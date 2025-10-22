# Minimact - Project Vision

## Overview

**Minimact** is a server-side React framework for ASP.NET Core that combines the familiar React developer experience with the performance and security benefits of server-side rendering, powered by Rust-based reconciliation and predictive DOM updates.

---

## The Problem

Modern web development faces a dilemma:

- **Client-side frameworks (React, Vue, etc.)**: Great DX, but heavy bundles, SEO challenges, security concerns (business logic exposed)
- **Traditional server-side rendering**: Secure, lightweight, but poor interactivity and dated DX
- **Existing SSR solutions**: Complex setup, hydration overhead, still ship large JS bundles

**What developers want:**
- Write familiar React syntax (JSX/TSX)
- Modern hooks API (useState, useEffect, useRef)
- Fast, interactive UIs
- No massive JavaScript bundles
- Server-side security and control

---

## The Solution: Minimact

Minimact delivers server-side React with near-instant UI updates through predictive reconciliation.

### Core Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Developer Experience                  │
│                                                          │
│  Write TSX/JSX with React hooks:                        │
│                                                          │
│    import { useState, useEffect, useRef } from 'minimact' │
│                                                          │
│    export function Counter() {                          │
│      const [count, setCount] = useState(0)             │
│                                                          │
│      return (                                           │
│        <div>                                            │
│          <p>Count: {count}</p>                         │
│          <button onClick={() => setCount(count + 1)}>  │
│            Increment                                    │
│          </button>                                      │
│        </div>                                           │
│      )                                                  │
│    }                                                    │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                   Build Time (Babel)                     │
│                                                          │
│  Babel + Custom Plugin transforms TSX → C#             │
│                                                          │
│    [MinimactComponent]                                   │
│    public class Counter : MinimactComponent              │
│    {                                                    │
│        [UseState(0)]                                    │
│        private int count;                               │
│                                                          │
│        protected override VNode Render()                │
│        {                                                │
│            return new VElement("div", new[] {           │
│                new VElement("p", $"Count: {count}"),    │
│                new VElement("button",                   │
│                    onClick: () => SetCount(count + 1),  │
│                    "Increment"                          │
│                )                                        │
│            });                                          │
│        }                                                │
│    }                                                    │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│              Runtime (ASP.NET Core + SignalR)            │
│                                                          │
│  1. Initial Request                                     │
│     • Server renders component to HTML                  │
│     • Sends HTML + minimal JS (<5KB minimact client)    │
│     • Establishes SignalR WebSocket connection         │
│                                                          │
│  2. User Interaction (e.g., button click)              │
│     • Client sends event to server via SignalR         │
│     • Server updates component state                    │
│     • Triggers reconciliation flow                      │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│         Rust Reconciliation Engine (via FFI)            │
│                                                          │
│  Step 1: Check Predictor Cache                         │
│                                                          │
│    StateChange: { componentId: "Counter",               │
│                   stateKey: "count",                    │
│                   oldValue: 5,                          │
│                   newValue: 6 }                         │
│                                                          │
│    Predictor.Predict() → 95% confidence:                │
│      [UpdateText { path: [0, 0], content: "Count: 6" }] │
│                                                          │
│  Step 2: Send Prediction to Client (Immediate)         │
│    SignalR.SendPrediction(patches, confidence)         │
│    → Client applies patches optimistically              │
│    → UI updates in <5ms!                                │
│                                                          │
│  Step 3: Verify Prediction (Background)                │
│    • Re-render component with new state                 │
│    • Reconciler.Reconcile(oldVNode, newVNode)          │
│    • Compare actual patches vs predicted                │
│                                                          │
│  Step 4: Send Correction (if needed)                   │
│    If prediction wrong:                                 │
│      SignalR.SendCorrection(actualPatches)             │
│                                                          │
│  Step 5: Learn Pattern                                 │
│    Predictor.Learn(stateChange, oldVNode, newVNode)    │
│    → Future predictions get smarter                     │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                    Client Library                        │
│                                                          │
│  minimact.js (~5KB gzipped)                              │
│                                                          │
│  • Establishes SignalR connection                       │
│  • Listens for events (click, input, etc.)             │
│  • Sends events to server                               │
│  • Applies predicted patches optimistically             │
│  • Applies corrections when predictions fail            │
│  • Minimal DOM manipulation code                        │
└─────────────────────────────────────────────────────────┘
```

---

## Key Components

### 1. Developer Tools (TypeScript/JavaScript)

**Minimact NPM Package**
```typescript
// minimact/index.ts
export function useState<T>(initialValue: T): [T, (value: T) => void];
export function useEffect(effect: () => void, deps?: any[]): void;
export function useRef<T>(initialValue: T): { current: T };
```

**Purpose**: Type definitions and build-time helpers for developer experience.

**Babel Plugin**
```javascript
// babel-plugin-minimact
// Transforms JSX/TSX → C# class with attributes
```

**Build Pipeline**:
```bash
# Developer workflow
npm install minimact babel-plugin-minimact

# tsconfig.json
{
  "jsx": "react",
  "jsxFactory": "Minimact.createElement"
}

# .babelrc
{
  "plugins": ["babel-plugin-minimact"]
}

# Build command
npm run build  # Generates C# files in /Generated
```

---

### 2. C# Runtime (ASP.NET Core)

**Component Base Class**
```csharp
public abstract class MinimactComponent
{
    protected string ComponentId { get; }
    protected Dictionary<string, object> State { get; }

    protected abstract VNode Render();

    protected void SetState(string key, object value)
    {
        var oldValue = State[key];
        State[key] = value;

        // Trigger reconciliation
        OnStateChanged(key, oldValue, value);
    }
}
```

**Attributes for Hooks**
```csharp
[AttributeUsage(AttributeTargets.Field)]
public class UseStateAttribute : Attribute
{
    public object InitialValue { get; }
    public UseStateAttribute(object initialValue) { ... }
}

[AttributeUsage(AttributeTargets.Method)]
public class UseEffectAttribute : Attribute
{
    public string[] Dependencies { get; }
    public UseEffectAttribute(params string[] deps) { ... }
}

[AttributeUsage(AttributeTargets.Field)]
public class UseRefAttribute : Attribute
{
    public object InitialValue { get; }
    public UseRefAttribute(object initialValue) { ... }
}
```

**Example Generated C# Component**
```csharp
[MinimactComponent]
public class Counter : MinimactComponent
{
    [UseState(0)]
    private int count;

    [UseEffect("count")]
    private void LogCount()
    {
        Console.WriteLine($"Count changed to: {count}");
    }

    [UseRef(null)]
    private ElementRef buttonRef;

    protected override VNode Render()
    {
        return new VElement("div", new Dictionary<string, string>
        {
            ["class"] = "counter"
        }, new[]
        {
            new VElement("p", $"Count: {count}"),
            new VElement("button", new Dictionary<string, string>
            {
                ["onclick"] = "increment",
                ["ref"] = "buttonRef"
            }, "Increment")
        });
    }

    private void Increment()
    {
        SetState(nameof(count), count + 1);
    }
}
```

**ASP.NET Core Integration**
```csharp
// Startup.cs
public void ConfigureServices(IServiceCollection services)
{
    services.AddMinimact(options =>
    {
        options.PredictorMinConfidence = 0.7f;
        options.EnablePrediction = true;
        options.ValidationConfig = new ValidationConfig
        {
            MaxTreeDepth = 100,
            MaxNodeCount = 10_000
        };
    });

    services.AddSignalR();
}

public void Configure(IApplicationBuilder app)
{
    app.UseRouting();
    app.UseEndpoints(endpoints =>
    {
        endpoints.MapHub<MinimactHub>("/minimact");
        endpoints.MapMinimactComponents();
    });
}
```

**SignalR Hub**
```csharp
public class MinimactHub : Hub
{
    private readonly MinimactRuntime _runtime;
    private readonly Predictor _predictor;

    public async Task HandleEvent(string componentId, string eventName, object data)
    {
        var component = _runtime.GetComponent(componentId);
        var oldVNode = component.CurrentVNode;

        // Execute event handler (updates state)
        component.HandleEvent(eventName, data);

        // Get state changes
        var stateChanges = component.GetStateChanges();

        foreach (var stateChange in stateChanges)
        {
            // Try to predict
            var prediction = _predictor.Predict(stateChange, oldVNode);

            if (prediction != null && prediction.Confidence > 0.7f)
            {
                // Send prediction immediately
                await Clients.Caller.SendAsync("ApplyPrediction", new
                {
                    patches = prediction.PredictedPatches,
                    confidence = prediction.Confidence,
                    transactionId = Guid.NewGuid()
                });
            }
        }

        // Render new state
        var newVNode = component.Render();

        // Reconcile (call Rust)
        var actualPatches = Reconciler.Reconcile(oldVNode, newVNode);

        // Check if prediction was correct
        if (prediction != null && !PatchesMatch(prediction.PredictedPatches, actualPatches))
        {
            // Send correction
            await Clients.Caller.SendAsync("ApplyCorrection", new
            {
                patches = actualPatches
            });
        }
        else if (prediction == null)
        {
            // No prediction was made, send actual patches
            await Clients.Caller.SendAsync("ApplyPatches", new
            {
                patches = actualPatches
            });
        }

        // Learn pattern for next time
        foreach (var stateChange in stateChanges)
        {
            _predictor.Learn(stateChange, oldVNode, newVNode);
        }

        component.CurrentVNode = newVNode;
    }
}
```

---

### 3. Rust Reconciliation Engine

**Purpose**: High-performance diffing and predictive caching.

**Already Built** (see `src/` directory):
- `vdom.rs` - Virtual DOM types
- `reconciler.rs` - Diffing algorithm
- `predictor.rs` - Pattern learning and prediction
- `ffi.rs` - C# interop layer

**C# Integration**:
```csharp
// MinimactRuntime.cs
public class MinimactRuntime
{
    private readonly Predictor _predictor;

    public MinimactRuntime()
    {
        // Create Rust predictor instance
        _predictor = new Predictor(minConfidence: 0.7f, maxPatternsPerKey: 100);
    }

    public Patch[] Reconcile(VNode oldTree, VNode newTree)
    {
        return Reconciler.Reconcile(oldTree, newTree);
    }

    public Prediction Predict(StateChange stateChange, VNode currentTree)
    {
        return _predictor.Predict(stateChange, currentTree);
    }

    public void Learn(StateChange stateChange, VNode oldTree, VNode newTree)
    {
        _predictor.Learn(stateChange, oldTree, newTree);
    }
}
```

---

### 4. Client Library (JavaScript)

**minimact-client.js** (~5KB gzipped)

```javascript
// minimact-client.js
class MinimactClient {
    constructor() {
        this.connection = new signalR.HubConnectionBuilder()
            .withUrl('/minimact')
            .build();

        this.pendingPredictions = new Map();

        this.connection.on('ApplyPrediction', this.applyPrediction.bind(this));
        this.connection.on('ApplyCorrection', this.applyCorrection.bind(this));
        this.connection.on('ApplyPatches', this.applyPatches.bind(this));

        this.connection.start();
        this.attachEventListeners();
    }

    attachEventListeners() {
        document.addEventListener('click', (e) => {
            const target = e.target.closest('[data-minimact-component]');
            if (!target) return;

            const componentId = target.dataset.minimactComponent;
            const eventName = 'click';

            this.connection.invoke('HandleEvent', componentId, eventName, {
                targetId: e.target.id,
                targetClass: e.target.className
            });
        });

        // Similar for input, change, etc.
    }

    applyPrediction({ patches, confidence, transactionId }) {
        console.log(`Applying prediction (${(confidence * 100).toFixed(0)}% confident)`);

        // Apply patches optimistically
        patches.forEach(patch => this.applyPatch(patch));

        // Track for potential rollback
        this.pendingPredictions.set(transactionId, {
            patches,
            timestamp: Date.now()
        });
    }

    applyCorrection({ patches }) {
        console.warn('Prediction was incorrect, applying correction');

        // Apply correct patches
        patches.forEach(patch => this.applyPatch(patch));
    }

    applyPatches({ patches }) {
        // No prediction was made, apply patches directly
        patches.forEach(patch => this.applyPatch(patch));
    }

    applyPatch(patch) {
        switch (patch.op) {
            case 'UpdateText':
                this.updateText(patch.path, patch.content);
                break;
            case 'UpdateProps':
                this.updateProps(patch.path, patch.props);
                break;
            case 'Create':
                this.createElement(patch.path, patch.node);
                break;
            case 'Remove':
                this.removeElement(patch.path);
                break;
            case 'Replace':
                this.replaceElement(patch.path, patch.node);
                break;
            case 'ReorderChildren':
                this.reorderChildren(patch.path, patch.order);
                break;
        }
    }

    updateText(path, content) {
        const node = this.getNodeAtPath(path);
        if (node && node.nodeType === Node.TEXT_NODE) {
            node.textContent = content;
        }
    }

    updateProps(path, props) {
        const element = this.getNodeAtPath(path);
        if (!element) return;

        for (const [key, value] of Object.entries(props)) {
            if (key === 'class') {
                element.className = value;
            } else if (key === 'style') {
                element.style.cssText = value;
            } else {
                element.setAttribute(key, value);
            }
        }
    }

    createElement(path, node) {
        const parent = this.getNodeAtPath(path.slice(0, -1));
        const index = path[path.length - 1];

        const element = this.createElementFromVNode(node);

        if (index >= parent.childNodes.length) {
            parent.appendChild(element);
        } else {
            parent.insertBefore(element, parent.childNodes[index]);
        }
    }

    removeElement(path) {
        const node = this.getNodeAtPath(path);
        if (node) {
            node.remove();
        }
    }

    replaceElement(path, node) {
        const oldNode = this.getNodeAtPath(path);
        const newNode = this.createElementFromVNode(node);

        if (oldNode) {
            oldNode.replaceWith(newNode);
        }
    }

    reorderChildren(path, order) {
        const parent = this.getNodeAtPath(path);
        if (!parent) return;

        // Reorder based on keys
        const childrenByKey = new Map();
        Array.from(parent.children).forEach(child => {
            const key = child.dataset.key;
            if (key) childrenByKey.set(key, child);
        });

        // Append in new order
        order.forEach(key => {
            const child = childrenByKey.get(key);
            if (child) parent.appendChild(child);
        });
    }

    getNodeAtPath(path) {
        let node = document.querySelector('[data-minimact-root]');

        for (const index of path) {
            if (!node) return null;
            node = node.childNodes[index];
        }

        return node;
    }

    createElementFromVNode(vnode) {
        if (vnode.type === 'Text') {
            return document.createTextNode(vnode.text.content);
        }

        const element = document.createElement(vnode.element.tag);

        // Set props
        for (const [key, value] of Object.entries(vnode.element.props || {})) {
            if (key === 'class') {
                element.className = value;
            } else {
                element.setAttribute(key, value);
            }
        }

        // Set key
        if (vnode.element.key) {
            element.dataset.key = vnode.element.key;
        }

        // Add children
        for (const child of vnode.element.children || []) {
            element.appendChild(this.createElementFromVNode(child));
        }

        return element;
    }
}

// Auto-initialize
if (typeof window !== 'undefined') {
    window.minimact = new MinimactClient();
}
```

**Bundle size**: ~5KB gzipped (including SignalR client)

---

## Developer Experience

### Writing Components

```typescript
// src/components/TodoList.tsx
import { useState, useEffect } from 'minimact';

interface Todo {
    id: number;
    text: string;
    done: boolean;
}

export function TodoList() {
    const [todos, setTodos] = useState<Todo[]>([]);
    const [input, setInput] = useState('');

    useEffect(() => {
        console.log(`Todo count: ${todos.length}`);
    }, [todos]);

    const addTodo = () => {
        if (!input.trim()) return;

        setTodos([...todos, {
            id: Date.now(),
            text: input,
            done: false
        }]);
        setInput('');
    };

    const toggleTodo = (id: number) => {
        setTodos(todos.map(todo =>
            todo.id === id ? { ...todo, done: !todo.done } : todo
        ));
    };

    return (
        <div class="todo-list">
            <h1>My Todos</h1>

            <div class="input-group">
                <input
                    type="text"
                    value={input}
                    onInput={(e) => setInput(e.target.value)}
                    placeholder="Add a todo..."
                />
                <button onClick={addTodo}>Add</button>
            </div>

            <ul>
                {todos.map(todo => (
                    <li key={todo.id} class={todo.done ? 'done' : ''}>
                        <input
                            type="checkbox"
                            checked={todo.done}
                            onChange={() => toggleTodo(todo.id)}
                        />
                        <span>{todo.text}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}
```

### Build Process

```bash
# 1. Developer writes TSX
# src/components/TodoList.tsx

# 2. Babel transforms to C#
npm run build

# 3. Generates C# class
# Generated/Components/TodoList.cs

# 4. ASP.NET Core compiles and runs
dotnet run
```

### Generated C# (Example)

```csharp
// Generated/Components/TodoList.cs
[MinimactComponent]
public class TodoList : MinimactComponent
{
    [UseState]
    private List<Todo> todos = new();

    [UseState("")]
    private string input;

    [UseEffect("todos")]
    private void LogTodoCount()
    {
        Console.WriteLine($"Todo count: {todos.Count}");
    }

    protected override VNode Render()
    {
        return new VElement("div", new Dictionary<string, string>
        {
            ["class"] = "todo-list"
        }, new VNode[]
        {
            new VElement("h1", "My Todos"),

            new VElement("div", new Dictionary<string, string>
            {
                ["class"] = "input-group"
            }, new VNode[]
            {
                new VElement("input", new Dictionary<string, string>
                {
                    ["type"] = "text",
                    ["value"] = input,
                    ["oninput"] = "handleInput",
                    ["placeholder"] = "Add a todo..."
                }),
                new VElement("button", new Dictionary<string, string>
                {
                    ["onclick"] = "addTodo"
                }, "Add")
            }),

            new VElement("ul", todos.Select(todo =>
                new VElement("li", new Dictionary<string, string>
                {
                    ["class"] = todo.Done ? "done" : "",
                    ["key"] = todo.Id.ToString()
                }, new VNode[]
                {
                    new VElement("input", new Dictionary<string, string>
                    {
                        ["type"] = "checkbox",
                        ["checked"] = todo.Done ? "checked" : null,
                        ["onchange"] = $"toggleTodo_{todo.Id}"
                    }),
                    new VElement("span", todo.Text)
                })
            ).ToArray())
        });
    }

    private void AddTodo()
    {
        if (string.IsNullOrWhiteSpace(input)) return;

        SetState(nameof(todos), todos.Concat(new[] { new Todo
        {
            Id = DateTimeOffset.Now.ToUnixTimeMilliseconds(),
            Text = input,
            Done = false
        }}).ToList());

        SetState(nameof(input), "");
    }

    private void ToggleTodo(long id)
    {
        SetState(nameof(todos), todos.Select(todo =>
            todo.Id == id ? todo with { Done = !todo.Done } : todo
        ).ToList());
    }
}
```

---

## Performance Characteristics

### Initial Load
- **HTML size**: Same as traditional SSR (~10-50KB for typical page)
- **JavaScript size**: ~5KB (minimact client + SignalR)
- **Time to Interactive**: <100ms (just establish WebSocket)

### Interaction Performance

**Without Prediction** (traditional SSR):
1. User clicks button → 0ms
2. Event sent to server → 20ms (network latency)
3. Server processes → 5ms
4. Response sent back → 20ms (network latency)
5. Client applies patches → 2ms
**Total: ~47ms** ❌

**With Prediction** (Minimact):
1. User clicks button → 0ms
2. Event sent to server → 20ms (network)
3. **Server sends prediction immediately** → 2ms
4. **Client applies predicted patches → 2ms**
**Perceived latency: ~24ms** ✅ (2x faster!)

5. Server verifies (background) → 5ms
6. Correction sent (if needed) → 20ms
7. Correction applied → 2ms
**Total: ~49ms, but user already saw result at 24ms**

### Prediction Accuracy

After learning phase (10+ interactions per component):
- **Deterministic UIs** (counters, toggles, simple forms): **95%+ accuracy**
- **Dynamic UIs** (conditional rendering, lists): **70-85% accuracy**
- **Complex UIs** (computed state, side effects): **60-75% accuracy**

**Key Insight**: Even at 60% accuracy, users see instant feedback 60% of the time, with silent corrections for the other 40%. Net result: much faster perceived performance.

---

## Benefits

### For Developers

✅ **Familiar React syntax** - Write JSX/TSX like normal React
✅ **Type safety** - Full TypeScript support
✅ **Simple mental model** - No hydration, no client/server split
✅ **Hot reload** - Fast development iteration
✅ **No webpack config** - Babel plugin handles everything
✅ **Use existing tools** - VS Code, ESLint, Prettier all work

### For End Users

✅ **Fast initial load** - No large JS bundles
✅ **Instant interactions** - Predicted updates feel native
✅ **Works without JS** - Degrades to form posts
✅ **Low bandwidth** - Only send patches, not full HTML
✅ **Better mobile experience** - Less JS parsing/execution

### For Businesses

✅ **Better SEO** - True server-side rendering
✅ **Secure** - Business logic stays on server
✅ **Lower hosting costs** - Less client-side compute
✅ **Easier debugging** - Server-side stack traces
✅ **Compliance friendly** - Control data flow

---

## Comparison to Alternatives

### vs. Next.js / Remix

| Feature | Minimact | Next.js / Remix |
|---------|---------|-----------------|
| Bundle size | ~5KB | ~50-150KB |
| Server language | C# / .NET | Node.js |
| Hydration | None | Required |
| Prediction | ✅ | ❌ |
| SEO | ✅ | ✅ |
| Client-side routing | Via server | Client-side |

### vs. Blazor Server

| Feature | Minimact | Blazor Server |
|---------|---------|---------------|
| Syntax | JSX/TSX (React) | Razor (C#) |
| Learning curve | Low (React devs) | Medium (C# devs) |
| Performance | Predicted updates | SignalR patches |
| Bundle size | ~5KB | ~300KB |
| Community | React ecosystem | .NET ecosystem |

### vs. HTMX

| Feature | Minimact | HTMX |
|---------|---------|------|
| Syntax | React components | HTML attributes |
| State management | useState hooks | Server session |
| Prediction | ✅ | ❌ |
| Component model | ✅ | ❌ |
| TypeScript | ✅ | ❌ |

---

## Implementation Roadmap

### Phase 1: Core Runtime ✅ (Current)
- [x] Rust reconciliation engine
- [x] Rust predictor
- [x] C# FFI bindings
- [x] Basic VNode types

### Phase 2: C# Runtime (2-3 weeks)
- [ ] MinimactComponent base class
- [ ] Attribute-based hooks (UseState, UseEffect, UseRef)
- [ ] SignalR hub for real-time communication
- [ ] ASP.NET Core middleware
- [ ] Component registry and lifecycle management
- [ ] Event handling system

### Phase 3: Babel Plugin (2-3 weeks)
- [ ] JSX/TSX → C# transformation
- [ ] Type inference from TypeScript
- [ ] Hook detection and transformation
- [ ] Event handler extraction
- [ ] Key attribute handling
- [ ] Import resolution

### Phase 4: Client Library (1-2 weeks)
- [ ] SignalR client wrapper
- [ ] Patch application logic
- [ ] Event delegation system
- [ ] Optimistic update handling
- [ ] Fallback for no-JS scenarios

### Phase 5: Developer Tools (2-3 weeks)
- [ ] NPM package with TypeScript types
- [ ] CLI tool for scaffolding
- [ ] Hot reload support
- [ ] DevTools browser extension
- [ ] Component inspector
- [ ] Prediction debugger

### Phase 6: Production Readiness (3-4 weeks)
- [ ] Error boundaries
- [ ] Suspense-like loading states
- [ ] Code splitting (per-component C# assemblies)
- [ ] Production optimizations
- [ ] Security hardening
- [ ] Comprehensive documentation

### Phase 7: Advanced Features (Ongoing)
- [ ] Server-side caching strategies
- [ ] Partial hydration for critical components
- [ ] Streaming SSR
- [ ] React Server Components compatibility
- [ ] Plugin system for custom renderers

---

## Technical Challenges

### 1. Event Handling

**Challenge**: JavaScript events need to trigger server-side state updates.

**Solution**:
- Client captures events and sends to server via SignalR
- Server processes event, updates state, triggers re-render
- Predictions sent back for immediate feedback

### 2. Form Handling

**Challenge**: Form inputs need immediate feedback.

**Solution**:
- Controlled inputs (value from server, updates via SignalR)
- Debouncing for text inputs
- Optimistic updates with predictions
- Validation on server, errors sent back

### 3. State Serialization

**Challenge**: C# state needs to match TypeScript types.

**Solution**:
- Babel plugin infers types from TypeScript
- Generates matching C# types
- JSON serialization for complex objects
- Type validation at runtime

### 4. Component Composition

**Challenge**: Components need to nest and communicate.

**Solution**:
- Parent/child relationships in component tree
- Props passed via VNode structure
- Context API for deep prop passing
- Event bubbling through component tree

### 5. Memory Management

**Challenge**: Long-running SignalR connections hold component state.

**Solution**:
- Timeout for inactive connections
- State persistence to Redis/database
- Reconnection logic with state restoration
- Garbage collection of unused components

---

## Example Application

### Full Stack Todo App

**Project Structure**:
```
my-minimact-app/
├── src/
│   ├── components/
│   │   ├── TodoList.tsx
│   │   ├── TodoItem.tsx
│   │   └── AddTodo.tsx
│   └── index.tsx
├── Generated/         (auto-generated)
│   └── Components/
│       ├── TodoList.cs
│       ├── TodoItem.cs
│       └── AddTodo.cs
├── Server/
│   ├── Program.cs
│   ├── Startup.cs
│   └── appsettings.json
├── package.json
├── babel.config.js
└── minimact.config.json
```

**package.json**:
```json
{
  "name": "my-minimact-app",
  "scripts": {
    "build": "babel src --out-dir Generated --plugins babel-plugin-minimact",
    "watch": "babel src --out-dir Generated --plugins babel-plugin-minimact --watch"
  },
  "dependencies": {
    "minimact": "^1.0.0"
  },
  "devDependencies": {
    "@babel/cli": "^7.0.0",
    "@babel/core": "^7.0.0",
    "babel-plugin-minimact": "^1.0.0",
    "typescript": "^5.0.0"
  }
}
```

**Program.cs**:
```csharp
var builder = WebApplication.CreateBuilder(args);

// Add Minimact services
builder.Services.AddMinimact(options =>
{
    options.ComponentsPath = "Generated/Components";
    options.PredictorMinConfidence = 0.7f;
    options.EnableHotReload = builder.Environment.IsDevelopment();
});

builder.Services.AddSignalR();

var app = builder.Build();

app.UseStaticFiles();
app.UseRouting();

app.MapHub<MinimactHub>("/minimact");
app.MapMinimactPage("/", "TodoList");

app.Run();
```

**Running**:
```bash
# Terminal 1: Watch TypeScript
npm run watch

# Terminal 2: Run ASP.NET
dotnet watch run
```

**Result**:
- Visit http://localhost:5000
- See server-rendered todo list
- Add/toggle todos with <5ms perceived latency
- No page reloads, no large JS bundles

---

## Success Metrics

### Developer Adoption
- Time to first component: **<5 minutes**
- Learning curve: **<1 day** for React developers
- Migration from React: **90%+ component compatibility**

### Performance
- Initial page load: **<500ms** (including network)
- Interaction latency: **<50ms** perceived (with prediction)
- Prediction accuracy: **>80%** after warmup
- Bundle size: **<10KB** for typical app

### Production Viability
- Concurrent users per server: **10,000+**
- Memory per component: **<1KB**
- CPU usage: **<5%** per 100 req/s
- Uptime: **99.9%+**

---

## Open Questions

### 1. How to handle async operations?

**Option A**: Suspense-like boundaries
```typescript
function AsyncComponent() {
    const [data] = useState(null);

    useEffect(async () => {
        const result = await fetch('/api/data');
        setData(result);
    }, []);

    if (!data) return <Loading />;
    return <div>{data.content}</div>;
}
```

**Option B**: Server-side async/await
```csharp
[UseEffect]
private async Task LoadData()
{
    var data = await _httpClient.GetAsync("/api/data");
    SetState(nameof(data), data);
}
```

### 2. How to handle routing?

**Option A**: Server-side routing (like traditional MVC)
```csharp
app.MapMinimactPage("/todos", "TodoList");
app.MapMinimactPage("/todos/{id}", "TodoDetail");
```

**Option B**: Client-side routing (via history API)
```typescript
import { useRouter } from 'minimact';

function App() {
    const router = useRouter();

    return (
        <div>
            <Link href="/about">About</Link>
            {router.path === '/' && <Home />}
            {router.path === '/about' && <About />}
        </div>
    );
}
```

### 3. How to handle SEO/metadata?

```typescript
function BlogPost({ slug }) {
    useMeta({
        title: `Blog Post - ${slug}`,
        description: 'My blog post',
        ogImage: '/images/og.png'
    });

    return <article>...</article>;
}
```

Generates:
```csharp
protected override Dictionary<string, string> GetMetadata()
{
    return new Dictionary<string, string>
    {
        ["title"] = $"Blog Post - {slug}",
        ["description"] = "My blog post",
        ["og:image"] = "/images/og.png"
    };
}
```

---

## Getting Started (Future)

```bash
# Install CLI
npm install -g minimact-cli

# Create new project
minimact new my-app
cd my-app

# Start development
minimact dev

# Build for production
minimact build

# Deploy
dotnet publish
```

**First component**:
```typescript
// src/components/Hello.tsx
import { useState } from 'minimact';

export function Hello() {
    const [name, setName] = useState('World');

    return (
        <div>
            <h1>Hello, {name}!</h1>
            <input
                value={name}
                onInput={(e) => setName(e.target.value)}
            />
        </div>
    );
}
```

**That's it!** Minimact handles the rest.

---

## Conclusion

Minimact brings **React's developer experience** to **server-side rendering** with **predictive performance optimization**, all powered by **ASP.NET Core** and **Rust**.

**Key Differentiators**:
1. ✅ Familiar React syntax (TSX/JSX)
2. ✅ Minimal JavaScript bundle (~5KB)
3. ✅ Predictive updates (50%+ faster perceived latency)
4. ✅ Server-side security and control
5. ✅ ASP.NET Core ecosystem

**Target Audience**:
- React developers who want server-side rendering without complexity
- .NET developers who want modern frontend DX
- Teams prioritizing performance, SEO, and security

**Next Steps**:
1. Finish Rust reconciliation robustness (REQUIREMENTS.md)
2. Build C# runtime and SignalR hub
3. Create Babel transformation plugin
4. Develop client library
5. Launch alpha with sample apps

---

## Contributing

This is the vision. The Rust core is built. Now we need:
- C# runtime developers
- Babel plugin developers
- JavaScript/React developers
- DevTools developers
- Technical writers
- Early adopters / testers

**Let's build the future of server-side React!**
