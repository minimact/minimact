use crate::predictor::{Predictor, StateChange, PredictorConfig};
use crate::vdom::VNode;
use crate::reconciler::reconcile;
use crate::error::FfiResult;
use std::ffi::{CStr, CString};
use std::os::raw::c_char;
use std::sync::atomic::{AtomicUsize, Ordering};

// Thread-safe global predictor storage with per-predictor locks
lazy_static::lazy_static! {
    static ref PREDICTORS: dashmap::DashMap<usize, Predictor> = dashmap::DashMap::new();
}

static NEXT_PREDICTOR_ID: AtomicUsize = AtomicUsize::new(1);

/// Opaque handle to a predictor instance
pub type PredictorHandle = usize;


/// Create a new predictor instance
/// Returns a handle to the predictor
#[no_mangle]
pub extern "C" fn minimact_predictor_new() -> PredictorHandle {
    let predictor = Predictor::new();
    let id = NEXT_PREDICTOR_ID.fetch_add(1, Ordering::SeqCst);
    PREDICTORS.insert(id, predictor);
    crate::metrics::METRICS.record_predictor_created();
    id
}

/// Create a new predictor with custom configuration
#[no_mangle]
pub extern "C" fn minimact_predictor_new_with_config(
    min_confidence: f32,
    max_patterns_per_key: usize,
) -> PredictorHandle {
    let config = PredictorConfig {
        min_confidence,
        max_patterns_per_key,
        use_ml: false,
        max_state_keys: 1000,
        max_memory_bytes: 100 * 1024 * 1024, // 100 MB default
        eviction_policy: crate::predictor::EvictionPolicy::LeastFrequentlyUsed,
    };
    let predictor = Predictor::with_config(config);
    let id = NEXT_PREDICTOR_ID.fetch_add(1, Ordering::SeqCst);
    PREDICTORS.insert(id, predictor);
    crate::metrics::METRICS.record_predictor_created();
    id
}

/// Destroy a predictor instance
#[no_mangle]
pub extern "C" fn minimact_predictor_destroy(handle: PredictorHandle) -> FfiResult {
    if PREDICTORS.remove(&handle).is_some() {
        crate::metrics::METRICS.record_predictor_destroyed();
        FfiResult::success()
    } else {
        FfiResult::error_str("Invalid predictor handle")
    }
}

/// Reconcile two VNode trees and return patches as JSON
///
/// # Safety
/// - old_json and new_json must be valid null-terminated UTF-8 strings
/// - Input JSON is validated for size limits before parsing
/// - The returned pointer must be freed using minimact_free_string
#[no_mangle]
pub unsafe extern "C" fn minimact_reconcile(
    old_json: *const c_char,
    new_json: *const c_char,
) -> *mut c_char {
    let old_str = match CStr::from_ptr(old_json).to_str() {
        Ok(s) => s,
        Err(_) => return CString::new("").unwrap().into_raw(),
    };

    let new_str = match CStr::from_ptr(new_json).to_str() {
        Ok(s) => s,
        Err(_) => return CString::new("").unwrap().into_raw(),
    };

    // Use safe deserialization with size limits
    let validation_config = crate::validation::ValidationConfig::default();

    let old_node: VNode = match crate::validation::deserialize_vnode_safe(old_str, &validation_config) {
        Ok(n) => n,
        Err(e) => {
            let err = format!("{{\"error\": \"Failed to parse old tree: {}\"}}", e);
            return CString::new(err).unwrap().into_raw();
        }
    };

    let new_node: VNode = match crate::validation::deserialize_vnode_safe(new_str, &validation_config) {
        Ok(n) => n,
        Err(e) => {
            let err = format!("{{\"error\": \"Failed to parse new tree: {}\"}}", e);
            return CString::new(err).unwrap().into_raw();
        }
    };

    let patches = match reconcile(&old_node, &new_node) {
        Ok(p) => p,
        Err(e) => {
            let err = format!("{{\"error\": \"Reconciliation failed: {}\"}}", e);
            return CString::new(err).unwrap().into_raw();
        }
    };

    match serde_json::to_string(&patches) {
        Ok(json) => CString::new(json).unwrap().into_raw(),
        Err(e) => {
            let err = format!("{{\"error\": \"Failed to serialize patches: {}\"}}", e);
            CString::new(err).unwrap().into_raw()
        }
    }
}

/// Learn from a state change
///
/// # Safety
/// - All JSON pointers must be valid null-terminated UTF-8 strings
/// - all_state_json can be null if not available
#[no_mangle]
pub unsafe extern "C" fn minimact_predictor_learn(
    handle: PredictorHandle,
    state_change_json: *const c_char,
    old_tree_json: *const c_char,
    new_tree_json: *const c_char,
    all_state_json: *const c_char,
) -> FfiResult {
    let state_change_str = match CStr::from_ptr(state_change_json).to_str() {
        Ok(s) => s,
        Err(_) => return FfiResult::error_str("Invalid state_change_json encoding"),
    };

    let old_tree_str = match CStr::from_ptr(old_tree_json).to_str() {
        Ok(s) => s,
        Err(_) => return FfiResult::error_str("Invalid old_tree_json encoding"),
    };

    let new_tree_str = match CStr::from_ptr(new_tree_json).to_str() {
        Ok(s) => s,
        Err(_) => return FfiResult::error_str("Invalid new_tree_json encoding"),
    };

    let state_change: StateChange = match serde_json::from_str(state_change_str) {
        Ok(sc) => sc,
        Err(e) => return FfiResult::error_str(&format!("Failed to parse state change: {}", e)),
    };

    let validation_config = crate::validation::ValidationConfig::default();

    let old_tree: VNode = match crate::validation::deserialize_vnode_safe(old_tree_str, &validation_config) {
        Ok(t) => t,
        Err(e) => return FfiResult::error_str(&format!("Failed to parse old tree: {}", e)),
    };

    let new_tree: VNode = match crate::validation::deserialize_vnode_safe(new_tree_str, &validation_config) {
        Ok(t) => t,
        Err(e) => return FfiResult::error_str(&format!("Failed to parse new tree: {}", e)),
    };

    // Parse all_state if provided (can be null)
    let all_state = if all_state_json.is_null() {
        None
    } else {
        match CStr::from_ptr(all_state_json).to_str() {
            Ok(s) => {
                match serde_json::from_str::<std::collections::HashMap<String, serde_json::Value>>(s) {
                    Ok(state) => Some(state),
                    Err(e) => return FfiResult::error_str(&format!("Failed to parse all_state: {}", e)),
                }
            }
            Err(_) => return FfiResult::error_str("Invalid all_state_json encoding"),
        }
    };

    if let Some(mut predictor) = PREDICTORS.get_mut(&handle) {
        match predictor.learn(state_change, &old_tree, &new_tree, all_state.as_ref()) {
            Ok(()) => FfiResult::success(),
            Err(e) => FfiResult::error_str(&format!("Learn failed: {}", e)),
        }
    } else {
        FfiResult::error_str("Invalid predictor handle")
    }
}

/// Predict patches for a state change
/// Returns JSON string with prediction or null if no prediction available
///
/// # Safety
/// - All JSON pointers must be valid null-terminated UTF-8 strings
/// - The returned pointer must be freed using minimact_free_string
#[no_mangle]
pub unsafe extern "C" fn minimact_predictor_predict(
    handle: PredictorHandle,
    state_change_json: *const c_char,
    current_tree_json: *const c_char,
) -> *mut c_char {
    let state_change_str = match CStr::from_ptr(state_change_json).to_str() {
        Ok(s) => s,
        Err(_) => return std::ptr::null_mut(),
    };

    let current_tree_str = match CStr::from_ptr(current_tree_json).to_str() {
        Ok(s) => s,
        Err(_) => return std::ptr::null_mut(),
    };

    let state_change: StateChange = match serde_json::from_str(state_change_str) {
        Ok(sc) => sc,
        Err(_) => return std::ptr::null_mut(),
    };

    let validation_config = crate::validation::ValidationConfig::default();

    let current_tree: VNode = match crate::validation::deserialize_vnode_safe(current_tree_str, &validation_config) {
        Ok(t) => t,
        Err(_) => return std::ptr::null_mut(),
    };

    if let Some(mut predictor) = PREDICTORS.get_mut(&handle) {
        if let Some(prediction) = predictor.predict(&state_change, &current_tree) {
            // Return successful prediction wrapped in Result format
            let result = serde_json::json!({
                "ok": true,
                "data": prediction
            });
            match serde_json::to_string(&result) {
                Ok(json) => CString::new(json).unwrap().into_raw(),
                Err(_) => std::ptr::null_mut(),
            }
        } else {
            // Return error response when no prediction is available
            let error_response = serde_json::json!({
                "ok": false,
                "error": "No prediction available (confidence too low or no matching pattern)"
            });
            match serde_json::to_string(&error_response) {
                Ok(json) => CString::new(json).unwrap().into_raw(),
                Err(_) => std::ptr::null_mut(),
            }
        }
    } else {
        // Return error response for invalid handle
        let error_response = serde_json::json!({
            "ok": false,
            "error": "Invalid predictor handle"
        });
        match serde_json::to_string(&error_response) {
            Ok(json) => CString::new(json).unwrap().into_raw(),
            Err(_) => std::ptr::null_mut(),
        }
    }
}

/// Predict patches based on hint (for usePredictHint)
///
/// # Safety
/// - All JSON pointers must be valid null-terminated UTF-8 strings
/// - The returned pointer must be freed using minimact_free_string
#[no_mangle]
pub unsafe extern "C" fn minimact_predictor_predict_hint(
    handle: PredictorHandle,
    hint_id: *const c_char,
    component_id: *const c_char,
    state_changes_json: *const c_char,
    current_tree_json: *const c_char,
) -> *mut c_char {
    let hint_id_str = match CStr::from_ptr(hint_id).to_str() {
        Ok(s) => s,
        Err(_) => return std::ptr::null_mut(),
    };

    let component_id_str = match CStr::from_ptr(component_id).to_str() {
        Ok(s) => s,
        Err(_) => return std::ptr::null_mut(),
    };

    let state_changes_str = match CStr::from_ptr(state_changes_json).to_str() {
        Ok(s) => s,
        Err(_) => return std::ptr::null_mut(),
    };

    let current_tree_str = match CStr::from_ptr(current_tree_json).to_str() {
        Ok(s) => s,
        Err(_) => return std::ptr::null_mut(),
    };

    let state_changes: Vec<StateChange> = match serde_json::from_str(state_changes_str) {
        Ok(sc) => sc,
        Err(_) => return std::ptr::null_mut(),
    };

    let validation_config = crate::validation::ValidationConfig::default();
    let current_tree: VNode = match crate::validation::deserialize_vnode_safe(current_tree_str, &validation_config) {
        Ok(t) => t,
        Err(_) => return std::ptr::null_mut(),
    };

    if let Some(mut predictor) = PREDICTORS.get_mut(&handle) {
        if let Some(prediction) = predictor.predict_hint(hint_id_str, component_id_str, state_changes, &current_tree) {
            let result = serde_json::json!({
                "ok": true,
                "hint_id": hint_id_str,
                "data": prediction
            });
            match serde_json::to_string(&result) {
                Ok(json) => CString::new(json).unwrap().into_raw(),
                Err(_) => std::ptr::null_mut(),
            }
        } else {
            let error_response = serde_json::json!({
                "ok": false,
                "error": "No prediction available for hint"
            });
            match serde_json::to_string(&error_response) {
                Ok(json) => CString::new(json).unwrap().into_raw(),
                Err(_) => std::ptr::null_mut(),
            }
        }
    } else {
        std::ptr::null_mut()
    }
}

/// Get predictor statistics as JSON
///
/// # Safety
/// - The returned pointer must be freed using minimact_free_string
#[no_mangle]
pub unsafe extern "C" fn minimact_predictor_stats(handle: PredictorHandle) -> *mut c_char {
    if let Some(predictor) = PREDICTORS.get(&handle) {
        let stats = predictor.stats();
        match serde_json::to_string(&stats) {
            Ok(json) => CString::new(json).unwrap().into_raw(),
            Err(_) => std::ptr::null_mut(),
        }
    } else {
        std::ptr::null_mut()
    }
}

/// Save predictor state to JSON string
///
/// # Safety
/// - The returned pointer must be freed using minimact_free_string
#[no_mangle]
pub unsafe extern "C" fn minimact_predictor_save(handle: PredictorHandle) -> *mut c_char {
    if let Some(predictor) = PREDICTORS.get(&handle) {
        match predictor.save_to_json() {
            Ok(json) => CString::new(json).unwrap().into_raw(),
            Err(_) => std::ptr::null_mut(),
        }
    } else {
        std::ptr::null_mut()
    }
}

/// Load predictor state from JSON string
///
/// Returns a new predictor handle with the loaded state
///
/// # Safety
/// - json_str must be a valid null-terminated UTF-8 string
#[no_mangle]
pub unsafe extern "C" fn minimact_predictor_load(json_str: *const c_char) -> PredictorHandle {
    let json = match CStr::from_ptr(json_str).to_str() {
        Ok(s) => s,
        Err(_) => return 0, // Return 0 as invalid handle
    };

    match Predictor::load_from_json(json) {
        Ok(predictor) => {
            let id = NEXT_PREDICTOR_ID.fetch_add(1, Ordering::SeqCst);
            PREDICTORS.insert(id, predictor);
            crate::metrics::METRICS.record_predictor_created();
            id
        }
        Err(_) => 0, // Return 0 as invalid handle
    }
}

/// Free a string returned by minimact functions
///
/// # Safety
/// - ptr must be a pointer returned by a minimact function
/// - ptr must not be used after calling this function
#[no_mangle]
pub unsafe extern "C" fn minimact_free_string(ptr: *mut c_char) {
    if !ptr.is_null() {
        drop(CString::from_raw(ptr));
    }
}

/// Free an error message from FfiResult
///
/// # Safety
/// - ptr must be the error_message from an FfiResult
#[no_mangle]
pub unsafe extern "C" fn minimact_free_error(ptr: *mut c_char) {
    minimact_free_string(ptr);
}
