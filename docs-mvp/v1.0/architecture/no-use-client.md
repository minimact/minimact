# Why Minimact Doesn't Need 'use client'

One of the most profound architectural decisions in Minimact is the complete absence of `'use client'` directives — and it's not a limitation, it's a **superpower**.

## 🍵 The Minimact Tea Party: No Taxation Without Justification

> *"No hydration without justification!"*

Just as the Boston Tea Party was a revolt against oppressive taxation, **Minimact is a rebellion against React's tax regime**:

### React's Three Taxes

1. **Boundary Tax** - You must declare `'use client'` and manually split your components
2. **Hydration Tax** - You must ship 50KB+ and wait 200ms for the client to re-execute everything
3. **Bundle Tax** - Every interactive component increases your JavaScript payload

### Minimact's Declaration of Independence

**We threw that tea into the harbor.** ☕➡️🌊

Minimact rejected these taxes entirely:
- ✅ **No boundary tax** - No `'use client'` directives, no mental overhead
- ✅ **No hydration tax** - DOM is pre-rendered and ready, zero "wake up" time
- ✅ **No bundle tax** - ~10KB runtime regardless of component count

This is the **Posthydrationist Manifesto** in action - we've moved beyond the hydration era entirely.

## The Problem with 'use client'

In React Server Components (RSC), you must manually declare which components run on the client:

```tsx
'use client';  // ← Manual boundary declaration

export function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>{count}</button>;
}
```

This creates several problems:

### 1. **Boundary Tax**
You must decide upfront where the server/client split happens. This decision is:
- **Contagious**: `'use client'` spreads up the component tree
- **Irreversible**: Once a component is client-side, it can't access server-only APIs
- **Manual**: You must analyze every component to determine its placement

### 2. **Bundle Bloat**
When you mark a component as `'use client'`, you ship:
- The entire component code
- All its dependencies
- React's client runtime
- State management logic

A simple counter can balloon to **50KB+** of JavaScript.

### 3. **Split Component Anti-Pattern**

RSC forces you to artificially split components:

```tsx
// ❌ Can't do this - server component can't have state
function ServerProduct({ product }) {
  const [quantity, setQuantity] = useState(1);  // ERROR!
  return <div>...</div>;
}

// ❌ Can't do this - client component can't use server data
'use client';
function ClientProduct() {
  const product = await db.products.get(id);  // ERROR!
  return <div>...</div>;
}

// ✅ Have to split into TWO components
function ServerProduct({ product }) {
  return <ClientQuantitySelector initialProduct={product} />;
}

'use client';
function ClientQuantitySelector({ initialProduct }) {
  const [quantity, setQuantity] = useState(1);
  return <div>...</div>;
}
```

This is **artificial complexity** imposed by the framework.

## Minimact's Solution: Static Analysis Over Runtime Annotations

Minimact eliminates `'use client'` entirely through **build-time intelligence**.

### How It Works

The Babel plugin analyzes your JSX at build time and automatically determines:

1. **What's static** → Rendered once as HTML
2. **What's dynamic** → Needs template patches
3. **What's interactive** → Event handlers captured via closures

```csharp
public partial class Counter : MinimactComponent
{
    [State] private int count = 0;

    protected override VNode Render() {
        return <button onClick={() => count++}>{count}</button>;
    }
}
```

**The transpiler sees:**
- `{count}` → Dynamic text binding, generate template patch
- `onClick={() => count++}` → Server-side handler, capture via SignalR
- `<button>` → Static HTML structure

**No manual annotation needed.**

## The Four Pillars of 'use client'-Free Architecture

### 1. Zero Client-Side JavaScript for Logic

**React RSC:**
```tsx
'use client';
function ProductCard({ product }) {
  const [quantity, setQuantity] = useState(1);
  const total = product.price * quantity;  // ← Runs on client

  return (
    <div>
      <input
        value={quantity}
        onChange={e => setQuantity(+e.target.value)}
      />
      <p>Total: ${total.toFixed(2)}</p>
    </div>
  );
}
```

**Shipped to client:** All logic + React runtime ≈ **50KB+**

**Minimact:**
```csharp
[State] private int quantity = 1;

protected override VNode Render() {
    var total = Product.Price * quantity;  // ← Server calculation

    return (
        <div>
            <input
                value={quantity}
                onInput={(e) => quantity = int.Parse(e.target.value)}
            />
            <p>Total: ${total.ToString("F2")}</p>
        </div>
    );
}
```

**Shipped to client:** Minimact runtime ≈ **~10KB** + patch metadata

### 2. Automatic Granular Reactivity

The template patch system means updates are **surgical**, not wholesale:

```tsx
<div>
  <h1>{user.name}</h1>
  <p>Score: {user.score + bonus}</p>
</div>
```

When `user.score` changes:

**React RSC:**
1. Re-render component tree
2. Diff virtual DOM
3. Patch real DOM

**Minimact:**
1. Server: Calculate new value → `95`
2. Rust: Generate patch for **only** `p.text[1]`
3. Client: Apply **single text node** update

**No client-side re-rendering. No reconciliation. Just direct patches.**

### 3. The Closure Capture System

Event handlers with loop variables "just work":

```tsx
{todos.map(todo => (
  <button onClick={() => DeleteTodo(todo.id)}>Delete</button>
))}
```

**Transpiled to:**
```csharp
todos.Select(todo => new VElement("button", new {
    onClick = $"Handle0|{{\"id\":{todo.id}}}"  // ← Closure captured!
}, "Delete"))
```

**Client receives:**
```html
<button data-handler="Handle0|{&quot;id&quot;:42}">Delete</button>
```

**On click:**
1. Client parses: `Handle0` with `{id: 42}`
2. SignalR → Server: `InvokeHandler("Handle0", {id: 42})`
3. Server executes `DeleteTodo(42)` with full C# context
4. Server re-renders → Rust diffs → Client patches

**Zero manual serialization. Zero 'use client'. Just works.**

### 4. Predictive Rendering: Client Speed, Server Logic

With parameterized templates, the client can apply patches **instantly**:

```csharp
[State] private bool isOpen = false;

<button onClick={() => isOpen = !isOpen}>
  {isOpen ? "Close" : "Open"}
</button>
```

**Build-time template generation:**
```json
{
  "template": "{0}",
  "bindings": ["isOpen"],
  "conditionalTemplates": {
    "true": "Close",
    "false": "Open"
  }
}
```

**Runtime flow:**
1. Click → Client **instantly** applies cached patch (0ms)
2. Client sends state change to server via SignalR
3. Server confirms (or corrects if needed)

This is **faster than React's optimistic updates** because:
- ✅ No client-side vDOM diffing
- ✅ No reconciliation algorithm
- ✅ Direct DOM patch from pre-computed template

## Composition Without Compromise

The killer feature: **unified component model**.

**React forces artificial splits:**

```tsx
// Server component
async function ProductPage({ id }) {
  const product = await db.products.get(id);
  return <ClientInteractive product={product} />;
}

// Client component (separate file)
'use client';
function ClientInteractive({ product }) {
  const [quantity, setQuantity] = useState(1);
  return <div>{/* Can't access db here! */}</div>;
}
```

**Minimact keeps it unified:**

```csharp
public partial class ProductPage : MinimactComponent
{
    [Inject] private IProductService _products;
    [State] private int quantity = 1;

    protected override VNode Render() {
        // ✅ Server-side data access
        var product = _products.Get(ProductId);

        // ✅ Client-side interactivity
        var total = product.Price * quantity;

        return (
            <div>
                <h1>{product.Name}</h1>
                <input
                    value={quantity}
                    onInput={(e) => quantity = int.Parse(e.target.value)}
                />
                <p>Total: ${total.ToString("F2")}</p>
            </div>
        );
    }
}
```

**No splitting. No boundaries. No 'use client'. Just component logic.**

## Technical Deep Dive: How Minimact Achieves This

### Build-Time Analysis

The Babel plugin performs **AST analysis** on your JSX:

```tsx
<div>
  <h1>{user.name}</h1>
  <button onClick={() => Save(user.id)}>Save</button>
  <p>Count: {items.length}</p>
</div>
```

**Extracted metadata:**

```json
{
  "staticStructure": "<div><h1></h1><button>Save</button><p>Count: </p></div>",
  "dynamicBindings": {
    "h1.text[0]": { "binding": "user.name" },
    "p.text[1]": { "binding": "items.length" }
  },
  "eventHandlers": {
    "button.onClick": {
      "handler": "Handle0",
      "closure": { "userId": "user.id" }
    }
  }
}
```

This metadata enables:
1. **Server** to render initial HTML
2. **Client** to know what to patch
3. **Runtime** to route events to server handlers

### Runtime Coordination

```
┌─────────────┐                    ┌─────────────┐
│   Browser   │                    │   Server    │
│             │                    │             │
│  1. Click   │                    │             │
│  ─────────> │                    │             │
│             │  2. SignalR Call   │             │
│             │ ──────────────────>│ 3. Execute  │
│             │                    │    Handler  │
│             │                    │             │
│             │ 4. Render & Diff   │             │
│             │    <───────────────│             │
│             │                    │             │
│ 5. Patch    │ 6. Send Patches    │             │
│    DOM  <───│────────────────────│             │
└─────────────┘                    └─────────────┘
```

**Key insight:** The client is a **dumb terminal** that:
- Displays HTML
- Captures events
- Applies patches

All logic stays on the server where it belongs.

## Comparison Table

| Feature | React RSC | Minimact |
|---------|-----------|----------|
| **Boundary Declaration** | Manual `'use client'` | Automatic (build-time) |
| **Component Splitting** | Required | Not needed |
| **Client Bundle Size** | 50KB+ per component | ~10KB total runtime |
| **Client-Side Logic** | Yes (useState, effects) | No (patches only) |
| **Server Data Access** | Server components only | All components |
| **Event Handling** | Client-side callbacks | Server-side with closure capture |
| **State Updates** | Client re-render | Server render → Rust diff → Client patch |
| **Predictive Updates** | Optimistic UI patterns | Built-in template patches |
| **Type Safety** | TypeScript (client) | C# (server) |

## Real-World Impact

### Example: Todo App

**React RSC approach:**
```tsx
// server component
async function TodoList() {
  const todos = await db.todos.getAll();
  return <ClientTodoList todos={todos} />;
}

// client component (separate file)
'use client';
function ClientTodoList({ todos: initialTodos }) {
  const [todos, setTodos] = useState(initialTodos);

  async function toggleTodo(id) {
    await fetch('/api/todos/' + id, { method: 'PATCH' });
    setTodos(todos.map(t => t.id === id ? {...t, done: !t.done} : t));
  }

  return (
    <ul>
      {todos.map(todo => (
        <li key={todo.id}>
          <input
            type="checkbox"
            checked={todo.done}
            onChange={() => toggleTodo(todo.id)}
          />
          {todo.text}
        </li>
      ))}
    </ul>
  );
}
```

**Bundle size:** ~45KB (React + component + state management)

**Minimact approach:**
```csharp
public partial class TodoList : MinimactComponent
{
    [Inject] private ITodoService _todos;

    protected override VNode Render() {
        var todos = _todos.GetAll();

        return (
            <ul>
                {todos.Select(todo => (
                    <li key={todo.Id}>
                        <input
                            type="checkbox"
                            checked={todo.Done}
                            onChange={() => _todos.Toggle(todo.Id)}
                        />
                        {todo.Text}
                    </li>
                )).ToArray()}
            </ul>
        );
    }
}
```

**Bundle size:** ~10KB (Minimact runtime only)
**Bonus:** Direct database access, type safety, no API layer needed

## The Philosophical Shift

React Server Components ask: **"Where should this component run?"**

Minimact answers: **"Components run on the server. The client is just a view."**

This isn't a limitation — it's **architecture as advantage**.

You get:
- ✅ Server-side data access
- ✅ Client-side interactivity feel
- ✅ Type safety (C#)
- ✅ Zero client-side logic bundles
- ✅ Instant UI updates (predictive rendering)
- ✅ No mental tax of boundary management
- ✅ Unified component model

## Conclusion

`'use client'` exists because React chose to **run components in both places** and needed a way to distinguish them.

Minimact chose to **run components in ONE place (server)** and uses:
- Smart templates (build-time analysis)
- Surgical patches (Rust diffing)
- Event proxying (SignalR handlers)
- Predictive rendering (cached templates)

To make the client feel instant while keeping all logic server-side.

**This isn't just competitive with React — it's a different league entirely.**

No `'use client'` needed. Ever. 🚀

<div style="text-align: center; margin: 2rem 0; padding: 1.5rem; background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%); border-radius: 8px; border-left: 4px solid #ffd700;">
  <h3 style="margin: 0 0 0.5rem 0; color: #ffd700;">🐍 Don't Tread on My Bundle Size</h3>
  <p style="margin: 0; font-style: italic; color: #e0e0e0;">
    "No taxation without representation. No hydration without justification."
  </p>
  <p style="margin: 0.5rem 0 0 0; color: #a0a0a0; font-size: 0.9em;">
    — The Minimact Manifesto
  </p>
</div>

---

## See Also

- [Posthydrationist Manifesto](./posthydrationist-manifesto.md) - The philosophy behind this approach
- [Template Patch System](./template-patch-system.md) - How templates enable client-side speed
- [State Synchronization](./state-synchronization.md) - Keeping client and server in sync
- [Predictive Rendering 101](./predictive-rendering-101.md) - Instant updates without 'use client'
