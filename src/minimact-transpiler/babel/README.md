# @minimact/transpiler-babel

**Phase 1 of Minimact Transpiler: JSX → JSON AST**

This Babel plugin analyzes JSX components and generates a JSON intermediate representation (IR) with:

- **Hex-based paths**: Lexicographically sortable, insertion-friendly
- **Type hierarchy**: Nodes with discriminated types for C# deserialization
- **Template metadata**: Pre-analyzed templates ready for C# code generation
- **Structural markers**: Flags to optimize code generation

## Architecture

```
┌─────────────┐
│   JSX/TSX   │
└──────┬──────┘
       │ Babel Parse
       ▼
┌─────────────┐
│  Babel AST  │
└──────┬──────┘
       │ This Plugin
       ▼
┌─────────────┐
│  JSON IR    │  ← You are here!
└──────┬──────┘
       │ C# Deserialize
       ▼
┌─────────────┐
│ C# Visitor  │
└──────┬──────┘
       │ Code Generation
       ▼
┌─────────────┐
│ C# Classes  │
└─────────────┘
```

## JSON Output Format

### Component Node Types

- `Component` - Root component definition
- `RenderMethod` - Component's Render() method
- `JSXElement` - HTML/DOM element
- `TextTemplate` - Dynamic text with bindings
- `AttributeTemplate` - Dynamic attribute with bindings
- `LoopTemplate` - Array.map() loop
- `ConditionalTemplate` - Ternary or logical AND/OR

### Hex Path System

Paths use 8-digit hex codes with generous spacing (0x10000000 gap):

```
10000000                    ← First element
  10000000.10000000         ← First child
  10000000.20000000         ← Second child
  10000000.30000000         ← Third child
20000000                    ← Second element
```

**Benefits:**
- Lexicographically sortable as strings
- Insert anywhere without renumbering
- Billions of slots between elements
- Easy to debug and visualize

## Usage

```bash
npm install
```

```javascript
// babel.config.js
module.exports = {
  plugins: [
    ['@minimact/transpiler-babel', {
      outputDir: './Generated',
      hexGap: 0x10000000  // Optional: spacing between elements
    }]
  ]
};
```

## Output Example

```json
{
  "componentName": "Counter",
  "type": "Component",
  "renderMethod": {
    "type": "RenderMethod",
    "children": [
      {
        "type": "JSXElement",
        "tag": "div",
        "path": "10000000",
        "pathSegments": ["10000000"],
        "isStructural": false,
        "children": [
          {
            "type": "TextTemplate",
            "path": "10000000.10000000",
            "pathSegments": ["10000000", "10000000"],
            "template": "Count: {0}",
            "bindings": ["count"],
            "slots": [0]
          }
        ]
      }
    ]
  }
}
```

## Next Phase

The JSON output is consumed by `@minimact/transpiler-codegen` (C# project) which uses the visitor pattern to generate final C# code with template attributes.
