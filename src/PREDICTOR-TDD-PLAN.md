# Predictor TDD Implementation Plan

**Goal**: Reduce server reconciliation calls by 20-40% through intelligent prediction

**Current Status**: 0/10 predictor tests passing
**Target**: 8/10 tests passing with measurable server call reduction

---

## Test Results Summary

All 10 tests currently fail due to missing implementation. Here's the priority order for fixes:

### High Priority (Core Functionality)
1. ✗ **Sequential Pattern** - Most common use case
2. ✗ **Toggle Pattern** - Simple deterministic case
3. ✗ **Prediction Accuracy** - Need to measure success
4. ✗ **Server Call Reduction** - The ultimate goal metric

### Medium Priority (Production Readiness)
5. ✗ **Confidence Decay** - Prevents stale predictions
6. ✗ **Memory Pressure** - Resource management
7. ✗ **Pagination Pattern** - Common web pattern

### Low Priority (Advanced Features)
8. ✗ **Multi-Step Form** - Sequential pattern variant
9. ✗ **Multi-Component Cascade** - Complex dependency tracking
10. ✗ **Pattern Interference** - Advanced context awareness

---

## Phase 1: CLI Predictor Commands (Week 1)

### Required Commands

#### 1. `minimact predict --learn`
**Purpose**: Train predictor with state change pattern

```bash
minimact predict --learn \
  --state '{"component_id":"counter","state_key":"count","old_value":0,"new_value":1}' \
  --old '{"type":"Text","content":"Count: 0"}' \
  --new '{"type":"Text","content":"Count: 1"}'
```

**Output**:
```
✓ Pattern learned
  Component: counter
  State key: count
  Observations: 1
```

**Implementation**:
- Add `PredictCommand` to Minimact.Cli/Program.cs
- Options: `--state`, `--old`, `--new`
- Call `minimact_predictor_learn()` FFI function
- Return success/failure

**Estimated Time**: 2 hours

---

#### 2. `minimact predict --predict`
**Purpose**: Get prediction for given state change

```bash
minimact predict --predict \
  --state '{"component_id":"counter","state_key":"count","old_value":1,"new_value":2}' \
  --current '{"type":"Text","content":"Count: 1"}'
```

**Output**:
```json
{
  "confidence": 0.95,
  "predicted_tree": {
    "type": "Text",
    "content": "Count: 2"
  },
  "observations": 5,
  "should_use": true
}
```

**Implementation**:
- Add predict subcommand
- Options: `--state`, `--current`
- Call `minimact_predictor_predict()` FFI function
- Parse and display prediction with confidence

**Estimated Time**: 2 hours

---

#### 3. `minimact predict --stats`
**Purpose**: Show predictor statistics

```bash
minimact predict --stats
```

**Output**:
```
╔═══════════════════════════════════════════════════╗
║   Predictor Statistics                            ║
╚═══════════════════════════════════════════════════╝

Active Patterns:     15
Total Predictions:   234
Prediction Hits:     187
Hit Rate:            79.9%
Avg Confidence:      87.3%
Observations Range:  2-15
```

**Implementation**:
- Add stats subcommand
- Call `minimact_predictor_stats()` FFI function
- Display formatted statistics

**Estimated Time**: 1 hour

---

## Phase 2: Predictor Hit Rate Tracking (Week 1-2)

### Current Rust Predictor Limitations

The predictor currently:
- ✅ Learns patterns (state change → tree diff)
- ✅ Makes predictions with confidence
- ✅ Tracks observation count
- ❌ **Doesn't track if predictions were correct**
- ❌ **No hit rate calculation**
- ❌ **No accuracy metrics**

### Required Changes to `src/predictor.rs`

#### Add Hit Rate Tracking

```rust
pub struct Pattern {
    pub observations: Vec<VNodeDiff>,
    pub observation_count: usize,
    pub last_used: Instant,

    // NEW: Track prediction accuracy
    pub predictions_made: usize,
    pub predictions_correct: usize,
    pub predictions_incorrect: usize,
}

impl Pattern {
    pub fn hit_rate(&self) -> f32 {
        if self.predictions_made == 0 {
            return 0.0;
        }
        self.predictions_correct as f32 / self.predictions_made as f32
    }
}
```

#### Add Verification Function

```rust
/// Verify if a prediction was correct
/// Call this after reconciliation to check prediction accuracy
pub fn verify_prediction(
    &mut self,
    state_change: &StateChange,
    predicted_tree: &VNode,
    actual_tree: &VNode
) -> Result<bool> {
    let key = self.generate_key(state_change);

    if let Some(pattern) = self.patterns.get_mut(&key) {
        let matches = trees_match(predicted_tree, actual_tree);

        pattern.predictions_made += 1;
        if matches {
            pattern.predictions_correct += 1;
        } else {
            pattern.predictions_incorrect += 1;
        }

        Ok(matches)
    } else {
        Err(MinimactError::InvalidStateKey { ... })
    }
}

fn trees_match(tree1: &VNode, tree2: &VNode) -> bool {
    // Deep equality check
    // Allow small differences (e.g., timestamps) based on config
    serde_json::to_string(tree1).unwrap() == serde_json::to_string(tree2).unwrap()
}
```

#### Update Stats to Include Hit Rate

```rust
pub struct PredictorStats {
    // ... existing fields

    // NEW
    pub total_predictions: usize,
    pub correct_predictions: usize,
    pub incorrect_predictions: usize,
    pub hit_rate: f32,
    pub avg_confidence: f32,
}
```

**Estimated Time**: 4 hours

---

## Phase 3: Confidence Threshold Configuration (Week 2)

### Problem
Currently, predictions are made regardless of confidence. Low-confidence predictions waste resources.

### Solution

```rust
pub struct PredictorConfig {
    pub min_confidence: f32,          // Default: 0.70 (70%)
    pub max_state_keys: usize,        // Existing
    pub max_memory_bytes: usize,      // Existing
    pub eviction_policy: EvictionPolicy, // Existing

    // NEW
    pub confidence_threshold: f32,    // Only return predictions above this
    pub min_observations: usize,      // Require N observations before predicting
}

impl Default for PredictorConfig {
    fn default() -> Self {
        Self {
            min_confidence: 0.70,
            confidence_threshold: 0.75,
            min_observations: 3,
            // ... existing defaults
        }
    }
}
```

### Update Predict Function

```rust
pub fn predict(&self, state_change: &StateChange, current_tree: &VNode)
    -> Result<Option<PredictionResult>>
{
    let key = self.generate_key(state_change);

    if let Some(pattern) = self.patterns.get(&key) {
        // Check minimum observations
        if pattern.observation_count < self.config.min_observations {
            return Ok(None); // Not enough data
        }

        let predicted_diff = self.calculate_average_diff(&pattern.observations);
        let confidence = self.calculate_confidence(pattern);

        // Check confidence threshold
        if confidence < self.config.confidence_threshold {
            return Ok(None); // Confidence too low
        }

        let predicted_tree = apply_diff(current_tree, &predicted_diff)?;

        Ok(Some(PredictionResult {
            predicted_tree,
            confidence,
            observations: pattern.observation_count,
        }))
    } else {
        Ok(None) // No pattern learned
    }
}
```

**Estimated Time**: 3 hours

---

## Phase 4: Temporal Confidence Decay (Week 2)

### Problem
Patterns learned long ago may no longer be valid. Stale patterns should have reduced confidence.

### Solution

```rust
impl Pattern {
    pub fn calculate_confidence_with_decay(&self, decay_config: &DecayConfig) -> f32 {
        let base_confidence = self.calculate_base_confidence();

        // Apply time-based decay
        let age = self.last_used.elapsed();
        let decay_factor = if age > decay_config.decay_after {
            let excess_seconds = (age - decay_config.decay_after).as_secs() as f32;
            let decay = excess_seconds / decay_config.half_life_seconds;
            0.5_f32.powf(decay) // Exponential decay
        } else {
            1.0 // No decay yet
        };

        base_confidence * decay_factor
    }
}

pub struct DecayConfig {
    pub decay_after: Duration,      // Start decaying after this time
    pub half_life_seconds: f32,     // Confidence halves every N seconds
}

impl Default for DecayConfig {
    fn default() -> Self {
        Self {
            decay_after: Duration::from_secs(300), // 5 minutes
            half_life_seconds: 600.0,               // 10 minutes
        }
    }
}
```

**Example Decay**:
- Pattern used 5 minutes ago: 100% confidence (no decay yet)
- Pattern used 15 minutes ago: 70.7% of original confidence (1 half-life)
- Pattern used 25 minutes ago: 50% of original confidence (2 half-lives)
- Pattern used 35 minutes ago: 35.4% of original confidence (3 half-lives)

**Estimated Time**: 3 hours

---

## Phase 5: Server Call Reduction Integration (Week 3)

### Workflow with Prediction

```
Client State Change
       ↓
   1. Check Predictor
       ↓
   Has high-confidence prediction?
       ↓
   YES → Use predicted VNode
       ↓  (skip server reconciliation!)
       ↓
   Send patches to client
       ↓
   2. Verify in background
       ↓
   Reconcile on server
       ↓
   Compare actual vs predicted
       ↓
   Update predictor accuracy
       ↓
   If mismatch: send correction patches

   NO → Server reconciliation
       ↓
   Learn pattern for next time
```

### Metrics to Track

```rust
pub struct ReconciliationMetrics {
    pub total_state_changes: u64,
    pub server_reconciliations: u64,      // Full reconciliation
    pub predicted_skips: u64,             // Used prediction instead
    pub prediction_corrections: u64,      // Prediction was wrong
    pub server_call_reduction: f32,       // Percentage saved
}

impl ReconciliationMetrics {
    pub fn server_call_reduction(&self) -> f32 {
        if self.total_state_changes == 0 {
            return 0.0;
        }

        let saved = self.predicted_skips - self.prediction_corrections;
        (saved as f32 / self.total_state_changes as f32) * 100.0
    }
}
```

**Target**: 20-40% server call reduction for repetitive patterns

**Estimated Time**: 6 hours

---

## Phase 6: Advanced Pattern Features (Week 3-4)

### Multi-Component Patterns (Test 6)

Track cross-component dependencies:

```rust
pub struct MultiComponentPattern {
    pub trigger_component: String,
    pub trigger_state_key: String,
    pub affected_components: Vec<AffectedComponent>,
    pub observations: usize,
}

pub struct AffectedComponent {
    pub component_id: String,
    pub expected_state_changes: Vec<StateChange>,
    pub confidence: f32,
}
```

**Estimated Time**: 8 hours

### Pattern Context (Test 7)

Add sequence context to distinguish similar patterns:

```rust
pub struct PatternContext {
    pub previous_states: VecDeque<StateChange>, // Last N state changes
    pub sequence_depth: usize,                    // How many to track
}

// Pattern key includes context
fn generate_key_with_context(&self, state_change: &StateChange, context: &PatternContext) -> String {
    let mut hasher = DefaultHasher::new();

    // Include recent history
    for prev_state in &context.previous_states {
        prev_state.hash(&mut hasher);
    }

    state_change.hash(&mut hasher);
    format!("{:x}", hasher.finish())
}
```

**Estimated Time**: 6 hours

---

## Success Metrics

### Minimum Viable Product (MVP)
- ✅ 6/10 tests passing
- ✅ Sequential patterns working (Test 1)
- ✅ Toggle patterns working (Test 2)
- ✅ Hit rate >70% for learned patterns (Test 9)
- ✅ Server call reduction >20% (Test 8)
- ✅ Memory stays under 100MB (Test 10)
- ✅ Basic confidence decay (Test 5)

### Full Production Ready
- ✅ 8/10 tests passing
- ✅ All MVP criteria
- ✅ Pagination patterns (Test 4)
- ✅ Multi-step forms (Test 3)

### Advanced (Nice to Have)
- ✅ 10/10 tests passing
- ✅ Multi-component cascades (Test 6)
- ✅ Pattern interference handling (Test 7)

---

## Implementation Order

### Week 1: Foundation
1. **Day 1-2**: CLI predictor commands (`--learn`, `--predict`, `--stats`)
2. **Day 3-4**: Hit rate tracking in Rust predictor
3. **Day 5**: Run tests, verify Sequential Pattern (Test 1) passes

**Expected**: 2/10 tests passing (Sequential, Toggle)

### Week 2: Accuracy & Thresholds
1. **Day 1-2**: Confidence thresholds and minimum observations
2. **Day 3-4**: Temporal confidence decay
3. **Day 5**: Run tests, tune thresholds

**Expected**: 5/10 tests passing (+ Pagination, Confidence Decay, Memory Pressure)

### Week 3: Integration & Metrics
1. **Day 1-3**: Server call reduction integration
2. **Day 4-5**: Accuracy tracking and metrics
3. **End of week**: Full integration test

**Expected**: 6/10 tests passing (+ Prediction Accuracy)

### Week 4: Advanced Features (Optional)
1. **Day 1-3**: Multi-component patterns
2. **Day 4-5**: Pattern context awareness

**Expected**: 8/10 tests passing (+ Multi-Step Form, Multi-Component OR Pattern Interference)

---

## Testing Strategy

### After Each Phase

```bash
# Run predictor tests
node test-predictor-advanced.js

# Check specific test
node test-predictor-advanced.js --test sequential

# Verbose output
node test-predictor-advanced.js --verbose
```

### Continuous Metrics Tracking

```bash
# Before changes
npm test > baseline-metrics.txt

# After changes
npm test > new-metrics.txt

# Compare
diff baseline-metrics.txt new-metrics.txt
```

---

## Risk Mitigation

### Risk 1: Prediction accuracy too low
**Mitigation**: Start with high confidence threshold (80%), lower gradually

### Risk 2: Memory pressure from too many patterns
**Mitigation**: Aggressive eviction policy, max 1000 patterns per predictor

### Risk 3: Stale patterns causing bad UX
**Mitigation**: Fast confidence decay (5-10 minute half-life)

### Risk 4: Performance overhead from verification
**Mitigation**: Async verification, doesn't block client updates

---

## Next Steps

1. Review and approve this plan
2. Start Week 1: Day 1 - Implement CLI `--learn` command
3. Daily standup: Check progress against plan
4. Weekly review: Adjust timeline based on actual vs estimated

**Question for discussion**: Should we prioritize MVP (6/10 tests, 20% reduction) or aim for full production (8/10 tests, 30-40% reduction) in the first iteration?
