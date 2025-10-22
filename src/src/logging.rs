use std::sync::atomic::{AtomicBool, AtomicUsize, Ordering};
use std::sync::Mutex;
use std::time::Instant;

/// Log levels
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
#[repr(C)]
pub enum LogLevel {
    Trace = 0,
    Debug = 1,
    Info = 2,
    Warn = 3,
    Error = 4,
}

/// Log entry
#[derive(Debug, Clone)]
pub struct LogEntry {
    pub level: LogLevel,
    pub message: String,
    pub module: &'static str,
    pub timestamp: std::time::Instant,
}

/// Global logging state
pub struct Logger {
    enabled: AtomicBool,
    min_level: AtomicUsize,
    entries: Mutex<Vec<LogEntry>>,
    max_entries: usize,
    start_time: Instant,
}

lazy_static::lazy_static! {
    pub static ref LOGGER: Logger = Logger::new();
}

impl Logger {
    fn new() -> Self {
        Self {
            enabled: AtomicBool::new(false),
            min_level: AtomicUsize::new(LogLevel::Info as usize),
            entries: Mutex::new(Vec::new()),
            max_entries: 10_000,
            start_time: Instant::now(),
        }
    }

    /// Enable logging
    pub fn enable(&self) {
        self.enabled.store(true, Ordering::SeqCst);
    }

    /// Disable logging
    pub fn disable(&self) {
        self.enabled.store(false, Ordering::SeqCst);
    }

    /// Check if logging is enabled
    pub fn is_enabled(&self) -> bool {
        self.enabled.load(Ordering::SeqCst)
    }

    /// Set minimum log level
    pub fn set_level(&self, level: LogLevel) {
        self.min_level.store(level as usize, Ordering::SeqCst);
    }

    /// Get current log level
    pub fn level(&self) -> LogLevel {
        match self.min_level.load(Ordering::SeqCst) {
            0 => LogLevel::Trace,
            1 => LogLevel::Debug,
            2 => LogLevel::Info,
            3 => LogLevel::Warn,
            4 => LogLevel::Error,
            _ => LogLevel::Info,
        }
    }

    /// Log a message
    pub fn log(&self, level: LogLevel, module: &'static str, message: String) {
        if !self.is_enabled() {
            return;
        }

        if level < self.level() {
            return;
        }

        let entry = LogEntry {
            level,
            message,
            module,
            timestamp: Instant::now(),
        };

        let mut entries = self.entries.lock().unwrap();

        // Circular buffer - remove oldest if at capacity
        if entries.len() >= self.max_entries {
            entries.remove(0);
        }

        entries.push(entry);
    }

    /// Get all log entries
    pub fn entries(&self) -> Vec<LogEntry> {
        self.entries.lock().unwrap().clone()
    }

    /// Clear all log entries
    pub fn clear(&self) {
        self.entries.lock().unwrap().clear();
    }

    /// Get log entries as JSON
    pub fn entries_json(&self) -> String {
        let entries = self.entries.lock().unwrap();
        let formatted: Vec<serde_json::Value> = entries
            .iter()
            .map(|e| {
                serde_json::json!({
                    "level": format!("{:?}", e.level),
                    "module": e.module,
                    "message": &e.message,
                    "elapsed_ms": e.timestamp.duration_since(self.start_time).as_millis(),
                })
            })
            .collect();

        serde_json::to_string(&formatted).unwrap_or_else(|_| "[]".to_string())
    }
}

/// Public logging functions
pub fn enable_logging() {
    LOGGER.enable();
}

pub fn disable_logging() {
    LOGGER.disable();
}

pub fn set_log_level(level: LogLevel) {
    LOGGER.set_level(level);
}

pub fn clear_logs() {
    LOGGER.clear();
}

pub fn get_logs() -> Vec<LogEntry> {
    LOGGER.entries()
}

pub fn get_logs_json() -> String {
    LOGGER.entries_json()
}

/// Internal logging macros
#[macro_export]
macro_rules! log_trace {
    ($($arg:tt)*) => {
        $crate::logging::LOGGER.log(
            $crate::logging::LogLevel::Trace,
            module_path!(),
            format!($($arg)*)
        )
    };
}

#[macro_export]
macro_rules! log_debug {
    ($($arg:tt)*) => {
        $crate::logging::LOGGER.log(
            $crate::logging::LogLevel::Debug,
            module_path!(),
            format!($($arg)*)
        )
    };
}

#[macro_export]
macro_rules! log_info {
    ($($arg:tt)*) => {
        $crate::logging::LOGGER.log(
            $crate::logging::LogLevel::Info,
            module_path!(),
            format!($($arg)*)
        )
    };
}

#[macro_export]
macro_rules! log_warn {
    ($($arg:tt)*) => {
        $crate::logging::LOGGER.log(
            $crate::logging::LogLevel::Warn,
            module_path!(),
            format!($($arg)*)
        )
    };
}

#[macro_export]
macro_rules! log_error {
    ($($arg:tt)*) => {
        $crate::logging::LOGGER.log(
            $crate::logging::LogLevel::Error,
            module_path!(),
            format!($($arg)*)
        )
    };
}

/// FFI functions for logging control
#[no_mangle]
pub extern "C" fn minimact_logging_enable() {
    enable_logging();
}

#[no_mangle]
pub extern "C" fn minimact_logging_disable() {
    disable_logging();
}

#[no_mangle]
pub extern "C" fn minimact_logging_set_level(level: u32) {
    let log_level = match level {
        0 => LogLevel::Trace,
        1 => LogLevel::Debug,
        2 => LogLevel::Info,
        3 => LogLevel::Warn,
        4 => LogLevel::Error,
        _ => LogLevel::Info,
    };
    set_log_level(log_level);
}

#[no_mangle]
pub unsafe extern "C" fn minimact_logging_get_logs() -> *mut std::os::raw::c_char {
    use std::ffi::CString;

    let json = get_logs_json();
    CString::new(json).unwrap().into_raw()
}

#[no_mangle]
pub extern "C" fn minimact_logging_clear() {
    clear_logs();
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_logging_enable_disable() {
        let logger = Logger::new();
        assert!(!logger.is_enabled());

        logger.enable();
        assert!(logger.is_enabled());

        logger.disable();
        assert!(!logger.is_enabled());
    }

    #[test]
    fn test_log_levels() {
        let logger = Logger::new();
        logger.enable();
        logger.set_level(LogLevel::Warn);

        logger.log(LogLevel::Info, "test", "Should not appear".to_string());
        logger.log(LogLevel::Warn, "test", "Should appear".to_string());
        logger.log(LogLevel::Error, "test", "Should also appear".to_string());

        let entries = logger.entries();
        assert_eq!(entries.len(), 2);
        assert_eq!(entries[0].level, LogLevel::Warn);
        assert_eq!(entries[1].level, LogLevel::Error);
    }

    #[test]
    fn test_circular_buffer() {
        let logger = Logger::new();
        logger.enable();

        // Log more than max_entries
        for i in 0..logger.max_entries + 100 {
            logger.log(LogLevel::Info, "test", format!("Message {}", i));
        }

        let entries = logger.entries();
        assert_eq!(entries.len(), logger.max_entries);

        // Should have kept the newest ones
        assert!(entries.last().unwrap().message.contains(&format!("{}", logger.max_entries + 99)));
    }
}
