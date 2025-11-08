# Monaco Shadow Keys

**Invisible JSX key tracking for Minimact hot reload**

A Monaco Editor prototype that tracks JSX element positions and generates stable hex paths **invisibly** - developers never see the keys in their code, but they're maintained in a separate `.keys.json` shadow file.

---

## 📋 Table of Contents

- [The Problem](#the-problem)
- [The Solution](#the-solution)
- [How It Works](#how-it-works)
- [Architecture](#architecture)
- [Example Output](#example-output)
- [Implementation Details](#implementation-details)
- [Usage](#usage)
- [Future: VS Code Extension](#future-vs-code-extension)

---

## The Problem

Minimact's hot reload needs **stable keys** for JSX elements to:
1. Match elements between renders (without re-mounting)
2. Apply predictive patches to the correct DOM nodes
3. Track structural changes (element added/removed/moved)

**Previous approaches:**
- ❌ Runtime position tracking - breaks on edits
- ❌ Inline keys in source - clutters code, visible to developers
- ❌ Source maps - complex O(n) navigation, position shifts

---

## The Solution

### Shadow Key Map Architecture

**Two files on disk:**
```
Counter.tsx              # Clean source (no keys!)
Counter.tsx.keys.json    # Shadow map (auto-generated, gitignored)
```

**What developers see:**
```tsx
function Counter({ count }) {
  return (
    <div className="counter">
      <span>Count: {count}</span>
      <button onClick={increment}>+</button>
    </div>
  );
}
```

**What's in the shadow file:**
```json
{
  "version": "1.0",
  "sourceFile": "Counter.tsx",
  "keys": {
    "3:5": {
      "hexPath": "1",
      "tagName": "div",
      "attributes": ["className"],
      "astSignature": ".div.className",
      "line": 3,
      "column": 5,
      "stable": true
    },
    "4:7": {
      "hexPath": "1.1",
      "tagName": "span",
      "attributes": [],
      "astSignature": "1.span.",
      "line": 4,
      "column": 7,
      "stable": true
    }
  }
}
```

---

## How It Works

### 1. Live Tracking (Monaco Editor)

```
User types JSX → Monaco onChange event
  ↓
Debounced parser (500ms delay)
  ↓
babel-plugin-minimact assigns __minimactPath
  ↓
ShadowKeyMap matches tags (hybrid approach)
  ↓
Updates in-memory key map
  ↓
Updates .keys.json preview (right panel)
  ↓
Ctrl+S → Download both files
```

### 2. Hybrid Matching Strategy

**Problem**: When user edits, line numbers shift. How to keep keys stable?

**Solution**: Match tags using TWO methods:

#### Primary: AST Signature
```typescript
astSignature = `${parentPath}.${tagName}.${firstAttribute}`

Examples:
  ".div.className"           // Root div with className
  "1.span."                  // span under path "1", no attrs
  "1.2.button.onClick"       // button with onClick
```

**Benefits**:
- ✅ Stable across line number changes
- ✅ Survives copy/paste
- ✅ Detects structural changes

#### Fallback: Position
```typescript
locationKey = `${line}:${column}`

Examples:
  "3:5"   // Line 3, column 5
  "10:12" // Line 10, column 12
```

**Used for**:
- ✅ Conflict resolution (two identical signatures)
- ✅ Initial placement
- ✅ Quick lookups

### 3. Key Stability Rules

| User Action | Key Behavior |
|-------------|--------------|
| **Type text inside element** | Key stays stable ✅ |
| **Add whitespace/formatting** | Key stays stable ✅ |
| **Rename tag** (`<div>` → `<span>`) | Key regenerates ⚠️ |
| **Add/remove attribute** | Key stays stable, metadata updates ✅ |
| **Copy/paste element** | New key generated ✅ |
| **Delete element** | Key removed ✅ |
| **Move element** | Position updates, signature matches ✅ |

---

## Architecture

### File Structure

```
src/monaco-shadow-keys/
├── package.json
├── vite.config.ts
├── tsconfig.json
├── index.html                    # Split-screen UI
├── README.md
└── src/
    ├── main.ts                   # Entry point, Monaco setup
    ├── MonacoShadowKeyTracker.ts # Monaco integration
    └── core/
        ├── types.ts              # TypeScript interfaces
        ├── HexPathGenerator.ts   # Generates hex paths (1, 1.1, 1.2, ...)
        ├── ShadowKeyMap.ts       # Hybrid matching + key tracking
        └── JSXParser.ts          # Delegates to babel-plugin-minimact
```

### Core Classes

#### 1. **ShadowKeyMap** (Hybrid Matching)

```typescript
class ShadowKeyMap {
  private keyMap: Map<string, KeyEntry> = new Map();

  // Update keys from parsed JSX tags
  updateFromTags(tags: JSXTagInfo[]): void {
    for (const tag of tags) {
      const signature = this.buildASTSignature(tag);

      // Try signature match first
      let existingKey = this.findBySignature(signature);

      // Fallback to position
      if (!existingKey) {
        const locationKey = `${tag.line}:${tag.column}`;
        existingKey = this.keyMap.get(locationKey);
      }

      if (existingKey) {
        // Check if tag changed (rename, attr change)
        if (existingKey.tagName !== tag.name) {
          existingKey.hexPath = regeneratePath(tag);
          existingKey.stable = false;
        }
      } else {
        // New tag - generate key
        const newKey = generateNewKey(tag);
        this.keyMap.set(locationKey, newKey);
      }
    }
  }
}
```

#### 2. **JSXParser** (Babel Integration)

```typescript
class JSXParser {
  static async parseJSX(sourceCode: string): Promise<JSXTagInfo[]> {
    // Use babel-plugin-minimact to assign __minimactPath
    const result = babel.transformSync(sourceCode, {
      plugins: ['../../babel-plugin-minimact/index.cjs']
    });

    // Extract tag info from AST
    traverse(ast, {
      JSXElement(path) {
        const hexPath = node.__minimactPath;
        tags.push({
          name: tagName,
          attributes: [...],
          line: loc.start.line,
          column: loc.start.column,
          parentPath: hexPath.split('.').slice(0, -1).join('.')
        });
      }
    });

    return tags;
  }
}
```

#### 3. **MonacoShadowKeyTracker** (Editor Integration)

```typescript
class MonacoShadowKeyTracker {
  constructor(
    editor: monaco.editor.IStandaloneCodeEditor,
    sourceFile: string,
    onUpdate?: (keyMapData) => void  // Live preview callback
  ) {
    // Listen to document changes
    editor.onDidChangeModelContent(() => {
      this.scheduleUpdate();  // Debounced 500ms
    });

    // Ctrl+S to save
    editor.addAction({
      id: 'minimact-save',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS],
      run: () => this.handleSave()
    });
  }

  private async updateShadowKeyMap(): Promise<void> {
    const tags = await JSXParser.parseJSX(sourceCode);
    this.shadowKeyMap.updateFromTags(tags);

    // Update live preview
    if (this.onUpdateCallback) {
      this.onUpdateCallback(this.shadowKeyMap.serialize());
    }
  }
}
```

---

## Example Output

### Input (Counter.tsx)

```tsx
function Counter({ count }) {
  const [localCount, setLocalCount] = useState(count);

  function increment() {
    setLocalCount(localCount + 1);
  }

  return (
    <div className="counter">
      <h1>Counter Demo</h1>
      <span>Count: {localCount}</span>
      <button onClick={increment}>Increment</button>
    </div>
  );
}
```

### Output (Counter.tsx.keys.json)

```json
{
  "version": "1.0",
  "sourceFile": "Counter.tsx",
  "lastModified": 1762559999999,
  "keys": {
    "8:5": {
      "hexPath": "1",
      "tagName": "div",
      "attributes": ["className"],
      "astSignature": ".div.className",
      "line": 8,
      "column": 5,
      "stable": true,
      "lastModified": 1762559999999
    },
    "9:7": {
      "hexPath": "1.1",
      "tagName": "h1",
      "attributes": [],
      "astSignature": "1.h1.",
      "line": 9,
      "column": 7,
      "stable": true,
      "lastModified": 1762559999999
    },
    "10:7": {
      "hexPath": "1.2",
      "tagName": "span",
      "attributes": [],
      "astSignature": "1.span.",
      "line": 10,
      "column": 7,
      "stable": true,
      "lastModified": 1762559999999
    },
    "11:7": {
      "hexPath": "1.3",
      "tagName": "button",
      "attributes": ["onClick"],
      "astSignature": "1.button.onClick",
      "line": 11,
      "column": 7,
      "stable": true,
      "lastModified": 1762559999999
    }
  }
}
```

---

## Implementation Details

### Key Data Structure

```typescript
interface KeyEntry {
  hexPath: string;           // "1.2.3"
  tagName: string;           // "div", "span"
  attributes: string[];      // ["className", "onClick"]

  // Hybrid matching
  astSignature: string;      // "1.div.className"
  line: number;              // 8
  column: number;            // 5

  // Metadata
  stable: boolean;           // false = needs regeneration
  lastModified: number;      // timestamp
}
```

### Update Flow

1. **User types** → `onDidChangeModelContent` event
2. **Debounce 500ms** → Avoid re-parsing on every keystroke
3. **Parse JSX** → `babel-plugin-minimact` assigns `__minimactPath`
4. **Extract tags** → Line, column, tagName, attributes
5. **Match existing** → AST signature first, position fallback
6. **Update map** → Add new keys, mark changed keys as unstable
7. **Notify callback** → Update right panel with JSON preview
8. **Ctrl+S** → Download both files

### Performance Optimizations

- **Debounced parsing**: 500ms delay prevents lag on fast typing
- **Incremental updates**: Only re-parse changed regions (future)
- **Shared Babel instance**: Reuses `babel-plugin-minimact` parser
- **Map-based lookups**: O(1) key retrieval by position

---

## Usage

### Running the Prototype

```bash
cd src/monaco-shadow-keys
npm install
npm run dev
```

Open `http://localhost:5174/` in your browser.

### UI Features

**Left Panel**: Source editor (TypeScript/JSX)
- Edit your JSX code
- Syntax highlighting
- Auto-complete

**Right Panel**: Shadow keys preview (JSON, read-only)
- Updates automatically as you type
- Shows hex paths, signatures, positions
- Highlights stable vs. unstable keys

**Save (Ctrl+S)**: Downloads both files
- `Counter.tsx` - Clean source
- `Counter.tsx.keys.json` - Shadow map

---

## Future: VS Code Extension

### Planned Features

1. **File System Integration**
   - Save `.keys.json` next to source file
   - Auto-load existing shadow maps
   - Watch for external changes

2. **Git Integration**
   - Add `.keys.json` to `.gitignore`
   - Regenerate on branch switch
   - Handle merge conflicts

3. **Babel Plugin Integration**
   ```typescript
   // babel-plugin-minimact reads shadow map
   const shadowMap = loadShadowMap('Counter.tsx.keys.json');

   // Assign paths from shadow map instead of generating
   for (const node of jsxNodes) {
     const locationKey = `${node.loc.line}:${node.loc.column}`;
     const keyEntry = shadowMap.keys[locationKey];
     node.__minimactPath = keyEntry.hexPath;
   }
   ```

4. **Commands**
   - `Minimact: Regenerate Shadow Keys`
   - `Minimact: Clear Unstable Keys`
   - `Minimact: View Key at Cursor`

5. **Status Bar**
   - Show key count
   - Show unstable key count
   - Highlight current element's key

6. **Decorations**
   - Gutter icons for keyed elements
   - Hover tooltips showing hex path
   - Warning squiggles for unstable keys

---

## Benefits Over Alternatives

| Approach | Visibility | Stability | Performance | Maintenance |
|----------|-----------|-----------|-------------|-------------|
| **Inline keys** | ❌ Visible clutter | ✅ Very stable | ✅ Fast | ❌ Manual |
| **Source maps** | ✅ Invisible | ⚠️ Breaks on edits | ⚠️ O(n) navigation | ✅ Auto |
| **Shadow keys** | ✅ Invisible | ✅ Stable (hybrid) | ✅ Fast (O(1) lookup) | ✅ Auto |

---

## Technical Decisions

### Why Monaco instead of CodeMirror?

- ✅ Better VS Code compatibility (shares same editor core)
- ✅ Built-in TypeScript support
- ✅ Easier to port to VS Code extension
- ✅ Better auto-complete and intellisense

### Why hybrid matching?

- ✅ **AST signature**: Stable across line shifts, copy/paste
- ✅ **Position fallback**: Handles signature collisions
- ✅ **Best of both worlds**: Combines structural + positional matching

### Why 500ms debounce?

- ✅ Prevents lag on fast typing
- ✅ Allows multiple keystrokes to batch
- ✅ Still feels responsive to users
- ⚠️ Can be adjusted based on feedback

### Why reuse babel-plugin-minimact?

- ✅ Single source of truth for JSX parsing
- ✅ Ensures paths match between editor and transpilation
- ✅ No duplicate Babel dependencies
- ✅ Consistency across dev tools

---

## Known Limitations

1. **Browser-only prototype** - Downloads to `~/Downloads/` folder
2. **No incremental parsing** - Re-parses entire file on every change
3. **No conflict resolution UI** - Signature collisions silently use position fallback
4. **No key history** - Can't undo key regenerations
5. **No multi-file support** - One editor instance per file

---

## Next Steps

1. ✅ **Prototype complete** - Monaco split-screen editor working
2. ⏳ **VS Code extension** - Port to real extension with file system
3. ⏳ **Babel plugin integration** - Read shadow maps during transpilation
4. ⏳ **Incremental parsing** - Only re-parse changed regions
5. ⏳ **Key history** - Track key changes over time
6. ⏳ **Multi-file tracking** - Workspace-wide shadow map

---

## Related Documents

- [TEMPLATE_PATCH_SYSTEM.md](./TEMPLATE_PATCH_SYSTEM.md) - Predictive rendering with templates
- [SOURCE_MAP_SELF_CONTAINED.md](./SOURCE_MAP_SELF_CONTAINED.md) - Previous source map approach
- [VNODE_PATH_REFACTOR.md](./VNODE_PATH_REFACTOR.md) - VNode path architecture

---

**Status**: ✅ Prototype Complete
**Location**: `src/monaco-shadow-keys/`
**Demo**: `npm run dev` → `http://localhost:5174/`
