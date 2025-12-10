# Reluxer Parity Gaps

This document tracks features that babel-plugin-minimact supports but Reluxer does not yet properly handle. These gaps were identified by running the example files from `src/babel-plugin-minimact/examples/` through Reluxer.

## Critical: Raw JavaScript in C# Output

Reluxer is outputting raw JavaScript syntax instead of converting to C#. This produces uncompilable code.

### 1. JavaScript Object Literals Not Converted

**Input (hooks.input.tsx:49):**
```typescript
const emailValidation = useValidation('email', {
  required: true,
  pattern: /^[^@]+@[^@]+$/,
  minLength: 5,
  maxLength: 100
});
```

**Actual Output (hooks.input.cs:49):**
```csharp
var emailValidation = useValidation('email', {required:true, pattern:/^[^@] +@[^@] + $ /, minLength:5, maxLength:100});
```

**Expected Output:**
```csharp
[Validation("email", Required = true, Pattern = @"^[^@]+@[^@]+$", MinLength = 5, MaxLength = 100)]
private ValidationState emailValidation;
```

**Location to fix:** `SpecialHooksVisitor.cs` - `VisitUseValidationObject` pattern extracts the object but doesn't convert it to C# attribute syntax.

---

### 2. JavaScript Single Quotes Not Converted to Double Quotes

**Input:**
```typescript
const publish = usePub('notifications');
```

**Actual Output:**
```csharp
var publish = usePub('notifications');
```

**Expected Output:**
```csharp
// Should be handled via [Publisher] attribute, not a local variable
[Publisher("notifications")]
```

**Issue:** Single quotes `'notifications'` are invalid C# syntax. Should use double quotes `"notifications"`.

---

### 3. JavaScript Regex Literals Not Converted

**Input:**
```typescript
pattern: /^[^@]+@[^@]+$/
```

**Actual Output:**
```csharp
pattern:/^[^@] +@[^@] + $ /
```

**Expected Output:**
```csharp
Pattern = @"^[^@]+@[^@]+$"
```

**Issue:** JavaScript regex `/pattern/` should become C# verbatim string `@"pattern"`.

---

### 4. Hooks Rendered as Function Calls Instead of Attributes/Fields

Several hooks should not appear in the `Render()` method at all. They should be converted to class-level attributes or fields.

**Hooks that should NOT be in Render():**
- `useRef` → `[Ref] private ElementReference inputRef;`
- `useValidation` → `[Validation(...)] private ValidationState field;`
- `useModal` → `[Modal] private ModalState confirmModal;`
- `useDropdown` → `[Dropdown(...)] private DropdownState dropdown;`
- `usePub` → `[Publisher(...)]` class attribute

**Current behavior:** These are being output as local variables with raw JS syntax in `Render()`.

---

### 5. JavaScript Arrow Functions in Object Literals

**Input (component.input.tsx):**
```typescript
const animation = useTimeline({
  duration: 1000,
  keyframes: [
    { at: 0, opacity: 0 },
    { at: 100, opacity: 1 }
  ]
});
```

**Actual Output:**
```csharp
var animation = useTimeline({duration:1000, keyframes:[{at:0, opacity:0}, {at:100, opacity:1}]});
```

**Expected Output:**
```csharp
[Timeline(Duration = 1000)]
[Keyframe(0, "opacity", 0)]
[Keyframe(100, "opacity", 1)]
private TimelineState animation;
```

---

### 6. JavaScript Object Shorthand in Handler Bodies

**Input (component.input.tsx:90):**
```typescript
const handleSubmit = () => {
  if (canSubmit) {
    publish({ action: 'submit', count });
  }
};
```

**Actual Output (component.input.cs:90):**
```csharp
if(canSubmit){publish({action:'submit', count});}
```

**Expected Output:**
```csharp
if (canSubmit)
{
    Publish("notifications", new { action = "submit", count = count });
}
```

**Issues:**
1. Object literal `{action:'submit', count}` not converted to `new { action = "submit", count = count }`
2. Single quotes not converted to double quotes
3. Object shorthand `count` not expanded to `count = count`

---

## Files Affected

Based on running examples through Reluxer:

| Example File | Errors | Primary Issue |
|--------------|--------|---------------|
| hooks.input.tsx | 26+ | Object literals, regex, single quotes |
| component.input.tsx | 23+ | Object literals, handler bodies |
| expressions.input.tsx | TBD | Complex expressions |
| eventHandlers.input.tsx | TBD | Handler body conversion |

---

## Root Cause Analysis

The issue is in how Reluxer handles "unmatched" token sequences. When a pattern doesn't match, the tokens are passed through with minimal conversion via `ToCSharpFromString()` in `CSharpGenerator.cs`.

**Affected code paths:**

1. **`CSharpGenerator.cs:51`** - `ToCSharpFromString()` does basic string replacement but doesn't handle:
   - Object literals `{}`
   - Regex literals `/pattern/`
   - Arrow functions `() => {}`
   - Single quotes

2. **`SpecialHooksVisitor.cs`** - Pattern matchers extract hook names but don't fully parse the options object argument.

3. **`JsxVisitor.cs`** - Handler bodies are extracted but not fully transpiled to C#.

---

## Suggested Fixes

### Priority 1: Object Literal Conversion

Add a `ConvertObjectLiteralToCSharp()` method that handles:
```javascript
{ key: value, key2: value2 }  →  new { key = value, key2 = value2 }
{ key }                        →  new { key = key }  // shorthand
{ 'string-key': value }        →  new Dictionary<string, object> { ["string-key"] = value }
```

### Priority 2: String Quote Conversion

In `ToCSharpFromString()`, convert single quotes to double quotes:
```csharp
result = result.Replace("'", "\"");
```

### Priority 3: Regex Literal Conversion

Detect `/pattern/flags` and convert to `@"pattern"`:
```csharp
// Regex: /^[^@]+@[^@]+$/
// C#:    @"^[^@]+@[^@]+$"
```

### Priority 4: Hook-Specific Visitors

Each hook that takes an options object needs a dedicated visitor that:
1. Extracts the options object tokens
2. Parses them into a structured model
3. Generates appropriate C# attributes/fields

Hooks needing this treatment:
- `useValidation` - options → `[Validation(...)]` attribute
- `useTimeline` - options → `[Timeline]` + `[Keyframe]` attributes
- `useDropdown` - route → `[Dropdown(...)]` attribute
- `useStateX` - options → `[StateXTransform]` attributes

---

## Testing

After fixes, all files in `src/babel-plugin-minimact/examples/*.input.tsx` should:
1. Produce compilable C# code
2. Match the structure shown in corresponding `.expected.cs` files

Run test:
```bash
cd src/reluxer-minimact/Reluxer.Transformer.Tests
dotnet run -- "../babel-plugin-minimact/examples/hooks.input.tsx"
```
