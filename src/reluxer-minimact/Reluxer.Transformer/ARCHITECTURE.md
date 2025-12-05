# TSX to Minimact Multi-Output Transformer Architecture

## Overview

The TSX Transformer is a **multi-output compilation system** that converts Minimact TSX components into:

1. **C# Component Classes** (`.cs`) - `MinimactComponent` subclasses with `[State]`, `[Hook]`, `[Component]`, `[Timeline]` attributes
2. **Template JSON** (`.templates.json`) - Parameterized templates for the predictive patch system

This dual-output architecture is what enables Minimact's 0-2ms interaction latency - the templates allow the Rust reconciler to pre-compute patches before user interaction.

> **Key Insight**: The template JSON is not just metadata - it's a critical runtime artifact that the Rust prediction engine consumes to generate patches.

## Design Goals

1. **Multi-Output Generation**: Single TSX input → C# code + Template JSON
2. **Composable Visitors**: Each transformation phase is a separate visitor
3. **Preserve Semantics**: Minimact patterns (useState, lifted state, hooks with UI) map to C# constructs
4. **Template Extraction**: Extract parameterized templates with bindings for prediction
5. **Extensible**: New patterns supported by adding visitors

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           TsxTransformer                                │
│                 Orchestrates the multi-output pipeline                  │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                             TsxLexer                                    │
│                    Tokenizes TSX/JSX source code                        │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         Visitor Pipeline                                │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐   │
│  │ Component    │ │ State        │ │ Handler      │ │ Jsx          │   │
│  │ Visitor      │ │ Visitor      │ │ Visitor      │ │ Visitor      │   │
│  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘   │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐                    │
│  │ Hook         │ │ Timeline     │ │ Import       │                    │
│  │ Visitor      │ │ Visitor      │ │ Visitor      │                    │
│  └──────────────┘ └──────────────┘ └──────────────┘                    │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
                          ComponentModel(s)
                    (Intermediate Representation)
                                    │
                    ┌───────────────┴───────────────┐
                    ▼                               ▼
┌─────────────────────────────┐   ┌─────────────────────────────┐
│      CSharpGenerator        │   │     TemplateGenerator       │
│                             │   │                             │
│  Outputs:                   │   │  Outputs:                   │
│  • [Component] classes      │   │  • Template strings         │
│  • [Hook] classes           │   │  • Binding arrays           │
│  • [State] fields           │   │  • Slot positions           │
│  • [Timeline] attributes    │   │  • Path arrays              │
│  • Event handlers           │   │  • Template types           │
│  • VNode tree structure     │   │  • Conditional variants     │
│  • GetClientHandlers()      │   │  • Transform metadata       │
└─────────────────────────────┘   └─────────────────────────────┘
            │                               │
            ▼                               ▼
    ComponentName.cs              ComponentName.templates.json
```

## Output Files

For each TSX component, the transformer generates **two files**:

| Input | C# Output | Template Output |
|-------|-----------|-----------------|
| `Counter.tsx` | `Counter.cs` | `Counter.templates.json` |
| `ProductPage.tsx` | `ProductPage.cs` | `ProductPage.templates.json` |
| `LiftedState.tsx` | `LiftedState.cs` | `LiftedState.templates.json` |

### C# Output Structure
```csharp
using Minimact.AspNetCore.Core;
using Minimact.AspNetCore.Rendering;
using Minimact.AspNetCore.Extensions;
using MinimactHelpers = Minimact.AspNetCore.Core.Minimact;

namespace MinimactTest.Components
{
    [Component]
    public partial class Counter : MinimactComponent
    {
        [State]
        private int count = 0;

        protected override VNode Render()
        {
            StateManager.SyncMembersToState(this);

            return new VElement("div", "1", new Dictionary<string, string> { ["class"] = "counter" }, new VNode[]
            {
                new VElement("h3", "1.1", new Dictionary<string, string>(), "Counter"),
                new VElement("p", "1.2", new Dictionary<string, string>(), $"Count:{(count)}"),
                new VElement("button", "1.3", new Dictionary<string, string> { ["onclick"] = "Handle0" }, "Increment")
            });
        }

        public void Handle0()
        {
            SetState(nameof(count), count + 1);
        }
    }
}
```

### Template JSON Output Structure
```json
{
  "component": "Counter",
  "version": "1.0",
  "generatedAt": 1762802432068,
  "templates": {
    "1.2.1": {
      "template": "Count: {0}",
      "bindings": ["count"],
      "slots": [7],
      "path": ["1", "2"],
      "type": "dynamic"
    },
    "1.@className": {
      "template": "counter",
      "bindings": [],
      "slots": [],
      "path": ["1"],
      "type": "attribute-static"
    }
  }
}
```

## Transformation Pipeline

### Phase 1: Tokenization
Uses `TsxLexer` from Reluxer core to produce a token stream.

### Phase 2: Component Extraction (`ComponentVisitor`)
Identifies component and hook boundaries.

**Patterns Matched:**
- `export default function Name() { ... }`
- `export function Name() { ... }`
- `function useName(namespace: string, ...) { ... }` → Hook
- `const Name = () => { ... }` (arrow function components)

### Phase 3: State Extraction (`StateVisitor`)
Extracts hooks and converts to C# state fields.

**Patterns Matched:**
- `const [name, setName] = useState(value)` → `[State] private dynamic name = value;`
- `state["Component.key"]` → Lifted state access

### Phase 4: Handler Extraction (`HandlerVisitor`)
Extracts event handlers.

**Inline handlers:**
```tsx
onClick={() => setCount(count + 1)}
```
Becomes:
```csharp
["onclick"] = "Handle0"
// ...
public void Handle0() { SetState(nameof(count), count + 1); }
```

### Phase 5: JSX Tree Building (`JsxVisitor`)
Converts JSX into VNode tree model AND extracts templates.

**Dual responsibility:**
1. Build `VNodeModel` tree for C# generation
2. Extract template patterns for JSON generation

### Phase 6: Multi-Output Generation

**CSharpGenerator** produces:
- Component/Hook class structure
- State field declarations
- Render() method with VNode tree
- Event handler methods
- Timeline attributes (if applicable)
- GetClientHandlers() override (for client-side JS)

**TemplateGenerator** produces:
- Template strings with `{0}`, `{1}` placeholders
- Binding arrays mapping slots to state fields
- Slot positions (character offsets)
- Path arrays for DOM targeting
- Template type classification

## Template Types

The template JSON supports multiple template types:

| Type | Description | Example |
|------|-------------|---------|
| `static` | No bindings, fixed text | `"Counter"` |
| `dynamic` | Has bindings | `"Count: {0}"` with `bindings: ["count"]` |
| `conditional` | Ternary with variants | `conditionalTemplates: { "true": "Hide", "false": "Show" }` |
| `transform` | Method transformation | `transform: { method: "toFixed", args: [2] }` |
| `nullable` | Optional chaining | `nullable: true` |
| `attribute-static` | Static attribute | `type: "attribute-static"` |
| `attribute-dynamic` | Dynamic attribute | `type: "attribute-dynamic"` |

## Data Models

### ComponentModel
```
ComponentModel
├── Name: string
├── IsDefault: bool
├── IsExported: bool
├── IsHook: bool                    // [Hook] vs [Component]
├── StateFields: List<StateField>
├── Props: List<PropField>
├── EventHandlers: List<EventHandler>
├── LocalVariables: List<LocalVariable>
├── HookConfig: HookConfigModel?    // For _config.* pattern
├── TimelineConfig: TimelineModel?  // For [Timeline] attributes
├── RenderTree: VNodeModel?
└── Templates: Dictionary<string, TemplateInfo>  // For JSON output
```

### VNode Hierarchy
```
VNodeModel (abstract)
├── HexPath: string                  // "1.2.3" - used in both outputs
├── VElementModel                    // HTML elements
├── VTextModel                       // Text (static or dynamic binding)
│   ├── IsDynamic: bool
│   └── Binding: string?             // State field reference
├── VNullModel                       // Conditional placeholder
├── VConditionalModel                // && or ternary
│   ├── Condition: string
│   ├── TrueNode: VNodeModel?
│   └── FalseNode: VNodeModel?
├── VComponentWrapperModel           // Lifted state children
│   ├── ComponentName: string
│   ├── ComponentType: string
│   └── InitialState: Dictionary<string, object>
└── VListModel                       // .map() iterations
```

### TemplateInfo (for JSON output)
```
TemplateInfo
├── Template: string                 // "Count: {0}"
├── Bindings: List<string>           // ["count"]
├── Slots: List<int>                 // [7] (character positions)
├── Path: List<string>               // ["1", "2"]
├── Type: TemplateType               // dynamic, static, conditional, etc.
├── ConditionalTemplates: Dictionary<string, string>?
├── Transform: TransformInfo?
└── Nullable: bool
```

## Key Design Decisions

### 1. Dual Output from Single Model
The `ComponentModel` intermediate representation serves both generators:
- `CSharpGenerator` reads it to produce `.cs` files
- `TemplateGenerator` reads it to produce `.templates.json` files

This ensures consistency between runtime code and prediction templates.

### 2. Path-Based Identity
Every VNode has a `HexPath` that appears in **both outputs**:
- C#: `new VElement("div", "1.2.3", ...)`
- JSON: `"1.2.3": { "template": "...", "path": ["1", "2", "3"] }`

This allows the Rust reconciler to correlate templates with DOM nodes.

### 3. Hook as Child Component Pattern
Custom hooks compile to separate `[Hook]` classes:
```csharp
[Hook]
public partial class UseCounterHook : MinimactComponent
{
    private dynamic start => GetState<dynamic>("_config.start");
    [State] private dynamic count = start;
    // ...
}
```

Usage becomes `VComponentWrapper` with `_config.param*` pattern:
```csharp
new VComponentWrapper
{
    ComponentName = "counter1",
    ComponentType = "UseCounterHook",
    HexPath = "1.2.4",
    InitialState = new Dictionary<string, object> { ["_config.param0"] = 0 }
}
```

### 4. MObject for Truthiness
Conditionals wrap values in `MObject` for JavaScript-like truthiness:
```csharp
(new MObject(myState)) ? new VElement(...) : new VNull("1.2")
```

### 5. Template Slot Extraction
Dynamic text is converted to templates with slot positions:
```tsx
<p>Count: {count}, Total: {total}</p>
```
Becomes:
```json
{
  "template": "Count: {0}, Total: {1}",
  "bindings": ["count", "total"],
  "slots": [7, 23],
  "type": "dynamic"
}
```

## Extension Points

### Adding New Hook Support
1. Add pattern to `StateVisitor` or `HookVisitor`
2. Create corresponding model property
3. Update `CSharpGenerator` for C# output
4. Update `TemplateGenerator` for JSON output

### Adding New Template Types
1. Add type to `TemplateType` enum
2. Implement extraction in `JsxVisitor`
3. Add serialization in `TemplateGenerator`
4. Document for Rust reconciler team

### Custom Output Formats
Implement additional generators that consume `ComponentModel`:
```csharp
public class RustBindingsGenerator
{
    public string Generate(List<ComponentModel> components) { ... }
}
```

## Limitations

1. **No TypeScript type analysis**: Types inferred from values, not annotations
2. **Limited expression transformation**: Complex JS → C# may fail
3. **No import resolution**: Cross-file dependencies not tracked
4. **Simplified handler conversion**: Complex closures may not transform

## Future Improvements

1. TypeScript type annotation parsing
2. Import/export graph resolution
3. Source maps for debugging (TSX line → C# line → JSON path)
4. Incremental transformation (only regenerate changed components)
5. Rust binding generation (direct Rust structs from templates)
6. Validation between C# and JSON outputs
