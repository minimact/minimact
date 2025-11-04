# Minimact Transpiler

**Two-Phase Transpilation System: JSX → JSON → C#**

This is a next-generation transpiler for Minimact that separates concerns between JSX parsing (Babel) and code generation (C#) using a JSON intermediate representation.

## Architecture

```
┌──────────────────┐
│   Component.tsx  │  ← Source file
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Babel Plugin    │  ← Phase 1: Parse JSX, analyze templates
│  (JavaScript)    │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Component.json  │  ← Intermediate representation
└────────┬─────────┘     - Hex-based paths
         │               - Type discriminators
         ▼               - Template metadata
┌──────────────────┐
│  C# CodeGen      │  ← Phase 2: Visitor pattern, code generation
│  (C# + Roslyn)   │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Component.Gen.cs │  ← Generated C# with template attributes
└──────────────────┘
```

## Why Two Phases?

### Old Approach (babel-plugin-minimact)
- ❌ Babel generates C# strings directly
- ❌ Hard to debug (string manipulation)
- ❌ No type safety
- ❌ Difficult to extend
- ❌ Mixed concerns (parsing + codegen)

### New Approach (minimact-transpiler)
- ✅ Babel focuses on JSX analysis
- ✅ C# focuses on code generation
- ✅ JSON as clean contract between phases
- ✅ Type-safe C# classes for AST nodes
- ✅ Visitor pattern for extensibility
- ✅ Easy to debug (inspect JSON)
- ✅ Easy to test phases independently

## Hex Path System

Instead of integer indices `[0, 1, 2]`, we use **8-digit hex codes** with generous spacing:

```
10000000                    ← First element (gap: 0x10000000 = 268M)
  10000000.10000000         ← First child
  10000000.20000000         ← Second child
  10000000.30000000         ← Third child
20000000                    ← Second element
```

### Benefits

1. **Insertion-friendly**: Add elements anywhere without renumbering
2. **Lexicographic sorting**: Works as string comparison
3. **Billions of slots**: ~268 million insertions between any two elements
4. **Human-readable**: Visualize tree structure from paths
5. **Collision-free**: Practically impossible to run out of space

### Example: Inserting Between Elements

```
Original:
  10000000.10000000
  10000000.30000000

Insert between:
  10000000.10000000
  10000000.20000000  ← NEW! No renumbering needed
  10000000.30000000

Need more granularity:
  10000000.10000000
  10000000.18000000  ← NEW!
  10000000.20000000
  10000000.28000000  ← NEW!
  10000000.30000000
```

## Directory Structure

```
src/minimact-transpiler/
├── babel/                      # Phase 1: Babel plugin
│   ├── src/
│   │   ├── index.js           # Main plugin entry point
│   │   ├── hexPath.js         # Hex path generator
│   │   └── nodes.js           # JSON node factories
│   ├── package.json
│   └── README.md
│
└── codegen/                    # Phase 2: C# code generator
    └── Minimact.Transpiler.CodeGen/
        ├── Nodes/
        │   └── ComponentNode.cs   # C# class hierarchy
        ├── Visitors/
        │   ├── INodeVisitor.cs    # Visitor interface
        │   └── CSharpCodeGenerator.cs  # Code generation visitor
        └── Transpiler.cs          # Main transpiler orchestrator
```

## JSON Schema

### Example: Counter Component

**Input (Counter.tsx):**
```tsx
export function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div className={`counter count-${count}`}>
      <h1>Count: {count}</h1>
      <button onClick={() => setCount(count + 1)}>Increment</button>
    </div>
  );
}
```

**Output (Counter.json):**
```json
{
  "type": "Component",
  "componentName": "Counter",
  "renderMethod": {
    "type": "RenderMethod",
    "children": [
      {
        "type": "JSXElement",
        "tag": "div",
        "path": "10000000",
        "pathSegments": ["10000000"],
        "isStructural": false,
        "attributes": [
          {
            "type": "AttributeTemplate",
            "path": "10000000.@className",
            "pathSegments": ["10000000", "@className"],
            "attribute": "className",
            "template": "counter count-{0}",
            "bindings": ["count"],
            "slots": [0]
          }
        ],
        "children": [
          {
            "type": "JSXElement",
            "tag": "h1",
            "path": "10000000.10000000",
            "pathSegments": ["10000000", "10000000"],
            "isStructural": false,
            "children": [
              {
                "type": "TextTemplate",
                "path": "10000000.10000000.10000000",
                "pathSegments": ["10000000", "10000000", "10000000"],
                "template": "Count: {0}",
                "bindings": ["count"],
                "slots": [0]
              }
            ]
          },
          {
            "type": "JSXElement",
            "tag": "button",
            "path": "10000000.20000000",
            "pathSegments": ["10000000", "20000000"],
            "isStructural": true,
            "children": [
              {
                "type": "StaticText",
                "path": "10000000.20000000.10000000",
                "pathSegments": ["10000000", "20000000", "10000000"],
                "content": "Increment"
              }
            ]
          }
        ]
      }
    ]
  }
}
```

**Generated C# (Counter.Generated.cs):**
```csharp
using Minimact.AspNetCore.Core;
using Minimact.AspNetCore.Attributes;

namespace Generated;

[AttributeTemplate(Path = new[] { "10000000", "@className" }, Attribute = "className", Template = "counter count-{0}", Bindings = new[] { "count" })]
[TextTemplate(Path = new[] { "10000000", "10000000", "10000000" }, Template = "Count: {0}", Bindings = new[] { "count" })]
public class Counter : MinimactComponent
{
    protected override VNode Render()
    {
        // TODO: Render implementation will be generated
        return new VNode();
    }
}
```

## Node Types

### BaseNode
All nodes inherit from this base class with common properties:
- `type` - Discriminator for deserialization
- `path` - Hex path (e.g., "10000000.20000000")
- `pathSegments` - Parsed segments

### Specific Node Types

1. **ComponentNode** - Root component definition
2. **RenderMethodNode** - Container for render method body
3. **JSXElementNode** - HTML/DOM element (`<div>`, `<span>`, etc.)
4. **TextTemplateNode** - Dynamic text with bindings (`Count: {0}`)
5. **StaticTextNode** - Static text (no bindings)
6. **AttributeTemplateNode** - Dynamic attribute (`className={...}`)
7. **LoopTemplateNode** - Array.map() loops
8. **ConditionalTemplateNode** - Ternary or logical operators

## Usage

### Phase 1: Babel Plugin

```bash
cd babel
npm install
```

```javascript
// babel.config.js
module.exports = {
  plugins: [
    ['./src/minimact-transpiler/babel/src/index.js', {
      outputDir: './Generated/json',
      hexGap: 0x10000000  // Optional: default gap
    }]
  ]
};
```

Run Babel:
```bash
npx babel src/components --out-dir Generated/json
```

### Phase 2: C# CodeGen

```bash
cd codegen/Minimact.Transpiler.CodeGen
dotnet build
```

```csharp
using Minimact.Transpiler.CodeGen;

var transpiler = new Transpiler();
transpiler.TranspileDirectory(
    jsonDir: "./Generated/json",
    outputDir: "./Generated/cs"
);
```

## Migration Path

This new system is designed to run alongside the existing `babel-plugin-minimact`:

1. ✅ **Phase 1**: Create `minimact-transpiler` (this repo)
2. ⏳ **Phase 2**: Migrate template extraction logic from old plugin
3. ⏳ **Phase 3**: Add loop and conditional support
4. ⏳ **Phase 4**: Test with existing Minimact examples
5. ⏳ **Phase 5**: Update build tooling
6. ⏳ **Phase 6**: Deprecate old plugin

## Benefits Summary

| Feature | Old Plugin | New Transpiler |
|---------|-----------|----------------|
| Separation of concerns | ❌ | ✅ |
| Type safety | ❌ | ✅ |
| Easy to debug | ❌ | ✅ |
| Extensible | ⚠️ | ✅ |
| Testable | ⚠️ | ✅ |
| Insertion-friendly paths | ❌ | ✅ |
| JSON inspection | ❌ | ✅ |
| Visitor pattern | ❌ | ✅ |

## Future Enhancements

- [ ] Loop template support (Array.map)
- [ ] Conditional template support (ternary, &&, ||)
- [ ] Style object templates
- [ ] Event handler templates
- [ ] Component prop templates
- [ ] Fragment support
- [ ] Portal support
- [ ] CLI tool for easy invocation
- [ ] Watch mode for development
- [ ] Source maps for debugging

## License

MIT
