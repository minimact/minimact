# Cross-File Hook Imports Implementation

## Problem Statement

When a component imports a custom hook from a separate file, the Babel plugin cannot detect the hook's signature (return values, parameters) because it only processes one file at a time.

**Current Behavior:**
```tsx
// useToggle.tsx
function useToggle(namespace: string, initial: boolean) {
  const [on, setOn] = useState(initial);
  const toggle = () => setOn(!on);
  const ui = <button onClick={toggle}>{on ? 'ON' : 'OFF'}</button>;
  return [on, toggle, ui];
}

// TestComponent.tsx
import useToggle from './useToggle';

function TestComponent() {
  const [isOn, toggle, toggleUI] = useToggle('toggle1', false);
  return <div>{toggleUI}</div>;  // ❌ Fails: toggleUI not recognized as hook UI
}
```

**Generated C# (BROKEN):**
```csharp
// No UseToggleHook class generated!
// No VComponentWrapper for {toggleUI}!
// Just renders: new VText($"{(toggleUI)}", "1.1")  ❌
```

## Solution Architecture

### Phase 1: Import Detection ✅ DONE
**File:** `src/babel-plugin-minimact/src/analyzers/hookImports.cjs`

**What it does:**
1. Scans all `ImportDeclaration` nodes in the component file
2. Filters for relative imports (`./useToggle`, `../hooks/useToggle`)
3. Resolves the import path to an absolute file path
4. Parses the imported file with Babel
5. Analyzes exported functions to detect custom hooks
6. Returns a `Map<importedName, hookMetadata>`

**Key Functions:**
- `analyzeImportedHooks(filePath, state)` - Main entry point
- `resolveImportPath(importSource, currentDir)` - Resolves `./useToggle` → `/path/to/useToggle.tsx`
- `getImportedName(importNode, isDefault, originalName)` - Gets local name of import
- `isExportedLater(ast, funcName)` - Checks if function is exported

**Example Output:**
```javascript
Map {
  'useToggle' => {
    name: 'useToggle',
    className: 'UseToggleHook',
    params: [{ name: 'initial', type: 'boolean', defaultValue: 'false' }],
    states: [{ varName: 'on', setterName: 'setOn', type: 'boolean', initialValue: 'initial' }],
    methods: [{ name: 'toggle', params: [], returnType: 'void', body: '...' }],
    jsxElements: [{ type: 'variable', varName: 'ui', node: <AST> }],
    returnValues: [
      { index: 0, name: 'on', type: 'state' },
      { index: 1, name: 'toggle', type: 'method' },
      { index: 2, name: 'ui', type: 'jsx' }
    ],
    originalName: 'useToggle',
    filePath: '/abs/path/to/useToggle.tsx'
  }
}
```

### Phase 2: Hook Metadata Storage (IN PROGRESS)
**File:** `src/babel-plugin-minimact/src/processComponent.cjs`

**What needs to be done:**

1. **Call `analyzeImportedHooks` early in `processComponent`:**
```javascript
function processComponent(path, state) {
  const componentName = getComponentName(path);
  if (!componentName) return;

  // 🔥 NEW: Analyze imported hooks FIRST
  const importedHooks = analyzeImportedHooks(state.file.path, state);

  // Custom hook detection
  if (isCustomHook(path)) {
    return processCustomHook(path, state);
  }

  // Component processing
  const component = {
    name: componentName,
    // ... existing fields ...
    customHooks: [],
    importedHookMetadata: importedHooks  // 🔥 NEW: Store imported hook metadata
  };

  // ... rest of processing
}
```

2. **Pass `importedHookMetadata` to `extractCustomHookCall`:**

The hook call extractor needs access to imported hook metadata to properly identify which return value is the UI.

### Phase 3: Hook Call Extraction Enhancement (TODO)
**File:** `src/babel-plugin-minimact/src/extractors/hooks.cjs`

**Current `extractCustomHookCall` (incomplete):**
```javascript
function extractCustomHookCall(path, component, hookName) {
  // Extract: const [on, toggle, toggleUI] = useToggle('toggle1', false);

  const namespace = args[0].value;  // 'toggle1'
  const params = args.slice(1);     // [false]
  const uiVarName = elements[elements.length - 1].name;  // ❌ Assumes last element is UI!

  component.customHooks.push({
    hookName: 'useToggle',
    className: 'UseToggleHook',
    namespace: 'toggle1',
    uiVarName: 'toggleUI',
    params: ['false']
  });
}
```

**Enhanced Version (needed):**
```javascript
function extractCustomHookCall(path, component, hookName) {
  const parent = path.parent;
  if (!t.isVariableDeclarator(parent)) return;
  if (!t.isArrayPattern(parent.id)) return;

  const args = path.node.arguments;
  if (args.length === 0) return;

  // First argument must be namespace (string literal)
  const namespaceArg = args[0];
  if (!t.isStringLiteral(namespaceArg)) {
    console.warn(`[Custom Hook] ${hookName} first argument must be a string literal (namespace)`);
    return;
  }

  const namespace = namespaceArg.value;
  const hookParams = args.slice(1);

  // Extract destructured variables
  const elements = parent.id.elements;

  // 🔥 NEW: Get hook metadata from imported hooks or inline hook
  let hookMetadata = null;

  // Check if this hook was imported
  if (component.importedHookMetadata && component.importedHookMetadata.has(hookName)) {
    hookMetadata = component.importedHookMetadata.get(hookName);
    console.log(`[Custom Hook] Using imported metadata for ${hookName}`);
  } else {
    // TODO: Check if hook is defined inline in same file
    console.warn(`[Custom Hook] No metadata found for ${hookName}, assuming last return value is UI`);
  }

  // 🔥 NEW: Use returnValues from metadata to identify UI variable
  let uiVarName = null;
  if (hookMetadata && hookMetadata.returnValues) {
    // Find the JSX return value
    const jsxReturnIndex = hookMetadata.returnValues.findIndex(rv => rv.type === 'jsx');
    if (jsxReturnIndex !== -1 && jsxReturnIndex < elements.length) {
      const uiElement = elements[jsxReturnIndex];
      if (uiElement && t.isIdentifier(uiElement)) {
        uiVarName = uiElement.name;
      }
    }
  } else {
    // Fallback: Assume last element is UI (old behavior)
    const lastElement = elements[elements.length - 1];
    if (lastElement && t.isIdentifier(lastElement)) {
      uiVarName = lastElement.name;
    }
  }

  if (!uiVarName) {
    console.warn(`[Custom Hook] ${hookName} could not identify UI variable`);
    return;
  }

  // Store custom hook instance in component
  if (!component.customHooks) {
    component.customHooks = [];
  }

  const generate = require('@babel/generator').default;

  const className = hookMetadata ? hookMetadata.className : `${capitalize(hookName)}Hook`;

  component.customHooks.push({
    hookName,
    className,
    namespace,
    uiVarName,
    params: hookParams.map(p => generate(p).code),
    returnValues: elements.map(e => e ? e.name : null).filter(Boolean),
    metadata: hookMetadata  // 🔥 NEW: Store full metadata for later use
  });

  console.log(`[Custom Hook] Found ${hookName}('${namespace}') → UI in {${uiVarName}}`);
}
```

### Phase 4: Hook Class Generation for Imports (TODO)
**File:** `src/babel-plugin-minimact/src/generators/csharpFile.cjs` or `processComponent.cjs`

**Problem:**
When a hook is imported, we need to generate the C# class for it. Currently, hook classes are only generated when processing the hook file directly.

**Solution:**
After processing a component that uses imported hooks, generate C# classes for those hooks and append them to the C# output.

**In `processComponent.cjs` after component processing:**
```javascript
// After component C# generation is complete
if (component.customHooks && component.customHooks.length > 0) {
  const generatedHookClasses = new Set();  // Track to avoid duplicates

  component.customHooks.forEach(hookInstance => {
    // Check if this hook has metadata (was imported)
    if (hookInstance.metadata && !generatedHookClasses.has(hookInstance.className)) {
      // Generate the hook class from metadata
      const hookClass = generateHookClass(hookInstance.metadata, {
        name: hookInstance.className,
        stateTypes: new Map(),
        dependencies: new Map(),
        externalImports: new Set(),
        clientComputedVars: new Set(),
        eventHandlers: []
      });

      // Append hook class to C# output
      csharpCode += '\n\n' + hookClass;
      generatedHookClasses.add(hookInstance.className);

      console.log(`[Custom Hook] Generated C# class for imported hook: ${hookInstance.className}`);
    }
  });
}
```

### Phase 5: Testing & Edge Cases (TODO)

**Test Cases:**

1. **Default Export:**
```tsx
// useToggle.tsx
export default function useToggle(namespace, initial) { ... }

// Component.tsx
import useToggle from './useToggle';  // ✅ Should work
```

2. **Named Export:**
```tsx
// hooks.tsx
export function useToggle(namespace, initial) { ... }
export function useCounter(namespace, start) { ... }

// Component.tsx
import { useToggle, useCounter } from './hooks';  // ✅ Should work
```

3. **Renamed Import:**
```tsx
// useToggle.tsx
export default function useToggle(namespace, initial) { ... }

// Component.tsx
import Toggle from './useToggle';  // Renamed!
const [on, , ui] = Toggle('toggle1', false);  // ✅ Should work
```

4. **Separate Export:**
```tsx
// useToggle.tsx
function useToggle(namespace, initial) { ... }
export default useToggle;

// Component.tsx
import useToggle from './useToggle';  // ✅ Should work
```

5. **Multiple Hooks from Same File:**
```tsx
// hooks.tsx
export function useToggle(namespace, initial) { ... }
export function useCounter(namespace, start) { ... }

// Component.tsx
import { useToggle, useCounter } from './hooks';
const [on, , ui1] = useToggle('t1', false);
const [count, , , , ui2] = useCounter('c1', 0);
return <div>{ui1}{ui2}</div>;  // ✅ Both should work
```

6. **Inline + Imported Hooks:**
```tsx
// Component.tsx
import useToggle from './useToggle';

function useCounter(namespace, start) { ... }  // Inline hook

function Component() {
  const [on, , ui1] = useToggle('t1', false);      // Imported
  const [count, , , , ui2] = useCounter('c1', 0);  // Inline
  return <div>{ui1}{ui2}</div>;  // ✅ Both should work
}
```

**Edge Cases to Handle:**

- ❌ Hook file not found (invalid import path)
- ❌ Circular imports (A imports B, B imports A)
- ❌ Hook file has syntax errors
- ❌ Hook doesn't follow naming convention (doesn't start with 'use')
- ❌ Hook missing namespace parameter
- ❌ Import from node_modules (not supported - hooks must be local)

## Implementation Checklist

- [x] **Phase 1:** Create `hookImports.cjs` analyzer
- [ ] **Phase 2:** Integrate `analyzeImportedHooks` into `processComponent`
- [ ] **Phase 3:** Enhance `extractCustomHookCall` to use imported metadata
- [ ] **Phase 4:** Generate C# classes for imported hooks
- [ ] **Phase 5:** Test all scenarios and edge cases
- [ ] **Phase 6:** Update documentation and examples

## Expected Outcome

After full implementation:

**Input Files:**
```tsx
// useToggle.tsx
function useToggle(namespace: string, initial: boolean) {
  const [on, setOn] = useState(initial);
  const toggle = () => setOn(!on);
  const ui = <button onClick={toggle}>{on ? 'ON' : 'OFF'}</button>;
  return [on, toggle, ui];
}
export default useToggle;

// TestComponent.tsx
import useToggle from './useToggle';

export default function TestComponent() {
  const [isOn, toggle, toggleUI] = useToggle('toggle1', false);
  return <div>{toggleUI}</div>;
}
```

**Generated C# Output:**
```csharp
// ============================================================
// HOOK CLASS - Generated from useToggle
// ============================================================
[Hook]
public partial class UseToggleHook : MinimactComponent
{
    // Configuration (from hook arguments)
    private bool initial => GetState<bool>("_config.param0");

    // Hook state
    [State]
    private bool on = false;

    // State setters
    private void setOn(bool value)
    {
        SetState(nameof(on), value);
    }

    // Hook methods
    private void toggle()
    {
        setOn(!on);
    }

    // Hook UI rendering
    protected override VNode Render()
    {
        StateManager.SyncMembersToState(this);

        return new VElement("button", "1", new Dictionary<string, string> { ["onclick"] = "toggle" },
            on ? "ON" : "OFF");
    }
}

[Component]
public partial class TestComponent : MinimactComponent
{
    protected override VNode Render()
    {
        StateManager.SyncMembersToState(this);

        return new VElement("div", "1", new Dictionary<string, string>(), new VNode[]
        {
            new VComponentWrapper
            {
                ComponentName = "toggle1",
                ComponentType = "UseToggleHook",
                HexPath = "1.1",
                InitialState = new Dictionary<string, object> { ["_config.param0"] = false }
            }
        });
    }
}
```

✅ **Result:** Hook works perfectly with proper C# class generation and VComponentWrapper replacement!

## Benefits

1. ✅ **Reusable Hooks** - Create hook libraries and import them
2. ✅ **Better Organization** - Separate concerns (hooks vs components)
3. ✅ **Type Safety** - Proper TypeScript → C# inference
4. ✅ **DRY Principle** - Write hook once, use everywhere
5. ✅ **Maintainability** - Update hook in one place, all usages benefit

## Alternatives Considered

### Alternative 1: Require Inline Hooks Only
**Rejected:** Too restrictive, defeats the purpose of reusable hooks

### Alternative 2: Manual Hook Registration
```typescript
// Require manual registration
registerHook(useToggle);

function Component() {
  const [on, , ui] = useToggle('t1', false);
}
```
**Rejected:** Extra boilerplate, not idiomatic

### Alternative 3: Two-Pass Compilation
First pass: Process all hook files
Second pass: Process component files with hook metadata
**Rejected:** Complex build orchestration

### Alternative 4: Current Approach (Inline Analysis) ✅
Analyze imported files on-demand during component processing
**Selected:** Clean, no build orchestration, works with existing Babel pipeline

## Future Enhancements

1. **Hook Caching:** Cache analyzed hooks to avoid re-parsing on every component
2. **Hook Discovery:** Auto-discover hooks in `/hooks` directory
3. **Hook Type Generation:** Generate TypeScript `.d.ts` for hooks
4. **Hook Documentation:** Extract JSDoc from hooks for IDE autocomplete
5. **Hook Composition:** Support hooks that use other hooks internally
