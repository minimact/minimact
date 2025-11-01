# MVC Bridge - Babel Plugin Fixes Needed

**Status:** 🔴 Critical issues prevent MVC Bridge projects from working

**Context:** When transpiling ProductDetailsPage.tsx (MVC Bridge template), the Babel plugin generates C# code with several critical bugs that prevent compilation and runtime execution.

---

## Issue #1: Missing MVC State Properties ❌ CRITICAL

### Problem

The component uses `useMvcState` and `useMvcViewModel` hooks to access ViewModel properties from the server:

```tsx
// TypeScript/React
const [productName] = useMvcState<string>('productName');
const [price] = useMvcState<number>('price');
const [isAdmin] = useMvcState<boolean>('isAdminRole');
const [quantity, setQuantity] = useMvcState<number>('initialQuantity');
const [color, setColor] = useMvcState<string>('initialSelectedColor');
const [isExpanded, setIsExpanded] = useMvcState<boolean>('initialIsExpanded');
const viewModel = useMvcViewModel<ProductViewModel>();
```

**Generated C# (WRONG):**
```csharp
[Component]
public partial class ProductDetailsPage : MinimactComponent
{
    [State]
    private int cartTotal = 0;  // ✅ Only regular useState was detected

    // ❌ MISSING: productName, price, isAdmin, quantity, color, isExpanded
}
```

**What Should Be Generated:**
```csharp
[Component]
public partial class ProductDetailsPage : MinimactComponent
{
    // MVC ViewModel Properties (from useMvcState)
    [State]
    private string productName = "";

    [State]
    private decimal price = 0m;

    [State]
    private bool isAdmin = false;

    [State]
    private int quantity = 1;

    [State]
    private string color = "Black";

    [State]
    private bool isExpanded = false;

    // Regular Minimact state (from useState)
    [State]
    private int cartTotal = 0;
}
```

### Root Cause

The Babel plugin **does not recognize MVC Bridge hooks**:
- `useMvcState` is treated as unknown/ignored
- `useMvcViewModel` is treated as unknown/ignored
- Only standard Minimact hooks (`useState`, `useEffect`, `useRef`) are detected

**Location:** `src/babel-plugin-minimact/src/extractors/hooks.cjs` or similar

### Fix Required

1. **Detect `useMvcState` imports:**
   ```javascript
   import { useMvcState, useMvcViewModel } from '@minimact/mvc';
   ```

2. **Parse `useMvcState` calls:**
   ```tsx
   const [quantity, setQuantity] = useMvcState<number>('initialQuantity');
   ```
   Extract:
   - Variable name: `quantity`
   - Property name: `'initialQuantity'`
   - Type: `number` → C# `int`

3. **Generate C# state properties:**
   ```csharp
   [State]
   private int quantity = default;
   ```

4. **Generate setter methods (for mutable properties):**
   ```csharp
   private void setQuantity(int value)
   {
       SetState(nameof(quantity), value);
   }
   ```

---

## Issue #2: Incorrect Event Handler Parameters ❌ CRITICAL

### Problem

**Line 94 (C# output):**
```csharp
private void Handle2()
{
    handleQuantityChange(null);  // ❌ Should be -1
}
```

**Original TSX:**
```tsx
<button onClick={() => handleQuantityChange(-1)}>
  -
</button>
```

The arrow function `() => handleQuantityChange(-1)` loses its argument when converted to a named handler.

### What Should Be Generated

```csharp
private void Handle2()
{
    handleQuantityChange(-1);  // ✅ Correct
}
```

### Root Cause

The Babel plugin likely:
1. Detects arrow function in onClick
2. Extracts `handleQuantityChange` call
3. **Loses the argument** during extraction
4. Generates `null` as placeholder

**Location:** `src/babel-plugin-minimact/src/extractors/eventHandlers.cjs`

### Fix Required

Preserve arrow function arguments when generating handler wrappers:
- `() => handleQuantityChange(-1)` → `Handle2() { handleQuantityChange(-1); }`
- `() => handleQuantityChange(1)` → `Handle3() { handleQuantityChange(1); }`

---

## Issue #3: Undefined Event Object Reference ❌ CRITICAL

### Problem

**Line 104 (C# output):**
```csharp
private void Handle4()
{
    setColor(e.target.value);  // ❌ 'e' is undefined
}
```

**Original TSX:**
```tsx
<select
  value={color}
  onChange={(e) => setColor(e.target.value)}
>
```

The event parameter `e` from the arrow function is referenced but never declared in C#.

### What Should Be Generated

**Option A - Extract value from event (preferred):**
```csharp
private void Handle4(ChangeEvent e)
{
    setColor(e.Target.Value);
}
```

**Option B - Use DOM API:**
```csharp
private void Handle4()
{
    // Get value from the element that triggered the event
    var select = (HTMLSelectElement)Document.GetElementById("...");
    setColor(select.Value);
}
```

**Option C - Pass value directly (if possible):**
```csharp
// In VNode generation:
new VElement("select", new Dictionary<string, string> {
    ["onchange"] = "Handle4",
    ["data-handler-param"] = "value"  // Signal to extract value
})

// Handler:
private void Handle4(string value)
{
    setColor(value);
}
```

### Root Cause

Event handler extraction doesn't handle event parameter access (`e.target.value`).

**Location:** `src/babel-plugin-minimact/src/extractors/eventHandlers.cjs`

### Fix Required

1. Detect event parameter usage in arrow functions
2. Generate appropriate C# code to access event properties
3. Map JS event properties to C# equivalents:
   - `e.target.value` → `e.Target.Value`
   - `e.target.checked` → `e.Target.Checked`
   - `e.preventDefault()` → `e.PreventDefault()`

---

## Issue #4: Incorrect SetState Toggle Logic ❌ CRITICAL

### Problem

**Line 109 (C# output):**
```csharp
private void Handle5()
{
    setIsExpanded(null);  // ❌ Should be !isExpanded
}
```

**Original TSX:**
```tsx
<button onClick={() => setIsExpanded(!isExpanded)}>
  {isExpanded ? 'Hide' : 'Show'} Details
</button>
```

The negation logic `!isExpanded` is lost and replaced with `null`.

### What Should Be Generated

```csharp
private void Handle5()
{
    setIsExpanded(!isExpanded);  // ✅ Correct toggle
}
```

Or inline the SetState call:
```csharp
private void Handle5()
{
    SetState(nameof(isExpanded), !isExpanded);
}
```

### Root Cause

Same as Issue #2 - arrow function argument extraction loses the expression.

**Location:** `src/babel-plugin-minimact/src/extractors/eventHandlers.cjs`

### Fix Required

Preserve unary expressions (`!expr`) when extracting arrow function bodies.

---

## Issue #5: Missing Setter Method Implementations ❌ CRITICAL

### Problem

The C# code references methods that don't exist:

**Line 83:**
```csharp
setQuantity(newQuantity);  // ❌ Method not defined
```

**Line 104:**
```csharp
setColor(e.target.value);  // ❌ Method not defined
```

**Line 109:**
```csharp
setIsExpanded(null);  // ❌ Method not defined
```

### What Should Be Generated

For each MVC state with a setter:

```csharp
private void setQuantity(int value)
{
    SetState(nameof(quantity), value);
}

private void setColor(string value)
{
    SetState(nameof(color), value);
}

private void setIsExpanded(bool value)
{
    SetState(nameof(isExpanded), value);
}
```

### Root Cause

MVC Bridge hooks aren't detected (Issue #1), so setter methods are never generated.

**Location:** Same as Issue #1 - hook extraction logic

### Fix Required

When `useMvcState` returns a setter (array destructuring with 2 elements), generate the setter method.

---

## Issue #6: Missing ViewModel Properties Access ❌ MODERATE

### Problem

**Line 33 (C# output):**
```csharp
new VText($"{null}")  // ❌ Should be viewModel?.userEmail
```

**Original TSX:**
```tsx
<div style={{ color: '#6b7280', fontSize: '14px' }}>
  Logged in as: {viewModel?.userEmail}
</div>
```

Optional chaining (`?.`) is correctly marked as `__complex__`, but the reference to `viewModel` is lost entirely.

### What Should Be Generated

Since optional chaining IS complex (can't be templated), this is fine:

```csharp
new VText($"{viewModel?.UserEmail ?? \"\"}")  // ✅ Valid C#
```

Or:
```csharp
new VText($"{(viewModel != null ? viewModel.UserEmail : \"\")}")
```

### Root Cause

`useMvcViewModel()` hook isn't recognized, so `viewModel` variable is never declared.

**Location:** Hook extraction logic

### Fix Required

Detect `useMvcViewModel()` and generate:

```csharp
// Option A - Store entire ViewModel as state
[State]
private object viewModel = null;  // Populated by MVC Bridge

// Option B - Just allow access to ViewModel property (via base class?)
// ProductDetailsPage would have access to `this.ViewModel` from MVC Bridge setup
```

**Note:** This might require coordination with server-side MVC Bridge implementation.

---

## Issue #7: Incorrect Namespace ⚠️ LOW PRIORITY

### Problem

**Line 8 (C# output):**
```csharp
namespace Minimact.Components;
```

For an MVC project named `my-mvc-app`, this should probably be:

```csharp
namespace my_mvc_app.Pages;
```

### What Should Be Generated

Based on project structure:
- Project name: `my-mvc-app`
- File location: `Pages/ProductDetailsPage.tsx`
- C# namespace: `my_mvc_app.Pages`

### Root Cause

Babel plugin doesn't know the project context, uses hardcoded `Minimact.Components`.

**Location:** Component generation code

### Fix Required

**Option A:** Make namespace configurable via Babel options
**Option B:** Infer from file path
**Option C:** Leave as-is and use partial classes (acceptable workaround)

---

## Priority Fix Order

### 🔴 P0 - Blocks Compilation:
1. **Issue #1:** Detect `useMvcState`/`useMvcViewModel` and generate state properties
2. **Issue #3:** Handle event parameter access (`e.target.value`)
3. **Issue #5:** Generate setter methods for MVC state

### 🔴 P1 - Blocks Runtime:
4. **Issue #2:** Preserve arrow function arguments in event handlers
5. **Issue #4:** Preserve unary expressions (`!expr`) in handlers

### 🟡 P2 - Reduces Functionality:
6. **Issue #6:** Support `useMvcViewModel()` for full ViewModel access

### 🟢 P3 - Nice to Have:
7. **Issue #7:** Configurable namespaces

---

## Implementation Strategy

### Phase 1: MVC Hook Detection

**File:** `src/babel-plugin-minimact/src/analyzers/detection.cjs` or new file

```javascript
function detectMvcBridgeHooks(path, component) {
  // 1. Find imports from '@minimact/mvc'
  const mvcImports = findImports(path, '@minimact/mvc');

  // 2. Track useMvcState calls
  path.traverse({
    CallExpression(callPath) {
      if (isUseMvcState(callPath.node)) {
        const [varName, setterName] = getDestructuredNames(callPath.parent);
        const propertyName = callPath.node.arguments[0].value;
        const type = extractTypeFromGeneric(callPath.node);

        component.mvcState.set(propertyName, {
          varName,
          setterName,
          type,
          isMutable: !!setterName
        });
      }
    }
  });
}
```

### Phase 2: Event Handler Argument Preservation

**File:** `src/babel-plugin-minimact/src/extractors/eventHandlers.cjs`

```javascript
function extractArrowFunctionHandler(arrowFunc) {
  // Current: loses arguments
  // Fixed: preserve the entire body

  if (t.isCallExpression(arrowFunc.body)) {
    const callee = arrowFunc.body.callee.name;
    const args = arrowFunc.body.arguments.map(arg =>
      generateCSharpExpression(arg, true)  // Preserve expressions!
    );
    return `${callee}(${args.join(', ')})`;
  }
}
```

### Phase 3: Event Parameter Handling

**File:** `src/babel-plugin-minimact/src/extractors/eventHandlers.cjs`

```javascript
function generateEventHandler(arrowFunc, handlerName) {
  const params = arrowFunc.params;  // e.g., [(e)]

  // Check if body accesses event parameter
  const usesEventParam = checkEventParamUsage(arrowFunc.body, params);

  if (usesEventParam) {
    return `
private void ${handlerName}(Event e)
{
    ${generateHandlerBody(arrowFunc.body, params)}
}`;
  } else {
    return `
private void ${handlerName}()
{
    ${generateHandlerBody(arrowFunc.body, params)}
}`;
  }
}
```

---

## Testing Checklist

After implementing fixes, verify:

- [ ] `useMvcState('prop')` generates `[State] private T prop;`
- [ ] `useMvcState('prop')` with setter generates setter method
- [ ] `() => handler(-1)` preserves `-1` argument
- [ ] `() => handler(1)` preserves `1` argument
- [ ] `(e) => setter(e.target.value)` generates valid C# event access
- [ ] `() => setter(!state)` preserves `!` negation
- [ ] `useMvcViewModel()` generates viewModel variable
- [ ] Generated C# compiles without errors
- [ ] MVC Bridge template works end-to-end

---

## Related Files to Investigate

1. **Hook Detection:**
   - `src/babel-plugin-minimact/src/analyzers/detection.cjs`
   - `src/babel-plugin-minimact/src/extractors/hooks.cjs` (if exists)

2. **Event Handler Extraction:**
   - `src/babel-plugin-minimact/src/extractors/eventHandlers.cjs`
   - `src/babel-plugin-minimact/src/generators/expressions.cjs`

3. **Component Generation:**
   - `src/babel-plugin-minimact/src/generators/component.cjs`
   - `src/babel-plugin-minimact/src/transpilers/typescriptToCSharp.cjs`

4. **State Management:**
   - Look for where `[State]` properties are generated
   - Look for where setter methods are generated

---

## Acceptance Criteria

✅ **Success:** ProductDetailsPage.tsx transpiles to valid C# that:
1. Has all MVC state properties declared
2. Has all setter methods implemented
3. Has correct event handler implementations
4. Compiles without errors
5. Runs correctly when integrated with MVC controller + ViewModel

The MVC Bridge should be a **first-class citizen** alongside standard Minimact hooks.
