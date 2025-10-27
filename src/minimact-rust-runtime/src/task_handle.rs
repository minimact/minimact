//! Task Handle
//!
//! Represents the state and metadata of a running task

use serde::{Deserialize, Serialize};
use std::time::{Duration, SystemTime};

/// Task execution status
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum TaskStatus {
    Idle,
    Running,
    Complete,
    Error,
    Cancelled,
}

/// Task handle containing status and result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaskHandle {
    pub task_id: String,
    pub status: TaskStatus,
    pub progress: f64,
    pub result: Option<serde_json::Value>,
    pub error: Option<String>,
    pub started_at: Option<SystemTime>,
    pub completed_at: Option<SystemTime>,
}

impl TaskHandle {
    /// Create a new task handle
    pub fn new(task_id: String) -> Self {
        Self {
            task_id,
            status: TaskStatus::Idle,
            progress: 0.0,
            result: None,
            error: None,
            started_at: None,
            completed_at: None,
        }
    }

    /// Set task status
    pub fn set_status(&mut self, status: TaskStatus) {
        self.status = status.clone();

        match status {
            TaskStatus::Running => {
                self.started_at = Some(SystemTime::now());
            }
            TaskStatus::Complete | TaskStatus::Error | TaskStatus::Cancelled => {
                self.completed_at = Some(SystemTime::now());
            }
            _ => {}
        }
    }

    /// Set task result
    pub fn set_result(&mut self, result: serde_json::Value) {
        self.result = Some(result);
    }

    /// Set task error
    pub fn set_error(&mut self, error: String) {
        self.error = Some(error);
    }

    /// Set task progress (0.0 to 1.0)
    pub fn set_progress(&mut self, progress: f64) {
        self.progress = progress.clamp(0.0, 1.0);
    }

    /// Get task duration (if started)
    pub fn duration(&self) -> Option<Duration> {
        match (self.started_at, self.completed_at) {
            (Some(start), Some(end)) => end.duration_since(start).ok(),
            _ => None,
        }
    }

    /// Check if task is running
    pub fn is_running(&self) -> bool {
        self.status == TaskStatus::Running
    }

    /// Check if task is complete
    pub fn is_complete(&self) -> bool {
        self.status == TaskStatus::Complete
    }

    /// Check if task has error
    pub fn has_error(&self) -> bool {
        self.status == TaskStatus::Error
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_task_handle_creation() {
        let handle = TaskHandle::new("test_task".to_string());
        assert_eq!(handle.task_id, "test_task");
        assert_eq!(handle.status, TaskStatus::Idle);
        assert_eq!(handle.progress, 0.0);
    }

    #[test]
    fn test_task_status_transitions() {
        let mut handle = TaskHandle::new("test_task".to_string());

        handle.set_status(TaskStatus::Running);
        assert!(handle.is_running());
        assert!(handle.started_at.is_some());

        handle.set_status(TaskStatus::Complete);
        assert!(handle.is_complete());
        assert!(handle.completed_at.is_some());
    }

    #[test]
    fn test_task_progress() {
        let mut handle = TaskHandle::new("test_task".to_string());

        handle.set_progress(0.5);
        assert_eq!(handle.progress, 0.5);

        handle.set_progress(1.5); // Should clamp to 1.0
        assert_eq!(handle.progress, 1.0);

        handle.set_progress(-0.5); // Should clamp to 0.0
        assert_eq!(handle.progress, 0.0);
    }
}
