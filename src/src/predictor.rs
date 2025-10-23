use crate::vdom::{VNode, Patch};
use crate::reconciler::reconcile;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Represents a change to component state
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StateChange {
    /// Component identifier
    pub component_id: String,
    /// State key that changed
    pub state_key: String,
    /// Old value (JSON serialized)
    pub old_value: serde_json::Value,
    /// New value (JSON serialized)
    pub new_value: serde_json::Value,
}

/// Pattern type detected from state changes
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum PatternType {
    /// Numeric increment (e.g., 0→1, 1→2, 2→3)
    NumericIncrement,
    /// Numeric decrement (e.g., 5→4, 4→3, 3→2)
    NumericDecrement,
    /// Boolean toggle (true↔false)
    BooleanToggle,
    /// String/object change (no pattern)
    Literal,
}

/// Represents a prediction of how a state change will affect the DOM
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Prediction {
    /// The state change that triggers this prediction
    pub state_change: StateChange,
    /// Predicted patches to the DOM
    pub predicted_patches: Vec<Patch>,
    /// Confidence score (0.0 to 1.0)
    pub confidence: f32,
    /// The predicted new VNode tree (optional, for validation)
    pub predicted_tree: Option<VNode>,
}

/// The predictor engine that learns patterns and makes predictions
#[derive(Serialize, Deserialize)]
pub struct Predictor {
    /// Historical patterns: maps state changes to observed patches
    patterns: HashMap<String, Vec<PredictionPattern>>,
    /// Configuration
    config: PredictorConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct PredictionPattern {
    /// The state change pattern
    #[allow(dead_code)]
    state_change_key: String,
    /// Detected pattern type
    pattern_type: PatternType,
    /// The observed patches
    patches: Vec<Patch>,
    /// Number of times this pattern was observed
    observation_count: usize,
    /// Last VNode tree before the change
    old_tree: Option<VNode>,
    /// Last VNode tree after the change
    new_tree: Option<VNode>,
    /// Seconds since pattern was last accessed (serialized from Instant)
    #[serde(skip, default = "std::time::Instant::now")]
    last_accessed: std::time::Instant,
    /// Seconds since pattern was created (serialized from Instant)
    #[serde(skip, default = "std::time::Instant::now")]
    created_at: std::time::Instant,
    /// Number of predictions made using this pattern
    predictions_made: usize,
    /// Number of correct predictions
    predictions_correct: usize,
    /// Number of incorrect predictions
    predictions_incorrect: usize,
}

impl PredictionPattern {
    /// Calculate hit rate for this pattern
    fn hit_rate(&self) -> f32 {
        if self.predictions_made == 0 {
            return 0.0;
        }
        self.predictions_correct as f32 / self.predictions_made as f32
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PredictorConfig {
    /// Minimum confidence threshold to send predictions
    pub min_confidence: f32,
    /// Maximum number of patterns to track per state key
    pub max_patterns_per_key: usize,
    /// Whether to use ML-based prediction (future enhancement)
    pub use_ml: bool,
    /// Maximum number of unique state keys to track
    pub max_state_keys: usize,
    /// Maximum total memory usage in bytes (approximate)
    pub max_memory_bytes: usize,
    /// Eviction policy when limits are reached
    pub eviction_policy: EvictionPolicy,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum EvictionPolicy {
    /// Remove least recently used patterns
    LeastRecentlyUsed,
    /// Remove least frequently observed patterns
    LeastFrequentlyUsed,
    /// Remove oldest patterns first
    OldestFirst,
}

impl Default for PredictorConfig {
    fn default() -> Self {
        Self {
            min_confidence: 0.7,
            max_patterns_per_key: 100,
            use_ml: false,
            max_state_keys: 1000,
            max_memory_bytes: 100 * 1024 * 1024, // 100 MB
            eviction_policy: EvictionPolicy::LeastFrequentlyUsed,
        }
    }
}

impl Predictor {
    /// Create a new predictor with default config
    pub fn new() -> Self {
        Self::with_config(PredictorConfig::default())
    }

    /// Create a new predictor with custom config
    pub fn with_config(config: PredictorConfig) -> Self {
        Self {
            patterns: HashMap::new(),
            config,
        }
    }

    /// Detect pattern type from state change
    fn detect_pattern_type(state_change: &StateChange) -> PatternType {
        use serde_json::Value;

        match (&state_change.old_value, &state_change.new_value) {
            // Boolean toggle
            (Value::Bool(old), Value::Bool(new)) if old != new => PatternType::BooleanToggle,

            // Numeric increment
            (Value::Number(old), Value::Number(new)) => {
                if let (Some(old_val), Some(new_val)) = (old.as_f64(), new.as_f64()) {
                    if new_val > old_val {
                        PatternType::NumericIncrement
                    } else if new_val < old_val {
                        PatternType::NumericDecrement
                    } else {
                        PatternType::Literal
                    }
                } else {
                    PatternType::Literal
                }
            }

            // Everything else is literal
            _ => PatternType::Literal,
        }
    }

    /// Check if a state change matches a pattern type
    fn matches_pattern_type(state_change: &StateChange, pattern_type: PatternType) -> bool {
        Self::detect_pattern_type(state_change) == pattern_type
    }

    /// Save predictor state to JSON string
    pub fn save_to_json(&self) -> crate::error::Result<String> {
        serde_json::to_string_pretty(self)
            .map_err(|e| crate::error::MinimactError::Serialization(
                format!("Failed to serialize predictor: {}", e)
            ))
    }

    /// Load predictor state from JSON string
    pub fn load_from_json(json: &str) -> crate::error::Result<Self> {
        let mut predictor: Predictor = serde_json::from_str(json)
            .map_err(|e| crate::error::MinimactError::Serialization(
                format!("Failed to deserialize predictor: {}", e)
            ))?;

        // Reset Instant fields to current time since they can't be serialized
        let now = std::time::Instant::now();
        for patterns in predictor.patterns.values_mut() {
            for pattern in patterns.iter_mut() {
                pattern.last_accessed = now;
                pattern.created_at = now;
            }
        }

        Ok(predictor)
    }

    /// Learn from an observed state change and its resulting patches
    pub fn learn(&mut self, state_change: StateChange, old_tree: &VNode, new_tree: &VNode) -> crate::error::Result<()> {
        crate::log_debug!("Learning pattern for {}::{}", state_change.component_id, state_change.state_key);

        let patches = match reconcile(old_tree, new_tree) {
            Ok(p) => p,
            Err(e) => {
                crate::metrics::METRICS.record_learn(true);
                return Err(e);
            }
        };
        let pattern_key = self.make_pattern_key(&state_change);

        // Check memory limits before adding new patterns
        self.enforce_memory_limits()?;

        let patterns = self.patterns.entry(pattern_key.clone()).or_insert_with(Vec::new);

        // Detect pattern type
        let pattern_type = Self::detect_pattern_type(&state_change);

        // Try to find existing similar pattern OF THE SAME TYPE
        let existing_idx = patterns.iter().position(|p| {
            p.pattern_type == pattern_type &&
            p.patches.len() == patches.len() &&
            p.patches.iter().zip(patches.iter()).all(|(p1, p2)| {
                std::mem::discriminant(p1) == std::mem::discriminant(p2)
            })
        });

        let now = std::time::Instant::now();

        if let Some(idx) = existing_idx {
            // Increment observation count for this pattern
            patterns[idx].observation_count += 1;
            patterns[idx].old_tree = Some(old_tree.clone());
            patterns[idx].new_tree = Some(new_tree.clone());
            patterns[idx].last_accessed = now;
        } else {
            // Add new pattern
            patterns.push(PredictionPattern {
                state_change_key: pattern_key.clone(),
                pattern_type,
                patches: patches.clone(),
                observation_count: 1,
                old_tree: Some(old_tree.clone()),
                new_tree: Some(new_tree.clone()),
                last_accessed: now,
                created_at: now,
                predictions_made: 0,
                predictions_correct: 0,
                predictions_incorrect: 0,
            });

            // Limit number of patterns per key
            if patterns.len() > self.config.max_patterns_per_key {
                // Evict patterns in-place
                match self.config.eviction_policy {
                    EvictionPolicy::LeastFrequentlyUsed => {
                        patterns.sort_by_key(|p| std::cmp::Reverse(p.observation_count));
                    }
                    EvictionPolicy::LeastRecentlyUsed => {
                        patterns.sort_by_key(|p| std::cmp::Reverse(p.last_accessed));
                    }
                    EvictionPolicy::OldestFirst => {
                        patterns.sort_by_key(|p| std::cmp::Reverse(p.created_at));
                    }
                }
                patterns.truncate(self.config.max_patterns_per_key);
            }
        }

        crate::metrics::METRICS.record_learn(false);
        Ok(())
    }

    /// Pre-compute patches for a hinted state change (for usePredictHint)
    /// This allows developers to explicitly tell the predictor what might happen next
    pub fn predict_hint(
        &mut self,
        hint_id: &str,
        component_id: &str,
        state_changes: Vec<StateChange>,
        current_tree: &VNode
    ) -> Option<Prediction> {
        crate::log_info!("Processing hint '{}' for component {}", hint_id, component_id);

        // For now, handle single state change hints
        // Future: support multiple simultaneous state changes
        if state_changes.len() != 1 {
            crate::log_warn!("Multi-state hints not yet supported");
            return None;
        }

        let state_change = &state_changes[0];

        // Use the same prediction logic, but mark it as a hint
        let mut prediction = self.predict(state_change, current_tree)?;

        // Add hint metadata
        crate::log_info!("Hint '{}' predicted {} patches with {:.2} confidence",
                        hint_id, prediction.predicted_patches.len(), prediction.confidence);

        Some(prediction)
    }

    /// Predict patches for a given state change
    pub fn predict(&mut self, state_change: &StateChange, current_tree: &VNode) -> Option<Prediction> {
        let start = std::time::Instant::now();
        let pattern_key = self.make_pattern_key(state_change);

        // Detect pattern type for this state change
        let requested_pattern_type = Self::detect_pattern_type(state_change);

        // Try learned patterns first
        if let Some(patterns) = self.patterns.get_mut(&pattern_key) {
            crate::log_debug!("Predicting for {}::{}, found {} patterns, looking for {:?}",
                             state_change.component_id, state_change.state_key, patterns.len(), requested_pattern_type);

            // Find patterns matching the requested type
            let matching_indices: Vec<usize> = patterns.iter()
                .enumerate()
                .filter(|(_, p)| p.pattern_type == requested_pattern_type)
                .map(|(idx, _)| idx)
                .collect();

            if !matching_indices.is_empty() {
                // Find the most observed pattern of the matching type
                let best_idx = *matching_indices.iter()
                    .max_by_key(|&&idx| patterns[idx].observation_count)?;

                // Calculate confidence based on observation frequency
                let total_observations: usize = matching_indices.iter()
                    .map(|&idx| patterns[idx].observation_count)
                    .sum();
                let confidence = patterns[best_idx].observation_count as f32 / total_observations as f32;

                if confidence >= self.config.min_confidence {
                    crate::log_info!("Learned prediction with confidence {:.2} ({} observations)",
                                    confidence, patterns[best_idx].observation_count);

                    patterns[best_idx].predictions_made += 1;

                    let predicted_patches = Self::adapt_patches(&patterns[best_idx].patches, current_tree);
                    let predicted_tree = patterns[best_idx].new_tree.clone();

                    crate::metrics::METRICS.record_prediction(start.elapsed(), true);

                    return Some(Prediction {
                        state_change: state_change.clone(),
                        predicted_patches,
                        confidence,
                        predicted_tree,
                    });
                }
            }
        }

        // No learned patterns or low confidence - try built-in pattern prediction
        crate::log_debug!("No learned patterns, trying built-in prediction for {:?}", requested_pattern_type);
        let builtin_prediction = Self::predict_builtin_pattern(state_change, current_tree, requested_pattern_type);

        if builtin_prediction.is_some() {
            crate::metrics::METRICS.record_prediction(start.elapsed(), true);
        } else {
            crate::metrics::METRICS.record_prediction(start.elapsed(), false);
        }

        builtin_prediction
    }

    /// Predict patches using built-in knowledge of common patterns
    /// This allows instant predictions for simple cases without needing to learn first
    fn predict_builtin_pattern(
        state_change: &StateChange,
        current_tree: &VNode,
        pattern_type: PatternType
    ) -> Option<Prediction> {
        use serde_json::Value;

        match pattern_type {
            PatternType::NumericIncrement | PatternType::NumericDecrement => {
                // Predict text content will change to show new number
                if let Value::Number(new_val) = &state_change.new_value {
                    let new_text = new_val.to_string();

                    // Try to find text nodes in the tree that might contain the old value
                    if let Some(patches) = Self::find_and_replace_number_text(current_tree, state_change, &new_text) {
                        crate::log_info!("Built-in prediction for {:?}: {} patch(es)", pattern_type, patches.len());
                        return Some(Prediction {
                            state_change: state_change.clone(),
                            predicted_patches: patches,
                            confidence: 0.85, // High confidence for simple numeric changes
                            predicted_tree: None,
                        });
                    }
                }
            }
            PatternType::BooleanToggle => {
                // Predict checkbox checked state or class changes
                crate::log_info!("Built-in prediction for BooleanToggle (simplified)");
                // For now, return None - would need more context to predict boolean changes
                // Future: analyze tree for checkboxes, conditional classes, etc.
            }
            PatternType::Literal => {
                // No built-in prediction for arbitrary changes
            }
        }

        None
    }

    /// Find text nodes containing the old value and predict UpdateText patches
    fn find_and_replace_number_text(
        tree: &VNode,
        state_change: &StateChange,
        new_text: &str
    ) -> Option<Vec<Patch>> {
        use serde_json::Value;

        let old_text = if let Value::Number(old_val) = &state_change.old_value {
            old_val.to_string()
        } else {
            return None;
        };

        let mut patches = Vec::new();
        Self::find_text_patches_recursive(tree, &old_text, new_text, &mut Vec::new(), &mut patches);

        if patches.is_empty() {
            None
        } else {
            Some(patches)
        }
    }

    /// Recursively search tree for text nodes containing the old value
    fn find_text_patches_recursive(
        node: &VNode,
        old_text: &str,
        new_text: &str,
        path: &mut Vec<usize>,
        patches: &mut Vec<Patch>
    ) {
        match node {
            VNode::Text(text_node) => {
                // Check if text contains the old value
                if text_node.content.contains(old_text) {
                    // Replace old value with new value in the text
                    let new_content = text_node.content.replace(old_text, new_text);
                    patches.push(Patch::UpdateText {
                        path: path.clone(),
                        content: new_content,
                    });
                }
            }
            VNode::Element(element) => {
                // Recursively check children
                for (i, child) in element.children.iter().enumerate() {
                    path.push(i);
                    Self::find_text_patches_recursive(child, old_text, new_text, path, patches);
                    path.pop();
                }
            }
        }
    }

    /// Verify if a prediction was correct by comparing predicted tree with actual tree
    /// Call this after reconciliation to track prediction accuracy
    pub fn verify_prediction(
        &mut self,
        state_change: &StateChange,
        predicted_tree: &VNode,
        actual_tree: &VNode
    ) -> crate::error::Result<bool> {
        let pattern_key = self.make_pattern_key(state_change);

        if let Some(patterns) = self.patterns.get_mut(&pattern_key) {
            // Find the pattern that was likely used for prediction
            if let Some(pattern) = patterns.iter_mut().max_by_key(|p| p.observation_count) {
                let matches = Self::trees_match(predicted_tree, actual_tree);

                if matches {
                    pattern.predictions_correct += 1;
                    crate::log_debug!("Prediction verified as CORRECT for {}::{}",
                                     state_change.component_id, state_change.state_key);
                } else {
                    pattern.predictions_incorrect += 1;
                    crate::log_debug!("Prediction verified as INCORRECT for {}::{}",
                                     state_change.component_id, state_change.state_key);
                }

                Ok(matches)
            } else {
                Ok(false)
            }
        } else {
            // Pattern not found
            Ok(false)
        }
    }

    /// Check if two VNode trees match (deep equality)
    fn trees_match(tree1: &VNode, tree2: &VNode) -> bool {
        // For now, use simple JSON comparison
        // In production, we might want to allow small differences (e.g., timestamps)
        match (serde_json::to_string(tree1), serde_json::to_string(tree2)) {
            (Ok(json1), Ok(json2)) => json1 == json2,
            _ => false,
        }
    }

    /// Create a pattern key from a state change
    fn make_pattern_key(&self, state_change: &StateChange) -> String {
        format!("{}::{}", state_change.component_id, state_change.state_key)
    }

    /// Check if two patch lists are similar (for pattern matching)
    #[allow(dead_code)]
    fn patches_similar(&self, a: &[Patch], b: &[Patch]) -> bool {
        if a.len() != b.len() {
            return false;
        }

        a.iter().zip(b.iter()).all(|(p1, p2)| {
            std::mem::discriminant(p1) == std::mem::discriminant(p2)
        })
    }

    /// Adapt learned patches to current tree (basic implementation)
    fn adapt_patches(patches: &[Patch], _current_tree: &VNode) -> Vec<Patch> {
        // For now, return patches as-is
        // Future enhancement: intelligently adapt paths based on current tree structure
        patches.to_vec()
    }

    /// Get statistics about learned patterns
    pub fn stats(&self) -> PredictorStats {
        let total_patterns: usize = self.patterns.values().map(|v| v.len()).sum();
        let total_observations: usize = self.patterns.values()
            .flat_map(|patterns| patterns.iter().map(|p| p.observation_count))
            .sum();

        let total_predictions: usize = self.patterns.values()
            .flat_map(|patterns| patterns.iter().map(|p| p.predictions_made))
            .sum();

        let correct_predictions: usize = self.patterns.values()
            .flat_map(|patterns| patterns.iter().map(|p| p.predictions_correct))
            .sum();

        let incorrect_predictions: usize = self.patterns.values()
            .flat_map(|patterns| patterns.iter().map(|p| p.predictions_incorrect))
            .sum();

        let hit_rate = if total_predictions > 0 {
            correct_predictions as f32 / total_predictions as f32
        } else {
            0.0
        };

        // Calculate average confidence from patterns with observations
        let patterns_with_obs: Vec<&PredictionPattern> = self.patterns.values()
            .flat_map(|patterns| patterns.iter())
            .filter(|p| p.observation_count > 0)
            .collect();

        let avg_confidence = if !patterns_with_obs.is_empty() {
            let total_conf: f32 = patterns_with_obs.iter()
                .map(|p| p.observation_count as f32)
                .sum::<f32>() / patterns_with_obs.len() as f32;
            // Normalize to 0-1 range (simplified)
            (total_conf / (total_conf + 1.0)).min(1.0)
        } else {
            0.0
        };

        PredictorStats {
            unique_state_keys: self.patterns.len(),
            total_patterns,
            total_observations,
            estimated_memory_bytes: self.estimate_memory_usage(),
            total_predictions,
            correct_predictions,
            incorrect_predictions,
            hit_rate,
            avg_confidence,
            active_patterns: total_patterns,
            prediction_hits: correct_predictions,
        }
    }

    /// Estimate memory usage of the predictor
    fn estimate_memory_usage(&self) -> usize {

        let mut total = 0;

        // HashMap overhead
        total += std::mem::size_of::<HashMap<String, Vec<PredictionPattern>>>();

        for (key, patterns) in &self.patterns {
            // Key string
            total += key.len();

            // Vec overhead
            total += std::mem::size_of::<Vec<PredictionPattern>>();

            for pattern in patterns {
                // Pattern struct overhead
                total += std::mem::size_of::<PredictionPattern>();

                // State change key
                total += pattern.state_change_key.len();

                // Patches
                total += pattern.patches.len() * std::mem::size_of::<Patch>();

                // Trees (approximate)
                if let Some(ref tree) = pattern.old_tree {
                    total += tree.estimate_size();
                }
                if let Some(ref tree) = pattern.new_tree {
                    total += tree.estimate_size();
                }
            }
        }

        total
    }

    /// Enforce memory limits by evicting patterns if necessary
    fn enforce_memory_limits(&mut self) -> crate::error::Result<()> {
        // Check state key limit
        if self.patterns.len() > self.config.max_state_keys {
            self.evict_state_keys()?;
        }

        // Check memory limit
        let current_memory = self.estimate_memory_usage();
        if current_memory > self.config.max_memory_bytes {
            self.evict_to_memory_limit()?;
        }

        Ok(())
    }

    /// Evict entire state keys based on eviction policy
    fn evict_state_keys(&mut self) -> crate::error::Result<()> {
        let target_count = (self.config.max_state_keys * 9) / 10; // Remove 10%

        if self.patterns.len() <= target_count {
            return Ok(());
        }

        crate::log_warn!("Evicting state keys: {} -> {}", self.patterns.len(), target_count);

        // Collect keys with their scores for eviction
        let mut key_scores: Vec<(String, u64)> = self.patterns.iter().map(|(key, patterns)| {
            let score = match self.config.eviction_policy {
                EvictionPolicy::LeastFrequentlyUsed => {
                    patterns.iter().map(|p| p.observation_count as u64).sum()
                }
                EvictionPolicy::LeastRecentlyUsed => {
                    patterns.iter()
                        .map(|p| p.last_accessed.elapsed().as_secs())
                        .max()
                        .unwrap_or(0)
                }
                EvictionPolicy::OldestFirst => {
                    patterns.iter()
                        .map(|p| p.created_at.elapsed().as_secs())
                        .max()
                        .unwrap_or(0)
                }
            };
            (key.clone(), score)
        }).collect();

        // Sort by score (lowest first for eviction)
        match self.config.eviction_policy {
            EvictionPolicy::LeastFrequentlyUsed => {
                key_scores.sort_by_key(|(_, score)| *score);
            }
            EvictionPolicy::LeastRecentlyUsed | EvictionPolicy::OldestFirst => {
                key_scores.sort_by_key(|(_, score)| std::cmp::Reverse(*score));
            }
        }

        // Remove keys until we reach target
        let to_remove = self.patterns.len() - target_count;
        for (key, _) in key_scores.iter().take(to_remove) {
            self.patterns.remove(key);
            crate::metrics::METRICS.record_eviction();
        }

        Ok(())
    }

    /// Evict patterns to get under memory limit
    fn evict_to_memory_limit(&mut self) -> crate::error::Result<()> {
        let current_memory = self.estimate_memory_usage();
        let target_memory = (self.config.max_memory_bytes * 9) / 10; // Target 90% of limit

        if current_memory <= target_memory {
            return Ok(());
        }

        crate::log_warn!("Evicting to memory limit: {} bytes -> {} bytes", current_memory, target_memory);

        while self.estimate_memory_usage() > target_memory && !self.patterns.is_empty() {
            // Remove one state key at a time
            if let Some(key_to_remove) = self.find_key_to_evict() {
                self.patterns.remove(&key_to_remove);
                crate::metrics::METRICS.record_eviction();
            } else {
                break;
            }
        }

        Ok(())
    }

    /// Find the best key to evict based on policy
    fn find_key_to_evict(&self) -> Option<String> {
        self.patterns.iter().min_by_key(|(_, patterns)| {
            match self.config.eviction_policy {
                EvictionPolicy::LeastFrequentlyUsed => {
                    patterns.iter().map(|p| p.observation_count as u64).sum()
                }
                EvictionPolicy::LeastRecentlyUsed => {
                    patterns.iter()
                        .map(|p| p.last_accessed.elapsed().as_secs())
                        .max()
                        .unwrap_or(0)
                }
                EvictionPolicy::OldestFirst => {
                    patterns.iter()
                        .map(|p| p.created_at.elapsed().as_secs())
                        .max()
                        .unwrap_or(0)
                }
            }
        }).map(|(key, _)| key.clone())
    }
}

impl Default for Predictor {
    fn default() -> Self {
        Self::new()
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PredictorStats {
    pub unique_state_keys: usize,
    pub total_patterns: usize,
    pub total_observations: usize,
    pub estimated_memory_bytes: usize,
    pub total_predictions: usize,
    pub correct_predictions: usize,
    pub incorrect_predictions: usize,
    pub hit_rate: f32,
    pub avg_confidence: f32,
    pub active_patterns: usize,
    pub prediction_hits: usize,
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::vdom::VNode;
    use std::collections::HashMap;

    #[test]
    fn test_predictor_learns_and_predicts() {
        let mut predictor = Predictor::new();

        // Create a simple state change pattern
        let state_change = StateChange {
            component_id: "counter".to_string(),
            state_key: "count".to_string(),
            old_value: serde_json::json!(0),
            new_value: serde_json::json!(1),
        };

        let old_tree = VNode::element("div", HashMap::new(), vec![
            VNode::text("Count: 0"),
        ]);

        let new_tree = VNode::element("div", HashMap::new(), vec![
            VNode::text("Count: 1"),
        ]);

        // Learn the pattern multiple times
        for _ in 0..5 {
            predictor.learn(state_change.clone(), &old_tree, &new_tree).unwrap();
        }

        // Now predict
        let prediction = predictor.predict(&state_change, &old_tree);
        assert!(prediction.is_some());

        let prediction = prediction.unwrap();
        assert!(prediction.confidence > 0.9); // Should be very confident
        assert!(!prediction.predicted_patches.is_empty());
    }

    #[test]
    fn test_predictor_stats() {
        let mut predictor = Predictor::new();

        let state_change = StateChange {
            component_id: "comp1".to_string(),
            state_key: "value".to_string(),
            old_value: serde_json::json!(0),
            new_value: serde_json::json!(1),
        };

        let tree = VNode::text("test");
        predictor.learn(state_change, &tree, &tree).unwrap();

        let stats = predictor.stats();
        assert_eq!(stats.unique_state_keys, 1);
        assert_eq!(stats.total_observations, 1);
    }

    #[test]
    fn test_low_confidence_returns_none() {
        let mut predictor = Predictor::with_config(PredictorConfig {
            min_confidence: 0.9,
            ..Default::default()
        });

        // Learn two different patterns for the same state key
        let state_change = StateChange {
            component_id: "test".to_string(),
            state_key: "val".to_string(),
            old_value: serde_json::json!(0),
            new_value: serde_json::json!(1),
        };

        let tree1 = VNode::text("A");
        let tree2 = VNode::text("B");
        let tree3 = VNode::element("div", HashMap::new(), vec![]);

        // Learn different outcomes
        predictor.learn(state_change.clone(), &tree1, &tree2).unwrap();
        predictor.learn(state_change.clone(), &tree1, &tree3).unwrap();

        // Low confidence - should return None
        let prediction = predictor.predict(&state_change, &tree1);
        assert!(prediction.is_none());
    }

    #[test]
    fn test_hit_rate_tracking() {
        let mut predictor = Predictor::new();

        let state_change = StateChange {
            component_id: "counter".to_string(),
            state_key: "count".to_string(),
            old_value: serde_json::json!(0),
            new_value: serde_json::json!(1),
        };

        let old_tree = VNode::text("Count: 0");
        let new_tree = VNode::text("Count: 1");

        // Learn pattern
        for _ in 0..5 {
            predictor.learn(state_change.clone(), &old_tree, &new_tree).unwrap();
        }

        // Make prediction
        let prediction = predictor.predict(&state_change, &old_tree);
        assert!(prediction.is_some());

        let prediction = prediction.unwrap();

        // Verify correct prediction
        if let Some(ref predicted_tree) = prediction.predicted_tree {
            let is_correct = predictor.verify_prediction(&state_change, predicted_tree, &new_tree).unwrap();
            assert!(is_correct);
        }

        // Check stats
        let stats = predictor.stats();
        assert_eq!(stats.total_predictions, 1);
        assert_eq!(stats.correct_predictions, 1);
        assert_eq!(stats.hit_rate, 1.0);
    }
}
