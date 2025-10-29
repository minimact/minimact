# Template Patch System

Minimact's template patch system takes the output of your TSX components, extracts reusable templates at build time, and then uses those templates to deliver deterministic DOM updates at runtime. By precomputing every legal rendering path, the client never has to hydrate or reconcile — it simply fills in parameterized templates with live state.

## Build-Time Pipeline

Minimact performs five coordinated steps whenever you build or save a component:

1. **TSX analysis (Babel plugin)** – walks the component AST, finds static markup, bindings, loops, and branches.
2. **C# generation (transpiler)** – emits partial classes with `[LoopTemplate]` attributes that embed the serialized template definition next to the component.
3. **Reflection pass (ASP.NET host)** – loads those attributes on startup and registers template metadata with the runtime.
4. **Rust planner (confidence engine)** – converts the metadata into parameterized patch plans that can be combined with prediction hints.
5. **Template bundle (client)** – ships a compact JSON representation that the client can apply to DOM nodes without reparsing HTML.

Each phase produces deterministic artifacts, so templates stay in sync with the actual source that generated them.

## Template Shapes

Minimact supports four template families:

- **Static templates**: literal markup without bindings. Ideal for headings, wrappers, or any DOM node whose content never changes.
- **Dynamic templates**: markup that introduces numbered slots such as `{0}`, `{1}`. Bindings map directly to component state.
- **Conditional templates**: a dynamic template whose slot value depends on a boolean binding (`true`/`false` branches are materialized ahead of time).
- **Loop templates**: describe `array.map(...)` results. The template tracks the array binding, item variable, optional index, optional React `key`, and the nested template used for every item.

Complex expressions that cannot be expressed as direct bindings (for example `formatDate(timestamp)` or chained method calls) are marked as `__complex__` so the server can compute the value and send the final patch.

### Example: Loop Template

```tsx
export function TodoList({ todos }: { todos: Todo[] }) {
  return (
    <ul>
      {todos.map((todo, index) => (
        <li key={todo.id} className={todo.done ? 'done' : 'pending'}>
          <span>{todo.text}</span>
          <button onClick={() => toggleTodo(todo.id)}>
            {todo.done ? 'Complete' : 'Reopen'}
          </button>
        </li>
      ))}
    </ul>
  );
}
```

Generates an attribute similar to:

```csharp
[LoopTemplate("todos", @"{
  ""stateKey"": ""todos"",
  ""arrayBinding"": ""todos"",
  ""itemVar"": ""todo"",
  ""indexVar"": ""index"",
  ""keyBinding"": ""item.id"",
  ""itemTemplate"": {
    ""type"": ""dynamic"",
    ""template"": ""<li class=\\""${0}\\"">{1}{2}</li>"",
    ""bindings"": [
      ""item.done ? 'done' : 'pending'"",
      ""item.text"",
      ""__complex__""
    ]
  }
}")]
public partial class TodoList : MinimactComponent
{
    [State] private List<Todo> todos = new();
}
```

The JSON payload is stored exactly as written in the attribute so it can be recovered without re-rendering the component.

## Path-Based References

Every template stores the binding path that leads from the component's state root to the value. Nested loops append to the path (for example `todos[].items[].name`). At runtime the client resolves those paths against the current state snapshot, which allows it to fill slots without executing component code.

When a template references another template (for example, `Comment` rows that include a `UserBadge` template), the metadata records the dependency so the client can inline the sub-template without additional network round-trips.

## Runtime Application

When the server predicts a change — or when it confirms a user interaction — the runtime sends a compact patch message that contains:

1. A template identifier (derived from the C# attribute).
2. The binding payload (values for each slot, encoded by index).
3. Optional branch or loop instructions if the template contains conditionals.
4. A checksum so the client can verify compatibility before applying the patch.

On the client, the hot reload manager follows this algorithm:

```text
1. Look up the template definition in the local registry.
2. Resolve slot values in order (simple bindings read from state; complex ones come from the payload).
3. Evaluate conditional branches if present.
4. For loops, diff items by key and render the item template for inserts or updates.
5. Apply DOM changes using direct node operations (no VDOM or hydration).
```

Because templates are pure data, the client can apply them immediately after a prediction arrives, and the UI stays interactive even if the server is still verifying the guess.

## Performance Profile

- **Build time**: template extraction adds tens of milliseconds per component; the work is cached between rebuilds.
- **Server runtime**: patch planning operates on the number of bindings (`m`) rather than total DOM nodes (`n`), reducing reconciliation to `O(m)` operations.
- **Client runtime**: applying a patch is a straight slot substitution; there is no virtual DOM diff, so updates typically complete in 2–3 ms.

In practice, the template system enables 10×–100× faster update cycles compared to rendering full HTML payloads.

## Limitations and Best Practices

- Prefer predictable expressions over ad hoc logic; `__complex__` bindings force server evaluation and increase latency.
- Templates do not cross component boundaries. Compose smaller components instead of returning JSX elements from helper functions.
- Dynamic element/tag names are not supported — favor explicit markup.
- Imperative APIs (`ref.current.focus()`, `getBoundingClientRect()`, etc.) run outside of the template system; keep template updates pure.

For maintainability:

- Give loops stable keys so the client can reuse DOM nodes.
- Break up deeply nested conditionals into smaller components to keep templates readable.
- Keep an eye on prediction logs to ensure template patches are being applied instead of falling back to full renders.

## Tooling and Observability

Minimact ships with SWIG-based tooling that can:

- Inspect all `[LoopTemplate]` definitions and show the binding graph.
- Preview templates with live state to confirm slot replacement.
- Track template hit rates versus full renders.
- Profile binding resolution so you can spot expensive complex expressions early.

## Related Reading

- [Predictive Rendering](/v1.0/guide/predictive-rendering)
- [Client Stack Overview](/v1.0/architecture/client-stack)
- [Hooks API](/v1.0/api/hooks)
