# Tested Fixtures

These fixtures have been tested with `test-single.js` and compile successfully to C#.

## Passing Fixtures

| Fixture | Description |
|---------|-------------|
| Counter.tsx | Basic counter with useState |
| LiftedStateSimple.tsx | Lifted state example with parent/child |
| LiftedState_01_LoadingOverlay.tsx | Loading overlay with lifted state |
| LiftedState_02_FormValidation.tsx | Form validation with lifted state |
| LiftedState_03_ResetAll.tsx | Reset all state example |
| LiftedState_04_Wizard.tsx | Multi-step wizard with lifted state |
| LiftedState_05_Chat.tsx | Chat app with lifted state |
| LiftedState_06_ShoppingCart.tsx | Shopping cart with lifted state |
| LiftedState_07_EmailComposer.tsx | Email composer with lifted state |
| UseEffectTest.tsx | useEffect hook transformation |
| ComplexState.tsx | Shopping cart with props and .map() |
| ConditionalRendering.tsx | Conditional rendering with ternary |
| EventHandlers.tsx | Form with event handlers |
| Fragments.tsx | React fragments |
| NestedComponents.tsx | Nested component composition |
| TodoList.tsx | Todo list with .map() and callbacks |
| TestEmpty.tsx | null and undefined in JSX |
| TestEmptyComments.tsx | JSX comments handling |
| ConditionalRenderingTest.tsx | Conditional rendering with state |
| EventHandlersTest.tsx | Event handlers with state updates |

## Bugs Fixed During Testing

1. **String escaping in InitialState** - Empty strings in `VComponentWrapper.InitialState` were escaped as `\"\"` instead of `""`. Fixed in `jsx.cjs` line 428.

2. **undefined identifier** - JavaScript's `undefined` was passed through literally instead of being converted to `null`. Fixed in `expressions.cjs`.

3. **Missing props in fixtures** - `ComplexState.tsx` and `TodoList.tsx` were missing callback props (`removeItem`, `checkout`, `deleteTodo`, `addTodo`).

## How to Test

```bash
cd src
node test-single.js <fixture-name>.tsx
```

Example:
```bash
node test-single.js Counter.tsx
```
