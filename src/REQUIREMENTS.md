# Minimact Rust Library - Requirements Analysis

## Current Requirements Fulfilled ✅

Based on the request for a Rust reconciliation engine and predictor for server-side React:

### What Was Built:

1. **Virtual DOM Reconciliation** ✓
   - Efficient diffing algorithm comparing two VNode trees
   - Minimal patch generation (only necessary changes)
   - Keyed reconciliation for optimized list updates
   - Path-based patch targeting for precise updates

2. **Predictor for State→DOM Changes** ✓
   - Pattern learning from observed state changes
   - Confidence-based predictions
   - Statistics tracking (observations, patterns, accuracy)
   - Configurable thresholds and limits

3. **C# FFI Integration** ✓
   - Safe memory management across FFI boundary
   - Thread-safe predictor instances via global registry
   - JSON serialization for data exchange
   - Proper string memory handling (allocate in Rust, free in Rust)

4. **Performance (Rust)** ✓
   - Written in Rust for maximum speed
   - Optimized reconciliation algorithms
   - Benchmark suite for performance testing
   - Minimal allocations during reconciliation

---

## Missing Requirements for Production Robustness 🔧

Here's what would make the Rust library production-ready:

---

## 1. Error Handling 🔴 CRITICAL

**Current Gap:**
```rust
// src/ffi.rs - silently returns null on errors
if resultPtr == IntPtr.Zero {
    // C# has no idea what went wrong!
}

// Could panic in various places
let patterns = self.patterns.entry(pattern_key.clone()).or_insert_with(Vec::new);
```

**What's Needed:**

```rust
// Define comprehensive error types
#[derive(Debug, thiserror::Error)]
pub enum MinimactError {
    #[error("Invalid VNode structure: {0}")]
    InvalidVNode(String),

    #[error("Patch path out of bounds: {path:?}")]
    InvalidPatchPath { path: Vec<usize> },

    #[error("Predictor at capacity")]
    PredictorFull,

    #[error("Serialization error: {0}")]
    Serialization(#[from] serde_json::Error),

    #[error("Invalid predictor handle: {0}")]
    InvalidHandle(usize),

    #[error("Tree too deep: {depth} exceeds max {max}")]
    TreeTooDeep { depth: usize, max: usize },

    #[error("Tree too large: {nodes} nodes exceeds max {max}")]
    TreeTooLarge { nodes: usize, max: usize },

    #[error("Memory limit exceeded: {current} bytes > {max} bytes")]
    MemoryLimitExceeded { current: usize, max: usize },
}

pub type Result<T> = std::result::Result<T, MinimactError>;

// Better FFI error reporting
#[repr(C)]
pub struct FfiError {
    pub code: i32,              // Error code for C# enum
    pub message: *mut c_char,   // Detailed message
}

pub enum ErrorCode {
    Success = 0,
    InvalidVNode = 1,
    InvalidPath = 2,
    PredictorFull = 3,
    // ...
}

// All public functions should return Result
pub fn reconcile(old: &VNode, new: &VNode) -> Result<Vec<Patch>>;
pub fn predict(&self, state_change: &StateChange, tree: &VNode) -> Result<Option<Prediction>>;
```

**Why Critical:** Production systems can't have silent failures or panics. C# needs structured error information.

**Impact:** Prevents crashes, enables proper error handling in C#.

---

## 2. Input Validation 🔴 CRITICAL

**Current Gap:**
```rust
// No validation - could crash on malicious input
pub fn reconcile(old: &VNode, new: &VNode) -> Vec<Patch> {
    // What if tree is 10,000 levels deep?
    // What if it has 1 million nodes?
    // What if props has 1GB of data?
}
```

**What's Needed:**

```rust
#[derive(Debug, Clone)]
pub struct ValidationConfig {
    pub max_tree_depth: usize,          // Default: 100
    pub max_node_count: usize,          // Default: 10,000
    pub max_children_per_node: usize,   // Default: 1,000
    pub max_prop_key_length: usize,     // Default: 256
    pub max_prop_value_length: usize,   // Default: 4,096
    pub max_text_length: usize,         // Default: 1MB
}

impl Default for ValidationConfig {
    fn default() -> Self {
        Self {
            max_tree_depth: 100,
            max_node_count: 10_000,
            max_children_per_node: 1_000,
            max_prop_key_length: 256,
            max_prop_value_length: 4_096,
            max_text_length: 1_024 * 1_024, // 1MB
        }
    }
}

impl VNode {
    pub fn validate(&self, config: &ValidationConfig) -> Result<()> {
        self.validate_depth(0, config)?;
        self.validate_node_count(config)?;
        self.validate_content_sizes(config)?;
        Ok(())
    }

    fn validate_depth(&self, current_depth: usize, config: &ValidationConfig) -> Result<()> {
        if current_depth > config.max_tree_depth {
            return Err(MinimactError::TreeTooDeep {
                depth: current_depth,
                max: config.max_tree_depth,
            });
        }

        match self {
            VNode::Element(el) => {
                for child in &el.children {
                    child.validate_depth(current_depth + 1, config)?;
                }
            }
            VNode::Text(_) => {}
        }
        Ok(())
    }

    fn validate_node_count(&self, config: &ValidationConfig) -> Result<()> {
        let count = self.count_nodes();
        if count > config.max_node_count {
            return Err(MinimactError::TreeTooLarge {
                nodes: count,
                max: config.max_node_count,
            });
        }
        Ok(())
    }

    fn count_nodes(&self) -> usize {
        match self {
            VNode::Text(_) => 1,
            VNode::Element(el) => {
                1 + el.children.iter().map(|c| c.count_nodes()).sum::<usize>()
            }
        }
    }

    fn validate_content_sizes(&self, config: &ValidationConfig) -> Result<()> {
        match self {
            VNode::Text(text) => {
                if text.content.len() > config.max_text_length {
                    return Err(MinimactError::InvalidVNode(
                        format!("Text too long: {} bytes", text.content.len())
                    ));
                }
            }
            VNode::Element(el) => {
                if el.children.len() > config.max_children_per_node {
                    return Err(MinimactError::InvalidVNode(
                        format!("Too many children: {}", el.children.len())
                    ));
                }

                for (key, value) in &el.props {
                    if key.len() > config.max_prop_key_length {
                        return Err(MinimactError::InvalidVNode(
                            format!("Prop key too long: {}", key.len())
                        ));
                    }
                    if value.len() > config.max_prop_value_length {
                        return Err(MinimactError::InvalidVNode(
                            format!("Prop value too long: {}", value.len())
                        ));
                    }
                }

                for child in &el.children {
                    child.validate_content_sizes(config)?;
                }
            }
        }
        Ok(())
    }
}

// FFI function with validation
#[no_mangle]
pub unsafe extern "C" fn minimact_reconcile_with_validation(
    old_json: *const c_char,
    new_json: *const c_char,
    max_depth: usize,
    max_nodes: usize,
) -> *mut c_char {
    let config = ValidationConfig {
        max_tree_depth: max_depth,
        max_node_count: max_nodes,
        ..Default::default()
    };

    // Parse and validate before processing
    let old = parse_and_validate(old_json, &config)?;
    let new = parse_and_validate(new_json, &config)?;

    reconcile(&old, &new)
}
```

**Why Critical:** Prevents DoS attacks. Malicious C# code could crash Rust with deeply nested or huge trees.

**Impact:** Security, stability, predictable resource usage.

---

## 3. Memory Management & Limits 🔴 CRITICAL

**Current Gap:**
```rust
// Predictor can grow forever
patterns.push(PredictionPattern { ... });

// No limit on global HashMap size
static ref PREDICTORS: Mutex<HashMap<usize, Predictor>> = ...;

// No tracking of memory usage
```

**What's Needed:**

```rust
pub struct PredictorConfig {
    pub min_confidence: f32,
    pub max_patterns_per_key: usize,     // ✓ Already have this
    pub max_total_patterns: usize,       // ✗ Need this
    pub max_memory_bytes: usize,         // ✗ Need this
    pub eviction_policy: EvictionPolicy, // ✗ Need this
}

pub enum EvictionPolicy {
    /// Remove least recently used patterns
    LRU,
    /// Remove patterns with lowest observation count
    LeastObserved,
    /// Remove oldest patterns by learning time
    OldestFirst,
    /// Remove patterns with lowest confidence
    LowestConfidence,
}

impl Predictor {
    /// Estimate current memory usage in bytes
    pub fn estimate_memory_usage(&self) -> usize {
        let base = std::mem::size_of::<Self>();
        let patterns_overhead = std::mem::size_of_val(&self.patterns);

        let patterns_size: usize = self.patterns.iter()
            .map(|(key, patterns)| {
                key.len() +
                patterns.capacity() * std::mem::size_of::<PredictionPattern>() +
                patterns.iter().map(|p| p.estimate_size()).sum::<usize>()
            })
            .sum();

        base + patterns_overhead + patterns_size
    }

    /// Enforce memory and pattern limits
    pub fn enforce_limits(&mut self) -> Result<()> {
        // Check memory limit
        let current_memory = self.estimate_memory_usage();
        if current_memory > self.config.max_memory_bytes {
            self.evict_patterns_to_fit()?;
        }

        // Check total pattern limit
        let total_patterns: usize = self.patterns.values().map(|v| v.len()).sum();
        if total_patterns > self.config.max_total_patterns {
            self.evict_excess_patterns()?;
        }

        Ok(())
    }

    /// Evict patterns based on configured policy
    fn evict_patterns_to_fit(&mut self) -> Result<()> {
        match self.config.eviction_policy {
            EvictionPolicy::LeastObserved => {
                self.evict_least_observed()?;
            }
            EvictionPolicy::OldestFirst => {
                self.evict_oldest()?;
            }
            // ... other policies
        }
        Ok(())
    }

    /// Remove patterns with lowest observation counts
    fn evict_least_observed(&mut self) -> Result<()> {
        // Collect all patterns with their scores
        let mut all_patterns: Vec<(String, usize, usize)> = Vec::new();

        for (key, patterns) in &self.patterns {
            for (idx, pattern) in patterns.iter().enumerate() {
                all_patterns.push((
                    key.clone(),
                    idx,
                    pattern.observation_count,
                ));
            }
        }

        // Sort by observation count (ascending)
        all_patterns.sort_by_key(|(_, _, count)| *count);

        // Remove bottom 25%
        let to_remove = all_patterns.len() / 4;
        for (key, idx, _) in all_patterns.iter().take(to_remove) {
            if let Some(patterns) = self.patterns.get_mut(key) {
                patterns.remove(*idx);
                if patterns.is_empty() {
                    self.patterns.remove(key);
                }
            }
        }

        Ok(())
    }

    /// Clear all learned patterns
    pub fn clear(&mut self) {
        self.patterns.clear();
    }

    /// Get statistics about memory usage
    pub fn memory_stats(&self) -> MemoryStats {
        MemoryStats {
            total_bytes: self.estimate_memory_usage(),
            pattern_count: self.patterns.values().map(|v| v.len()).sum(),
            key_count: self.patterns.len(),
            limit_bytes: self.config.max_memory_bytes,
            utilization_percent: (self.estimate_memory_usage() as f32
                / self.config.max_memory_bytes as f32 * 100.0),
        }
    }
}

#[derive(Debug, Clone, Serialize)]
pub struct MemoryStats {
    pub total_bytes: usize,
    pub pattern_count: usize,
    pub key_count: usize,
    pub limit_bytes: usize,
    pub utilization_percent: f32,
}

impl PredictionPattern {
    fn estimate_size(&self) -> usize {
        std::mem::size_of::<Self>() +
        self.state_change_key.len() +
        self.patches.capacity() * std::mem::size_of::<Patch>() +
        self.old_tree.as_ref().map(|t| t.estimate_size()).unwrap_or(0) +
        self.new_tree.as_ref().map(|t| t.estimate_size()).unwrap_or(0)
    }
}

impl VNode {
    fn estimate_size(&self) -> usize {
        match self {
            VNode::Text(text) => {
                std::mem::size_of::<VText>() + text.content.len()
            }
            VNode::Element(el) => {
                std::mem::size_of::<VElement>() +
                el.tag.len() +
                el.key.as_ref().map(|k| k.len()).unwrap_or(0) +
                el.props.iter().map(|(k, v)| k.len() + v.len()).sum::<usize>() +
                el.children.iter().map(|c| c.estimate_size()).sum::<usize>()
            }
        }
    }
}

// FFI exports
#[no_mangle]
pub unsafe extern "C" fn minimact_predictor_memory_stats(
    handle: PredictorHandle,
) -> *mut c_char {
    // Return JSON memory stats
}

#[no_mangle]
pub unsafe extern "C" fn minimact_predictor_clear(
    handle: PredictorHandle,
) -> FfiResult {
    // Clear all patterns
}
```

**Why Critical:** Long-running servers can't have unbounded memory growth. Need predictable resource usage.

**Impact:** Stability, prevents OOM crashes, predictable costs.

---

## 4. Concurrency Safety 🔴 CRITICAL

**Current Gap:**
```rust
lazy_static! {
    static ref PREDICTORS: Mutex<HashMap<usize, Predictor>> = ...;
}

// Every operation locks the ENTIRE map!
let mut predictors = PREDICTORS.lock().unwrap();
if let Some(predictor) = predictors.get_mut(&handle) {
    // All other threads blocked during this operation
}
```

**What's Needed:**

```rust
use dashmap::DashMap;  // Lock-free concurrent hashmap
use parking_lot::RwLock; // Faster RwLock than std

lazy_static! {
    // Each predictor has its own lock
    static ref PREDICTORS: DashMap<usize, Arc<RwLock<Predictor>>> = DashMap::new();
}

#[no_mangle]
pub extern "C" fn minimact_predictor_new() -> PredictorHandle {
    let predictor = Predictor::new();

    unsafe {
        let id = NEXT_PREDICTOR_ID;
        NEXT_PREDICTOR_ID += 1;

        PREDICTORS.insert(id, Arc::new(RwLock::new(predictor)));
        id
    }
}

#[no_mangle]
pub unsafe extern "C" fn minimact_predictor_predict(
    handle: PredictorHandle,
    state_change_json: *const c_char,
    current_tree_json: *const c_char,
) -> *mut c_char {
    // Get reference to specific predictor (no global lock!)
    let predictor_ref = match PREDICTORS.get(&handle) {
        Some(p) => p,
        None => return std::ptr::null_mut(),
    };

    // Read lock only (multiple threads can predict simultaneously)
    let predictor = predictor_ref.read();

    // Parse inputs
    let state_change = parse_state_change(state_change_json)?;
    let tree = parse_vnode(current_tree_json)?;

    // Predict (read-only operation)
    let prediction = predictor.predict(&state_change, &tree)?;

    serialize_to_cstring(&prediction)
}

#[no_mangle]
pub unsafe extern "C" fn minimact_predictor_learn(
    handle: PredictorHandle,
    state_change_json: *const c_char,
    old_tree_json: *const c_char,
    new_tree_json: *const c_char,
) -> FfiResult {
    let predictor_ref = match PREDICTORS.get(&handle) {
        Some(p) => p,
        None => return FfiResult::error("Invalid handle"),
    };

    // Write lock only for learning (exclusive access)
    let mut predictor = predictor_ref.write();

    let state_change = parse_state_change(state_change_json)?;
    let old_tree = parse_vnode(old_tree_json)?;
    let new_tree = parse_vnode(new_tree_json)?;

    predictor.learn(state_change, &old_tree, &new_tree);

    FfiResult::success()
}

// Batch operations for efficiency
#[no_mangle]
pub unsafe extern "C" fn minimact_predictor_learn_batch(
    handle: PredictorHandle,
    batch_json: *const c_char, // Array of learning examples
) -> FfiResult {
    let predictor_ref = PREDICTORS.get(&handle)
        .ok_or(MinimactError::InvalidHandle(handle))?;

    let mut predictor = predictor_ref.write();

    let batch: Vec<LearningExample> = parse_json(batch_json)?;

    for example in batch {
        predictor.learn(example.state_change, &example.old_tree, &example.new_tree);
    }

    FfiResult::success()
}
```

**Why Critical:** High-traffic C# servers have many threads. Global mutex is a bottleneck and defeats Rust's performance.

**Impact:** Scalability, throughput, reduced latency.

---

## 5. Patch Verification 🟡 IMPORTANT

**Current Gap:**
```rust
// Generate patches but can't verify they're valid
pub fn reconcile(old: &VNode, new: &VNode) -> Vec<Patch> { ... }

// No way to check if patch is applicable to a tree
// No way to apply patches (for testing predictions)
```

**What's Needed:**

```rust
impl VNode {
    /// Verify a patch can be applied to this tree
    pub fn can_apply_patch(&self, patch: &Patch) -> Result<()> {
        match patch {
            Patch::UpdateText { path, content } => {
                let node = self.get_node_at_path(path)?;
                match node {
                    VNode::Text(_) => Ok(()),
                    _ => Err(MinimactError::PatchTypeMismatch {
                        expected: "Text",
                        found: node.type_name(),
                    }),
                }
            }

            Patch::Remove { path } => {
                self.get_node_at_path(path)?; // Verify path exists
                Ok(())
            }

            Patch::Replace { path, node } => {
                self.get_node_at_path(path)?;
                node.validate(&ValidationConfig::default())?; // Validate replacement
                Ok(())
            }

            Patch::UpdateProps { path, props } => {
                let node = self.get_node_at_path(path)?;
                match node {
                    VNode::Element(_) => Ok(()),
                    _ => Err(MinimactError::PatchTypeMismatch {
                        expected: "Element",
                        found: node.type_name(),
                    }),
                }
            }

            Patch::Create { path, node } => {
                // Verify parent exists
                if path.is_empty() {
                    return Err(MinimactError::InvalidPatchPath {
                        path: path.clone()
                    });
                }
                let parent_path = &path[..path.len()-1];
                let parent = self.get_node_at_path(parent_path)?;

                match parent {
                    VNode::Element(_) => {
                        node.validate(&ValidationConfig::default())?;
                        Ok(())
                    }
                    _ => Err(MinimactError::PatchTypeMismatch {
                        expected: "Element",
                        found: parent.type_name(),
                    }),
                }
            }

            Patch::ReorderChildren { path, order } => {
                let node = self.get_node_at_path(path)?;
                match node {
                    VNode::Element(el) => {
                        // Verify all keys exist
                        let existing_keys: HashSet<&str> = el.children
                            .iter()
                            .filter_map(|c| c.key())
                            .collect();

                        for key in order {
                            if !existing_keys.contains(key.as_str()) {
                                return Err(MinimactError::InvalidVNode(
                                    format!("Key not found: {}", key)
                                ));
                            }
                        }
                        Ok(())
                    }
                    _ => Err(MinimactError::PatchTypeMismatch {
                        expected: "Element",
                        found: node.type_name(),
                    }),
                }
            }
        }
    }

    /// Apply a single patch to create a new tree
    pub fn apply_patch(&self, patch: &Patch) -> Result<VNode> {
        // Verify first
        self.can_apply_patch(patch)?;

        match patch {
            Patch::UpdateText { path, content } => {
                self.apply_at_path(path, |_| {
                    VNode::text(content.clone())
                })
            }

            Patch::Remove { path } => {
                self.remove_at_path(path)
            }

            Patch::Replace { path, node } => {
                self.apply_at_path(path, |_| node.clone())
            }

            Patch::UpdateProps { path, props } => {
                self.apply_at_path(path, |old| {
                    match old {
                        VNode::Element(mut el) => {
                            el.props = props.clone();
                            VNode::Element(el)
                        }
                        _ => old.clone(),
                    }
                })
            }

            Patch::Create { path, node } => {
                self.insert_at_path(path, node.clone())
            }

            Patch::ReorderChildren { path, order } => {
                self.apply_at_path(path, |old| {
                    match old {
                        VNode::Element(mut el) => {
                            el.reorder_children(order);
                            VNode::Element(el)
                        }
                        _ => old.clone(),
                    }
                })
            }
        }
    }

    /// Apply multiple patches in sequence
    pub fn apply_patches(&self, patches: &[Patch]) -> Result<VNode> {
        let mut current = self.clone();
        for patch in patches {
            current = current.apply_patch(patch)?;
        }
        Ok(current)
    }

    /// Get node at a specific path
    fn get_node_at_path(&self, path: &[usize]) -> Result<&VNode> {
        if path.is_empty() {
            return Ok(self);
        }

        match self {
            VNode::Element(el) => {
                let idx = path[0];
                let child = el.children.get(idx)
                    .ok_or(MinimactError::InvalidPatchPath {
                        path: path.to_vec()
                    })?;
                child.get_node_at_path(&path[1..])
            }
            VNode::Text(_) => {
                Err(MinimactError::InvalidPatchPath {
                    path: path.to_vec()
                })
            }
        }
    }

    fn type_name(&self) -> &'static str {
        match self {
            VNode::Element(_) => "Element",
            VNode::Text(_) => "Text",
        }
    }
}

// FFI exports for verification
#[no_mangle]
pub unsafe extern "C" fn minimact_verify_patch(
    tree_json: *const c_char,
    patch_json: *const c_char,
) -> FfiResult {
    let tree = parse_vnode(tree_json)?;
    let patch = parse_patch(patch_json)?;

    match tree.can_apply_patch(&patch) {
        Ok(()) => FfiResult::success(),
        Err(e) => FfiResult::error(&e.to_string()),
    }
}

#[no_mangle]
pub unsafe extern "C" fn minimact_apply_patches(
    tree_json: *const c_char,
    patches_json: *const c_char,
) -> *mut c_char {
    let tree = parse_vnode(tree_json)?;
    let patches = parse_patches(patches_json)?;

    let result = tree.apply_patches(&patches)?;
    serialize_to_cstring(&result)
}
```

**Why Important:** Need to verify predictions are valid. Useful for testing and debugging.

**Impact:** Quality assurance, debugging, prediction accuracy measurement.

---

## 6. Logging & Diagnostics 🟡 IMPORTANT

**Current Gap:**
```rust
// No logging, hard to debug production issues
if let Some(predictor) = predictors.get(&handle) {
    // What happened? When? Who knows!
}

// Silent failures
return std::ptr::null_mut(); // Why? No idea!
```

**What's Needed:**

```rust
use tracing::{info, warn, error, debug, trace, instrument};

// Initialize logging
pub fn init_logging(level: LogLevel) {
    tracing_subscriber::fmt()
        .with_max_level(level.to_tracing_level())
        .init();
}

pub enum LogLevel {
    Trace,
    Debug,
    Info,
    Warn,
    Error,
}

#[instrument(skip(predictor))]
pub fn reconcile(old: &VNode, new: &VNode) -> Result<Vec<Patch>> {
    debug!(
        old_type = old.type_name(),
        new_type = new.type_name(),
        "Starting reconciliation"
    );

    let patches = reconcile_node(old, new, &mut vec![], &mut Vec::new())?;

    info!(
        patch_count = patches.len(),
        "Reconciliation complete"
    );

    Ok(patches)
}

impl Predictor {
    #[instrument(skip(self, current_tree))]
    pub fn predict(
        &self,
        state_change: &StateChange,
        current_tree: &VNode,
    ) -> Result<Option<Prediction>> {
        debug!(
            component_id = %state_change.component_id,
            state_key = %state_change.state_key,
            "Prediction requested"
        );

        let pattern_key = self.make_pattern_key(state_change);

        let patterns = match self.patterns.get(&pattern_key) {
            Some(p) => p,
            None => {
                debug!("No patterns found for key: {}", pattern_key);
                return Ok(None);
            }
        };

        let best_pattern = patterns.iter()
            .max_by_key(|p| p.observation_count)
            .unwrap();

        let total_observations: usize = patterns.iter()
            .map(|p| p.observation_count)
            .sum();

        let confidence = best_pattern.observation_count as f32
            / total_observations as f32;

        trace!(
            confidence = %confidence,
            observation_count = best_pattern.observation_count,
            total_observations = total_observations,
            "Calculated confidence"
        );

        if confidence < self.config.min_confidence {
            warn!(
                confidence = %confidence,
                min_confidence = %self.config.min_confidence,
                "Confidence below threshold"
            );
            return Ok(None);
        }

        let predicted_patches = self.adapt_patches(&best_pattern.patches, current_tree);

        info!(
            confidence = %confidence,
            patch_count = predicted_patches.len(),
            "Prediction generated"
        );

        Ok(Some(Prediction {
            state_change: state_change.clone(),
            predicted_patches,
            confidence,
            predicted_tree: best_pattern.new_tree.clone(),
        }))
    }

    #[instrument(skip(self, old_tree, new_tree))]
    pub fn learn(
        &mut self,
        state_change: StateChange,
        old_tree: &VNode,
        new_tree: &VNode,
    ) -> Result<()> {
        debug!(
            component_id = %state_change.component_id,
            state_key = %state_change.state_key,
            "Learning pattern"
        );

        let patches = reconcile(old_tree, new_tree)?;

        info!(
            patch_count = patches.len(),
            "Pattern learned"
        );

        // ... rest of learn logic

        Ok(())
    }
}

// FFI logging control
#[no_mangle]
pub unsafe extern "C" fn minimact_set_log_level(level: i32) {
    let log_level = match level {
        0 => LogLevel::Error,
        1 => LogLevel::Warn,
        2 => LogLevel::Info,
        3 => LogLevel::Debug,
        4 => LogLevel::Trace,
        _ => LogLevel::Info,
    };

    init_logging(log_level);
}

// Structured event logging for C# consumption
#[derive(Debug, Serialize)]
pub struct LogEvent {
    pub timestamp: SystemTime,
    pub level: String,
    pub message: String,
    pub component_id: Option<String>,
    pub state_key: Option<String>,
    pub confidence: Option<f32>,
}

static LOG_EVENTS: Mutex<VecDeque<LogEvent>> = Mutex::new(VecDeque::new());

#[no_mangle]
pub unsafe extern "C" fn minimact_get_log_events(
    max_events: usize,
) -> *mut c_char {
    let mut events = LOG_EVENTS.lock().unwrap();
    let to_return: Vec<LogEvent> = events.drain(..max_events.min(events.len())).collect();
    serialize_to_cstring(&to_return)
}
```

**Why Important:** Production debugging requires visibility. C# developers need to see what's happening in Rust.

**Impact:** Debuggability, observability, faster issue resolution.

---

## 7. Serialization Safety 🟡 IMPORTANT

**Current Gap:**
```rust
let old_node: VNode = serde_json::from_str(old_str)?;
// What if JSON is malformed?
// What if JSON is 1GB?
// What if JSON has deeply nested objects?
```

**What's Needed:**

```rust
pub struct DeserializeConfig {
    pub max_json_size: usize,        // Default: 1MB
    pub max_recursion_depth: usize,  // Default: 100
}

impl Default for DeserializeConfig {
    fn default() -> Self {
        Self {
            max_json_size: 1024 * 1024, // 1MB
            max_recursion_depth: 100,
        }
    }
}

pub fn deserialize_vnode_safe(
    json: &str,
    config: &DeserializeConfig,
) -> Result<VNode> {
    // Check size first
    if json.len() > config.max_json_size {
        return Err(MinimactError::JsonTooLarge {
            size: json.len(),
            max: config.max_json_size
        });
    }

    // Use streaming deserializer with depth limit
    let mut deserializer = serde_json::Deserializer::from_str(json);
    deserializer.disable_recursion_limit();

    // Deserialize with custom visitor that checks depth
    let node = VNode::deserialize(&mut deserializer)
        .map_err(|e| MinimactError::Serialization(e))?;

    // Validate after deserialization
    let validation_config = ValidationConfig {
        max_tree_depth: config.max_recursion_depth,
        ..Default::default()
    };
    node.validate(&validation_config)?;

    Ok(node)
}

pub fn serialize_vnode_safe(node: &VNode) -> Result<String> {
    // Could add size estimation before serializing
    let estimated_size = node.estimate_size();
    if estimated_size > 10 * 1024 * 1024 {
        warn!(
            estimated_size = estimated_size,
            "Serializing very large VNode"
        );
    }

    serde_json::to_string(node)
        .map_err(|e| MinimactError::Serialization(e))
}

// FFI with limits
#[no_mangle]
pub unsafe extern "C" fn minimact_reconcile_safe(
    old_json: *const c_char,
    new_json: *const c_char,
    max_json_size: usize,
) -> *mut c_char {
    let config = DeserializeConfig {
        max_json_size,
        ..Default::default()
    };

    let old_str = cstr_to_str(old_json)?;
    let new_str = cstr_to_str(new_json)?;

    let old = deserialize_vnode_safe(old_str, &config)?;
    let new = deserialize_vnode_safe(new_str, &config)?;

    let patches = reconcile(&old, &new)?;

    let json = serialize_vnode_safe(&patches)?;
    CString::new(json).unwrap().into_raw()
}
```

**Why Important:** Prevent memory exhaustion from huge payloads. Prevent stack overflow from deep nesting.

**Impact:** Security, stability, DoS prevention.

---

## 8. Metrics & Observability 🟡 IMPORTANT

**Current Gap:**
```rust
// No way to measure performance or accuracy
pub fn predict(...) -> Option<Prediction> { ... }

// No telemetry, no monitoring
```

**What's Needed:**

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PredictorMetrics {
    // Prediction metrics
    pub predictions_made: u64,
    pub predictions_returned: u64,           // Non-None results
    pub predictions_high_confidence: u64,    // confidence > 0.9
    pub avg_confidence: f32,

    // Learning metrics
    pub patterns_learned: u64,
    pub total_pattern_count: usize,
    pub unique_state_keys: usize,

    // Performance metrics
    pub avg_prediction_time_ns: u64,
    pub avg_learning_time_ns: u64,
    pub avg_reconcile_time_ns: u64,

    // Memory metrics
    pub memory_usage_bytes: usize,
    pub memory_limit_bytes: usize,
    pub memory_utilization_percent: f32,

    // Accuracy metrics (if verification enabled)
    pub predictions_verified: u64,
    pub predictions_correct: u64,
    pub accuracy_percent: f32,
}

impl Predictor {
    pub fn metrics(&self) -> PredictorMetrics {
        let memory_usage = self.estimate_memory_usage();

        PredictorMetrics {
            predictions_made: self.stats.predictions_made,
            predictions_returned: self.stats.predictions_returned,
            predictions_high_confidence: self.stats.high_confidence_count,
            avg_confidence: self.stats.avg_confidence(),

            patterns_learned: self.stats.patterns_learned,
            total_pattern_count: self.patterns.values().map(|v| v.len()).sum(),
            unique_state_keys: self.patterns.len(),

            avg_prediction_time_ns: self.stats.avg_prediction_time(),
            avg_learning_time_ns: self.stats.avg_learning_time(),
            avg_reconcile_time_ns: self.stats.avg_reconcile_time(),

            memory_usage_bytes: memory_usage,
            memory_limit_bytes: self.config.max_memory_bytes,
            memory_utilization_percent: (memory_usage as f32
                / self.config.max_memory_bytes as f32 * 100.0),

            predictions_verified: self.stats.verifications,
            predictions_correct: self.stats.correct_predictions,
            accuracy_percent: self.stats.accuracy_percent(),
        }
    }

    pub fn reset_metrics(&mut self) {
        self.stats = PredictorStats::default();
    }
}

#[derive(Default)]
struct PredictorStats {
    predictions_made: u64,
    predictions_returned: u64,
    high_confidence_count: u64,
    confidence_sum: f64,

    patterns_learned: u64,

    prediction_times: Vec<Duration>,
    learning_times: Vec<Duration>,
    reconcile_times: Vec<Duration>,

    verifications: u64,
    correct_predictions: u64,
}

impl PredictorStats {
    fn avg_confidence(&self) -> f32 {
        if self.predictions_returned == 0 {
            0.0
        } else {
            (self.confidence_sum / self.predictions_returned as f64) as f32
        }
    }

    fn avg_prediction_time(&self) -> u64 {
        if self.prediction_times.is_empty() {
            0
        } else {
            let sum: Duration = self.prediction_times.iter().sum();
            (sum.as_nanos() / self.prediction_times.len() as u128) as u64
        }
    }

    fn accuracy_percent(&self) -> f32 {
        if self.verifications == 0 {
            0.0
        } else {
            (self.correct_predictions as f32 / self.verifications as f32) * 100.0
        }
    }
}

// FFI exports
#[no_mangle]
pub unsafe extern "C" fn minimact_predictor_metrics(
    handle: PredictorHandle,
) -> *mut c_char {
    let predictor_ref = PREDICTORS.get(&handle)
        .ok_or(MinimactError::InvalidHandle(handle))?;

    let predictor = predictor_ref.read();
    let metrics = predictor.metrics();

    serialize_to_cstring(&metrics)
}

#[no_mangle]
pub unsafe extern "C" fn minimact_predictor_reset_metrics(
    handle: PredictorHandle,
) -> FfiResult {
    let predictor_ref = PREDICTORS.get(&handle)
        .ok_or(MinimactError::InvalidHandle(handle))?;

    let mut predictor = predictor_ref.write();
    predictor.reset_metrics();

    FfiResult::success()
}

// Global metrics across all predictors
#[no_mangle]
pub unsafe extern "C" fn minimact_global_metrics() -> *mut c_char {
    let global_metrics = GlobalMetrics {
        predictor_count: PREDICTORS.len(),
        total_memory_bytes: PREDICTORS.iter()
            .map(|entry| entry.read().estimate_memory_usage())
            .sum(),
        // Aggregate other metrics...
    };

    serialize_to_cstring(&global_metrics)
}
```

**Why Important:** C# needs to monitor predictor health, track accuracy, and optimize performance.

**Impact:** Observability, performance tuning, production monitoring.

---

## 9. Persistence 🟢 NICE TO HAVE

**Current Gap:**
```rust
// All learning is lost when process dies
impl Predictor {
    pub fn new() -> Self { ... }
}
```

**What's Needed:**

```rust
use bincode;

impl Predictor {
    /// Serialize predictor state to bytes
    pub fn serialize(&self) -> Result<Vec<u8>> {
        bincode::serialize(&self.patterns)
            .map_err(|e| MinimactError::Persistence(e.to_string()))
    }

    /// Deserialize predictor state from bytes
    pub fn deserialize(bytes: &[u8], config: PredictorConfig) -> Result<Self> {
        let patterns = bincode::deserialize(bytes)
            .map_err(|e| MinimactError::Persistence(e.to_string()))?;

        Ok(Self {
            patterns,
            config,
            stats: Default::default(),
        })
    }

    /// Export patterns as JSON for debugging/inspection
    pub fn export_patterns_json(&self) -> Result<String> {
        serde_json::to_string_pretty(&self.patterns)
            .map_err(|e| MinimactError::Serialization(e))
    }

    /// Import patterns from JSON
    pub fn import_patterns_json(&mut self, json: &str) -> Result<()> {
        let patterns = serde_json::from_str(json)
            .map_err(|e| MinimactError::Serialization(e))?;
        self.patterns = patterns;
        Ok(())
    }
}

// Make PredictionPattern serializable
#[derive(Debug, Clone, Serialize, Deserialize)]
struct PredictionPattern {
    state_change_key: String,
    patches: Vec<Patch>,
    observation_count: usize,
    old_tree: Option<VNode>,
    new_tree: Option<VNode>,
}

// FFI exports
#[no_mangle]
pub unsafe extern "C" fn minimact_predictor_serialize(
    handle: PredictorHandle,
    out_len: *mut usize,
) -> *mut u8 {
    let predictor_ref = PREDICTORS.get(&handle)
        .ok_or(MinimactError::InvalidHandle(handle))?;

    let predictor = predictor_ref.read();
    let bytes = predictor.serialize()?;

    *out_len = bytes.len();

    // Allocate and return bytes
    let ptr = libc::malloc(bytes.len()) as *mut u8;
    std::ptr::copy_nonoverlapping(bytes.as_ptr(), ptr, bytes.len());
    ptr
}

#[no_mangle]
pub unsafe extern "C" fn minimact_predictor_deserialize(
    bytes: *const u8,
    len: usize,
    min_confidence: f32,
    max_patterns: usize,
) -> PredictorHandle {
    let slice = std::slice::from_raw_parts(bytes, len);

    let config = PredictorConfig {
        min_confidence,
        max_patterns_per_key: max_patterns,
        ..Default::default()
    };

    let predictor = Predictor::deserialize(slice, config)?;

    let id = NEXT_PREDICTOR_ID;
    NEXT_PREDICTOR_ID += 1;

    PREDICTORS.insert(id, Arc::new(RwLock::new(predictor)));
    id
}

#[no_mangle]
pub unsafe extern "C" fn minimact_free_bytes(ptr: *mut u8) {
    if !ptr.is_null() {
        libc::free(ptr as *mut libc::c_void);
    }
}
```

**Why Nice to Have:** C# can save predictor state to Redis/database and restore on server restart. Preserves learning.

**Impact:** Better cold-start performance, preserved learning across deployments.

---

## 10. Testing Infrastructure 🟢 NICE TO HAVE

**Current Gap:**
```rust
// Only 10 basic unit tests
#[test]
fn test_text_update() { ... }

// No property testing
// No fuzzing
// No comprehensive benchmarks
```

**What's Needed:**

```rust
// Add proptest dependency
use proptest::prelude::*;

// Generate arbitrary VNodes for testing
fn arb_vnode() -> impl Strategy<Value = VNode> {
    let leaf = prop_oneof![
        any::<String>().prop_map(VNode::text),
    ];

    leaf.prop_recursive(
        8,    // Max depth
        256,  // Max nodes
        10,   // Items per collection
        |inner| {
            (
                any::<String>(),
                prop::collection::hash_map(any::<String>(), any::<String>(), 0..5),
                prop::collection::vec(inner, 0..5),
            ).prop_map(|(tag, props, children)| {
                VNode::element(tag, props, children)
            })
        },
    )
}

// Property-based tests
proptest! {
    #[test]
    fn reconcile_never_panics(
        old in arb_vnode(),
        new in arb_vnode()
    ) {
        let result = std::panic::catch_unwind(|| {
            reconcile(&old, &new)
        });
        prop_assert!(result.is_ok());
    }

    #[test]
    fn reconcile_produces_valid_patches(
        old in arb_vnode(),
        new in arb_vnode()
    ) {
        let patches = reconcile(&old, &new)?;

        for patch in &patches {
            prop_assert!(old.can_apply_patch(patch).is_ok());
        }
    }

    #[test]
    fn applying_patches_reaches_new_tree(
        old in arb_vnode(),
        new in arb_vnode()
    ) {
        let patches = reconcile(&old, &new)?;
        let result = old.apply_patches(&patches)?;
        prop_assert_eq!(result, new);
    }

    #[test]
    fn predictor_never_panics(
        state_change in arb_state_change(),
        old in arb_vnode(),
        new in arb_vnode(),
    ) {
        let mut predictor = Predictor::new();

        let result = std::panic::catch_unwind(|| {
            predictor.learn(state_change.clone(), &old, &new);
            predictor.predict(&state_change, &old)
        });

        prop_assert!(result.is_ok());
    }
}

// Fuzzing (requires cargo-fuzz)
#[cfg(fuzzing)]
pub fn fuzz_reconcile(data: &[u8]) {
    if let Ok(s) = std::str::from_utf8(data) {
        if let (Ok(old), Ok(new)) = (
            serde_json::from_str::<VNode>(s),
            serde_json::from_str::<VNode>(s),
        ) {
            let _ = reconcile(&old, &new);
        }
    }
}

// Comprehensive benchmarks
mod benches {
    use criterion::{black_box, criterion_group, criterion_main, Criterion, BenchmarkId};

    fn bench_reconcile_by_size(c: &mut Criterion) {
        let mut group = c.benchmark_group("reconcile_by_tree_size");

        for size in [10, 100, 1000, 10000].iter() {
            let tree = create_tree_with_nodes(*size);
            let modified = modify_tree(&tree, 10);

            group.bench_with_input(
                BenchmarkId::from_parameter(size),
                size,
                |b, _| {
                    b.iter(|| reconcile(black_box(&tree), black_box(&modified)));
                },
            );
        }

        group.finish();
    }

    fn bench_predictor_scaling(c: &mut Criterion) {
        let mut group = c.benchmark_group("predictor_pattern_count");

        for pattern_count in [10, 100, 1000, 10000].iter() {
            let predictor = create_predictor_with_patterns(*pattern_count);
            let state_change = sample_state_change();
            let tree = sample_tree();

            group.bench_with_input(
                BenchmarkId::from_parameter(pattern_count),
                pattern_count,
                |b, _| {
                    b.iter(|| predictor.predict(black_box(&state_change), black_box(&tree)));
                },
            );
        }

        group.finish();
    }

    criterion_group!(benches, bench_reconcile_by_size, bench_predictor_scaling);
    criterion_main!(benches);
}
```

**Why Nice to Have:** Confidence in correctness. Find edge cases. Prevent regressions.

**Impact:** Code quality, reliability, fewer production bugs.

---

## Priority Ranking Summary

### 🔴 CRITICAL (Must Fix for Production):

1. **Error Handling** - Return `Result<T>` everywhere, not panics
2. **Input Validation** - Prevent DoS with malicious trees
3. **Memory Limits** - Enforce bounds, eviction policies
4. **Concurrency Safety** - Per-predictor locks, not global mutex

**Estimated Effort:** 2-3 days
**Risk if Skipped:** Crashes, DoS vulnerabilities, poor scalability

---

### 🟡 IMPORTANT (Should Add Before Production):

5. **Patch Verification** - Validate patches before applying
6. **Logging** - Structured logging for debugging
7. **Serialization Safety** - Size limits on JSON
8. **Metrics** - Telemetry for monitoring

**Estimated Effort:** 2-3 days
**Risk if Skipped:** Hard to debug, can't monitor, poor observability

---

### 🟢 NICE TO HAVE (Enhances Production Experience):

9. **Persistence** - Save/load predictor state
10. **Testing Infrastructure** - Property tests, fuzzing

**Estimated Effort:** 1-2 days
**Risk if Skipped:** Cold starts, potential undiscovered bugs

---

## Total Effort Estimate

- **Critical items**: ~2-3 days
- **Important items**: ~2-3 days
- **Nice to have**: ~1-2 days

**Total for production-ready**: ~5-8 days of development

---

## Next Steps

To make this library production-ready, I recommend implementing in this order:

1. **Day 1-2**: Error handling + Input validation
2. **Day 3**: Memory limits + Concurrency fixes
3. **Day 4**: Patch verification + Serialization safety
4. **Day 5**: Logging + Metrics
5. **Day 6-7** (optional): Persistence + Testing

Would you like me to implement any of these improvements?
