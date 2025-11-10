# Minor Issues Analysis & Solutions

## Issue 1: Helper Functions Using External Libraries (formatDate)

### The Problem

**JSX (line 37-39 of ExternalLibrariesTest.jsx):**
```javascript
const formatDate = (dateStr) => {
  return moment(dateStr).format('MMM DD, YYYY');
};
```

**Generated C# (line 110-113):**
```csharp
private void formatDate(dynamic dateStr)
{
    return moment(dateStr).format("MMM DD, YYYY");  // ❌ 'moment' doesn't exist in C#
}
```

###Root Cause

`formatDate` is an **arrow function variable**, not a top-level variable assignment. The Babel plugin's `extractLocalVariables` only processes `VariableDeclaration` nodes, but it doesn't detect that the **function body** uses external libraries.

**Current Flow:**
1. Plugin detects `const formatDate = (dateStr) => ...` as a variable
2. Checks if the initializer (`(dateStr) => ...`) uses external libs
3. Arrow function itself doesn't directly reference `moment`
4. ❌ Not marked as client-computed
5. Gets transpiled as regular C# method

### Solution Options

#### Option A: Mark Function Variables as Client-Computed

If a variable is initialized with an arrow function that uses external libraries in its body, mark the variable as client-computed.

**Implementation:**

```javascript
// In localVariables.cjs
function extractLocalVariables(path, component) {
  const declaration = path.node;

  declaration.declarations.forEach(declarator => {
    if (t.isIdentifier(declarator.id)) {
      const varName = declarator.id.name;
      const init = declarator.init;

      // Check if this is a function
      const isFunction = t.isArrowFunctionExpression(init) || t.isFunctionExpression(init);

      let isClientComputed = false;

      if (isFunction) {
        // For functions, check if the body uses external libraries
        isClientComputed = usesExternalLibrary(init.body, component.externalImports);
      } else {
        // For regular variables, check the initializer
        isClientComputed = usesExternalLibrary(init, component.externalImports);
      }

      if (isClientComputed) {
        component.clientComputedVars.add(varName);
      }

      component.localVariables.push({
        name: varName,
        init: init,
        isClientComputed: isClientComputed,
        isFunction: isFunction  // NEW: Track if it's a function
      });
    }
  });
}
```

**Generated C# (corrected):**
```csharp
[ClientComputed("formatDate")]
private Func<string, string> formatDate => GetClientState<Func<string, string>>("formatDate", null);
```

#### Option B: Don't Transpile Helper Functions Using External Libraries

Skip transpiling these functions entirely. They'll only run on the client.

**Generated C# (corrected):**
```csharp
// formatDate is client-only, no C# method generated
// Usage in render:
new VText($"{GetClientComputed("formatDate", item.created)}")
```

#### Option C: Inline Client-Side Code (Recommended)

Generate a placeholder that calls client-computed values:

```csharp
private string formatDate(string dateStr)
{
    // This method is overridden by client-side computation
    return GetClientState<string>($"formatDate_{dateStr}", dateStr);
}
```

---

## Issue 2: Event Handler Arrow Function Logic (toggleSort)

### The Problem

**JSX (line 41-43):**
```javascript
const toggleSort = () => {
  setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
};
```

**Generated C# (line 115-118):**
```csharp
private void toggleSort()
{
    SetState(nameof(sortOrder), null);  // ❌ Wrong! Should toggle value
}
```

### Root Cause

The Babel plugin's `generateCSharpStatement` doesn't correctly handle `setState` calls with conditional expressions.

**What's Happening:**

1. `setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')` is an `ExpressionStatement`
2. Contains `CallExpression` → `setSortOrder`
3. Argument is `ConditionalExpression` → `sortOrder === 'asc' ? 'desc' : 'asc'`
4. Plugin recognizes `setSortOrder` as state setter
5. But fails to translate the conditional argument correctly
6. ❌ Generates `SetState(nameof(sortOrder), null)` instead

### Solution

Fix the expression generator to handle conditional expressions in setState calls.

**File:** `src/babel-plugin-minimact/src/generators/expressions.cjs`

**Find the setState handling code and ensure it processes the argument expression:**

```javascript
function generateCSharpExpression(node) {
  // ... existing code

  if (t.isCallExpression(node)) {
    const callee = node.callee;

    // Check if it's a setState call
    if (t.isIdentifier(callee) && isSetStateCall(callee.name)) {
      const stateVarName = getStateVarFromSetter(callee.name);
      const valueArg = node.arguments[0];

      // IMPORTANT: Generate the value expression
      const valueExpr = valueArg ? generateCSharpExpression(valueArg) : 'null';

      return `SetState(nameof(${stateVarName}), ${valueExpr})`;
    }
  }

  // Handle conditional expressions
  if (t.isConditionalExpression(node)) {
    const test = generateCSharpExpression(node.test);
    const consequent = generateCSharpExpression(node.consequent);
    const alternate = generateCSharpExpression(node.alternate);
    return `(${test}) ? ${consequent} : ${alternate}`;
  }

  // ... rest of function
}
```

**Corrected Generated C# (should be):**
```csharp
private void toggleSort()
{
    sortOrder = (sortOrder == "asc") ? "desc" : "asc";
    SetState(nameof(sortOrder), sortOrder);
}
```

---

## Current vs. Expected Output Comparison

### formatDate

| Current (Wrong) | Expected (Correct) |
|----------------|-------------------|
| ```csharp
private void formatDate(dynamic dateStr)
{
    return moment(dateStr).format("MMM DD, YYYY");
}
``` | ```csharp
[ClientComputed("formatDate")]
private Func<string, string> formatDate => GetClientState<Func<string, string>>("formatDate", null);
``` |

### toggleSort

| Current (Wrong) | Expected (Correct) |
|----------------|-------------------|
| ```csharp
private void toggleSort()
{
    SetState(nameof(sortOrder), null);
}
``` | ```csharp
private void toggleSort()
{
    sortOrder = (sortOrder == "asc") ? "desc" : "asc";
    SetState(nameof(sortOrder), sortOrder);
}
``` |

---

## Implementation Priority

### High Priority (Blocks Full External Library Support)
✅ **Issue 1: formatDate** - Must fix for helper functions using external libs

### Medium Priority (Pre-existing Bug)
⚠️ **Issue 2: toggleSort** - Affects setState with conditional logic (not specific to external libraries)

---

## Next Steps

1. **For Issue 1:** Enhance `usesExternalLibrary` to check function bodies
2. **For Issue 2:** Fix `generateCSharpExpression` to handle conditionals in setState calls
3. **Test both** with ExternalLibrariesTest.jsx
4. **Verify** transpilation output is clean

Once these are fixed, external library support will be complete! 🌵 + 🍹
