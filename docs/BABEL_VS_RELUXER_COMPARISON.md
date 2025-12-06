# Babel Plugin vs Reluxer Comparison

This document compares the feature parity between `babel-plugin-minimact` (JavaScript/Node.js) and `reluxer-minimact` (C#/.NET).

## Legend
- ✅ Implemented
- ⚠️ Partial
- ❌ Not implemented

---

## 1. REACT HOOKS EXTRACTION

### Core Hooks

| Feature | Babel | Reluxer | Notes |
|---------|-------|---------|-------|
| `useState` → `[State]` field | ✅ | ✅ | Both extract name, setter, initial value, type |
| `useState<T>` generic type | ✅ | ⚠️ | Reluxer infers from value, not generic |
| `useProtectedState` | ✅ | ❌ | Lifted state protection |
| `useEffect` → `[OnStateChanged]` | ✅ | ✅ | EffectVisitor exists |
| `useRef` → `[Ref]` | ✅ | ✅ | RefVisitor exists |
| `useStateX` | ✅ | ❌ | Declarative state projections |

> **Note**: `useClientState` was removed - no client-side reconciliation in dehydrationist architecture.

### Special-Purpose Hooks

| Feature | Babel | Reluxer | Notes |
|---------|-------|---------|-------|
| `useMarkdown` | ✅ | ❌ | |
| `useRazorMarkdown` | ✅ | ❌ | |
| `useTemplate` | ✅ | ❌ | Layout inheritance |
| `useValidation` | ✅ | ❌ | Form validation |
| `useModal` | ✅ | ❌ | |
| `useToggle` | ✅ | ❌ | |
| `useDropdown` | ✅ | ❌ | |
| `usePub` / `useSub` | ✅ | ❌ | Pub/Sub channels |
| `useMicroTask` / `useMacroTask` | ✅ | ❌ | Task scheduling |
| `useSignalR` | ✅ | ❌ | Hub integration |
| `usePredictHint` | ✅ | ❌ | Predictive rendering hints |
| `useServerTask` | ✅ | ❌ | Async server operations |
| `usePaginatedServerTask` | ✅ | ❌ | Paginated queries |
| `useMvcState` | ✅ | ✅ | StateVisitor has patterns |
| `useMvcViewModel` | ✅ | ✅ | StateVisitor has pattern |

---

## 2. CUSTOM HOOKS

| Feature | Babel | Reluxer | Notes |
|---------|-------|---------|-------|
| Custom hook detection (`useXxx`) | ✅ | ✅ | CustomHookVisitor exists |
| `namespace` parameter requirement | ✅ | ⚠️ | Needs verification |
| Extract useState from hook body | ✅ | ⚠️ | Basic support |
| Extract methods from hook | ✅ | ⚠️ | Basic support |
| Extract JSX from hook | ✅ | ⚠️ | Basic support |
| Hook metadata generation | ✅ | ✅ | Generates `UseXxxHook` class |
| Imported hook handling | ✅ | ❌ | Track imported hook metadata |
| Hook instance usage | ✅ | ⚠️ | |
| Captured parameters in .map() | ✅ | ⚠️ | Partial - JsxVisitor has context |

---

## 3. JSX TRANSFORMATION

### Elements & Structure

| Feature | Babel | Reluxer | Notes |
|---------|-------|---------|-------|
| JSX Element → VElement | ✅ | ✅ | JsxVisitor |
| Fragments → child array | ✅ | ⚠️ | Needs verification |
| Static string attributes | ✅ | ✅ | `VisitStringAttribute` |
| Dynamic binding attributes | ✅ | ✅ | `VisitExpressionAttribute` |
| Event handler attributes | ✅ | ✅ | Detects `on*` prefix |
| `className` → `class` | ✅ | ✅ | `NormalizeAttributeName` |
| Style binding (inline styles) | ✅ | ✅ | `TransformStyleObject` |
| Hex path assignment | ✅ | ✅ | Path tracking in visitors |

### Conditional Rendering

| Feature | Babel | Reluxer | Notes |
|---------|-------|---------|-------|
| Ternary `? :` | ✅ | ✅ | `TryParseTernary` |
| Logical AND `&&` | ✅ | ✅ | `TryParseAndConditional` |
| Nested conditionals | ✅ | ✅ | Handles depth tracking |
| VNull for false branch | ✅ | ✅ | `VNullModel` |

### List Rendering

| Feature | Babel | Reluxer | Notes |
|---------|-------|---------|-------|
| `.map()` pattern recognition | ✅ | ✅ | `TryParseMapCall` |
| Item/index variables | ✅ | ✅ | Extracts from callback |
| Chained operations (.filter.map) | ✅ | ⚠️ | Partial |
| Key binding extraction | ✅ | ✅ | From element attributes |
| Loop template generation | ✅ | ✅ | `LoopTemplateInfo` |

### Dynamic Content

| Feature | Babel | Reluxer | Notes |
|---------|-------|---------|-------|
| Text interpolation `{var}` | ✅ | ✅ | VTextModel with binding |
| Member expressions `item.name` | ✅ | ✅ | |
| Method calls `price.toFixed(2)` | ✅ | ✅ | Transform detection |
| Binary expressions `count * 2` | ✅ | ⚠️ | |
| Logical expressions `\|\| 'default'` | ✅ | ⚠️ | |
| Template literals | ✅ | ✅ | `ConvertExpression` |

---

## 4. TEMPLATE EXTRACTION

| Feature | Babel | Reluxer | Notes |
|---------|-------|---------|-------|
| Static text templates | ✅ | ✅ | `TemplateType.Static` |
| Dynamic text templates | ✅ | ✅ | `TemplateType.Dynamic` |
| Attribute templates | ✅ | ✅ | Static & Dynamic |
| Loop item templates | ✅ | ✅ | `ExtractLoopItemTemplate` |
| Conditional element templates | ✅ | ✅ | `ConditionalElementInfo` |
| Transform metadata (toFixed, etc) | ✅ | ✅ | `TransformInfo` |
| Nullable detection (`?.`) | ✅ | ✅ | `Nullable` flag |
| Slot positions | ✅ | ✅ | |
| Binding list | ✅ | ✅ | |

---

## 5. OUTPUT FILE GENERATION

| Output | Babel | Reluxer | Notes |
|--------|-------|---------|-------|
| `.cs` C# class | ✅ | ✅ | `CSharpGenerator` |
| `.templates.json` | ✅ | ✅ | `TemplateGenerator` |
| `.hooks.json` | ✅ | ✅ | `HooksGenerator` |
| `.structural-changes.json` | ✅ | ✅ | `StructuralChangesGenerator` |
| `.tsx.keys` | ✅ | ✅ | `KeysGenerator` |
| `.timeline-templates.json` | ✅ | ⚠️ | TimelineVisitor exists |

---

## 6. C# CODE GENERATION

| Feature | Babel | Reluxer | Notes |
|---------|-------|---------|-------|
| `[Component]` attribute | ✅ | ✅ | |
| `[State]` fields | ✅ | ✅ | |
| `[Prop]` parameters | ✅ | ✅ | |
| `[Hook]` classes | ✅ | ✅ | Custom hook → class |
| `[LoopTemplate]` attributes | ✅ | ✅ | |
| `[Timeline]` attributes | ✅ | ✅ | |
| `Render()` method | ✅ | ✅ | |
| VElement construction | ✅ | ✅ | |
| VText construction | ✅ | ✅ | |
| VNull for conditionals | ✅ | ✅ | |
| VComponentWrapper | ✅ | ✅ | |
| Event handler methods | ✅ | ✅ | |
| `GetClientHandlers()` | ✅ | ✅ | |
| Helper functions | ✅ | ✅ | |
| `StateManager.SyncMembersToState()` | ✅ | ✅ | |
| `SetState()` calls | ✅ | ✅ | |
| `[ClientComputed]` properties | ✅ | ✅ | Lifted state |
| MVC state setters | ✅ | ✅ | |

---

## 7. TYPE HANDLING

| Feature | Babel | Reluxer | Notes |
|---------|-------|---------|-------|
| TS→C# basic types | ✅ | ✅ | string, number, boolean |
| Array types → List<T> | ✅ | ✅ | |
| Object types → Dictionary | ✅ | ✅ | |
| Type inference from value | ✅ | ✅ | `InferType` |
| Generic type extraction | ✅ | ⚠️ | |
| Union types | ✅ | ❌ | |
| Custom types pass-through | ✅ | ⚠️ | |

---

## 8. EVENT HANDLERS

| Feature | Babel | Reluxer | Notes |
|---------|-------|---------|-------|
| Inline arrow functions | ✅ | ✅ | |
| Named function references | ✅ | ✅ | |
| Handler classification (server/client) | ✅ | ⚠️ | |
| Captured parameters from .map() | ✅ | ✅ | Context tracking |
| `e.target.value` simplification | ✅ | ⚠️ | |
| JS handler storage | ✅ | ✅ | `GetClientHandlers()` |

---

## 9. EXPRESSION CONVERSION

| Feature | Babel | Reluxer | Notes |
|---------|-------|---------|-------|
| `setXxx(value)` → `SetState()` | ✅ | ✅ | |
| `console.log` → `Console.WriteLine` | ✅ | ✅ | |
| `Math.xxx` → `Math.Xxx` | ✅ | ✅ | |
| `.toFixed(n)` → `.ToString("Fn")` | ✅ | ✅ | |
| `.toLocaleString()` → `.ToString("N0")` | ✅ | ✅ | |
| Template literals | ✅ | ✅ | |
| Single quotes → double quotes | ✅ | ✅ | |
| `const/let` → `var` | ✅ | ✅ | |
| `setTimeout` → `Task.Delay` | ✅ | ✅ | |

---

## 10. LEXER/PARSER CAPABILITIES

| Feature | Babel | Reluxer | Notes |
|---------|-------|---------|-------|
| Full TypeScript support | ✅ | ✅ | TsxLexer |
| JSX parsing | ✅ | ✅ | State machine |
| Type annotations | ✅ | ✅ | TypeAnnotation state |
| Generic type params | ✅ | ✅ | GenericParams state |
| Regex literals | ✅ | ✅ | Context detection |
| Template literals | ✅ | ✅ | |
| Decorators | ✅ | ✅ | `@decorator` |
| `as` type assertions | ✅ | ✅ | |
| Pattern matching | N/A | ✅ | Unique to Reluxer |
| Token manipulation | N/A | ✅ | `InsertAfter`, `Replace` |

---

## SUMMARY

### What Reluxer HAS that Babel doesn't:
1. **Pattern-based visitor system** - Declarative `[TokenPattern]` attributes
2. **Balanced bracket matchers** - `\Bp`, `\Bb`, `\Bk`, `\Bj`
3. **Named captures & backreferences** - `(?<name>\i)`, `\k<name>`
4. **Lookahead/lookbehind** - `(?=...)`, `(?!...)`, `(?<=...)`, `(?<!...)`
5. **Token manipulation** - `InsertAfter`, `Replace`, `Remove`
6. **Scoped traversal** - `From` attribute restricts visitor scope
7. **Dependency injection between visitors** - `[Inject]` attribute

### What Babel HAS that Reluxer needs:
1. **Special hooks**: useClientState, useProtectedState, useStateX
2. **Content hooks**: useMarkdown, useRazorMarkdown, useTemplate
3. **UI hooks**: useModal, useToggle, useDropdown
4. **Communication hooks**: usePub, useSub, useSignalR
5. **Task hooks**: useMicroTask, useMacroTask, useServerTask, usePaginatedServerTask
6. **Prediction hook**: usePredictHint
7. **Validation hook**: useValidation
8. **Imported hook handling**: Track and link imported hooks
9. **Full chained array methods**: .filter().slice().map() chains
10. **Plugin detection**: `<Plugin name="..." state={...} />`
11. **Union type handling**: string | number → C# equivalent
12. **Handler classification**: Server vs client vs hybrid handlers

### Priority Implementation Order:
1. **High Priority** (commonly used):
   - useClientState, useProtectedState
   - Full chained array methods
   - Handler classification

2. **Medium Priority** (specific use cases):
   - useServerTask, usePaginatedServerTask
   - useValidation
   - usePredictHint

3. **Lower Priority** (niche features):
   - useMarkdown, useRazorMarkdown
   - usePub/useSub
   - useMicroTask/useMacroTask
   - Plugin detection
