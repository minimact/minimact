# TSX Keys Generation System

## Overview

Minimact automatically generates `.tsx.keys` files that contain the original TSX source code with **hex path keys** added to every JSX element. These shadow files enable Swig (the Minimact IDE) to merge hex path keys back into the source TSX files, allowing developers to track and maintain stable element paths across renders.

## Architecture

### The Problem

Minimact uses hex paths (e.g., `1`, `1.1`, `1.2`) to uniquely identify every element in the component tree for predictive rendering and hot reload. However, these paths were previously only visible in the generated C# code. Developers had no way to see or manage these paths in their TSX source files.

### The Solution

The Babel plugin now:
1. **Assigns hex paths** to all JSX elements during transpilation
2. **Adds `key` props** with the hex path values to every element
3. **Generates a `.tsx.keys` file** with the keyed JSX before it's nullified for C# generation
4. **Preserves JSX syntax** by using only the TypeScript preset (no React preset for keys generation)

## Implementation

### Key Components

#### 1. Path Assignment (`pathAssignment.cjs`)

Assigns hex paths and adds `key` props to JSX elements:

```javascript
function assignPathsToJSX(node, parentPath, pathGen, t) {
  if (t.isJSXElement(node)) {
    const childHex = pathGen.next(parentPath);
    const currentPath = pathGen.buildPath(parentPath, childHex);

    // Store path metadata
    node.__minimactPath = currentPath;

    // Add key prop if it doesn't exist
    if (!hasKey(node)) {
      const keyAttr = t.jsxAttribute(
        t.jsxIdentifier('key'),
        t.stringLiteral(currentPath)
      );
      node.openingElement.attributes.unshift(keyAttr);
    }
  }
}
```

#### 2. Live AST Reference (`processComponent.cjs`)

**Critical Fix**: Store a reference to the live AST node, not a clone:

```javascript
// ❌ WRONG - Creates a disconnected copy
component.renderBody = t.cloneNode(returnPath.node.argument, true);

// ✅ CORRECT - Uses the actual live AST node
component.renderBody = returnPath.node.argument;
```

**Why this matters**: When we add keys to `component.renderBody`, the mutations must affect the same AST tree that Babel uses for code generation. Cloning creates a separate tree, so mutations don't persist in the Program node.

#### 3. Pre-Hook Source Capture (`index-full.cjs`)

**Critical**: Use the `pre()` hook to save original JSX before React preset transforms it:

```javascript
pre(file) {
  // Save the original code BEFORE React preset transforms JSX
  // This allows us to generate .tsx.keys with real JSX syntax
  file.originalCode = file.code;
}
```

**Why this matters**: The React preset runs BEFORE our plugin and transforms JSX into `React.createElement()` calls. By saving the original code in the `pre()` hook, we can parse it separately with only the TypeScript preset to preserve JSX syntax.

#### 4. Three-Step Generation (`Program.exit`)

The `Program.exit` hook runs in three distinct phases:

```javascript
exit(programPath, state) {
  // 🔥 STEP 1: Generate .tsx.keys from original JSX source
  if (state.file.originalCode) {
    // Parse original code with TypeScript preset only (no React preset!)
    const originalAst = babelCore.parseSync(state.file.originalCode, {
      filename: inputFilePath,
      presets: ['@babel/preset-typescript'],
      plugins: []
    });

    // Add keys to the fresh AST
    babelCore.traverse(originalAst, {
      FunctionDeclaration(funcPath) {
        funcPath.traverse({
          ReturnStatement(returnPath) {
            if (t.isJSXElement(returnPath.node.argument)) {
              const pathGen = new HexPathGenerator();
              assignPathsToJSX(returnPath.node.argument, '', pathGen, t);
            }
          }
        });
      }
    });

    // Generate JSX with keys
    const output = generate(originalAst);
    fs.writeFileSync(inputFilePath + '.keys', output.code);
  }

  // 🔥 STEP 2: Nullify JSX in all components (after .tsx.keys saved)
  for (const componentPath of state.file.componentPathsToNullify) {
    componentPath.traverse({
      ReturnStatement(returnPath) {
        returnPath.node.argument = t.nullLiteral();
      }
    });
  }

  // 🔥 STEP 3: Generate C# code (now with nullified JSX)
  const csharpCode = generateCSharpFile(state.file.minimactComponents, state);
}
```

**Order is critical**:
- `pre()` hook saves original JSX **before** React preset runs
- `.tsx.keys` is parsed from original source with TypeScript preset only
- Keys are added to a fresh AST parse (preserving JSX syntax)
- JSX nullification happens **after** keys are saved but **before** C# generation

### 5. Preset Configuration

**The plugin handles both presets automatically**:

```javascript
// ✅ Use both presets - plugin handles JSX preservation internally
babel.transformSync(code, {
  filename: 'Component.tsx',
  presets: ['@babel/preset-typescript', '@babel/preset-react'],
  plugins: ['@minimact/babel-plugin']
});
```

**How it works**:
- `pre()` hook saves original JSX code before React preset runs
- Main transform uses both TypeScript and React presets (for C# generation)
- `Program.exit` re-parses the original code with TypeScript preset only
- This preserves JSX syntax in `.tsx.keys` while allowing normal transpilation

## Generated Output Example

### Input (Component.tsx)

```tsx
export function Simple() {
  return (
    <div>
      <h1>Hello</h1>
      <p>World</p>
    </div>
  );
}
```

### Output (Component.tsx.keys)

```tsx
export function Simple() {
  return (
    <div key="1">
      <h1 key="1.1">Hello</h1>
      <p key="1.2">World</p>
    </div>
  );
}
```

### Complex Example

```tsx
// Input
{showHistory && (
  <div className="history-panel">
    <h3>History</h3>
    {history.map((entry, i) => (
      <li className="history-item">
        <span>{entry.action}</span>
      </li>
    ))}
  </div>
)}

// Output with keys
{showHistory && (
  <div key="1.7.1" className="history-panel">
    <h3 key="1.7.1.1">History</h3>
    {history.map((entry, i) => (
      <li key="1.7.1.2.2.1.1" className="history-item">
        <span key="1.7.1.2.2.1.1.1">{entry.action}</span>
      </li>
    ))}
  </div>
)}
```

## Common Pitfalls

### ❌ Pitfall 1: Cloning the AST

```javascript
// This creates a disconnected copy!
component.renderBody = t.cloneNode(returnPath.node.argument, true);
assignPathsToJSX(component.renderBody, ...); // Keys added to clone, not live tree
```

**Result**: Keys added to the clone don't appear in `programPath.node` during generation.

**Fix**: Store a reference to the live node:
```javascript
component.renderBody = returnPath.node.argument;
```

### ❌ Pitfall 2: Generating from state.file.ast

```javascript
// This might be the pre-mutation AST!
const output = generate(state.file.ast, ...);
```

**Result**: Mutations made via `path.traverse()` might not be reflected.

**Fix**: Generate from the Program path node:
```javascript
const output = generate(programPath.node, ...);
```

### ❌ Pitfall 3: Not Using `pre()` Hook

```javascript
// ❌ WRONG - No pre() hook to save original code
module.exports = function(babel) {
  return {
    name: 'minimact-full',
    visitor: {
      Program: {
        exit(programPath, state) {
          // Try to generate from programPath - already transformed by React preset!
          const output = generate(programPath.node);
        }
      }
    }
  };
}
```

**Result**: `.tsx.keys` contains `React.createElement()` instead of JSX because React preset already ran.

**Fix**: Use `pre()` hook to save original code:
```javascript
module.exports = function(babel) {
  return {
    name: 'minimact-full',
    pre(file) {
      // ✅ Save original JSX before React preset transforms it
      file.originalCode = file.code;
    },
    visitor: {
      Program: {
        exit(programPath, state) {
          // Parse original code separately with TypeScript preset only
          const originalAst = babelCore.parseSync(state.file.originalCode, {
            presets: ['@babel/preset-typescript']
          });
        }
      }
    }
  };
}
```

### ❌ Pitfall 4: Nullifying JSX Too Early

```javascript
// Wrong order!
function processComponent(path, state) {
  // ... add keys ...

  // Nullify JSX immediately
  path.traverse({
    ReturnStatement(returnPath) {
      returnPath.node.argument = t.nullLiteral();
    }
  });
}
```

**Result**: JSX is null by the time `Program.exit` runs, so `.tsx.keys` is empty.

**Fix**: Delay nullification until `Program.exit`:
```javascript
// Store paths to nullify later
state.file.componentPathsToNullify.push(path);

// In Program.exit, nullify AFTER generating .tsx.keys
```

## Debugging Tips

### Check if keys exist in the AST

```javascript
let keyCount = 0;
programPath.traverse({
  JSXElement(jsxPath) {
    const hasKey = jsxPath.node.openingElement.attributes.some(attr =>
      t.isJSXAttribute(attr) && attr.name.name === 'key'
    );
    if (hasKey) keyCount++;
  }
});
console.log(`Found ${keyCount} elements with keys`);
```

### Verify live AST mutations

```javascript
// After adding keys
console.log('[Path Assignment] ✅ Added key="${path}" to <${tagName}>');

// Before generation
console.log('[Minimact Keys] 🔍 Found ${keyCount} JSX elements with keys');
```

### Check generated output

```bash
cat Component.tsx.keys
# Should show JSX with key props, not React.createElement
```

## Integration with Swig

The `.tsx.keys` files are consumed by Swig (Minimact IDE) to:

1. **Display hex paths** in the editor alongside JSX elements
2. **Validate manual keys** - check if they maintain lexicographic sort order
3. **Replace source TSX** with keyed version after transpilation
4. **Highlight path changes** during hot reload

**Important**: The source `.tsx` file is **replaced** (not merged) with the `.tsx.keys` content after each transpilation. This ensures the source always has the correct keys matching the generated C# code.

### Manual Key Validation

Developers can manually add keys, but they must maintain sort order:

```tsx
// ✅ Valid - "1.5" is between "1.1" and "1.2"
<div key="1">
  <h1 key="1.1">First</h1>
  <p key="1.5">Custom</p>
  <p key="1.2">Last</p>
</div>

// ❌ Invalid - "1.05" would come before "1.1"
<div key="1">
  <h1 key="1.1">First</h1>
  <p key="1.05">Custom</p> {/* Breaks sort order! */}
</div>
```

## Benefits

1. **Visibility**: Developers can see hex paths in their source code
2. **Stability**: Paths remain consistent across refactors
3. **Debugging**: Easier to track elements in predictive rendering
4. **Hot Reload**: Accurate path matching for instant updates
5. **Custom Keys**: Developers can manually specify paths when needed

## Current Status

**✅ Implemented Features:**
- [x] `pre()` hook to save original JSX before React preset transformation
- [x] `.tsx.keys` generation with real JSX syntax (not `createElement`)
- [x] Automatic key addition to all JSX elements with hex paths
- [x] Three-phase generation: keys → nullification → C# code
- [x] Support for complex components with conditionals, loops, and fragments

**🚧 Future Enhancements:**
- [ ] Add key validation in Swig (check sort order, uniqueness)
- [ ] Automatic source replacement after transpilation in Swig
- [ ] Generate diffs between manual keys and auto-generated keys
- [ ] Add config option to disable `.tsx.keys` generation
- [ ] Support for JSX fragments with keys
- [ ] Preserve existing valid manual keys during generation

## References

- [Hex Path Generator](../src/babel-plugin-minimact/src/utils/hexPath.cjs)
- [Path Assignment](../src/babel-plugin-minimact/src/utils/pathAssignment.cjs)
- [Component Processor](../src/babel-plugin-minimact/src/processComponent.cjs)
- [Babel Plugin Entry Point](../src/babel-plugin-minimact/index-full.cjs)
