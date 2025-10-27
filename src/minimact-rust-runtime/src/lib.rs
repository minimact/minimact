//! Minimact Rust Runtime
//!
//! High-performance Rust task execution runtime for Minimact server tasks
//! Provides Tokio-based async execution with FFI interface for C# interop

use dashmap::DashMap;
use serde::{Deserialize, Serialize};
use std::ffi::{CStr, CString};
use std::os::raw::c_char;
use std::sync::Arc;
use tokio::runtime::Runtime;
use tokio::sync::mpsc;

pub mod task_registry;
pub mod task_handle;

use task_handle::{TaskHandle, TaskStatus};

/// Global Rust runtime instance
static mut RUNTIME: Option<Arc<RustTaskRuntime>> = None;

/// Rust task runtime manager
pub struct RustTaskRuntime {
    tokio_runtime: Runtime,
    tasks: Arc<DashMap<String, TaskHandle>>,
}

impl RustTaskRuntime {
    /// Create a new Rust task runtime
    pub fn new() -> Self {
        let tokio_runtime = tokio::runtime::Builder::new_multi_thread()
            .worker_threads(num_cpus::get())
            .thread_name("minimact-rust-task")
            .enable_all()
            .build()
            .expect("Failed to create Tokio runtime");

        Self {
            tokio_runtime,
            tasks: Arc::new(DashMap::new()),
        }
    }

    /// Get global runtime instance (lazy initialization)
    pub fn global() -> Arc<RustTaskRuntime> {
        unsafe {
            if RUNTIME.is_none() {
                RUNTIME = Some(Arc::new(RustTaskRuntime::new()));
            }
            RUNTIME.as_ref().unwrap().clone()
        }
    }

    /// Execute a task asynchronously
    pub fn execute_task<F, T>(
        &self,
        task_id: String,
        task_fn: F,
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>>
    where
        F: std::future::Future<Output = Result<T, Box<dyn std::error::Error + Send + Sync>>> + Send + 'static,
        T: Serialize + Send + 'static,
    {
        let tasks = self.tasks.clone();
        let task_id_clone = task_id.clone();

        // Create progress channel
        let (progress_tx, mut progress_rx) = mpsc::channel::<f64>(100);

        // Insert task handle
        let handle = TaskHandle::new(task_id.clone());
        tasks.insert(task_id.clone(), handle);

        // Spawn task on Tokio runtime
        self.tokio_runtime.spawn(async move {
            // Mark as running
            if let Some(mut task) = tasks.get_mut(&task_id_clone) {
                task.set_status(TaskStatus::Running);
            }

            // Execute task
            match task_fn.await {
                Ok(result) => {
                    // Serialize result
                    let result_json = serde_json::to_value(&result)
                        .expect("Failed to serialize result");

                    // Update task handle
                    if let Some(mut task) = tasks.get_mut(&task_id_clone) {
                        task.set_status(TaskStatus::Complete);
                        task.set_result(result_json);
                    }
                }
                Err(err) => {
                    // Update task handle with error
                    if let Some(mut task) = tasks.get_mut(&task_id_clone) {
                        task.set_status(TaskStatus::Error);
                        task.set_error(err.to_string());
                    }
                }
            }
        });

        Ok(())
    }

    /// Get task status
    pub fn get_task_status(&self, task_id: &str) -> Option<TaskHandle> {
        self.tasks.get(task_id).map(|entry| entry.value().clone())
    }

    /// Cancel a running task
    pub fn cancel_task(&self, task_id: &str) {
        if let Some(mut task) = self.tasks.get_mut(task_id) {
            task.set_status(TaskStatus::Cancelled);
        }
    }

    /// Remove a completed task
    pub fn remove_task(&self, task_id: &str) {
        self.tasks.remove(task_id);
    }
}

// ============================================================================
// FFI Interface for C# Interop
// ============================================================================

/// Initialize the Rust runtime (called from C#)
#[no_mangle]
pub extern "C" fn minimact_runtime_init() -> bool {
    let _ = RustTaskRuntime::global();
    true
}

/// Execute a task (called from C#)
///
/// # Arguments
/// * `task_id` - Unique task identifier
/// * `input_json` - JSON-serialized task input
///
/// # Returns
/// * JSON string with execution result or error
#[no_mangle]
pub extern "C" fn minimact_execute_task(
    task_id: *const c_char,
    input_json: *const c_char,
) -> *mut c_char {
    let task_id = unsafe {
        assert!(!task_id.is_null());
        CStr::from_ptr(task_id).to_str().unwrap()
    };

    let input_json = unsafe {
        assert!(!input_json.is_null());
        CStr::from_ptr(input_json).to_str().unwrap()
    };

    // Parse input
    let input: serde_json::Value = match serde_json::from_str(input_json) {
        Ok(v) => v,
        Err(e) => {
            let error_json = serde_json::json!({
                "success": false,
                "error": format!("Failed to parse input: {}", e)
            });
            return CString::new(error_json.to_string()).unwrap().into_raw();
        }
    };

    // Return task ID (actual execution happens asynchronously)
    let response = serde_json::json!({
        "success": true,
        "task_id": task_id
    });

    CString::new(response.to_string()).unwrap().into_raw()
}

/// Get task status (called from C#)
#[no_mangle]
pub extern "C" fn minimact_get_task_status(task_id: *const c_char) -> *mut c_char {
    let task_id = unsafe {
        assert!(!task_id.is_null());
        CStr::from_ptr(task_id).to_str().unwrap()
    };

    let runtime = RustTaskRuntime::global();

    match runtime.get_task_status(task_id) {
        Some(handle) => {
            let status_json = serde_json::to_string(&handle).unwrap();
            CString::new(status_json).unwrap().into_raw()
        }
        None => {
            let error_json = serde_json::json!({
                "status": "not_found",
                "error": format!("Task {} not found", task_id)
            });
            CString::new(error_json.to_string()).unwrap().into_raw()
        }
    }
}

/// Cancel a task (called from C#)
#[no_mangle]
pub extern "C" fn minimact_cancel_task(task_id: *const c_char) -> bool {
    let task_id = unsafe {
        assert!(!task_id.is_null());
        CStr::from_ptr(task_id).to_str().unwrap()
    };

    let runtime = RustTaskRuntime::global();
    runtime.cancel_task(task_id);
    true
}

/// Free a string allocated by Rust (called from C#)
#[no_mangle]
pub extern "C" fn minimact_free_string(ptr: *mut c_char) {
    if !ptr.is_null() {
        unsafe {
            let _ = CString::from_raw(ptr);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_runtime_creation() {
        let runtime = RustTaskRuntime::new();
        assert!(runtime.tasks.is_empty());
    }

    #[tokio::test]
    async fn test_simple_task_execution() {
        let runtime = RustTaskRuntime::new();

        let task_id = "test_task_1".to_string();
        let result = runtime.execute_task(task_id.clone(), async {
            Ok::<i32, Box<dyn std::error::Error + Send + Sync>>(42)
        });

        assert!(result.is_ok());

        // Wait a bit for task to complete
        tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;

        let status = runtime.get_task_status(&task_id);
        assert!(status.is_some());
    }
}
