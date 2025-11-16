use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager, Emitter};
use crate::runtime::{ExecuteRequest, execute_component};
use std::collections::HashMap;
use std::sync::Mutex;
use lazy_static::lazy_static;
use uuid::Uuid;
use minimact::{reconcile, VNode, Patch};

// ========================================
// Component Registry (Global State)
// ========================================

lazy_static! {
    static ref COMPONENT_REGISTRY: Mutex<HashMap<String, ComponentInstance>> = Mutex::new(HashMap::new());
}

#[derive(Clone, Serialize, Deserialize)]
struct ComponentInstance {
    id: String,
    csharp: String,
    templates: serde_json::Value,
    state: HashMap<String, serde_json::Value>,
    vnode_json: Option<String>,  // VNode as JSON string
}

impl ComponentInstance {
    fn new(id: String, csharp: String, templates: serde_json::Value, initial_state: HashMap<String, serde_json::Value>) -> Self {
        ComponentInstance {
            id,
            csharp,
            templates,
            state: initial_state,
            vnode_json: None,
        }
    }
}

// ========================================
// SignalM² Message Types
// ========================================

#[derive(Serialize, Deserialize, Clone)]
struct SignalMMessage {
    method: String,
    args: Vec<serde_json::Value>,
}

// ========================================
// Main Entry Point
// ========================================

/// Main SignalM² entry point - routes messages to appropriate handlers
#[tauri::command]
pub async fn signalm_invoke(
    app: AppHandle,
    method: String,
    args: Vec<serde_json::Value>
) -> Result<serde_json::Value, String> {
    println!("[SignalM²] Received: {} with {} args", method, args.len());

    // Route to appropriate handler based on method name
    match method.as_str() {
        // ========================================
        // Component Initialization
        // ========================================
        "Initialize" => handle_initialize(app, args).await,

        // ========================================
        // State Management
        // ========================================
        "UpdateComponentState" => handle_update_component_state(app, args).await,
        "UpdateDomElementState" => handle_update_dom_element_state(app, args).await,

        // ========================================
        // Event Handling
        // ========================================
        "TriggerEvent" => handle_trigger_event(app, args).await,

        // ========================================
        // Component Registration
        // ========================================
        "RegisterComponent" => handle_register_component(args).await,
        "InvokeComponentMethod" => handle_invoke_component_method(app, args).await,

        // ========================================
        // Unknown Method
        // ========================================
        _ => {
            eprintln!("[SignalM²] Unknown method: {}", method);
            Err(format!("Unknown SignalM method: {}", method))
        }
    }
}

// ========================================
// Component Initialization
// ========================================

async fn handle_initialize(
    app: AppHandle,
    args: Vec<serde_json::Value>
) -> Result<serde_json::Value, String> {
    let csharp = args.get(0)
        .and_then(|v| v.as_str())
        .ok_or("Missing C# source")?;

    let templates = args.get(1).cloned().unwrap_or(serde_json::json!({}));
    let initial_state = args.get(2).cloned().unwrap_or(serde_json::json!({}));

    println!("[SignalM²] Initializing component ({} bytes C#)", csharp.len());

    // Generate unique component ID
    let component_id = format!("component-{}", Uuid::new_v4());

    // Convert initial_state JSON to HashMap
    let state_map: HashMap<String, serde_json::Value> = if let Some(obj) = initial_state.as_object() {
        obj.iter().map(|(k, v)| (k.clone(), v.clone())).collect()
    } else {
        HashMap::new()
    };

    // Execute component via Phase 3 Native AOT runtime
    let request = ExecuteRequest {
        csharp: csharp.to_string(),
        templates: templates.clone(),
        initial_state,
    };

    let response = execute_component(app.clone(), request).await?;

    if !response.success {
        return Err(response.error.unwrap_or_else(|| "Unknown error".to_string()));
    }

    // Store component in registry
    let mut component = ComponentInstance::new(
        component_id.clone(),
        csharp.to_string(),
        templates,
        state_map
    );
    component.vnode_json = response.vnode_json.clone();

    {
        let mut registry = COMPONENT_REGISTRY.lock().unwrap();
        registry.insert(component_id.clone(), component);
        println!("[SignalM²] ✅ Component registered: {} (registry size: {})", component_id, registry.len());
    }

    Ok(serde_json::json!({
        "success": true,
        "componentId": component_id,
        "html": response.html,
        "vnodeJson": response.vnode_json
    }))
}

// ========================================
// State Management
// ========================================

async fn handle_update_component_state(
    app: AppHandle,
    args: Vec<serde_json::Value>
) -> Result<serde_json::Value, String> {
    let component_id = args.get(0)
        .and_then(|v| v.as_str())
        .ok_or("Missing componentId")?;

    let state_key = args.get(1)
        .and_then(|v| v.as_str())
        .ok_or("Missing stateKey")?;

    let value = args.get(2)
        .ok_or("Missing value")?
        .clone();

    println!("[SignalM²] UpdateComponentState: {} {} = {:?}", component_id, state_key, value);

    // 1. Get component from registry
    let (old_vnode, csharp, templates, new_state) = {
        let mut registry = COMPONENT_REGISTRY.lock().unwrap();
        let component = registry.get_mut(component_id)
            .ok_or_else(|| format!("Component not found: {}", component_id))?;

        // 2. Update state
        component.state.insert(state_key.to_string(), value.clone());

        // Get current VNode for diffing
        let old_vnode = component.vnode_json.clone();

        (old_vnode, component.csharp.clone(), component.templates.clone(), component.state.clone())
    };

    // 3. Re-execute component with new state
    let state_json = serde_json::to_value(&new_state)
        .map_err(|e| format!("Failed to serialize state: {}", e))?;

    let request = ExecuteRequest {
        csharp,
        templates,
        initial_state: state_json,
    };

    let response = execute_component(app.clone(), request).await?;

    if !response.success {
        return Err(response.error.unwrap_or_else(|| "Re-render failed".to_string()));
    }

    let new_vnode = response.vnode_json.clone();

    // 4. Generate patches (simple diff for now - TODO: use Rust reconciler)
    let patches = generate_simple_patches(old_vnode, new_vnode.clone())?;

    // 5. Update stored VNode
    {
        let mut registry = COMPONENT_REGISTRY.lock().unwrap();
        if let Some(component) = registry.get_mut(component_id) {
            component.vnode_json = new_vnode;
        }
    }

    println!("[SignalM²] ✅ Generated {} patches", patches.len());

    // 6. Emit patches to client
    if !patches.is_empty() {
        app.emit("signalm-message", SignalMMessage {
            method: "ApplyPatches".to_string(),
            args: vec![serde_json::json!({
                "componentId": component_id,
                "patches": patches
            })]
        }).map_err(|e| e.to_string())?;

        println!("[SignalM²] ✅ Emitted patches to client");
    }

    Ok(serde_json::json!({
        "success": true,
        "patchCount": patches.len()
    }))
}

async fn handle_update_dom_element_state(
    app: AppHandle,
    args: Vec<serde_json::Value>
) -> Result<serde_json::Value, String> {
    let component_id = args.get(0)
        .and_then(|v| v.as_str())
        .ok_or("Missing componentId")?;

    let state_key = args.get(1)
        .and_then(|v| v.as_str())
        .ok_or("Missing stateKey")?;

    let snapshot = args.get(2)
        .ok_or("Missing snapshot")?
        .clone();

    println!("[SignalM²] UpdateDomElementState: {} {} = {:?}", component_id, state_key, snapshot);

    // Store DOM state same as regular state
    let (old_vnode, csharp, templates, new_state) = {
        let mut registry = COMPONENT_REGISTRY.lock().unwrap();
        let component = registry.get_mut(component_id)
            .ok_or_else(|| format!("Component not found: {}", component_id))?;

        // Update state with DOM snapshot
        component.state.insert(state_key.to_string(), snapshot.clone());

        let old_vnode = component.vnode_json.clone();
        (old_vnode, component.csharp.clone(), component.templates.clone(), component.state.clone())
    };

    // Re-render with updated DOM state
    let state_json = serde_json::to_value(&new_state)
        .map_err(|e| format!("Failed to serialize state: {}", e))?;

    let request = ExecuteRequest {
        csharp,
        templates,
        initial_state: state_json,
    };

    let response = execute_component(app.clone(), request).await?;

    if !response.success {
        return Err(response.error.unwrap_or_else(|| "Re-render failed".to_string()));
    }

    let new_vnode = response.vnode_json.clone();

    // Generate and emit patches
    let patches = generate_simple_patches(old_vnode, new_vnode.clone())?;

    {
        let mut registry = COMPONENT_REGISTRY.lock().unwrap();
        if let Some(component) = registry.get_mut(component_id) {
            component.vnode_json = new_vnode;
        }
    }

    if !patches.is_empty() {
        app.emit("signalm-message", SignalMMessage {
            method: "ApplyPatches".to_string(),
            args: vec![serde_json::json!({
                "componentId": component_id,
                "patches": patches
            })]
        }).map_err(|e| e.to_string())?;
    }

    Ok(serde_json::json!({
        "success": true,
        "patchCount": patches.len()
    }))
}

// ========================================
// Event Handling
// ========================================

async fn handle_trigger_event(
    app: AppHandle,
    args: Vec<serde_json::Value>
) -> Result<serde_json::Value, String> {
    let component_id = args.get(0)
        .and_then(|v| v.as_str())
        .ok_or("Missing componentId")?;

    let event_name = args.get(1)
        .and_then(|v| v.as_str())
        .ok_or("Missing eventName")?;

    let event_data = args.get(2).cloned().unwrap_or(serde_json::json!(null));

    println!("[SignalM²] TriggerEvent: {} {} {:?}", component_id, event_name, event_data);

    // For events, we typically want to:
    // 1. Find the component
    // 2. Execute the event handler (which may update state)
    // 3. Re-render if state changed
    // 4. Generate and emit patches

    // For now, we'll treat this as a state update pattern
    // In a full implementation, this would call into the C# component's event handler

    // Emit a simple acknowledgment for now
    app.emit("signalm-message", SignalMMessage {
        method: "EventExecuted".to_string(),
        args: vec![serde_json::json!({
            "componentId": component_id,
            "eventName": event_name,
            "eventData": event_data
        })]
    }).map_err(|e| e.to_string())?;

    Ok(serde_json::json!({
        "success": true,
        "message": format!("Event {} triggered", event_name)
    }))
}

// ========================================
// Component Registration
// ========================================

async fn handle_register_component(
    args: Vec<serde_json::Value>
) -> Result<serde_json::Value, String> {
    let component_id = args.get(0)
        .and_then(|v| v.as_str())
        .ok_or("Missing componentId")?;

    println!("[SignalM²] RegisterComponent: {}", component_id);

    // Check if component exists in registry
    let exists = {
        let registry = COMPONENT_REGISTRY.lock().unwrap();
        registry.contains_key(component_id)
    };

    Ok(serde_json::json!({
        "success": true,
        "exists": exists
    }))
}

async fn handle_invoke_component_method(
    app: AppHandle,
    args: Vec<serde_json::Value>
) -> Result<serde_json::Value, String> {
    let component_id = args.get(0)
        .and_then(|v| v.as_str())
        .ok_or("Missing componentId")?;

    let method_name = args.get(1)
        .and_then(|v| v.as_str())
        .ok_or("Missing methodName")?;

    let method_args = args.get(2).cloned().unwrap_or(serde_json::json!([]));

    println!("[SignalM²] InvokeComponentMethod: {} {} {:?}", component_id, method_name, method_args);

    // In full implementation, this would:
    // 1. Get component from registry
    // 2. Invoke the C# method dynamically
    // 3. Handle any state changes
    // 4. Re-render and generate patches

    // For now, acknowledge the call
    Ok(serde_json::json!({
        "success": true,
        "result": format!("Method {} invoked", method_name)
    }))
}

// ========================================
// Patch Generation (REAL Rust Reconciler!)
// ========================================

/// Generate surgical patches using the Minimact Rust reconciler
/// This generates minimal, surgical DOM updates instead of replacing the whole tree
fn generate_simple_patches(
    old_vnode_json: Option<String>,
    new_vnode_json: Option<String>
) -> Result<Vec<serde_json::Value>, String> {
    // If old doesn't exist, it's initial render - return full tree replacement
    if old_vnode_json.is_none() {
        if let Some(new_json) = new_vnode_json {
            let vnode_value: serde_json::Value = serde_json::from_str(&new_json)
                .map_err(|e| format!("Failed to parse new VNode JSON: {}", e))?;

            return Ok(vec![serde_json::json!({
                "type": "ReplaceRoot",
                "vnode": vnode_value
            })]);
        }
        return Ok(vec![]);
    }

    // If both exist, use the REAL Rust reconciler for surgical patches!
    if let (Some(old_json), Some(new_json)) = (old_vnode_json, new_vnode_json) {
        // Parse JSON strings to VNode structs
        let old_vnode: VNode = serde_json::from_str(&old_json)
            .map_err(|e| format!("Failed to parse old VNode JSON: {}", e))?;

        let new_vnode: VNode = serde_json::from_str(&new_json)
            .map_err(|e| format!("Failed to parse new VNode JSON: {}", e))?;

        println!("[SignalM²] 🔧 Running Rust reconciler...");

        // Call the REAL reconciler! This generates surgical patches
        let rust_patches: Vec<Patch> = reconcile(&old_vnode, &new_vnode)
            .map_err(|e| format!("Reconciliation failed: {}", e))?;

        println!("[SignalM²] ✅ Reconciler generated {} surgical patches", rust_patches.len());

        // Convert Rust Patch structs to JSON for client
        let patches_json: Vec<serde_json::Value> = rust_patches
            .iter()
            .map(|patch| serde_json::to_value(patch).unwrap())
            .collect();

        return Ok(patches_json);
    }

    Ok(vec![])
}

// ========================================
// Utility Functions
// ========================================

/// Get component count (for debugging)
#[tauri::command]
pub fn get_component_count() -> usize {
    let registry = COMPONENT_REGISTRY.lock().unwrap();
    registry.len()
}

/// Clear all components (for testing)
#[tauri::command]
pub fn clear_components() -> Result<String, String> {
    let mut registry = COMPONENT_REGISTRY.lock().unwrap();
    let count = registry.len();
    registry.clear();
    Ok(format!("Cleared {} components", count))
}
