# Transpiler Issues - FileManagerPage.tsx

This document tracks the remaining TypeScript → C# transpilation errors that need to be fixed in `babel-plugin-minimact`.

## Summary

**Total Errors:** 4 unique errors remaining (was 6, fixed 2)
**Status:** In Progress - Fixing one error at a time

### ✅ Fixed Errors:
1. **Error 1** - Anonymous Type vs List<dynamic> - Fixed with `.Cast<dynamic>()`
2. **Error 6** - Math.Floor double to int - Fixed with `(int)` cast

---

## Error 1: Anonymous Type vs List<dynamic> Incompatibility

**File:** `FileManagerPage.cs:36`
**Error Code:** CS0019
**Message:** `Operator '??' cannot be applied to operands of type 'List<<anonymous type: dynamic name, dynamic count, dynamic size>>' and 'List<dynamic>'`

### TSX Code:
```tsx
const chartData = fileStats?.extensionStats.map(stat => ({
  name: stat.extension,
  count: stat.count,
  size: stat.totalSize
})) || [];
```

### Generated C# Code:
```csharp
var chartData = (((IEnumerable<dynamic>)fileStats?.ExtensionStats)?.Select(stat => new { name = stat.extension, count = stat.count, size = stat.totalSize })?.ToList()) ?? (new List<dynamic> {  });
```

### Problem:
C# won't allow `??` between `List<{anonymous type}>` and `List<dynamic>` because anonymous types are not assignable to `dynamic` in this context.

### Solution:
Cast the `.ToList()` result to `List<dynamic>`:
```csharp
var chartData = (((IEnumerable<dynamic>)fileStats?.ExtensionStats)?.Select(stat => new { name = stat.extension, count = stat.count, size = stat.totalSize })?.ToList() as List<dynamic>) ?? (new List<dynamic> {  });
```

**OR** use `.Cast<dynamic>()`:
```csharp
var chartData = (((IEnumerable<dynamic>)fileStats?.ExtensionStats)?.Select(stat => new { name = stat.extension, count = stat.count, size = stat.totalSize })?.Cast<dynamic>().ToList()) ?? (new List<dynamic> {  });
```

### Where to Fix:
`src/babel-plugin-minimact/src/generators/expressions.cjs` - Lines 437-456 (optional call expression with `.map()`)

When we detect a `.map()` that will be used with `??` (null coalescing), we need to add `.Cast<dynamic>()` before `.ToList()`.

---

## Error 2: Method Group vs Int Comparison

**File:** `FileManagerPage.cs:295`
**Error Code:** CS0019
**Message:** `Operator '>' cannot be applied to operands of type 'method group' and 'int'`

### Generated C# Code (Line 295):
```csharp
// Need to see the actual line
```

### Problem:
Likely calling a method without parentheses: `array.Count > 0` instead of `array.Count() > 0`, or accessing a property that should be called as a method.

### Possible Causes:
1. JavaScript `.length` being converted to C# `.Count` (property) when it should be `.Count()` (method for `IEnumerable<T>`)
2. Missing parentheses on a method call

### Where to Fix:
`src/babel-plugin-minimact/src/generators/expressions.cjs` - Lines 253-280 (member expression handling)

Currently line 259-260 converts `.length` → `.Count`, but this assumes it's a property (like on `List<T>`). For `IEnumerable<T>`, it should be `.Count()`.

---

## Error 3: Undefined Variable 'item'

**File:** `FileManagerPage.cs:293`
**Error Code:** CS0103
**Message:** `The name 'item' does not exist in the current context`

### Likely Cause:
A `.map()` callback that references `item` in the wrong scope, or a nested `.map()` where the inner lambda parameter isn't being captured correctly.

### Example TSX:
```tsx
data.map((item, index) => (
  <div key={index} onClick={() => handleItemClick(item)}>
    {item.name}
  </div>
))
```

### Potential Issue:
The lambda capture might not be working correctly in nested expressions, or `item` is being referenced outside its scope.

### Where to Fix:
`src/babel-plugin-minimact/src/generators/expressions.cjs` - Lines 121-141 (generateMapExpression)

---

## Error 4: Lambda with Dynamic Type

**File:** `FileManagerPage.cs:293`
**Error Code:** CS1977
**Message:** `Cannot use a lambda expression as an argument to a dynamically dispatched operation without first casting it to a delegate or expression tree type`

### Problem:
Calling a method on a `dynamic` object with a lambda expression requires an explicit delegate cast.

### Example:
```csharp
dynamicObject.Select(x => x.Value)  // ❌ Error
((IEnumerable<dynamic>)dynamicObject).Select(x => x.Value)  // ✅ Fixed
```

### Current Status:
We already added casting for `.Select()` in the optional chain case (lines 451-456), but there might be another case we're missing.

### Where to Fix:
Search for all lambda usages on dynamic types and ensure they have explicit casts.

---

## Error 5: Invalid Statement

**File:** `FileManagerPage.cs:347`
**Error Code:** CS0201
**Message:** `Only assignment, call, increment, decrement, await, and new object expressions can be used as a statement`

### Problem:
An expression is being used as a statement when it shouldn't be. Common causes:
- Lone JSX expression without assignment: `<Component />;` should be `var x = <Component />;` or `return <Component />;`
- Value being computed but not assigned or returned

### Likely Cause:
A helper function (like `formatFileSize` or `formatDate`) is being called but the result isn't being used or returned properly.

### Where to Fix:
Check how function calls are being generated in `generateCSharpStatement()` around line 146-202.

---

## Error 6: Double to Int Conversion

**File:** `FileManagerPage.cs:376`
**Error Code:** CS1503
**Message:** `Argument 1: cannot convert from 'double' to 'int'`

### TSX Code (likely):
```tsx
const i = Math.floor(Math.log(bytes) / Math.log(k));
return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
```

### Problem:
JavaScript math operations return `number` (which becomes `double` in C#), but we're using it where an `int` is expected (probably array indexing: `sizes[i]`).

### Solution:
Cast to `int`:
```csharp
var i = (int)Math.Floor(Math.Log(bytes) / Math.Log(k));
```

### Where to Fix:
`src/babel-plugin-minimact/src/generators/expressions.cjs` - Lines 330-354 (Math method handling)

Add explicit `(int)` cast for `Math.Floor()`, `Math.Ceiling()`, and `Math.Round()` when they're used in contexts requiring integers (like array indexing).

---

## Priority Order

Fix these in order:

1. **Error 1** (Anonymous Type) - Most common issue with dynamic LINQ
2. **Error 6** (Math.Floor cast) - Easy fix, clear solution
3. **Error 5** (Invalid statement) - Need to see context
4. **Error 2** (Method group) - Need to identify which method
5. **Error 3** (Undefined item) - Need to see full context
6. **Error 4** (Lambda cast) - Might be fixed already by Error 1 fix

---

## Next Steps

1. Fix Error 1 by adding `.Cast<dynamic>()` before `.ToList()` in optional chain `.map()` expressions
2. Re-transpile and test
3. Move to next error
4. Repeat until all errors are resolved

---

## Testing Command

```bash
# Re-transpile
cd J:\projects\minimact\src\babel-plugin-minimact
node -e "..." # (transpile script)

# Build
cd J:\projects\minimact\examples\minimact-electron-filemanager\src
dotnet build 2>&1 | grep "error CS"
```

---

## Related Files

- **Transpiler:** `J:\projects\minimact\src\babel-plugin-minimact\src\generators\expressions.cjs`
- **TSX Source:** `J:\projects\minimact\examples\minimact-electron-filemanager\src\Pages\FileManagerPage.tsx`
- **Generated C#:** `J:\projects\minimact\examples\minimact-electron-filemanager\src\Pages\FileManagerPage.cs`
- **Fixtures:** `J:\projects\minimact\src\fixtures\FileManagerPage.tsx`
