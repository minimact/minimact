# Hot Reload Template Patches - Architecture

**Status**: Design Complete - Ready for Implementation
**Priority**: High - Enables truly instant hot reload with minimal memory
**Innovation**: Parameterized patches via template source mapping

---

## Executive Summary

Instead of pre-computing 1000+ variations of text changes, we create **template patches** with parameters. A Babel plugin generates a template mapping at build time, and hot reload sends parameterized patches that work with any value.

**Key Innovation**: Text nodes become "virtual state" in dev mode, with templates that bind to component state.

---

## The Problem with Prediction-Based Approach

### Prediction Approach (Previous Design)
```rust
// Pre-compute every possible variation:
predictions = {
  "Count: 0" → [UpdateText { content: "Count: 0" }],
  "Count: 1" → [UpdateText { content: "Count: 1" }],
  "Count: 2" → [UpdateText { content: "Count: 2" }],
  // ... 1000+ more variations
}

// Memory: 50KB per component
// Coverage: Only predicted values (85% hit rate)
// Flexibility: Fixed set of values
```

### Template Approach (This Design)
```rust
// One template covers ALL values:
template = {
  "h1[0].text": TemplatePatch {
    template: "Count: {0}",
    bindings: ["count"],
    patch: UpdateTextTemplate { path: [0], slots: [7] }
  }
}

// Memory: 2KB per component
// Coverage: ALL possible values (100% hit rate)
// Flexibility: Infinite - works with any value
```

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    BUILD TIME (Babel)                        │
│                                                              │
│  TSX Source:                                                 │
│  <h1>Count: {count}</h1>                                    │
│                                                              │
│  Babel Plugin Detects:                                       │
│  - Text node with expression: {count}                        │
│  - Position in tree: h1[0].text                             │
│                                                              │
│  Generates Template Map:                                     │
│  {                                                           │
│    "h1[0].text": {                                          │
│      template: "Count: {0}",                                │
│      bindings: ["count"],                                   │
│      patch: {                                               │
│        type: "UpdateTextTemplate",                          │
│        path: [0],                                           │
│        slots: [7]  // Character position                    │
│      }                                                       │
│    }                                                         │
│  }                                                           │
│                                                              │
│  Outputs:                                                    │
│  - C# code (component.g.cs)                                 │
│  - Template map (component.templates.json) ← NEW!           │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                   RUNTIME (Dev Mode)                         │
│                                                              │
│  Component Loads:                                            │
│  1. C# executes → VNode tree                                │
│  2. Server loads template map                                │
│  3. Server sends initial state + templates to client         │
│                                                              │
│  Client State:                                               │
│  {                                                           │
│    count: 0,  // Regular state                              │
│    _templates: {  // Virtual state for text nodes           │
│      "text_0": {                                            │
│        template: "Count: {0}",                              │
│        bindings: ["count"],                                 │
│        value: 0                                             │
│      }                                                       │
│    }                                                         │
│  }                                                           │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                  HOT RELOAD (Instant!)                       │
│                                                              │
│  Developer Edits TSX:                                        │
│  OLD: <h1>Count: {count}</h1>                               │
│  NEW: <h1>Counter: {count}</h1>                             │
│                                                              │
│  File Watcher Detects:                                       │
│  - Template changed: "Count: {0}" → "Counter: {0}"          │
│  - Bindings unchanged: still ["count"]                      │
│  - No structural change (still h1 > text)                   │
│                                                              │
│  Server Sends Template Patch:                                │
│  {                                                           │
│    type: "UpdateTextTemplate",                              │
│    componentId: "Counter",                                   │
│    path: [0],                                               │
│    template: "Counter: {0}",  // NEW template               │
│    params: [0],  // Current count value                     │
│    bindings: ["count"]                                      │
│  }                                                           │
│                                                              │
│  Client Applies (3ms):                                       │
│  1. Render: "Counter: {0}".replace("{0}", 0) → "Counter: 0" │
│  2. Update DOM: textNode.textContent = "Counter: 0"         │
│  3. Update virtual state: _templates["text_0"].template     │
│                                                              │
│  Result: DOM shows "Counter: 0" ✅ Instant!                 │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│              FUTURE STATE CHANGES (Use Template)             │
│                                                              │
│  User Clicks Increment:                                      │
│  setCount(1)                                                │
│                                                              │
│  Client State Manager:                                       │
│  const template = context.state.get('_templates.text_0');   │
│  const newText = template.template.replace("{0}", 1);       │
│  // "Counter: 1" ✅ Uses new template automatically!        │
│                                                              │
│  DOM: "Counter: 1" ✅                                        │
└─────────────────────────────────────────────────────────────┘
```

---

## Component Breakdown

### 1. Babel Plugin: Template Extractor

**File**: `packages/babel-plugin-minimact-templates/src/index.ts`

```typescript
import { NodePath, PluginObj } from '@babel/core';
import * as t from '@babel/types';

interface TemplateBinding {
  path: string;          // "h1[0].text"
  template: string;      // "Count: {0}"
  bindings: string[];    // ["count"]
  slots: number[];       // [7] - character positions
}

export default function minimactTemplatesPlugin(): PluginObj {
  return {
    name: 'minimact-templates',

    visitor: {
      Program(path, state) {
        state.templates = [];
        state.nodeCounter = 0;
      },

      JSXElement(path, state) {
        // Track element hierarchy for path generation
        const nodePath = getNodePath(path);

        path.traverse({
          JSXText(textPath) {
            const text = textPath.node.value.trim();
            if (!text) return;

            // Static text - no template needed
            state.templates.push({
              path: `${nodePath}.text`,
              template: text,
              bindings: [],
              slots: []
            });
          },

          JSXExpressionContainer(exprPath) {
            // <h1>{count}</h1>
            if (t.isIdentifier(exprPath.node.expression)) {
              const binding = exprPath.node.expression.name;

              state.templates.push({
                path: `${nodePath}.text`,
                template: '{0}',  // Entire content is expression
                bindings: [binding],
                slots: [0]
              });
            }

            // <h1>Count: {count}</h1>
            if (exprPath.parent.type === 'JSXElement') {
              const parent = exprPath.parentPath.parent;
              if (t.isJSXElement(parent)) {
                const children = parent.children;
                const template = buildTemplate(children);
                const bindings = extractBindings(children);
                const slots = calculateSlots(template, bindings);

                state.templates.push({
                  path: `${nodePath}.text`,
                  template,
                  bindings,
                  slots
                });
              }
            }
          }
        });
      },

      // After traversal, write template map
      ProgramExit(path, state) {
        const templateMap = {
          component: state.file.opts.filename,
          templates: state.templates.reduce((acc, t) => {
            acc[t.path] = {
              template: t.template,
              bindings: t.bindings,
              slots: t.slots
            };
            return acc;
          }, {})
        };

        // Write to .templates.json file
        const outputPath = state.file.opts.filename.replace('.tsx', '.templates.json');
        fs.writeFileSync(outputPath, JSON.stringify(templateMap, null, 2));

        console.log(`[Minimact Templates] Generated ${state.templates.length} templates`);
      }
    }
  };
}

function buildTemplate(children: JSXChild[]): string {
  let template = '';
  let slotIndex = 0;

  for (const child of children) {
    if (t.isJSXText(child)) {
      template += child.value;
    } else if (t.isJSXExpressionContainer(child)) {
      template += `{${slotIndex++}}`;
    }
  }

  return template;
}

function extractBindings(children: JSXChild[]): string[] {
  const bindings: string[] = [];

  for (const child of children) {
    if (t.isJSXExpressionContainer(child)) {
      if (t.isIdentifier(child.expression)) {
        bindings.push(child.expression.name);
      }
    }
  }

  return bindings;
}

function calculateSlots(template: string, bindings: string[]): number[] {
  const slots: number[] = [];
  let index = 0;

  for (let i = 0; i < bindings.length; i++) {
    const placeholder = `{${i}}`;
    const pos = template.indexOf(placeholder);
    if (pos !== -1) {
      slots.push(pos);
    }
  }

  return slots;
}

function getNodePath(path: NodePath): string {
  // Generate path like "div[0].h1[0]"
  const ancestors: string[] = [];
  let current = path;

  while (current && current.isJSXElement()) {
    const tagName = getTagName(current);
    const index = getSiblingIndex(current);
    ancestors.unshift(`${tagName}[${index}]`);
    current = current.parentPath;
  }

  return ancestors.join('.');
}
```

**Output Example** (`Counter.templates.json`):
```json
{
  "component": "Counter.tsx",
  "templates": {
    "div[0].h1[0].text": {
      "template": "Count: {0}",
      "bindings": ["count"],
      "slots": [7]
    },
    "div[0].button[0].text": {
      "template": "Increment",
      "bindings": [],
      "slots": []
    }
  }
}
```

### 2. Rust: Template Patch Type

**File**: `src/src/vdom.rs`

```rust
/// Template patch - parameterized patch for hot reload
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TemplatePatch {
    /// Template string with {0}, {1}, etc. placeholders
    pub template: String,
    /// Current parameter values
    pub params: Vec<serde_json::Value>,
    /// State bindings that fill the template
    pub bindings: Vec<String>,
    /// Character positions where params are inserted
    pub slots: Vec<usize>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum Patch {
    // Existing patches...
    Create { path: Vec<usize>, vnode: VNode },
    Remove { path: Vec<usize> },
    UpdateText { path: Vec<usize>, content: String },
    UpdateProp { path: Vec<usize>, name: String, value: String },

    // NEW: Template patches for hot reload
    /// Update text using template (dev mode only)
    UpdateTextTemplate {
        path: Vec<usize>,
        template_patch: TemplatePatch,
    },

    /// Update prop using template (dev mode only)
    UpdatePropTemplate {
        path: Vec<usize>,
        prop_name: String,
        template_patch: TemplatePatch,
    },
}
```

**File**: `src/src/predictor.rs`

```rust
/// Template mapping for a component (replaces ComponentPredictionMap)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ComponentTemplateMap {
    pub component_id: String,
    /// Map from node path to template
    /// e.g., "h1[0].text" → Template { "Count: {0}", ["count"] }
    pub templates: HashMap<String, Template>,
    pub source_tsx: String,
    pub generated_at: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Template {
    pub template: String,
    pub bindings: Vec<String>,
    pub slots: Vec<usize>,
}

impl Predictor {
    /// Load template map from JSON file (generated by Babel)
    pub fn load_template_map(
        &mut self,
        component_id: &str,
        template_json: &str,
    ) -> crate::error::Result<()> {
        let map: ComponentTemplateMap = serde_json::from_str(template_json)?;
        self.template_maps.insert(component_id.to_string(), map);
        Ok(())
    }

    /// Generate template patch for hot reload
    /// Returns None if no template found or structural change
    pub fn generate_template_patch(
        &self,
        component_id: &str,
        old_tsx: &str,
        new_tsx: &str,
        current_state: &HashMap<String, serde_json::Value>,
    ) -> Option<Patch> {
        let template_map = self.template_maps.get(component_id)?;

        // Detect which template changed
        for (path, template) in &template_map.templates {
            let old_rendered = render_template(template, old_tsx, current_state);
            let new_rendered = render_template(template, new_tsx, current_state);

            if old_rendered != new_rendered {
                // Template changed - generate patch
                let new_template = extract_template_from_tsx(new_tsx, path);

                return Some(Patch::UpdateTextTemplate {
                    path: parse_path(path),
                    template_patch: TemplatePatch {
                        template: new_template.template,
                        params: template.bindings.iter()
                            .map(|b| current_state.get(b).cloned().unwrap_or(serde_json::Value::Null))
                            .collect(),
                        bindings: new_template.bindings,
                        slots: new_template.slots,
                    }
                });
            }
        }

        None
    }
}
```

### 3. Client: Template State Manager

**File**: `src/client-runtime/src/template-state.ts`

```typescript
/**
 * Template State Manager
 * Manages "virtual state" for text nodes in dev mode
 */
export class TemplateStateManager {
  private templates: Map<string, TemplateState> = new Map();

  /**
   * Register a template for a text node
   */
  registerTemplate(
    nodePath: string,
    template: string,
    bindings: string[],
    initialValue: any
  ): void {
    this.templates.set(nodePath, {
      template,
      bindings,
      value: initialValue,
      slots: this.calculateSlots(template)
    });
  }

  /**
   * Update template (hot reload)
   */
  updateTemplate(
    nodePath: string,
    newTemplate: string,
    currentValue: any
  ): string {
    const state = this.templates.get(nodePath);
    if (!state) {
      console.warn(`[TemplateState] No template found for ${nodePath}`);
      return currentValue;
    }

    // Update template
    state.template = newTemplate;
    state.slots = this.calculateSlots(newTemplate);

    // Render with current value
    return this.render(nodePath, currentValue);
  }

  /**
   * Render template with value
   */
  render(nodePath: string, value: any): string {
    const state = this.templates.get(nodePath);
    if (!state) return String(value);

    // Simple template rendering: replace {0}, {1}, etc.
    let result = state.template;
    const values = Array.isArray(value) ? value : [value];

    values.forEach((v, i) => {
      result = result.replace(`{${i}}`, String(v));
    });

    return result;
  }

  /**
   * Apply template patch from server
   */
  applyTemplatePatch(patch: TemplatePatch, domPatcher: DOMPatcher): void {
    const { path, template_patch } = patch;
    const { template, params, bindings } = template_patch;

    // Render template with params
    let text = template;
    params.forEach((param, i) => {
      text = text.replace(`{${i}}`, String(param));
    });

    // Update DOM
    domPatcher.updateText(path, text);

    // Update template state
    const nodePath = path.join('_');
    this.templates.set(nodePath, {
      template,
      bindings,
      value: params,
      slots: this.calculateSlots(template)
    });
  }

  private calculateSlots(template: string): number[] {
    const slots: number[] = [];
    const regex = /\{(\d+)\}/g;
    let match;

    while ((match = regex.exec(template)) !== null) {
      slots.push(match.index);
    }

    return slots;
  }
}

interface TemplateState {
  template: string;
  bindings: string[];
  value: any;
  slots: number[];
}

interface TemplatePatch {
  path: number[];
  template_patch: {
    template: string;
    params: any[];
    bindings: string[];
    slots: number[];
  };
}
```

### 4. Server: Template Hot Reload

**File**: `src/Minimact.AspNetCore/HotReload/TemplateHotReloadManager.cs`

```csharp
public class TemplateHotReloadManager
{
    private readonly IHubContext<MinimactHub> _hubContext;
    private readonly ComponentRegistry _registry;
    private readonly Predictor _predictor;
    private readonly ILogger<TemplateHotReloadManager> _logger;

    // Cache of loaded template maps
    private readonly Dictionary<string, ComponentTemplateMap> _templateMaps = new();

    public async Task HandleFileChange(string componentId, string newTsxPath)
    {
        try
        {
            // Load template map (generated by Babel)
            var templateMapPath = newTsxPath.Replace(".tsx", ".templates.json");
            if (!File.Exists(templateMapPath))
            {
                _logger.LogWarning("No template map found for {}", componentId);
                return;
            }

            var templateJson = await File.ReadAllTextAsync(templateMapPath);
            var newTemplateMap = JsonSerializer.Deserialize<ComponentTemplateMap>(templateJson);

            // Get old template map
            var hadOldMap = _templateMaps.TryGetValue(componentId, out var oldTemplateMap);

            if (!hadOldMap)
            {
                // First load - just cache it
                _templateMaps[componentId] = newTemplateMap;
                await SendInitialTemplates(componentId, newTemplateMap);
                return;
            }

            // Detect template changes
            var changes = DetectTemplateChanges(oldTemplateMap, newTemplateMap);

            if (changes.Count == 0)
            {
                _logger.LogDebug("No template changes for {}", componentId);
                return;
            }

            // Get current component state
            var component = _registry.GetComponent(componentId);
            var currentState = component.GetState();

            // Generate template patches
            foreach (var change in changes)
            {
                var patch = new TemplatePatch
                {
                    Type = "UpdateTextTemplate",
                    Path = ParsePath(change.NodePath),
                    TemplatePatch = new TemplatePatchData
                    {
                        Template = change.NewTemplate.Template,
                        Params = change.NewTemplate.Bindings
                            .Select(b => currentState.GetValueOrDefault(b))
                            .ToArray(),
                        Bindings = change.NewTemplate.Bindings,
                        Slots = change.NewTemplate.Slots
                    }
                };

                // Send to all clients
                await _hubContext.Clients.All.SendAsync("ApplyTemplatePatch", new
                {
                    componentId,
                    patch
                });

                _logger.LogInformation(
                    "[HMR] Template patch sent for {}.{}: '{}' → '{}'",
                    componentId,
                    change.NodePath,
                    change.OldTemplate.Template,
                    change.NewTemplate.Template
                );
            }

            // Update cached template map
            _templateMaps[componentId] = newTemplateMap;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error handling template hot reload");
        }
    }

    private List<TemplateChange> DetectTemplateChanges(
        ComponentTemplateMap oldMap,
        ComponentTemplateMap newMap)
    {
        var changes = new List<TemplateChange>();

        foreach (var (nodePath, newTemplate) in newMap.Templates)
        {
            if (!oldMap.Templates.TryGetValue(nodePath, out var oldTemplate))
            {
                // New template added
                changes.Add(new TemplateChange
                {
                    NodePath = nodePath,
                    OldTemplate = null,
                    NewTemplate = newTemplate,
                    ChangeType = ChangeType.Added
                });
                continue;
            }

            // Check if template string changed
            if (oldTemplate.Template != newTemplate.Template)
            {
                changes.Add(new TemplateChange
                {
                    NodePath = nodePath,
                    OldTemplate = oldTemplate,
                    NewTemplate = newTemplate,
                    ChangeType = ChangeType.Modified
                });
            }
        }

        // Check for removed templates
        foreach (var (nodePath, oldTemplate) in oldMap.Templates)
        {
            if (!newMap.Templates.ContainsKey(nodePath))
            {
                changes.Add(new TemplateChange
                {
                    NodePath = nodePath,
                    OldTemplate = oldTemplate,
                    NewTemplate = null,
                    ChangeType = ChangeType.Removed
                });
            }
        }

        return changes;
    }

    private async Task SendInitialTemplates(
        string componentId,
        ComponentTemplateMap templateMap)
    {
        await _hubContext.Clients.All.SendAsync("InitializeTemplates", new
        {
            componentId,
            templates = templateMap.Templates
        });
    }
}

public class TemplateChange
{
    public string NodePath { get; set; }
    public Template OldTemplate { get; set; }
    public Template NewTemplate { get; set; }
    public ChangeType ChangeType { get; set; }
}

public enum ChangeType
{
    Added,
    Modified,
    Removed
}
```

---

## Integration with Existing Systems

### 1. Build Pipeline

```json
// package.json
{
  "scripts": {
    "build": "babel src --out-dir dist --plugins=@babel/preset-react,minimact-templates",
    "dev": "babel src --out-dir dist --watch --plugins=@babel/preset-react,minimact-templates"
  }
}
```

### 2. Component Registration

```csharp
// MinimactComponent.cs
public abstract class MinimactComponent
{
    // Existing state
    protected Dictionary<string, object> State { get; } = new();

    // NEW: Template map (loaded from .templates.json)
    protected ComponentTemplateMap TemplateMap { get; private set; }

    public void LoadTemplateMap(string templateJson)
    {
        TemplateMap = JsonSerializer.Deserialize<ComponentTemplateMap>(templateJson);
    }
}
```

### 3. Client Hooks Integration

```typescript
// hooks.ts
export function useState<T>(initialValue: T): [T, (value: T) => void] {
  const context = currentContext;
  const stateKey = `state_${stateIndex++}`;

  // Initialize state
  if (!context.state.has(stateKey)) {
    context.state.set(stateKey, initialValue);
  }

  const setState = (newValue: T) => {
    context.state.set(stateKey, newValue);

    // Check if any templates are bound to this state
    const boundTemplates = context.templateState.getTemplatesBoundTo(stateKey);

    for (const template of boundTemplates) {
      // Re-render template with new value
      const newText = context.templateState.render(template.path, newValue);
      context.domPatcher.updateText(template.pathArray, newText);
    }

    // Also sync to server
    context.signalR.updateComponentState(context.componentId, stateKey, newValue);
  };

  return [context.state.get(stateKey), setState];
}
```

---

## Performance Characteristics

### Memory Usage
```
Prediction-Based:
  - 1000 variations × 100 bytes = 100KB per component
  - 100 components = 10MB

Template-Based:
  - 5-10 templates × 200 bytes = 2KB per component
  - 100 components = 200KB

Savings: 98% reduction! 🎉
```

### Hot Reload Latency
```
Both approaches: ~3-5ms
  - Template lookup: <1ms
  - Render template: <1ms
  - Apply patch: 1-2ms
  - DOM update: 1ms
```

### Coverage
```
Prediction-Based: 85% (only predicted values)
Template-Based: 100% (all values covered by template)
```

---

## Example: Counter Component

### Input TSX
```tsx
function Counter() {
  const [count, setCount] = useState(0);
  const [name, setName] = useState('User');

  return (
    <div>
      <h1>Hello, {name}!</h1>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>
        Increment
      </button>
    </div>
  );
}
```

### Babel Output: `Counter.templates.json`
```json
{
  "component": "Counter",
  "templates": {
    "div[0].h1[0].text": {
      "template": "Hello, {0}!",
      "bindings": ["name"],
      "slots": [7]
    },
    "div[0].p[0].text": {
      "template": "Count: {0}",
      "bindings": ["count"],
      "slots": [7]
    },
    "div[0].button[0].text": {
      "template": "Increment",
      "bindings": [],
      "slots": []
    }
  }
}
```

### Hot Reload Scenario

**Edit 1: Change greeting**
```tsx
// Change: "Hello, {name}!" → "Hi, {name}!"
```

**Server sends:**
```json
{
  "type": "UpdateTextTemplate",
  "componentId": "Counter",
  "path": [0, 0],
  "template_patch": {
    "template": "Hi, {0}!",
    "params": ["User"],
    "bindings": ["name"],
    "slots": [4]
  }
}
```

**Client applies:** "Hi, User!" ✅ (3ms)

**Edit 2: Change label**
```tsx
// Change: "Count: {count}" → "Counter: {count}"
```

**Server sends:**
```json
{
  "type": "UpdateTextTemplate",
  "componentId": "Counter",
  "path": [0, 1],
  "template_patch": {
    "template": "Counter: {0}",
    "params": [0],
    "bindings": ["count"],
    "slots": [9]
  }
}
```

**Client applies:** "Counter: 0" ✅ (3ms)

**User clicks increment:** count = 5

**Client re-renders using NEW template:** "Counter: 5" ✅

---

## Advantages Over Prediction Approach

| Aspect | Prediction-Based | Template-Based |
|--------|-----------------|----------------|
| **Memory** | 50-100KB/component | 2KB/component |
| **Coverage** | 85% (predicted values only) | 100% (all values) |
| **Flexibility** | Fixed variations | Infinite values |
| **Build Time** | Runtime generation (slow) | Build-time extraction (fast) |
| **Accuracy** | Predictions may be wrong | Always correct |
| **Scalability** | O(n) with value range | O(1) - one template |

---

## Implementation Phases

### Phase 1: Babel Plugin (Week 1)
- [ ] Implement template extraction
- [ ] Generate .templates.json files
- [ ] Test with Counter component

### Phase 2: Rust Types (Week 1)
- [ ] Add TemplatePatch type
- [ ] Add ComponentTemplateMap
- [ ] Implement template patch generation

### Phase 3: Client Integration (Week 2)
- [ ] Implement TemplateStateManager
- [ ] Update hooks to use templates
- [ ] Handle template patch application

### Phase 4: Server Integration (Week 2)
- [ ] Implement TemplateHotReloadManager
- [ ] Load template maps from JSON
- [ ] Detect and send template changes

### Phase 5: Testing & Polish (Week 3)
- [ ] End-to-end hot reload tests
- [ ] Performance benchmarks
- [ ] Documentation

---

## Future Enhancements

### 1. Conditional Templates
```tsx
<div>{isLoggedIn ? `Welcome, ${name}!` : 'Please log in'}</div>

// Template:
{
  "template": "{0}",  // Dynamic template selection
  "conditionalTemplates": {
    "true": "Welcome, {1}!",
    "false": "Please log in"
  },
  "bindings": ["isLoggedIn", "name"]
}
```

### 2. Loop Templates
```tsx
<ul>
  {items.map(item => <li>{item.name}</li>)}
</ul>

// Template:
{
  "template": "{loop:0}",
  "loopTemplate": "<li>{0}</li>",
  "bindings": ["items"]
}
```

### 3. Nested Templates
```tsx
<div>
  Hello, {user.firstName} {user.lastName}!
</div>

// Template:
{
  "template": "Hello, {0} {1}!",
  "bindings": ["user.firstName", "user.lastName"],
  "slots": [7, 10]
}
```

---

## Conclusion

Template patches provide a **superior solution** to prediction-based hot reload:

✅ **98% less memory** (2KB vs 100KB per component)
✅ **100% coverage** (works with any value)
✅ **Simpler architecture** (no prediction needed)
✅ **Build-time generation** (Babel extracts templates)
✅ **Parameterized patches** (one template, infinite values)

This approach leverages **source mapping** principles - the template map generated at build time serves as a "source map" for hot reload, enabling instant updates without TSX parsing or prediction.

**Next step:** Implement Babel plugin to extract templates.

🔥 **The hottest hot reload, with the smallest memory footprint!** 🚀
