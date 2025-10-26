# Runtime Template Patches - Prediction System Upgrade

**Status**: Design Phase
**Priority**: Critical - 98% memory reduction for prediction cache
**Innovation**: Apply template patch concept to runtime predictions

---

## Executive Summary

Extend the hot reload template patches concept to **runtime state change predictions**. Instead of predicting 1000+ specific patches for counter increments (0→1, 1→2, 2→3...), the predictor learns **one template patch** that works for any counter value.

**Key Innovation**: Prediction cache stores templates, not concrete patches.

---

## Current Prediction System (Before)

### How It Works Now

```rust
// User clicks increment when count = 5
// Predictor has pre-computed:
predictions = {
  "increment_count_5_to_6": [
    Patch::UpdateText {
      path: [0, 0],  // h1 > text
      content: "Count: 6"  // ❌ Hard-coded value!
    }
  ],
  "increment_count_6_to_7": [
    Patch::UpdateText {
      path: [0, 0],
      content: "Count: 7"  // ❌ Another hard-coded value!
    }
  ],
  // ... 1000+ more variations
}
```

### Problems

1. **Memory Explosion**: 1000 variations × 100 bytes = 100KB per component
2. **Limited Coverage**: Only works for predicted values (85% hit rate)
3. **Cache Misses**: count = 9999 → no prediction → slow render
4. **Maintenance**: Prediction cache grows indefinitely

---

## New Template-Based Prediction (After)

### How It Should Work

```rust
// Predictor learns ONE template for ALL counter values
predictions = {
  "increment_count": [
    Patch::UpdateTextTemplate {
      path: [0, 0],
      template_patch: TemplatePatch {
        template: "Count: {0}",  // ✅ Works for ANY value!
        bindings: ["count"],
        slots: [7]
      }
    }
  ]
}

// Memory: 200 bytes (vs 100KB)
// Coverage: 100% (works for any count value)
```

---

## Architecture Changes

### 1. Prediction Learning Phase

**OLD: Learn Concrete Patches**
```rust
// After render with count = 5 → count = 6
predictor.learn(
  componentId: "Counter",
  stateChange: { count: 5 → 6 },
  patches: [UpdateText { content: "Count: 6" }]  // ❌ Specific value
);
```

**NEW: Learn Template Patches**
```rust
// After render with count = 5 → count = 6
predictor.learn_template(
  componentId: "Counter",
  stateChange: { count: Old(5) → New(6) },
  patches: [UpdateText { content: "Count: 6" }],
  old_vnode: VNode { text: "Count: 5" },
  new_vnode: VNode { text: "Count: 6" }
);

// Predictor detects pattern:
// - Text changed from "Count: 5" to "Count: 6"
// - State "count" changed from 5 to 6
// - Pattern: "Count: {count}"

// Stores template:
predictions.insert("setState_count", [
  Patch::UpdateTextTemplate {
    path: [0, 0],
    template_patch: TemplatePatch {
      template: "Count: {0}",
      bindings: ["count"],
      slots: [7]
    }
  }
]);
```

---

### 2. Template Pattern Detection

The predictor needs to **detect patterns** in patch content to extract templates.

#### Algorithm: Pattern Extraction

```rust
impl Predictor {
    /// Detect if a patch can be converted to a template
    fn extract_template(
        &self,
        old_patch: &Patch,
        new_patch: &Patch,
        state_changes: &HashMap<String, StateChange>
    ) -> Option<TemplatePatch> {
        match (old_patch, new_patch) {
            (
                Patch::UpdateText { content: old_content, .. },
                Patch::UpdateText { content: new_content, path }
            ) => {
                // Try to find which state variable caused the change
                for (state_key, change) in state_changes {
                    let old_value_str = change.old.to_string();
                    let new_value_str = change.new.to_string();

                    // Check if old_content contains old_value
                    if old_content.contains(&old_value_str) {
                        // Extract template by replacing value with placeholder
                        let template = old_content.replace(&old_value_str, "{0}");

                        // Verify template works for new value
                        let expected = template.replace("{0}", &new_value_str);
                        if expected == *new_content {
                            // ✅ Pattern found!
                            let slot = old_content.find(&old_value_str).unwrap();

                            return Some(TemplatePatch {
                                template,
                                bindings: vec![state_key.clone()],
                                slots: vec![slot],
                            });
                        }
                    }
                }
                None
            }
            _ => None
        }
    }
}
```

#### Example Detection

```rust
// Input:
old_patch = UpdateText { content: "Count: 5" }
new_patch = UpdateText { content: "Count: 6" }
state_changes = { "count": StateChange { old: 5, new: 6 } }

// Step 1: Find state variable in content
old_content.contains("5") → true (count changed 5 → 6)

// Step 2: Extract template
template = "Count: 5".replace("5", "{0}") → "Count: {0}"

// Step 3: Verify with new value
"Count: {0}".replace("{0}", "6") → "Count: 6" ✅ Matches!

// Step 4: Calculate slot position
slot = "Count: 5".find("5") → 7

// Output:
TemplatePatch {
  template: "Count: {0}",
  bindings: ["count"],
  slots: [7]
}
```

---

### 3. Prediction Matching Phase

**OLD: Exact State Match**
```rust
// User clicks increment when count = 99
let hint = predictor.get_prediction(
  componentId: "Counter",
  stateChanges: { count: 99 → 100 }
);
// Returns: None (cache miss - never predicted count=100 before)
```

**NEW: Template Match**
```rust
// User clicks increment when count = 99
let hint = predictor.get_template_prediction(
  componentId: "Counter",
  stateChanges: { count: 99 → 100 }
);

// Finds template prediction for "setState_count"
let template = predictions.get("setState_count");
// TemplatePatch { template: "Count: {0}", bindings: ["count"] }

// Render template with new value
let rendered_patch = Patch::UpdateText {
  path: [0, 0],
  content: template.render(&[100])  // "Count: 100"
};

// Returns: rendered_patch ✅ Cache HIT!
```

---

### 4. Multi-Variable Templates

Handle templates with multiple state variables:

```tsx
<h1>Hello, {firstName} {lastName}!</h1>
```

#### Detection

```rust
// Input:
old_content = "Hello, John Doe!"
new_content = "Hello, Jane Doe!"
state_changes = {
  "firstName": Old("John") → New("Jane"),
  "lastName": Old("Doe") → New("Doe")
}

// Step 1: Find all state variables in content
"Hello, John Doe!".contains("John") → true (firstName)
"Hello, John Doe!".contains("Doe") → true (lastName)

// Step 2: Extract template (order matters!)
template = "Hello, John Doe!"
  .replace("John", "{0}")  // "Hello, {0} Doe!"
  .replace("Doe", "{1}")   // "Hello, {0} {1}!"

// Step 3: Verify
"Hello, {0} {1}!".replace("{0}", "Jane").replace("{1}", "Doe")
// → "Hello, Jane Doe!" ✅

// Output:
TemplatePatch {
  template: "Hello, {0} {1}!",
  bindings: ["firstName", "lastName"],
  slots: [7, 13]
}
```

---

### 5. Template Cache Structure

```rust
pub struct Predictor {
    /// Template-based predictions (NEW!)
    /// Key: "setState_{stateKey}" or "method_{methodName}"
    template_predictions: HashMap<String, Vec<TemplatePatch>>,

    /// Legacy concrete predictions (for backwards compatibility)
    concrete_predictions: HashMap<String, Vec<Patch>>,

    /// Statistics
    template_hit_count: u64,
    concrete_hit_count: u64,
    miss_count: u64,
}

impl Predictor {
    pub fn get_prediction(
        &mut self,
        component_id: &str,
        state_changes: &HashMap<String, StateChange>
    ) -> Option<Vec<Patch>> {
        // Try template predictions first (100% coverage)
        if let Some(patches) = self.try_template_prediction(component_id, state_changes) {
            self.template_hit_count += 1;
            return Some(patches);
        }

        // Fall back to concrete predictions (legacy)
        if let Some(patches) = self.try_concrete_prediction(component_id, state_changes) {
            self.concrete_hit_count += 1;
            return Some(patches);
        }

        // Cache miss
        self.miss_count += 1;
        None
    }

    fn try_template_prediction(
        &self,
        component_id: &str,
        state_changes: &HashMap<String, StateChange>
    ) -> Option<Vec<Patch>> {
        // For each changed state variable, check if we have a template
        for (state_key, change) in state_changes {
            let prediction_key = format!("{}:setState_{}", component_id, state_key);

            if let Some(template_patches) = self.template_predictions.get(&prediction_key) {
                // Render templates with new values
                let rendered_patches = template_patches.iter().map(|tp| {
                    let params: Vec<String> = tp.bindings.iter()
                        .map(|binding| {
                            state_changes
                                .get(binding)
                                .map(|sc| sc.new.to_string())
                                .unwrap_or_default()
                        })
                        .collect();

                    // Render template
                    Patch::UpdateText {
                        path: tp.path.clone(),
                        content: render_template(&tp.template, &params)
                    }
                }).collect();

                return Some(rendered_patches);
            }
        }

        None
    }
}

/// Render template with parameters
fn render_template(template: &str, params: &[String]) -> String {
    let mut result = template.to_string();
    for (i, param) in params.iter().enumerate() {
        result = result.replace(&format!("{{{}}}", i), param);
    }
    result
}
```

---

## Implementation Plan

### Phase 1: Core Template Detection (Week 1)

**Files to Modify:**
- `src/predictor.rs` - Add template extraction logic
- `src/vdom.rs` - Add `TemplatePatch` struct (already exists from hot reload)

**Tasks:**
- [x] Define `TemplatePatch` struct
- [ ] Implement `extract_template()` for single-variable patterns
- [ ] Implement `render_template()` helper
- [ ] Add `template_predictions` HashMap to Predictor
- [ ] Write unit tests for pattern detection

**Test Cases:**
```rust
#[test]
fn test_extract_simple_template() {
    let old_patch = Patch::UpdateText {
        path: vec![0],
        content: "Count: 5".to_string()
    };
    let new_patch = Patch::UpdateText {
        path: vec![0],
        content: "Count: 6".to_string()
    };
    let state_changes = hashmap!{
        "count" => StateChange { old: 5, new: 6 }
    };

    let template = extract_template(&old_patch, &new_patch, &state_changes);

    assert!(template.is_some());
    let tp = template.unwrap();
    assert_eq!(tp.template, "Count: {0}");
    assert_eq!(tp.bindings, vec!["count"]);
    assert_eq!(tp.slots, vec![7]);
}
```

---

### Phase 2: Learning Integration (Week 2)

**Files to Modify:**
- `src/predictor.rs` - Update `learn()` method
- `src/Minimact.AspNetCore/Core/MinimactComponent.cs` - Pass old VNode to predictor

**Tasks:**
- [ ] Modify `learn()` to detect templates
- [ ] Store template predictions alongside concrete predictions
- [ ] Add statistics tracking (template hits vs concrete hits)
- [ ] Log template extraction successes

**Example Learning Flow:**
```rust
impl Predictor {
    pub fn learn(
        &mut self,
        component_id: &str,
        method_name: &str,
        state_changes: &HashMap<String, StateChange>,
        old_vnode: &VNode,
        new_vnode: &VNode,
        patches: Vec<Patch>
    ) {
        // Try to extract templates from patches
        for i in 0..patches.len() {
            // Compare old vs new patch content
            if let Some(old_patch) = self.reconstruct_old_patch(&patches[i], old_vnode) {
                if let Some(template) = self.extract_template(
                    &old_patch,
                    &patches[i],
                    state_changes
                ) {
                    // Store template prediction
                    let key = format!("{}:{}", component_id, method_name);
                    self.template_predictions
                        .entry(key)
                        .or_insert_with(Vec::new)
                        .push(template);

                    println!("[Predictor] 📐 Template extracted: {} → '{}'",
                        method_name, template.template);
                    return; // Don't store concrete patch if we have template
                }
            }
        }

        // Fall back to concrete prediction (legacy)
        self.learn_concrete(component_id, method_name, state_changes, patches);
    }
}
```

---

### Phase 3: Prediction Matching (Week 2)

**Files to Modify:**
- `src/predictor.rs` - Update `get_prediction()`
- `src/client-runtime/src/hint-queue.ts` - Handle template patches

**Tasks:**
- [ ] Implement `try_template_prediction()`
- [ ] Render templates with current state values
- [ ] Fall back to concrete predictions if no template found
- [ ] Add metrics for template hit rate

---

### Phase 4: Multi-Variable Support (Week 3)

**Tasks:**
- [ ] Extend `extract_template()` to handle multiple variables
- [ ] Handle ordering issues (ensure consistent placeholder numbering)
- [ ] Test with complex templates (`"Hello, {firstName} {lastName}!"`)

**Complex Example:**
```tsx
<p>User {userId}: {firstName} {lastName} ({email})</p>

// Should extract:
TemplatePatch {
  template: "User {0}: {1} {2} ({3})",
  bindings: ["userId", "firstName", "lastName", "email"],
  slots: [5, 10, 15, 25]
}
```

---

### Phase 5: Attribute Templates (Week 3)

Extend to handle attribute changes:

```tsx
<div className={isActive ? 'active' : 'inactive'}>
<input value={searchQuery} />
```

**Detection:**
```rust
Patch::UpdateProp { name: "className", value: "active" }
→
Patch::UpdatePropTemplate {
  name: "className",
  template_patch: TemplatePatch {
    template: "{0}",  // Simple replacement
    bindings: ["isActive"],
    conditional_map: {
      "true": "active",
      "false": "inactive"
    }
  }
}
```

---

### Phase 6: Performance Optimization (Week 4)

**Tasks:**
- [ ] Benchmark template rendering vs concrete patches
- [ ] Optimize template rendering (compile to closure?)
- [ ] Add caching for rendered templates
- [ ] Memory profiling (verify 98% reduction)

**Expected Results:**
```
BEFORE:
  Memory: 100KB per component (1000 predictions)
  Hit Rate: 85%
  Latency: 2-3ms

AFTER:
  Memory: 2KB per component (5-10 templates)
  Hit Rate: 99%+ (templates cover all values)
  Latency: 2-3ms (same - template rendering is fast)
```

---

## Migration Strategy

### Backwards Compatibility

Keep both systems running in parallel:

```rust
pub struct Predictor {
    // NEW: Template predictions
    template_predictions: HashMap<String, Vec<TemplatePatch>>,

    // OLD: Concrete predictions (for non-templatable patches)
    concrete_predictions: HashMap<String, Vec<Patch>>,

    // Configuration
    prefer_templates: bool,  // Default: true
}
```

### Gradual Rollout

1. **Week 1-2**: Template system runs alongside concrete predictions
2. **Week 3**: Log template hit rate vs concrete hit rate
3. **Week 4**: If template hit rate > 95%, remove concrete predictions
4. **Week 5**: Clean up legacy code

---

## Edge Cases

### 1. Non-Templatable Patches

Some patches can't be templated (structural changes):

```rust
Patch::Create { vnode: ... }  // ❌ Can't template
Patch::Remove { path: ... }   // ❌ Can't template
Patch::Reorder { ... }        // ❌ Can't template
```

**Solution**: Fall back to concrete predictions

---

### 2. Multiple Occurrences

```tsx
<div>Count: {count}, Previous: {count - 1}</div>
```

**Detection Challenge**: Same variable appears twice with different transformations

**Solution**: Detect `count - 1` as derived state, template only the direct binding:
```rust
TemplatePatch {
  template: "Count: {0}, Previous: {1}",
  bindings: ["count", "count_minus_1"],  // Derived binding
  slots: [7, 20]
}
```

---

### 3. Conditional Content

```tsx
{isLoggedIn ? `Welcome, ${name}!` : 'Please log in'}
```

**Challenge**: Template changes based on condition

**Solution**: Conditional templates (future enhancement)
```rust
TemplatePatch {
  template: "{0}",
  conditional_templates: {
    "true": "Welcome, {1}!",
    "false": "Please log in"
  },
  bindings: ["isLoggedIn", "name"]
}
```

---

## Success Metrics

### Memory Reduction
- **Target**: 95%+ reduction in prediction cache size
- **Measurement**: Track `template_predictions` memory vs `concrete_predictions`

### Hit Rate Improvement
- **Target**: 95%+ hit rate (up from 85%)
- **Measurement**: `template_hit_count / (template_hit_count + miss_count)`

### Latency (Should Stay Same)
- **Target**: < 5ms for template rendering + patch application
- **Measurement**: Benchmark `render_template()` + `applyPatches()`

### Coverage
- **Target**: 100% of text/prop updates covered by templates
- **Measurement**: % of `UpdateText`/`UpdateProp` patches that use templates

---

## Code Changes Summary

### Rust (`src/predictor.rs`)
```rust
// Add to Predictor struct
template_predictions: HashMap<String, Vec<TemplatePatch>>,

// New methods
fn extract_template(...) -> Option<TemplatePatch>
fn try_template_prediction(...) -> Option<Vec<Patch>>
fn render_template(...) -> String
```

### C# (`MinimactComponent.cs`)
```csharp
// Pass old VNode to predictor for template extraction
public void TriggerRender()
{
    var oldVNode = CurrentVNode;  // Save before rendering
    var newVNode = Render();
    var patches = _reconciler.ComputePatches(oldVNode, newVNode);

    // Learn templates
    _predictor.Learn(ComponentId, methodName, stateChanges, oldVNode, newVNode, patches);
}
```

### Client (`hint-queue.ts`)
```typescript
// Handle template patches
matchHint(componentId: string, stateChanges: Record<string, any>): Hint | null {
  // Check template predictions first
  const templateHint = this.matchTemplateHint(componentId, stateChanges);
  if (templateHint) return templateHint;

  // Fall back to concrete predictions
  return this.matchConcreteHint(componentId, stateChanges);
}
```

---

## Next Steps

1. **Review this plan** - Ensure it aligns with hot reload template patches design
2. **Phase 1 implementation** - Start with single-variable template detection
3. **Unit tests** - Verify template extraction works correctly
4. **Integration** - Hook into existing predictor learning flow
5. **Metrics** - Add logging to track template hit rate

---

## Conclusion

By applying the template patches concept to **runtime predictions**, we achieve:

✅ **98% memory reduction** (2KB vs 100KB per component)
✅ **100% coverage** (works with any state value)
✅ **Same latency** (template rendering is fast)
✅ **Simpler cache** (5-10 templates instead of 1000+ patches)

This transforms the prediction system from a **brute-force cache** to an **intelligent template engine**.

🚀 **One template to rule them all!**
