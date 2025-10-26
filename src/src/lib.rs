pub mod vdom;
pub mod reconciler;
pub mod predictor;
pub mod ffi;
pub mod error;
pub mod validation;
pub mod patch_validator;
pub mod logging;
pub mod metrics;
pub mod deep_state_traversal;  // Phase 7
pub mod reorder_detection;     // Phase 8
pub mod structural_template_extraction;  // Phase 5

pub use vdom::{VNode, VElement, VText, Patch, TemplatePatch};
pub use reconciler::{reconcile, reconcile_with_config};
pub use predictor::{Predictor, StateChange, Prediction, PredictorConfig, EvictionPolicy};
pub use error::{MinimactError, Result, ErrorCode, FfiResult};
pub use validation::{ValidationConfig, deserialize_vnode_safe, serialize_vnode_safe};
pub use patch_validator::{validate_patch, validate_patches, PatchValidatorConfig};
pub use logging::{LogLevel, enable_logging, disable_logging, set_log_level, get_logs, get_logs_json, clear_logs};
pub use metrics::{MetricsSnapshot, METRICS};
