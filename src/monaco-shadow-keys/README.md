# Monaco Shadow Keys

**Invisible JSX key tracking for Minimact hot reload**

## What is this?

A Monaco Editor prototype that tracks JSX element positions and generates stable hex paths **invisibly** - developers never see the keys in their code, but they're maintained in a separate `.keys.json` shadow file.

## How it works

### 1. **Live Tracking**
- As you type JSX, the editor parses it in real-time (using `babel-plugin-minimact`)
- Each JSX tag gets assigned a hex path (e.g., `"1.2.3"`)
- The mapping is stored in memory: `{ "3:5": { hexPath: "1", tagName: "div", ... } }`

### 2. **Hybrid Matching**
- **AST Signature** (primary): `parentPath.tagName.firstAttribute`
- **Position** (fallback): `line:column`
- Keys remain stable across edits (only regenerate when tag changes)

### 3. **On Save (Ctrl+S)**
- Exports **two files**:
  - `Counter.tsx` - Clean source code (no keys!)
  - `Counter.tsx.keys.json` - Shadow key map
- Babel plugin reads `.keys.json` during transpilation to inject correct paths

## Architecture

```
src/
├── core/
│   ├── types.ts              # TypeScript interfaces
│   ├── HexPathGenerator.ts   # Generates hex paths (1, 1.1, 1.2, ...)
│   ├── ShadowKeyMap.ts       # Hybrid matching + key tracking
│   └── JSXParser.ts          # Delegates to babel-plugin-minimact
├── MonacoShadowKeyTracker.ts # Monaco integration
└── main.ts                   # Entry point
