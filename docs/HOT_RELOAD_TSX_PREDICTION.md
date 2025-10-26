# Hot Reload TSX Prediction - Implementation Plan

**Status**: Planning
**Priority**: High - Enables "hottest ever" hot reload (<5ms)
**Owner**: Rust Predictor Enhancement

---

## Executive Summary

Enhance the Rust predictor to generate TSX edit predictions in dev mode, enabling instant hot reload by pre-computing patches for common TSX edits. This completes the predictive mapping approach by automatically populating the client-side cache.

**Key Innovation**: Reuse the existing Rust predictor (which already predicts state changes) to ALSO predict TSX edits. This avoids duplication and leverages Rust's performance.

---

## Current State

### What Works ✅
- Client-side pattern detection (`TsxPatternDetector`)
- Client-side cache lookup mechanism
- Fallback to server re-render
- WebSocket communication (file changes → client)
- VS Code extension integration

### What's Missing ❌
- **Cache is empty** - No automatic TSX prediction generation
- Server doesn't send pre-computed patches to client
- Every hot reload uses naive fallback (~150ms)

### Why Cache Is Empty
The infrastructure exists, but there's no mechanism to populate `tsxPredictionCache` with pre-computed patches. The client can detect patterns but has nothing to match against.

---

## Proposed Solution: Rust Predictor Enhancement

### High-Level Flow

```
1. Developer edits Counter.tsx
        ↓
2. HotReloadFileWatcher detects change
        ↓
3. Rust Predictor generates TSX predictions
        ↓
4. Server sends predictions to client via SignalR
        ↓
5. Client populates cache with patches
        ↓
6. Future edits match cache → INSTANT reload (3-5ms)
```

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   SERVER-SIDE (RUST)                     │
│                                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │  HotReloadFileWatcher                              │ │
│  │  - Detects Counter.tsx change                      │ │
│  │  - Reads new TSX code                              │ │
│  └──────────────────┬─────────────────────────────────┘ │
│                     │                                    │
│                     ↓                                    │
│  ┌────────────────────────────────────────────────────┐ │
│  │  Rust Predictor (ENHANCED)                         │ │
│  │                                                     │ │
│  │  generate_tsx_predictions() {                      │ │
│  │    // Find text nodes in current TSX               │ │
│  │    text_nodes = extract_text_nodes(tsx);           │ │
│  │                                                     │ │
│  │    // Generate variations                          │ │
│  │    for node in text_nodes {                        │ │
│  │      variations = [                                │ │
│  │        "Count: 1", "Count: 2", ...                │ │
│  │      ];                                             │ │
│  │                                                     │ │
│  │      // Compute patches for each                   │ │
│  │      for var in variations {                       │ │
│  │        new_tree = parse_tsx(var);                  │ │
│  │        patches = reconcile(old, new);              │ │
│  │        predictions.push({                          │ │
│  │          pattern: detect_pattern(),                │ │
│  │          patches: patches,                         │ │
│  │          confidence: 0.95                          │ │
│  │        });                                          │ │
│  │      }                                              │ │
│  │    }                                                │ │
│  │  }                                                  │ │
│  └──────────────────┬─────────────────────────────────┘ │
│                     │                                    │
│                     ↓                                    │
│  ┌────────────────────────────────────────────────────┐ │
│  │  SignalR Hub                                       │ │
│  │  - Send predictions to client                      │ │
│  │  - Message: "HotReload:TsxPrediction"             │ │
│  └──────────────────┬─────────────────────────────────┘ │
└─────────────────────┼─────────────────────────────────┘
                      │ WebSocket
                      ↓
┌─────────────────────────────────────────────────────────┐
│                   CLIENT-SIDE (JS)                       │
│                                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │  HotReloadManager                                  │ │
│  │                                                     │ │
│  │  ws.on('message', msg => {                         │ │
│  │    if (msg.type === 'tsx-prediction') {            │ │
│  │      populateTsxCache(msg);                        │ │
│  │    }                                                │ │
│  │  })                                                 │ │
│  │                                                     │ │
│  │  populateTsxCache(prediction) {                    │ │
│  │    key = buildCacheKey(prediction.pattern);        │ │
│  │    cache.set(key, prediction.patches);             │ │
│  │    // Cache now populated! 🎉                      │ │
│  │  }                                                  │ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
│  Now when user edits "Count: 0" → "Count: 1":          │
│  - Pattern detected: text-content change                │
│  - Cache lookup: HITS! ⚡                               │
│  - Apply patches in 3ms                                 │
└─────────────────────────────────────────────────────────┘
```

---

## Implementation Tasks

### Phase 1: Rust Types and Enums (2 hours)

#### 1.1 Extend `PatternType` enum

**File**: `src/src/predictor.rs`

```rust
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum PatternType {
    // Existing state change patterns
    NumericIncrement,
    NumericDecrement,
    BooleanToggle,
    Literal,

    // NEW: TSX edit patterns (for hot reload)
    TsxTextChange,        // Text content edit in JSX
    TsxClassChange,       // className attribute edit
    TsxAttributeChange,   // Generic attribute edit
    TsxStyleChange,       // Inline style property edit
    TsxElementAdded,      // New element added
    TsxElementRemoved,    // Element removed
}
```

#### 1.2 Create `TsxEditChange` struct

```rust
/// Represents a TSX code change (for hot reload)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TsxEditChange {
    pub component_id: String,
    pub old_tsx: String,
    pub new_tsx: String,
    pub edit_type: PatternType,
    pub confidence: f32,

    // Pattern-specific fields
    pub old_value: Option<String>,
    pub new_value: Option<String>,
    pub path: Option<String>,
}
```

#### 1.3 Create `TsxPrediction` struct

```rust
/// Represents a predicted TSX edit with pre-computed patches
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TsxPrediction {
    pub component_id: String,
    pub tsx_pattern: TsxEditPattern,
    pub patches: Vec<Patch>,
    pub confidence: f32,
    pub timestamp: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TsxEditPattern {
    pub pattern_type: PatternType,
    pub element_path: Option<String>,   // e.g., "div > h1"
    pub old_value: Option<String>,
    pub new_value: Option<String>,
    pub old_classes: Option<Vec<String>>,
    pub new_classes: Option<Vec<String>>,
    pub attribute_name: Option<String>,
    pub style_property: Option<String>,
}
```

---

### Phase 2: TSX Pattern Detection (3 hours)

Port the TypeScript pattern detection logic to Rust.

#### 2.1 Create `tsx_detector.rs` module

**File**: `src/src/tsx_detector.rs`

```rust
use crate::predictor::{PatternType, TsxEditPattern};

pub struct TsxPatternDetector;

impl TsxPatternDetector {
    /// Detect what kind of edit was made to TSX code
    pub fn detect_edit_pattern(old_tsx: &str, new_tsx: &str) -> Option<TsxEditPattern> {
        if old_tsx == new_tsx {
            return None;
        }

        let diff = compute_diff(old_tsx, new_tsx);

        // Try pattern detection in priority order
        if let Some(pattern) = detect_text_change(&diff) {
            return Some(pattern);
        }

        if let Some(pattern) = detect_class_change(&diff) {
            return Some(pattern);
        }

        if let Some(pattern) = detect_attribute_change(&diff) {
            return Some(pattern);
        }

        if let Some(pattern) = detect_style_change(&diff) {
            return Some(pattern);
        }

        if let Some(pattern) = detect_element_change(&diff) {
            return Some(pattern);
        }

        None // Complex change - no pattern detected
    }

    /// Build cache key from pattern (matches client-side key generation)
    pub fn build_cache_key(component_id: &str, pattern: &TsxEditPattern) -> String {
        match pattern.pattern_type {
            PatternType::TsxTextChange => {
                format!(
                    "{}:text:{}:{}→{}",
                    component_id,
                    pattern.element_path.as_deref().unwrap_or(""),
                    pattern.old_value.as_deref().unwrap_or(""),
                    pattern.new_value.as_deref().unwrap_or("")
                )
            }
            PatternType::TsxClassChange => {
                format!(
                    "{}:class:{}→{}",
                    component_id,
                    pattern.old_classes.as_ref().map(|c| c.join(",")).unwrap_or_default(),
                    pattern.new_classes.as_ref().map(|c| c.join(",")).unwrap_or_default()
                )
            }
            // ... other pattern types
            _ => format!("{}:complex", component_id)
        }
    }
}

struct DiffResult {
    added: Vec<String>,
    removed: Vec<String>,
    unchanged: Vec<String>,
}

fn compute_diff(old_tsx: &str, new_tsx: &str) -> DiffResult {
    let old_lines: Vec<String> = old_tsx
        .lines()
        .map(|l| l.trim().to_string())
        .filter(|l| !l.is_empty())
        .collect();

    let new_lines: Vec<String> = new_tsx
        .lines()
        .map(|l| l.trim().to_string())
        .filter(|l| !l.is_empty())
        .collect();

    let old_set: std::collections::HashSet<_> = old_lines.iter().collect();
    let new_set: std::collections::HashSet<_> = new_lines.iter().collect();

    let added: Vec<String> = new_lines.iter()
        .filter(|line| !old_set.contains(line))
        .cloned()
        .collect();

    let removed: Vec<String> = old_lines.iter()
        .filter(|line| !new_set.contains(line))
        .cloned()
        .collect();

    let unchanged: Vec<String> = new_lines.iter()
        .filter(|line| old_set.contains(line))
        .cloned()
        .collect();

    DiffResult { added, removed, unchanged }
}

fn detect_text_change(diff: &DiffResult) -> Option<TsxEditPattern> {
    // Exactly one line changed
    if diff.removed.len() != 1 || diff.added.len() != 1 {
        return None;
    }

    let removed = &diff.removed[0];
    let added = &diff.added[0];

    // Use regex to extract tags and content
    // Example: <h1>Count: 0</h1> → extract tag="h1", content="Count: 0"

    // Simplified for now - in production, use proper HTML/JSX parser
    if let (Some(removed_content), Some(added_content)) =
        (extract_text_content(removed), extract_text_content(added)) {

        if removed_content.tag == added_content.tag {
            return Some(TsxEditPattern {
                pattern_type: PatternType::TsxTextChange,
                element_path: Some(removed_content.tag.clone()),
                old_value: Some(removed_content.text),
                new_value: Some(added_content.text),
                old_classes: None,
                new_classes: None,
                attribute_name: None,
                style_property: None,
            });
        }
    }

    None
}

fn detect_class_change(diff: &DiffResult) -> Option<TsxEditPattern> {
    // Similar to detect_text_change, but for className changes
    // ...
    None
}

// ... other detection functions
```

#### 2.2 Add module to `lib.rs`

**File**: `src/src/lib.rs`

```rust
pub mod tsx_detector;
```

---

### Phase 3: TSX Prediction Generator (4 hours)

#### 3.1 Add method to `Predictor`

**File**: `src/src/predictor.rs`

```rust
impl Predictor {
    /// Generate TSX edit predictions for dev mode hot reload
    /// This pre-computes patches for common TSX edits
    pub fn generate_tsx_predictions(
        &mut self,
        component_id: &str,
        current_tree: &VNode,
        current_tsx: &str,
    ) -> crate::error::Result<Vec<TsxPrediction>> {
        let mut predictions = Vec::new();

        // Generate common text edits
        predictions.extend(
            self.predict_text_edits(component_id, current_tree, current_tsx)?
        );

        // Generate common class edits
        predictions.extend(
            self.predict_class_edits(component_id, current_tree, current_tsx)?
        );

        // Generate common attribute edits
        predictions.extend(
            self.predict_attribute_edits(component_id, current_tree, current_tsx)?
        );

        crate::log_info!(
            "Generated {} TSX predictions for component {}",
            predictions.len(),
            component_id
        );

        Ok(predictions)
    }

    /// Predict common text content edits
    fn predict_text_edits(
        &self,
        component_id: &str,
        current_tree: &VNode,
        current_tsx: &str,
    ) -> crate::error::Result<Vec<TsxPrediction>> {
        let mut predictions = Vec::new();

        // Find all text nodes in TSX
        let text_nodes = extract_text_nodes_from_tsx(current_tsx);

        for text_node in text_nodes {
            // If text contains a number, generate numeric variations
            if let Some(number) = extract_number(&text_node.content) {
                // Generate common increments/decrements
                for variation in [
                    number + 1,
                    number - 1,
                    number + 10,
                    number - 10,
                    0,
                    100,
                ] {
                    // Create new TSX with this variation
                    let new_tsx = current_tsx.replace(
                        &format!("{}", number),
                        &format!("{}", variation),
                    );

                    // Compute prediction for this TSX change
                    if let Some(prediction) = self.compute_tsx_prediction(
                        component_id,
                        current_tsx,
                        &new_tsx,
                        current_tree,
                    )? {
                        predictions.push(prediction);
                    }
                }
            }

            // If text is a string, generate common string variations
            if !text_node.content.chars().any(char::is_numeric) {
                // Example: "Click me" → "Click here", "Submit", etc.
                let variations = [
                    "Click here",
                    "Submit",
                    "Cancel",
                    "Save",
                    "Delete",
                ];

                for variation in variations {
                    let new_tsx = current_tsx.replace(&text_node.content, variation);

                    if let Some(prediction) = self.compute_tsx_prediction(
                        component_id,
                        current_tsx,
                        &new_tsx,
                        current_tree,
                    )? {
                        predictions.push(prediction);
                    }
                }
            }
        }

        Ok(predictions)
    }

    /// Predict common class edits
    fn predict_class_edits(
        &self,
        component_id: &str,
        current_tree: &VNode,
        current_tsx: &str,
    ) -> crate::error::Result<Vec<TsxPrediction>> {
        let mut predictions = Vec::new();

        // Find all className attributes in TSX
        let class_attrs = extract_classnames_from_tsx(current_tsx);

        for class_attr in class_attrs {
            // Generate variations: add/remove common Tailwind/Bootstrap classes
            let variations = [
                format!("{} btn-primary", class_attr.classes),
                format!("{} text-red-500", class_attr.classes),
                format!("{} hidden", class_attr.classes),
                format!("{} disabled", class_attr.classes),
            ];

            for variation in variations {
                let new_tsx = current_tsx.replace(
                    &format!("className=\"{}\"", class_attr.classes),
                    &format!("className=\"{}\"", variation),
                );

                if let Some(prediction) = self.compute_tsx_prediction(
                    component_id,
                    current_tsx,
                    &new_tsx,
                    current_tree,
                )? {
                    predictions.push(prediction);
                }
            }
        }

        Ok(predictions)
    }

    /// Predict common attribute edits
    fn predict_attribute_edits(
        &self,
        component_id: &str,
        current_tree: &VNode,
        current_tsx: &str,
    ) -> crate::error::Result<Vec<TsxPrediction>> {
        let mut predictions = Vec::new();

        // Find common toggleable attributes
        let toggleable_attrs = ["disabled", "checked", "readonly", "hidden"];

        for attr in toggleable_attrs {
            if current_tsx.contains(&format!("{}=", attr)) {
                // Toggle true/false
                let variations = [
                    current_tsx.replace(&format!("{}=\"true\"", attr), &format!("{}=\"false\"", attr)),
                    current_tsx.replace(&format!("{}=\"false\"", attr), &format!("{}=\"true\"", attr)),
                    current_tsx.replace(&format!("{}={{true}}", attr), &format!("{}={{false}}", attr)),
                    current_tsx.replace(&format!("{}={{false}}", attr), &format!("{}={{true}}", attr)),
                ];

                for new_tsx in variations {
                    if let Some(prediction) = self.compute_tsx_prediction(
                        component_id,
                        current_tsx,
                        &new_tsx,
                        current_tree,
                    )? {
                        predictions.push(prediction);
                    }
                }
            }
        }

        Ok(predictions)
    }

    /// Compute patches for a TSX change
    fn compute_tsx_prediction(
        &self,
        component_id: &str,
        old_tsx: &str,
        new_tsx: &str,
        current_tree: &VNode,
    ) -> crate::error::Result<Option<TsxPrediction>> {
        // 1. Detect edit pattern
        let pattern = match crate::tsx_detector::TsxPatternDetector::detect_edit_pattern(old_tsx, new_tsx) {
            Some(p) => p,
            None => return Ok(None), // Complex change - skip
        };

        // 2. Parse new TSX → new VNode tree
        //    NOTE: This requires calling the TypeScript transformer
        //    Options:
        //    a) FFI to Node.js (via napi-rs or similar)
        //    b) Embed JavaScript engine (V8/QuickJS)
        //    c) Call external process (minimact transform CLI)
        //
        //    For MVP, use option (c) - call CLI
        let new_tree = match parse_tsx_to_vnode(new_tsx) {
            Ok(tree) => tree,
            Err(e) => {
                crate::log_warn!("Failed to parse TSX: {}", e);
                return Ok(None);
            }
        };

        // 3. Reconcile to get patches
        let patches = crate::reconciler::reconcile(current_tree, &new_tree)?;

        // 4. Build cache key (must match client-side key!)
        let _cache_key = crate::tsx_detector::TsxPatternDetector::build_cache_key(
            component_id,
            &pattern,
        );

        Ok(Some(TsxPrediction {
            component_id: component_id.to_string(),
            tsx_pattern: pattern,
            patches,
            confidence: 0.95,
            timestamp: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_millis() as u64,
        }))
    }
}

/// Parse TSX code to VNode tree
/// This calls the Minimact TypeScript transformer
fn parse_tsx_to_vnode(tsx: &str) -> crate::error::Result<VNode> {
    // For MVP, we need to call the transformer externally
    // Options:
    // 1. Call Node.js CLI: `minimact transform --tsx "code" --output vnode`
    // 2. Use FFI to call TypeScript directly (requires napi-rs)
    // 3. Embed V8 engine (heavy dependency)

    // Let's use option 1 for simplicity
    use std::process::Command;

    let output = Command::new("node")
        .arg("-e")
        .arg(format!(
            r#"
            const {{ transform }} = require('./dist/transformer');
            const tsx = `{}`;
            const result = transform(tsx);
            console.log(JSON.stringify(result.vnode));
            "#,
            tsx.replace('`', r"\`")
        ))
        .output()
        .map_err(|e| crate::error::MinimactError::Internal(
            format!("Failed to execute transformer: {}", e)
        ))?;

    let json = String::from_utf8_lossy(&output.stdout);

    serde_json::from_str(&json)
        .map_err(|e| crate::error::MinimactError::Serialization(
            format!("Failed to parse VNode: {}", e)
        ))
}

// Helper functions

fn extract_text_nodes_from_tsx(tsx: &str) -> Vec<TextNode> {
    // Use regex to find text content in JSX elements
    // Example: <h1>Count: 0</h1> → TextNode { tag: "h1", content: "Count: 0" }

    // Simplified implementation - in production, use proper JSX parser
    vec![]
}

fn extract_number(text: &str) -> Option<i32> {
    // Extract first number from text
    // Example: "Count: 42" → Some(42)
    text.split_whitespace()
        .find_map(|word| word.parse::<i32>().ok())
}

fn extract_classnames_from_tsx(tsx: &str) -> Vec<ClassAttr> {
    // Find all className="..." attributes
    vec![]
}

struct TextNode {
    tag: String,
    content: String,
}

struct ClassAttr {
    classes: String,
}
```

---

### Phase 4: Integration with HotReloadFileWatcher (2 hours)

#### 4.1 Update `HotReloadFileWatcher.cs`

**File**: `src/Minimact.AspNetCore/HotReload/HotReloadFileWatcher.cs`

Add dependency injection for Rust predictor:

```csharp
public class HotReloadFileWatcher : IDisposable
{
    private readonly IHubContext<MinimactHub> _hubContext;
    private readonly ILogger<HotReloadFileWatcher> _logger;
    private readonly ComponentRegistry _registry;
    private readonly Predictor _predictor;  // NEW: Rust predictor

    public HotReloadFileWatcher(
        IHubContext<MinimactHub> hubContext,
        ILogger<HotReloadFileWatcher> logger,
        IConfiguration configuration,
        ComponentRegistry registry,
        Predictor predictor  // NEW
    ) {
        _hubContext = hubContext;
        _logger = logger;
        _registry = registry;
        _predictor = predictor;

        // ... existing code
    }

    private async void OnFileChanged(object sender, FileSystemEventArgs e)
    {
        try
        {
            // ... existing debounce code ...

            var componentId = ExtractComponentId(e.FullPath);
            var code = await ReadFileWithRetry(e.FullPath);

            // NEW: Generate TSX predictions
            await GenerateAndSendTsxPredictions(componentId, code);

            // Send file change event (existing)
            await _hubContext.Clients.All.SendAsync("HotReload:FileChange", new
            {
                type = "file-change",
                componentId,
                filePath = e.Name,
                code,
                timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[Minimact HMR] Error processing file change");
        }
    }

    /// Generate TSX predictions and send to clients
    private async Task GenerateAndSendTsxPredictions(string componentId, string newTsx)
    {
        try
        {
            // Get current component
            var component = _registry.GetComponent(componentId);
            if (component == null)
            {
                _logger.LogWarning("[Minimact HMR] Component not found: {}", componentId);
                return;
            }

            // Generate predictions using Rust predictor
            var predictions = _predictor.GenerateTsxPredictions(
                componentId,
                component.CurrentTree,
                newTsx
            );

            _logger.LogInformation(
                "[Minimact HMR] Generated {} TSX predictions for {}",
                predictions.Count,
                componentId
            );

            // Send predictions to clients
            foreach (var prediction in predictions)
            {
                await _hubContext.Clients.All.SendAsync("HotReload:TsxPrediction", new
                {
                    type = "tsx-prediction",
                    componentId = prediction.ComponentId,
                    tsxPattern = prediction.TsxPattern,
                    patches = prediction.Patches,
                    confidence = prediction.Confidence,
                    timestamp = prediction.Timestamp
                });
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[Minimact HMR] Failed to generate TSX predictions");
        }
    }
}
```

---

### Phase 5: Client-Side Cache Population (1 hour)

#### 5.1 Update `hot-reload.ts`

**File**: `src/client-runtime/src/hot-reload.ts`

Add handler for TSX predictions:

```typescript
private async handleMessage(message: HotReloadMessage) {
  const startTime = performance.now();

  switch (message.type) {
    case 'file-change':
      await this.handleFileChange(message);
      break;

    case 'tsx-prediction':  // NEW
      this.handleTsxPrediction(message);
      break;

    case 'error':
      this.handleError(message);
      break;

    case 'connected':
      this.log('info', 'Hot reload server ready');
      break;
  }

  const latency = performance.now() - startTime;
  this.updateMetrics(latency);
}

/**
 * Handle TSX prediction from server
 * Populates the cache with pre-computed patches
 */
private handleTsxPrediction(message: any) {
  if (!message.tsxPattern || !message.patches) {
    this.log('warn', 'Invalid TSX prediction message');
    return;
  }

  // Build cache key (must match server-side key!)
  const cacheKey = this.detector.buildCacheKey(
    message.componentId,
    message.tsxPattern
  );

  // Populate cache
  this.tsxPredictionCache.set(cacheKey, message.patches);

  this.log('debug', `📦 Cached TSX prediction: ${cacheKey} (${message.patches.length} patches, confidence: ${(message.confidence * 100).toFixed(0)}%)`);

  // Show notification if enabled
  if (this.config.showNotifications) {
    this.log('info', `🔮 Prediction cached: ${message.tsxPattern.pattern_type}`);
  }
}
```

---

### Phase 6: Testing (3 hours)

#### 6.1 Unit Tests

**File**: `src/tests/predictor_tsx_tests.rs`

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use crate::predictor::Predictor;
    use crate::vdom::VNode;

    #[test]
    fn test_generate_text_predictions() {
        let mut predictor = Predictor::new();

        let tsx = r#"
            <div>
                <h1>Count: 0</h1>
            </div>
        "#;

        let tree = VNode::element("div", HashMap::new(), vec![
            VNode::element("h1", HashMap::new(), vec![
                VNode::text("Count: 0")
            ])
        ]);

        let predictions = predictor.generate_tsx_predictions(
            "Counter",
            &tree,
            tsx
        ).unwrap();

        // Should generate predictions for "Count: 1", "Count: 2", etc.
        assert!(predictions.len() > 0);

        // Check first prediction
        let first = &predictions[0];
        assert_eq!(first.component_id, "Counter");
        assert_eq!(first.tsx_pattern.pattern_type, PatternType::TsxTextChange);
        assert!(first.patches.len() > 0);
        assert!(first.confidence > 0.9);
    }

    #[test]
    fn test_tsx_pattern_detection() {
        let old_tsx = r#"<h1>Count: 0</h1>"#;
        let new_tsx = r#"<h1>Count: 1</h1>"#;

        let pattern = TsxPatternDetector::detect_edit_pattern(old_tsx, new_tsx);

        assert!(pattern.is_some());
        let pattern = pattern.unwrap();
        assert_eq!(pattern.pattern_type, PatternType::TsxTextChange);
        assert_eq!(pattern.old_value, Some("Count: 0".to_string()));
        assert_eq!(pattern.new_value, Some("Count: 1".to_string()));
    }

    #[test]
    fn test_cache_key_matches_client() {
        // Ensure Rust cache key matches TypeScript cache key
        let pattern = TsxEditPattern {
            pattern_type: PatternType::TsxTextChange,
            element_path: Some("h1".to_string()),
            old_value: Some("Count: 0".to_string()),
            new_value: Some("Count: 1".to_string()),
            old_classes: None,
            new_classes: None,
            attribute_name: None,
            style_property: None,
        };

        let key = TsxPatternDetector::build_cache_key("Counter", &pattern);

        // Expected format: "Counter:text:h1:Count: 0→Count: 1"
        assert_eq!(key, "Counter:text:h1:Count: 0→Count: 1");
    }
}
```

#### 6.2 Integration Test

Create a test Counter component:

```tsx
// test-components/Counter.tsx
import { useState } from 'minimact';

export function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <h1>Count: {count}</h1>
      <button className="btn" onClick={() => setCount(count + 1)}>
        Increment
      </button>
    </div>
  );
}
```

Test flow:
1. Start dev server
2. Load Counter component
3. Check that predictions are generated
4. Edit TSX file: `<h1>Count: {count}</h1>` → `<h1>Counter: {count}</h1>`
5. Verify hot reload happens in <5ms
6. Check browser console for cache hit confirmation

---

## Performance Targets

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Prediction generation time | <100ms per component | Server-side timing logs |
| Number of predictions | 10-50 per component | Count in logs |
| Cache hit rate | >85% for common edits | Client-side metrics |
| Hot reload latency (cache hit) | <5ms | Browser performance.now() |
| Hot reload latency (cache miss) | <150ms | Fallback to server |
| Memory usage (predictions) | <10MB per component | Rust memory estimation |

---

## Configuration

Add to `appsettings.Development.json`:

```json
{
  "Minimact": {
    "HotReload": {
      "Enabled": true,
      "WatchPath": "./Components",
      "GenerateTsxPredictions": true,
      "MaxPredictionsPerComponent": 50,
      "PredictionConfidenceThreshold": 0.9
    }
  }
}
```

---

## Rollout Plan

### Week 1: Core Implementation
- [ ] Day 1-2: Rust types and enums (Phase 1)
- [ ] Day 3-4: TSX pattern detection (Phase 2)
- [ ] Day 5: TSX prediction generator (Phase 3)

### Week 2: Integration & Testing
- [ ] Day 1-2: HotReloadFileWatcher integration (Phase 4)
- [ ] Day 3: Client-side cache population (Phase 5)
- [ ] Day 4-5: Testing and bug fixes (Phase 6)

### Week 3: Polish & Documentation
- [ ] Performance optimization
- [ ] Edge case handling
- [ ] Documentation
- [ ] Blog post: "The Hottest Hot Reload Ever"

---

## Success Criteria

1. ✅ Cache is automatically populated on file changes
2. ✅ Common text edits reload in <5ms
3. ✅ Common class edits reload in <5ms
4. ✅ Complex edits fall back to server gracefully
5. ✅ No crashes or errors during development
6. ✅ Memory usage stays under 100MB
7. ✅ Cache hit rate >85% for typical development workflow

---

## Open Questions

1. **TSX Parsing**: Should we embed a JavaScript engine in Rust, or call external Node.js process?
   - **Recommendation**: Use external Node.js for MVP, optimize later with napi-rs

2. **Prediction Scope**: How many variations should we generate per text node/class/etc.?
   - **Recommendation**: Start with 5-10 variations per element, tune based on cache hit rate

3. **Cache Eviction**: Should client cache have size limits?
   - **Recommendation**: Yes, limit to 1000 entries, use LRU eviction

4. **Production Mode**: Should predictions be disabled in production?
   - **Recommendation**: Yes, only enable in development

5. **Cross-Component Predictions**: Should predictions work across different components?
   - **Recommendation**: No, scope predictions to component_id for simplicity

---

## Alternative Approaches Considered

### Option 1: Client-Side esbuild (Rejected)
- **Pros**: No server round-trip
- **Cons**: 50ms latency, large bundle size, complex setup
- **Why rejected**: Predictive mapping is 10x faster

### Option 2: C# Prediction Generator (Rejected)
- **Pros**: No Rust changes needed
- **Cons**: Duplicates predictor logic, slower than Rust
- **Why rejected**: Reusing Rust predictor is more elegant

### Option 3: No Predictions (Rejected)
- **Pros**: Simple, no new code
- **Cons**: Always uses 150ms fallback
- **Why rejected**: Defeats the purpose of "hottest ever" reload

---

## Future Enhancements

### Phase 2: Learning from Actual Edits
- Track actual developer edits
- Learn common patterns specific to each developer
- Personalized prediction cache

### Phase 3: Multi-Edit Predictions
- Predict multiple simultaneous changes
- Example: Text + class change together

### Phase 4: Semantic Predictions
- Use AST parsing instead of line-based diff
- Detect refactorings (rename, extract, etc.)

### Phase 5: AI-Powered Predictions
- Use GPT to predict likely next edits
- Based on code context and developer history

---

## Risks and Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| TSX parsing fails | High | Medium | Fallback to server re-render |
| Prediction generation is slow | Medium | Low | Cache predictions, limit variations |
| Cache keys mismatch | High | Medium | Comprehensive unit tests |
| Memory leak in cache | Medium | Low | LRU eviction, size limits |
| Predictions are incorrect | Low | Low | Always verify in background |

---

## Conclusion

Enhancing the Rust predictor to generate TSX predictions is the cleanest path to achieving "hottest ever" hot reload (<5ms). It reuses existing infrastructure, leverages Rust's performance, and completes the predictive mapping architecture.

**Next Step**: Begin Phase 1 implementation (Rust types and enums).

🔥 **Let's make the hottest hot reload system in the world!** 🚀
