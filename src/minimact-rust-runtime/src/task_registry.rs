//! Task Registry
//!
//! Dynamically register and execute generated Rust tasks

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::future::Future;
use std::pin::Pin;
use std::sync::{Arc, RwLock};

/// Task function signature
pub type TaskFn = Arc<
    dyn Fn(serde_json::Value) -> Pin<Box<dyn Future<Output = Result<serde_json::Value, Box<dyn std::error::Error + Send + Sync>>> + Send>>
        + Send
        + Sync,
>;

/// Global task registry
static mut TASK_REGISTRY: Option<Arc<TaskRegistry>> = None;

/// Task registry for dynamically loading generated tasks
pub struct TaskRegistry {
    tasks: RwLock<HashMap<String, TaskFn>>,
}

impl TaskRegistry {
    /// Create a new task registry
    pub fn new() -> Self {
        Self {
            tasks: RwLock::new(HashMap::new()),
        }
    }

    /// Get global task registry instance
    pub fn global() -> Arc<TaskRegistry> {
        unsafe {
            if TASK_REGISTRY.is_none() {
                TASK_REGISTRY = Some(Arc::new(TaskRegistry::new()));
            }
            TASK_REGISTRY.as_ref().unwrap().clone()
        }
    }

    /// Register a task
    pub fn register(&self, task_id: String, task_fn: TaskFn) {
        let mut tasks = self.tasks.write().unwrap();
        tasks.insert(task_id, task_fn);
    }

    /// Get a registered task
    pub fn get(&self, task_id: &str) -> Option<TaskFn> {
        let tasks = self.tasks.read().unwrap();
        tasks.get(task_id).cloned()
    }

    /// Check if a task is registered
    pub fn contains(&self, task_id: &str) -> bool {
        let tasks = self.tasks.read().unwrap();
        tasks.contains_key(task_id)
    }

    /// List all registered tasks
    pub fn list(&self) -> Vec<String> {
        let tasks = self.tasks.read().unwrap();
        tasks.keys().cloned().collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_task_registry() {
        let registry = TaskRegistry::new();

        let task_id = "test_task".to_string();
        let task_fn: TaskFn = Arc::new(|input| {
            Box::pin(async move {
                Ok(serde_json::json!({ "result": 42 }))
            })
        });

        registry.register(task_id.clone(), task_fn);
        assert!(registry.contains(&task_id));

        let tasks = registry.list();
        assert_eq!(tasks.len(), 1);
        assert_eq!(tasks[0], task_id);
    }
}
