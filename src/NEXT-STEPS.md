# Minimact - Next Steps & Roadmap

## What's Been Built ✅

### Phase 1: Rust Core (COMPLETE)
- ✅ Virtual DOM types (VNode, VElement, VText, Patch)
- ✅ Reconciliation engine (efficient diffing algorithm)
- ✅ Predictive engine (learns state→DOM patterns)
- ✅ C FFI layer for C# interop
- ✅ Full test suite (10/10 tests passing)
- ✅ Benchmark suite
- ✅ Documentation (README, REQUIREMENTS, VISION)

### Phase 2: Babel Plugin (PROTOTYPE COMPLETE)
- ✅ Basic TSX/JSX → C# transformation
- ✅ useState → [State] attribute
- ✅ useEffect → [OnStateChanged] method
- ✅ useRef → [Ref] attribute
- ✅ JSX → VNode construction
- ✅ Event handlers → C# methods
- ✅ Partial class support (for codebehind)
- ✅ useMarkdown hook design
- ✅ useTemplate hook design
- ✅ useClientState concept & architecture
- ✅ Hybrid rendering architecture documented

---

## What Needs to Be Built

---

## 🔴 CRITICAL PATH (Weeks 1-2)

### 1. C# Runtime for ASP.NET Core
**Goal:** Server-side runtime that executes minimact components.

**Priority:** 🔴 CRITICAL (nothing works without this!)

#### Components to Build:

```
Minimact.AspNetCore/
├── Core/
│   ├── MinimactComponent.cs          // Base class for all components
│   ├── VNode.cs                     // Virtual DOM types (VElement, VText, etc.)
│   ├── Patch.cs                     // Patch types matching Rust engine
│   ├── ComponentRegistry.cs         // Register and track component instances
│   ├── StateManager.cs              // Handle [State] attribute reflection
│   ├── LifecycleManager.cs          // OnInitializedAsync, OnStateChanged, etc.
│   └── RenderContext.cs             // Context during rendering (route data, etc.)
│
├── SignalR/
│   ├── MinimactHub.cs                // SignalR hub for client communication
│   ├── ConnectionManager.cs         // Track active connections per component
│   ├── PatchSerializer.cs           // Serialize patches to JSON
│   └── EventHandler.cs              // Handle events from client (onClick, etc.)
│
├── Interop/
│   ├── RustBridge.cs                // P/Invoke to Rust reconciliation engine
│   ├── PredictorService.cs          // Manage predictor instances
│   └── NativeLibrary.cs             // Load minimact.dll safely
│
├── Markdown/
│   ├── MarkdownRenderer.cs          // Use Markdig to parse markdown
│   └── MarkdownAttribute.cs         // [Markdown] attribute implementation
│
├── Templates/
│   ├── DefaultLayout.cs             // Built-in layout template
│   ├── SidebarLayout.cs             // Sidebar + main area layout
│   ├── AuthLayout.cs                // Login/register layout
│   └── TemplateBase.cs              // Base class for all templates
│
├── Middleware/
│   ├── MinimactMiddleware.cs         // ASP.NET Core middleware
│   ├── ComponentRouter.cs           // Map routes to components
│   └── InitialRenderMiddleware.cs   // SSR for first page load
│
└── DependencyInjection/
    ├── ServiceCollectionExtensions.cs // services.AddMinimact()
    └── MinimactOptions.cs              // Configuration options
```

#### Key Classes:

**MinimactComponent.cs:**
```csharp
public abstract class MinimactComponent
{
    public string ComponentId { get; }
    protected Dictionary<string, object> State { get; }

    protected abstract VNode Render();

    protected void SetState(string key, object value);
    protected void TriggerRender();

    // Lifecycle hooks
    public virtual Task OnInitializedAsync() => Task.CompletedTask;
    public virtual void OnStateChanged(string[] stateKeys) { }
}
```

**MinimactHub.cs:**
```csharp
public class MinimactHub : Hub
{
    public async Task HandleEvent(string componentId, string eventName, object data);
    public async Task GetPrediction(string componentId, StateChange change);
}
```

**Estimated Time:** 3-5 days

**Dependencies:**
- Rust minimact.dll (already built)
- Markdig NuGet package
- SignalR

---

### 2. Client Runtime (minimact.js)
**Goal:** Minimal JavaScript client that applies patches and handles client state.

**Priority:** 🔴 CRITICAL (needed for interactivity!)

#### Components to Build:

```
minimact-client/
├── src/
│   ├── core/
│   │   ├── MinimactClient.js         // Main client orchestrator
│   │   ├── StateManager.js          // Manage useClientState
│   │   ├── DOMPatcher.js            // Apply Rust patches to real DOM
│   │   └── EventDelegator.js        // Capture events and send to server
│   │
│   ├── signalr/
│   │   ├── ConnectionManager.js     // Manage SignalR connection
│   │   ├── MessageHandler.js        // Process server messages
│   │   └── Reconnection.js          // Handle disconnects/reconnects
│   │
│   ├── hydration/
│   │   ├── ZoneHydrator.js          // Hydrate client/server zones
│   │   ├── DependencyTracker.js     // Track state→DOM dependencies
│   │   └── ScopeManager.js          // Manage data-minimact-*-scope elements
│   │
│   └── index.js                      // Public API
│
├── package.json
├── rollup.config.js                  // Bundle to <5KB
└── README.md
```

#### Key Functions:

**MinimactClient.js:**
```javascript
class MinimactClient {
  constructor() {
    this.clientStates = {};           // useClientState values
    this.serverConnection = null;     // SignalR connection
    this.componentScopes = new Map(); // Track client/server zones
  }

  // Hydrate client zones on page load
  hydrateClientZones();

  // Update client state (instant, no server)
  updateClientState(name, value);

  // Apply server patch (only to server zones)
  applyServerPatch(patch);

  // Apply predicted patch (optimistic)
  applyPredictedPatch(patch, transactionId);

  // Send event to server
  sendEvent(componentId, eventName, data);
}
```

**DOMPatcher.js:**
```javascript
class DOMPatcher {
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
      // ... etc
    }
  }
}
```

**Estimated Time:** 2-3 days

**Dependencies:**
- @microsoft/signalr
- Bundler (Rollup or esbuild)

**Target Size:** <5KB gzipped

---

### 3. Complete Babel Plugin
**Goal:** Production-ready TSX→C# transformation with all features.

**Priority:** 🔴 CRITICAL (needed to write components!)

#### Features to Add:

- [ ] **Dependency analysis**
  - Track which JSX nodes depend on which state
  - Classify as client/server/hybrid zones
  - Add `data-minimact-*-scope` attributes

- [ ] **useClientState transformation**
  - Detect `useClientState()` calls
  - Generate client-side hydration code
  - Exclude from C# VNode tree

- [ ] **Smart span splitting**
  - Detect mixed dependencies: `{clientState} and {serverState}`
  - Split into separate `<span>` elements
  - Each span gets correct scope attribute

- [ ] **Conditional rendering**
  ```tsx
  {condition ? <A /> : <B />}
  {condition && <Component />}
  ```
  - Transform to C# ternary or conditional logic

- [ ] **List rendering**
  ```tsx
  {items.map(item => <li key={item.id}>{item.name}</li>)}
  ```
  - Transform to LINQ `.Select()` in C#
  - Preserve `key` attribute for reconciliation

- [ ] **Fragment support**
  ```tsx
  <>
    <div>First</div>
    <div>Second</div>
  </>
  ```
  - Transform to `new Fragment(...)`

- [ ] **Props support**
  ```tsx
  function Card({ title, count }: CardProps) { ... }
  ```
  - Generate C# constructor with parameters
  - Create props class/record

- [ ] **TypeScript interfaces → C# classes**
  ```tsx
  interface User {
    id: number;
    name: string;
  }
  ```
  - Generate matching C# record or class

**Estimated Time:** 2-3 days

---

## 🟡 HIGH PRIORITY (Weeks 2-3)

### 4. CLI Tool (minimact-cli)
**Goal:** Developer-friendly tooling for scaffolding and building.

```bash
npm install -g minimact-cli

# Create new minimact project
minimact new my-app
minimact new my-blog --template blog

# Development mode (watch + hot reload)
minimact dev

# Build for production
minimact build

# Generate C# from TSX
minimact generate src/components

# Run ASP.NET Core server
minimact serve
```

#### What it Does:

1. **Scaffolding:**
   - Creates project structure
   - Adds package.json, babel.config.js
   - Creates sample components
   - Sets up ASP.NET Core project

2. **Watch Mode:**
   - Monitors `src/components/**/*.tsx`
   - Runs Babel plugin on changes
   - Generates C# in `Generated/Components/`
   - Triggers `dotnet watch run`

3. **Build:**
   - Transpiles all TSX → C#
   - Bundles minimact-client.js
   - Runs `dotnet publish`

**Project Structure:**
```
my-app/
├── src/
│   └── components/
│       ├── Counter.tsx
│       └── TodoList.tsx
├── Generated/
│   └── Components/
│       ├── Counter.cs
│       └── TodoList.cs
├── Server/
│   ├── Program.cs
│   ├── Startup.cs
│   └── appsettings.json
├── package.json
├── babel.config.js
└── minimact.config.json
```

**Estimated Time:** 1-2 days

---

### 5. Working Examples
**Goal:** Prove the architecture works with real apps.

#### Example 1: Counter (Hello World)
```tsx
import { useState } from '@minimact/core';

export function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>
        Increment
      </button>
    </div>
  );
}
```

**Shows:** Basic useState, event handling, rendering

---

#### Example 2: Todo List
```tsx
import { useState } from '@minimact/core';

export function TodoList() {
  const [todos, setTodos] = useState([]);
  const [input, setInput] = useState('');

  const addTodo = () => {
    setTodos([...todos, { id: Date.now(), text: input, done: false }]);
    setInput('');
  };

  return (
    <div>
      <input value={input} onInput={e => setInput(e.target.value)} />
      <button onClick={addTodo}>Add</button>
      <ul>
        {todos.map(todo => (
          <li key={todo.id}>{todo.text}</li>
        ))}
      </ul>
    </div>
  );
}
```

**Shows:** List rendering, multiple state, input handling

---

#### Example 3: Blog with EF Core
```tsx
import { useState, useMarkdown, useTemplate } from '@minimact/core';

export function BlogPost() {
  const [post, setPost] = useState(null);
  const [content, setContent] = useMarkdown('');

  useTemplate('DefaultLayout');

  return (
    <article>
      {post ? (
        <>
          <h1>{post.title}</h1>
          <div markdown>{content}</div>
        </>
      ) : (
        <p>Loading...</p>
      )}
    </article>
  );
}
```

**Codebehind:**
```csharp
public partial class BlogPost
{
  private readonly AppDbContext _db;

  public BlogPost(AppDbContext db) => _db = db;

  public override async Task OnInitializedAsync()
  {
    var id = RouteData.GetInt("id");
    post = await _db.Posts.FindAsync(id);
    content = post.Content;
    TriggerRender();
  }
}
```

**Shows:** EF Core integration, markdown, templates, async loading

---

#### Example 4: Hybrid Search Box
```tsx
import { useState, useClientState } from '@minimact/core';

export function SearchBox() {
  const [results, setResults] = useState([]);
  const [query, setQuery] = useClientState('');

  const search = async () => {
    const data = await fetch(`/api/search?q=${query}`);
    setResults(await data.json());
  };

  return (
    <div>
      <input value={query} onInput={e => setQuery(e.target.value)} />
      <button onClick={search}>Search</button>
      <p>Query: {query}</p>
      <p>Found {results.length} results for "{query}"</p>
      <ul>
        {results.map(r => <li key={r.id}>{r.title}</li>)}
      </ul>
    </div>
  );
}
```

**Shows:** useClientState, hybrid rendering, API calls

**Estimated Time:** 3-4 days (for all examples)

---

## 🟢 MEDIUM PRIORITY (Weeks 3-4)

### 6. Testing Infrastructure

#### Unit Tests
- [ ] Babel plugin tests (fixtures + expected outputs)
- [ ] C# runtime tests (component lifecycle, state management)
- [ ] Rust reconciliation tests (edge cases)
- [ ] minimact.js tests (DOM patching, client state)

#### Integration Tests
- [ ] Full stack: TSX → C# → Rust → SignalR → Client
- [ ] Predictor accuracy tests
- [ ] EF Core codebehind integration

#### E2E Tests (Playwright)
- [ ] Counter app interaction
- [ ] Todo list CRUD operations
- [ ] Blog post loading from DB
- [ ] Client state + server state hybrid

**Estimated Time:** 3-4 days

---

### 7. Performance Benchmarks

**Metrics to Track:**
- Initial page load time
- Time to Interactive (TTI)
- Bundle size (JS + HTML)
- Reconciliation speed (Rust engine)
- Prediction accuracy (%)
- SignalR latency
- Memory usage per component

**Comparison:**
- vs. Blazor Server
- vs. Next.js SSR
- vs. HTMX

**Estimated Time:** 2 days

---

## 🟢 NICE TO HAVE (Future)

### 8. Developer Tools

- [ ] **VS Code Extension**
  - Syntax highlighting for TSX
  - Show generated C# on hover
  - Jump to codebehind file

- [ ] **Browser DevTools Extension**
  - Inspect component state
  - View prediction confidence
  - Highlight client/server zones
  - Performance profiler

- [ ] **Prediction Debugger**
  - Show prediction history
  - Visualize pattern learning
  - See why predictions failed

**Estimated Time:** 5-7 days

---

### 9. Documentation Website

- [ ] Getting Started guide
- [ ] API Reference
- [ ] Component examples gallery
- [ ] Architecture deep-dive
- [ ] Video tutorials
- [ ] Migration guides (from React, Blazor)

**Estimated Time:** 3-5 days

---

### 10. Advanced Features

- [ ] **Server Components** (React Server Components style)
- [ ] **Streaming SSR** (render shell, stream content)
- [ ] **Suspense boundaries** (async data loading)
- [ ] **Error boundaries** (catch errors, show fallback)
- [ ] **Context API** (pass data through component tree)
- [ ] **Custom hooks** (extract reusable logic)
- [ ] **Portals** (render outside parent DOM)
- [ ] **Code splitting** (lazy load components)

**Estimated Time:** Ongoing

---

## Recommended Timeline

### **Week 1: MVP Runtime**
- **Day 1-2:** Basic C# runtime (MinimactComponent, VNode)
- **Day 3-4:** SignalR hub + Rust FFI integration
- **Day 5:** Basic minimact.js client
- **Day 6-7:** Counter example working end-to-end

**Deliverable:** "Hello World" that actually runs!

---

### **Week 2: Full Stack Integration**
- **Day 1-2:** Complete Babel plugin (all hooks, dependency tracking)
- **Day 3:** CLI tool for scaffolding
- **Day 4-5:** Todo list example
- **Day 6-7:** Blog example with EF Core + markdown

**Deliverable:** 3 working examples

---

### **Week 3: Advanced Features**
- **Day 1-2:** useClientState + hybrid rendering
- **Day 3-4:** useTemplate support
- **Day 5:** Search box example (hybrid)
- **Day 6-7:** Performance benchmarks

**Deliverable:** Hybrid rendering working, benchmarks published

---

### **Week 4: Polish & Launch**
- **Day 1-3:** Comprehensive tests
- **Day 4-5:** Documentation
- **Day 6:** Example gallery
- **Day 7:** Public alpha release!

**Deliverable:** Alpha release with docs

---

## What to Build First?

### Option 1: Start with C# Runtime 🏗️
**Pros:**
- Unblocks everything else
- Can test Rust FFI immediately
- Validates architecture

**Cons:**
- Can't test visually until client is ready

---

### Option 2: Start with End-to-End MVP 🚀
**Build in parallel:**
1. Minimal C# runtime (just Counter example)
2. Minimal minimact.js (just apply patches)
3. Minimal Babel plugin (just useState)
4. Get Counter working end-to-end ASAP

**Pros:**
- Fast feedback loop
- Proves architecture works
- Motivating to see it run!

**Cons:**
- More context switching

---

## My Recommendation: **Option 2** 🎯

**Build the absolute minimum** to get Counter working:

1. **C# Runtime** (2 days)
   - MinimactComponent base class
   - Simple VNode types
   - Basic SignalR hub
   - Rust FFI for reconcile()

2. **minimact.js** (1 day)
   - SignalR connection
   - Apply patches to DOM
   - Event delegation

3. **Babel Plugin** (1 day)
   - Just useState transformation
   - Just button onClick
   - Just basic JSX

4. **Wire it all together** (1 day)
   - Create Counter.tsx
   - Generate Counter.cs
   - Run it and see it work!

**Total: ~5 days to working prototype**

Then iterate from there!

---

## Dependencies & Blockers

### Already Have ✅
- Rust reconciliation engine
- Babel plugin prototype
- Architecture design
- Examples and documentation

### Need to Acquire
- **C# Skills** (for runtime)
- **SignalR knowledge** (for real-time communication)
- **Rollup/esbuild** (for bundling minimact.js)
- **Test infrastructure** (xUnit, Jest, Playwright)

---

## Success Metrics

### MVP (Week 1)
- ✅ Counter app runs end-to-end
- ✅ State updates trigger re-renders
- ✅ Rust reconciliation engine called from C#
- ✅ Patches applied via SignalR

### Alpha (Week 4)
- ✅ 3+ working examples
- ✅ Babel plugin handles all basic hooks
- ✅ Hybrid rendering works
- ✅ Developer can scaffold new project
- ✅ Basic documentation published

### Beta (Week 8)
- ✅ 10+ working examples
- ✅ Production-ready C# runtime
- ✅ Full test coverage
- ✅ Performance benchmarks
- ✅ DevTools extension

### 1.0 (Week 12)
- ✅ Complete documentation
- ✅ Migration guides
- ✅ Video tutorials
- ✅ Community examples
- ✅ npm + NuGet packages published

---

## Questions to Answer

1. **C# Runtime:** Should we use Blazor's component model as inspiration, or build from scratch?

2. **Client Bundle:** Use SignalR client as-is, or fork/customize it?

3. **Babel Plugin:** Should we parse TypeScript types ourselves, or rely on naming conventions?

4. **Testing:** What's the testing strategy for hybrid client/server code?

5. **Deployment:** How do users deploy minimact apps? Azure? Docker? Vercel?

6. **Versioning:** How do we handle Rust lib version ↔ C# runtime ↔ Babel plugin compatibility?

---

## Get Started Checklist

When you're ready to start building:

- [ ] Set up C# solution structure
- [ ] Add SignalR NuGet packages
- [ ] Add Markdig NuGet package
- [ ] Copy Rust minimact.dll to C# project
- [ ] Set up npm project for minimact-client
- [ ] Add @microsoft/signalr dependency
- [ ] Set up bundler (Rollup or esbuild)
- [ ] Create first example: Counter.tsx

---

## Next Decision Point

**What do you want to tackle first?**

A. Build C# runtime (MinimactComponent + SignalR hub)
B. Build minimact.js client (DOM patching + SignalR)
C. Improve Babel plugin (dependency tracking + all hooks)
D. Build CLI tool (scaffolding + watch mode)
E. Create end-to-end Counter example (minimal but working)

Let me know and I'll start building! 🚀
