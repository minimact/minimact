# Reluxer Parity Test Results

This document tracks the results of testing Reluxer against Babel plugin output using fixtures in `src/fixtures/parity/`.

## Test Command
```bash
cd src
node test-single.js fixtures/parity/<fixture>.tsx
```

Outputs:
- Babel → `test-output-babel/<Component>/<Component>.cs`
- Reluxer → `test-output-lexer/<Component>.cs`

---

## TestChainedArrayMethods.tsx

**Status**: ❌ FAILING

### Issues Found in Reluxer

#### 1. Chained Array Methods Not Parsed
**Severity**: HIGH

Reluxer treats `.filter().map()` chains as raw text inside `VText` instead of parsing them:

```csharp
// Reluxer output (WRONG)
new VText($"{(todos.filter(todo=>!todo.done).map(todo=>(<likey={todo.id}>{todo.text}</li>)))}", "1.2.2.1")

// Babel output (CORRECT)
((IEnumerable<dynamic>)todos.Where(todo => !todo.done).ToList()).Select((Func<dynamic, dynamic>)(todo => new VElement("li", "1.2.2.1.1", new Dictionary<string, string>(), new VNode[]
{
    new VText($"{(todo.text)}", "1.2.2.1.1.1")
}))).ToArray()
```

**Root Cause**: JsxVisitor's `TryParseMapCall` pattern isn't matching chained methods. It likely only matches simple `array.map()` but not `array.filter().map()`.

#### 2. State Arrays Not Extracted
**Severity**: HIGH

Reluxer misses the `todos` and `products` state arrays:

```tsx
// Source
const [todos, setTodos] = useState<Todo[]>([...]);
const [products, setProducts] = useState<Product[]>([...]);
```

```csharp
// Reluxer output - MISSING todos and products
[State]
private bool showCompleted = false;
[State]
private string categoryFilter = "";
[State]
private int maxItems = 10;

// Babel output - HAS all state
[State]
private List<dynamic> todos = new List<object> { ... };
[State]
private List<dynamic> products = new List<object> { ... };
[State]
private bool showCompleted = false;
// etc.
```

**Root Cause**: StateVisitor may not be handling array initializers with complex object literals, or type annotations like `useState<Todo[]>`.

#### 3. Object Literal Not Converted
**Severity**: MEDIUM

```tsx
const priority = { high: 0, medium: 1, low: 2 };
```

```csharp
// Reluxer output (WRONG - invalid C#)
var priority = {high:0,medium:1,low:2};

// Should be
var priority = new Dictionary<string, int> { ["high"] = 0, ["medium"] = 1, ["low"] = 2 };
```

**Root Cause**: Local variable extraction doesn't convert JS object literals to C# dictionaries.

#### 4. Event Handler Parameter Missing
**Severity**: MEDIUM

```csharp
// Reluxer output (WRONG)
public void Handle1()
{
    SetState(nameof(categoryFilter), e.target.value);  // 'e' is not defined!
}

// Should be
public void Handle1(dynamic e)
{
    SetState(nameof(categoryFilter), e.target.value);
}
```

**Root Cause**: HandlerVisitor not detecting `e.target.value` pattern to add event parameter.

### Issues Found in Babel (for reference)

1. **`.sort()` not converted** - Uses JS `.sort()` instead of C# `.OrderBy()`
2. **`.slice()` not converted** - Uses JS `.slice()` instead of C# `.Skip().Take()`
3. **Invalid `??` usage** - `(showCompleted) ?? (!todo.done)` is invalid C# (can't use `??` with bool)

---

## Fixtures Tested

| Fixture | Babel | Reluxer | Notes |
|---------|-------|---------|-------|
| TestChainedArrayMethods.tsx | ⚠️ Partial | ❌ FAIL | Reluxer doesn't parse `.filter().map()` chains |
| TestUseProtectedState.tsx | ⚠️ Partial | ⚠️ Partial | Both miss `[ProtectedState]` attribute |
| TestUseServerTask.tsx | ✅ Good | ❌ None | Babel: `[ServerTask]` with streaming, return types |
| TestUseValidation.tsx | ✅ Good | ❌ None | Babel: `[Validation]` fields with rules |
| TestUsePredictHint.tsx | ✅ Good | ❌ None | Babel: hint ID fields (`_hintId_N`) |
| TestUseMarkdown.tsx | ⚠️ Partial | ❌ None | Babel references vars but doesn't declare `[Markdown]` |
| TestUseMicroMacroTask.tsx | ✅ Good | ❌ None | Babel: scheduled flags, delay tracking |
| TestUsePaginatedServerTask.tsx | ❓ | ❓ | Not tested yet |
| TestUsePubSub.tsx | ✅ Good | ❌ None | Babel: channel fields, loop templates |
| TestUseSignalR.tsx | ✅ Good | ❌ None | Babel: hub URL, connection fields |
| TestUseTemplate.tsx | ✅ Good | ❌ None | Babel: inherits layout, `RenderContent()` |

### Babel Hook Support Summary

| Hook | Babel Support | Generated C# |
|------|---------------|--------------|
| `useState` | ✅ Full | `[State]` fields |
| `useEffect` | ✅ Full | `[OnStateChanged]` methods |
| `useRef` | ✅ Full | `[Ref]` fields |
| `useProtectedState` | ⚠️ Partial | Just `[State]` (no protection) |
| `useServerTask` | ✅ Full | `[ServerTask]` with async/streaming |
| `useValidation` | ✅ Full | `[Validation]` with rules |
| `usePredictHint` | ✅ Full | Hint ID fields (`_hintId_N`) |
| `usePub` | ✅ Full | Channel name fields |
| `useSub` | ✅ Full | Subscription handlers |
| `useSignalR` | ✅ Full | Hub URL, connection state fields |
| `useMarkdown` | ⚠️ Partial | References vars but no `[Markdown]` |
| `useRazorMarkdown` | ⚠️ Partial | Same issue |
| `useMicroTask` | ✅ Full | Scheduled flags (`_microTaskScheduled_N`) |
| `useMacroTask` | ✅ Full | Scheduled flags + delay (`_macroTaskScheduled_N`) |
| `useTemplate` | ✅ Full | Inherits layout class, uses `RenderContent()` |

---

## Priority Fixes for Reluxer

### P0 - Critical (blocks basic functionality)
1. **Parse chained array methods** - `.filter().map()`, `.sort().map()`, `.slice().map()`
2. **Extract array state** - `useState<T[]>([...])` with complex initializers

### P1 - High (common patterns)
3. **Event handler `e` parameter** - Detect `e.target.value` usage
4. **Object literal conversion** - `{ key: value }` → `new Dictionary<...>`

### P2 - Medium (special hooks - Reluxer has NONE of these)
5. `useServerTask` - Async server operations with `[ServerTask]`
6. `useValidation` - Field validation with `[Validation]`
7. `usePredictHint` - Predictive rendering hints
8. `usePub`/`useSub` - Pub/sub channels
9. `useSignalR` - Hub connections
10. `useMicroTask`/`useMacroTask` - Task scheduling
11. `useTemplate` - Layout inheritance (change base class)

### P3 - Lower (edge cases)
12. **JS method conversion** - `.sort()` → `.OrderBy()`, `.slice()` → `.Skip().Take()`
13. **Logical OR in filter** - `showCompleted || !todo.done`

---

## Summary

**Reluxer currently supports:**
- ✅ `useState` (basic)
- ✅ `useEffect`
- ✅ `useRef`
- ✅ `useMvcState` / `useMvcViewModel`
- ✅ Custom hooks (basic)
- ✅ Simple `.map()` list rendering
- ✅ Conditionals (ternary, `&&`)
- ✅ Template extraction
- ✅ Event handlers (basic)

**Reluxer is MISSING (that Babel has):**
- ❌ Chained array methods (`.filter().map()`)
- ❌ Complex array state initializers
- ❌ `useServerTask` / `usePaginatedServerTask`
- ❌ `useValidation`
- ❌ `usePredictHint`
- ❌ `usePub` / `useSub`
- ❌ `useSignalR`
- ❌ `useMicroTask` / `useMacroTask`
- ❌ `useTemplate` (layout inheritance)
- ❌ `useProtectedState` (both partial)
- ❌ `useMarkdown` / `useRazorMarkdown` (both partial)
