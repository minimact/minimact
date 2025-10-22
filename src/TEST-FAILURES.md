# Test Failures Analysis & Fix Plan

**Date**: 2025-10-21
**Test Results**: 5/10 tests passed
**Status**: TDD in progress

---

## Summary

Running the comprehensive test suite revealed 5 failures across different component types. The failures fall into two categories:
1. **Critical Babel Plugin Bug** (1 failure)
2. **Test Infrastructure Issue** (4 failures)

---

## Failures Breakdown

### ✅ Passing Tests (5/10)

1. **Counter.jsx** - Simple component with no props
2. **TodoList.jsx** - Component with props, works despite `.map()` complexity
3. **Phase 3: State Changes** - Reconciliation working
4. **Phase 4: Predictor Learning** - Pattern learning working
5. **Phase 5: Metrics** - Tracking working

### ❌ Failing Tests (5/10)

#### 1. ConditionalRendering.jsx - CRITICAL BABEL BUG
**Error:**
```
Error: You must pass a scope and parentPath unless traversing a Program/File.
Instead of that you tried to traverse a ConditionalExpression node without
passing scope and parentPath.
```

**Component Code:**
```jsx
function UserProfile({ user, loading }) {
  return (
    <div className="profile">
      {loading ? (
        <div className="spinner">Loading...</div>
      ) : (
        <div className="user-info">
          <h1>{user.name}</h1>
          <p>{user.email}</p>
          {user.isAdmin && <span className="badge">Admin</span>}
        </div>
      )}
    </div>
  );
}
```

**Root Cause:**
The Babel plugin's `analyzeDependencies()` function at `index-full.cjs:225` is calling `traverse()` on a `ConditionalExpression` node without passing the required `scope` and `parentPath` parameters.

**Location in Code:**
- File: `babel-plugin-minimact/index-full.cjs`
- Function: `analyzeDependencies()`
- Line: ~225

**Fix Strategy:**
```javascript
// CURRENT (BROKEN):
function analyzeDependencies(node) {
  traverse(node, {
    // visitor
  });
}

// SHOULD BE:
function analyzeDependencies(node, scope, parentPath) {
  traverse(node, {
    // visitor
  }, scope, parentPath);
}
```

**Steps to Fix:**
1. Update `analyzeDependencies()` function signature to accept `scope` and `parentPath`
2. Pass these parameters through to `traverse()` call
3. Find all call sites of `analyzeDependencies()` and pass the parameters
4. Likely call sites:
   - `generateJSXExpression()` - Line ~473
   - Any other places handling conditional expressions

**Complexity**: Medium
**Priority**: CRITICAL - blocks conditional rendering (core React feature)

---

#### 2. ComplexState.jsx - Component Name Mismatch
**Error:**
```
error CS0246: The type or namespace name 'ComplexState' could not be found
```

**Issue:**
- Filename: `ComplexState.jsx`
- Actual function name: `ShoppingCart`
- Test tries to instantiate: `new ComplexState()`

**Root Cause:**
The test script (`test-client-sim.js`) uses the filename to derive the component name:
```javascript
const componentName = path.basename(file, path.extname(file));
// Gets "ComplexState" from "ComplexState.jsx"
// But transpiled code has "class ShoppingCart"
```

**Fix Strategy:**
Extract the actual component name from the transpiled C# code instead of using the filename.

**Approach 1 - Parse C# Output (Recommended):**
```javascript
// After transpilation, extract class name from C# code:
const classNameMatch = csharpCode.match(/public partial class (\w+) : MinimactComponent/);
const componentName = classNameMatch ? classNameMatch[1] : path.basename(file, path.extname(file));
```

**Approach 2 - Parse JSX Before Transpilation:**
```javascript
// Parse the JSX to find function/class name
const jsxContent = fs.readFileSync(jsxPath, 'utf-8');
const functionMatch = jsxContent.match(/function\s+(\w+)\s*\(/);
const componentName = functionMatch ? functionMatch[1] : path.basename(file, path.extname(file));
```

**Recommended**: Approach 1 (parse C# output) because:
- More reliable - uses what was actually generated
- Handles edge cases (multiple components, exports, etc.)
- Single source of truth

**Complexity**: Low
**Priority**: High - affects 4/7 component tests

---

#### 3. EventHandlers.jsx - Component Name Mismatch
**Error:**
```
error CS0246: The type or namespace name 'EventHandlers' could not be found
```

**Issue:**
- Filename: `EventHandlers.jsx`
- Actual function name: `InteractiveForm`

**Fix**: Same as #2 above

---

#### 4. Fragments.jsx - Component Name Mismatch
**Error:**
```
error CS0246: The type or namespace name 'Fragments' could not be found
```

**Issue:**
- Filename: `Fragments.jsx`
- Actual function name: `MultiColumn`

**Fix**: Same as #2 above

---

#### 5. NestedComponents.jsx - Component Name Mismatch
**Error:**
```
error CS0246: The type or namespace name 'NestedComponents' could not be found
```

**Issue:**
- Filename: `NestedComponents.jsx`
- Actual function name: `Dashboard` (contains `Card` as well)

**Fix**: Same as #2 above

**Additional Consideration**:
This file contains **two components**: `Card` and `Dashboard`. The test should probably test `Dashboard` as it's the more complex one, but we need to decide:
- Should we test only the last/main component?
- Should we test all components in a file?
- How do we handle multi-component files?

**Recommended**: Test the last exported component (likely the main one)

---

## Fix Priority Order

### 1. Fix Component Name Extraction (High Priority, Low Complexity)
- **Time Estimate**: 30 minutes
- **Files to Modify**: `test-client-sim.js`
- **Impact**: Fixes 4/5 failures immediately
- **Risk**: Low

**Implementation:**
```javascript
async function compileCSharp(csharpCode, componentName) {
  // Extract actual component name from C# code
  const classNameMatch = csharpCode.match(/public partial class (\w+) : MinimactComponent/);
  const actualComponentName = classNameMatch ? classNameMatch[1] : componentName;

  // Use actualComponentName in Program.cs
  const programCs = `...
    var component = new ${actualComponentName}();
  ...`;
}
```

### 2. Fix Babel Plugin ConditionalExpression Bug (Critical Priority, Medium Complexity)
- **Time Estimate**: 1-2 hours
- **Files to Modify**: `babel-plugin-minimact/index-full.cjs`
- **Impact**: Enables conditional rendering (ternary, &&, ||)
- **Risk**: Medium - affects core transformation logic

**Implementation Steps:**
1. Locate `analyzeDependencies()` function
2. Add `scope` and `parentPath` parameters
3. Pass to `traverse()` call
4. Update all call sites to pass these parameters
5. Test with ConditionalRendering.jsx

**Specific Code Changes:**
```javascript
// Find this function (around line 220-230):
function analyzeDependencies(node) {
  const dependencies = new Set();
  traverse(node, {
    // ... visitor
  });
  return dependencies;
}

// Change to:
function analyzeDependencies(node, scope, parentPath) {
  const dependencies = new Set();
  traverse(node, {
    // ... visitor
  }, scope, parentPath);
  return dependencies;
}

// Find call sites (likely in generateJSXExpression):
const deps = analyzeDependencies(node.expression);
// Change to:
const deps = analyzeDependencies(node.expression, path.scope, path);
```

---

## Testing Strategy

### After Fix #1 (Component Name Extraction):
**Expected Results**: 8/10 tests passing
- ✅ ComplexState.jsx
- ✅ EventHandlers.jsx
- ✅ Fragments.jsx
- ✅ NestedComponents.jsx
- ❌ ConditionalRendering.jsx (still blocked by Babel bug)

### After Fix #2 (Babel Plugin):
**Expected Results**: 9/10 tests passing (or 10/10 if all work)
- ✅ ConditionalRendering.jsx

### Potential Additional Issues:
Once these fixes are in, we may discover:
- **Array.map()** issues (TodoList works, but might be incomplete)
- **Fragment** rendering issues (React `<>...</>` syntax)
- **Nested component** instantiation issues
- **Props** handling issues
- **Event handler** binding issues
- **Complex expressions** in JSX (arithmetic, ternary in attributes)

---

## Long-Term Improvements

### 1. Better Error Messages
Add try-catch in Babel plugin with helpful error messages:
```javascript
try {
  const deps = analyzeDependencies(node.expression, path.scope, path);
} catch (err) {
  throw new Error(`Failed to analyze dependencies for ${node.type}: ${err.message}`);
}
```

### 2. Babel Plugin Test Suite
Create unit tests for the Babel plugin:
```javascript
// babel-plugin-minimact/test/index.test.js
describe('Conditional Rendering', () => {
  it('should handle ternary expressions', () => {
    const input = `{loading ? <Spinner /> : <Content />}`;
    const output = transform(input);
    expect(output).toContain('loading ? new VElement');
  });
});
```

### 3. Component Name Convention
Document expected patterns:
- One component per file (recommended)
- Filename should match component name (recommended)
- Multi-component files test the last/main component

### 4. Incremental Compilation
Cache compiled components to speed up repeated test runs:
```javascript
const cacheKey = crypto.createHash('md5').update(csharpCode).digest('hex');
if (compilationCache.has(cacheKey)) {
  return compilationCache.get(cacheKey);
}
```

---

## Next Steps

1. **Immediate**: Fix component name extraction (30 min)
2. **Next**: Fix Babel plugin scope/parentPath bug (1-2 hours)
3. **Then**: Re-run full test suite
4. **Document**: Any new failures discovered
5. **Iterate**: Continue TDD cycle

---

## Success Metrics

- **Current**: 5/10 tests passing (50%)
- **After Fix #1**: 8/10 tests passing (80%)
- **After Fix #2**: 9-10/10 tests passing (90-100%)
- **Goal**: 10/10 tests passing with comprehensive coverage

---

## Notes

- TodoList.jsx passes despite having `.map()` - this is good, means array handling works
- Counter.jsx passes - baseline functionality works
- The Babel plugin crash is the most serious issue (prevents testing conditional logic)
- Once these are fixed, we can add more sophisticated tests:
  - State mutations
  - Multiple re-renders
  - Deep nesting
  - Performance stress tests
  - Edge cases (null, undefined, empty arrays)
