use std::fmt;

/// Comprehensive error types for Minimact
#[derive(Debug)]
pub enum MinimactError {
    /// Invalid VNode structure
    InvalidVNode(String),

    /// Patch path out of bounds or invalid
    InvalidPatchPath { path: Vec<usize> },

    /// Patch type doesn't match target node
    PatchTypeMismatch {
        expected: &'static str,
        found: &'static str,
    },

    /// Predictor is at capacity
    PredictorFull,

    /// Invalid predictor handle
    InvalidHandle(usize),

    /// Tree exceeds maximum depth
    TreeTooDeep { depth: usize, max: usize },

    /// Tree has too many nodes
    TreeTooLarge { nodes: usize, max: usize },

    /// Memory limit exceeded
    MemoryLimitExceeded { current: usize, max: usize },

    /// JSON is too large to process
    JsonTooLarge { size: usize, max: usize },

    /// JSON parsing/serialization error
    Serialization(String),

    /// Invalid UTF-8 in C string
    InvalidUtf8(std::str::Utf8Error),

    /// Null pointer passed from C#
    NullPointer(&'static str),

    /// Too many children in a single node
    TooManyChildren { count: usize, max: usize },

    /// Property key or value too long
    PropertyTooLong { name: String, length: usize, max: usize },

    /// Text content too long
    TextTooLong { length: usize, max: usize },

    /// Persistence error
    Persistence(String),

    /// Key not found in reorder operation
    KeyNotFound(String),
}

impl fmt::Display for MinimactError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            MinimactError::InvalidVNode(msg) => write!(f, "Invalid VNode: {}", msg),
            MinimactError::InvalidPatchPath { path } => {
                write!(f, "Invalid patch path: {:?}", path)
            }
            MinimactError::PatchTypeMismatch { expected, found } => {
                write!(f, "Patch type mismatch: expected {}, found {}", expected, found)
            }
            MinimactError::PredictorFull => write!(f, "Predictor is at capacity"),
            MinimactError::InvalidHandle(handle) => {
                write!(f, "Invalid predictor handle: {}", handle)
            }
            MinimactError::TreeTooDeep { depth, max } => {
                write!(f, "Tree too deep: {} levels exceeds max {}", depth, max)
            }
            MinimactError::TreeTooLarge { nodes, max } => {
                write!(f, "Tree too large: {} nodes exceeds max {}", nodes, max)
            }
            MinimactError::MemoryLimitExceeded { current, max } => {
                write!(f, "Memory limit exceeded: {} bytes > {} bytes", current, max)
            }
            MinimactError::JsonTooLarge { size, max } => {
                write!(f, "JSON too large: {} bytes > {} bytes", size, max)
            }
            MinimactError::Serialization(msg) => write!(f, "Serialization error: {}", msg),
            MinimactError::InvalidUtf8(e) => write!(f, "Invalid UTF-8: {}", e),
            MinimactError::NullPointer(param) => write!(f, "Null pointer: {}", param),
            MinimactError::TooManyChildren { count, max } => {
                write!(f, "Too many children: {} exceeds max {}", count, max)
            }
            MinimactError::PropertyTooLong { name, length, max } => {
                write!(f, "Property '{}' too long: {} bytes > {} bytes", name, length, max)
            }
            MinimactError::TextTooLong { length, max } => {
                write!(f, "Text too long: {} bytes > {} bytes", length, max)
            }
            MinimactError::Persistence(msg) => write!(f, "Persistence error: {}", msg),
            MinimactError::KeyNotFound(key) => write!(f, "Key not found: {}", key),
        }
    }
}

impl std::error::Error for MinimactError {}

impl From<serde_json::Error> for MinimactError {
    fn from(err: serde_json::Error) -> Self {
        MinimactError::Serialization(err.to_string())
    }
}

impl From<std::str::Utf8Error> for MinimactError {
    fn from(err: std::str::Utf8Error) -> Self {
        MinimactError::InvalidUtf8(err)
    }
}

/// Result type for Minimact operations
pub type Result<T> = std::result::Result<T, MinimactError>;

/// Error codes for FFI
#[repr(i32)]
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ErrorCode {
    Success = 0,
    InvalidVNode = 1,
    InvalidPath = 2,
    PatchTypeMismatch = 3,
    PredictorFull = 4,
    InvalidHandle = 5,
    TreeTooDeep = 6,
    TreeTooLarge = 7,
    MemoryLimitExceeded = 8,
    JsonTooLarge = 9,
    Serialization = 10,
    InvalidUtf8 = 11,
    NullPointer = 12,
    TooManyChildren = 13,
    PropertyTooLong = 14,
    TextTooLong = 15,
    Persistence = 16,
    KeyNotFound = 17,
    Unknown = 999,
}

impl From<&MinimactError> for ErrorCode {
    fn from(err: &MinimactError) -> Self {
        match err {
            MinimactError::InvalidVNode(_) => ErrorCode::InvalidVNode,
            MinimactError::InvalidPatchPath { .. } => ErrorCode::InvalidPath,
            MinimactError::PatchTypeMismatch { .. } => ErrorCode::PatchTypeMismatch,
            MinimactError::PredictorFull => ErrorCode::PredictorFull,
            MinimactError::InvalidHandle(_) => ErrorCode::InvalidHandle,
            MinimactError::TreeTooDeep { .. } => ErrorCode::TreeTooDeep,
            MinimactError::TreeTooLarge { .. } => ErrorCode::TreeTooLarge,
            MinimactError::MemoryLimitExceeded { .. } => ErrorCode::MemoryLimitExceeded,
            MinimactError::JsonTooLarge { .. } => ErrorCode::JsonTooLarge,
            MinimactError::Serialization(_) => ErrorCode::Serialization,
            MinimactError::InvalidUtf8(_) => ErrorCode::InvalidUtf8,
            MinimactError::NullPointer(_) => ErrorCode::NullPointer,
            MinimactError::TooManyChildren { .. } => ErrorCode::TooManyChildren,
            MinimactError::PropertyTooLong { .. } => ErrorCode::PropertyTooLong,
            MinimactError::TextTooLong { .. } => ErrorCode::TextTooLong,
            MinimactError::Persistence(_) => ErrorCode::Persistence,
            MinimactError::KeyNotFound(_) => ErrorCode::KeyNotFound,
        }
    }
}

/// FFI-safe error result
#[repr(C)]
pub struct FfiResult {
    pub code: i32,
    pub message: *mut std::os::raw::c_char,
}

impl FfiResult {
    pub fn success() -> Self {
        Self {
            code: ErrorCode::Success as i32,
            message: std::ptr::null_mut(),
        }
    }

    pub fn error(err: &MinimactError) -> Self {
        use std::ffi::CString;

        let code = ErrorCode::from(err) as i32;
        let message_str = err.to_string();
        let message = CString::new(message_str)
            .unwrap_or_else(|_| CString::new("Error creating error message").unwrap())
            .into_raw();

        Self { code, message }
    }

    pub fn error_str(msg: &str) -> Self {
        use std::ffi::CString;

        let message = CString::new(msg)
            .unwrap_or_else(|_| CString::new("Error creating error message").unwrap())
            .into_raw();

        Self {
            code: ErrorCode::Unknown as i32,
            message,
        }
    }
}
