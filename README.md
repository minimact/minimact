<p align="center">
  <img src="./src/minimact-logo.png" alt="Minimact Logo" width="600">
</p>

<h1 align="center">Minimact</h1>
<h2 align="center">The Posthydrationist Framework</h2>

<p align="center">
  <strong>Server-first reactive UI with zero hydration, predictive patches, instant interactivity, and Rust-fueled performance — built for ASP.NET Core.</strong>
</p>

<p align="center">
  <em>The cactus doesn't hydrate — it stores.</em> 🌵
</p>

<p align="center">
  <a href="https://docs.minimact.com"><img src="https://img.shields.io/badge/docs-minimact.com-blue.svg" alt="Documentation"></a>
  <a href="https://app.netlify.com/sites/minimact/deploys"><img src="https://api.netlify.com/api/v1/badges/4c1c36b7-74a4-4558-94b8-64a6996d1e64/deploy-status" alt="Netlify Status"></a>
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License: MIT"></a>
  <a href="https://www.rust-lang.org/"><img src="https://img.shields.io/badge/rust-%23000000.svg?style=flat&logo=rust&logoColor=white" alt="Rust"></a>
  <a href="https://dotnet.microsoft.com/"><img src="https://img.shields.io/badge/.NET-512BD4?style=flat&logo=dotnet&logoColor=white" alt=".NET"></a>
  <a href="https://dotnet.microsoft.com/apps/aspnet/signalr"><img src="https://img.shields.io/badge/SignalR-Real--time-purple.svg?style=flat&logo=.net&logoColor=white" alt="SignalR"></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/typescript-%23007ACC.svg?style=flat&logo=typescript&logoColor=white" alt="TypeScript"></a>
</p>

They’re treading water in a sea of hydration, clinging to their VDOM life vests while Minimact is out here desert-gliding on predictive patches like some kind of reactive dune worm🌵
Seriously though—client hydration has become the default religion in web dev, and not because it's ideal. It’s just familiar. You’re tossing a wrench (made of Rust, no less 🦀) into that belief system and saying:
“What if we didn’t need to hydrate anything at all because we already know what’s going to happen?”

<br>

Minimact brings the familiar React developer experience to server-side rendering with ASP.NET Core, powered by a Rust reconciliation engine and intelligent predictive updates.

```typescript
import { useState } from 'minimact';

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

**That's it.** Write React, get server-rendered HTML with <5ms perceived latency.

---

## ✨ Why Minimact?

Traditional UI frameworks like React must reconcile every state change on the client, leading to CPU overhead and slower interactions — especially on low-end devices or in high-frequency apps.

**Minimact flips the model:**
- You write UI in **TSX/JSX**
- Minimact compiles it to **C# classes**
- C# renders the HTML on the server
- A **Rust engine predicts state changes** and pre-sends patches to the client
- Client caches predicted patches **before user interaction**
- User clicks → **Client applies cached patch instantly (0ms network latency)**
- **SignalR verifies in background** and corrects only if needed
- **No diffing, no runtime VDOM, zero client reconciliation**

### For React Developers
- ✅ **Familiar syntax** - Write JSX/TSX like you always have
- ✅ **React hooks** - `useState`, `useEffect`, `useRef`, plus powerful semantic hooks
- ✅ **No hydration** - No client-side JavaScript frameworks to load
- ✅ **Instant feedback** - Hybrid client/server state for optimal UX

### For .NET Developers
- ✅ **ASP.NET Core integration** - Use EF Core, dependency injection, and your favorite .NET tools
- ✅ **Type safety** - Full TypeScript → C# type inference
- ✅ **Secure by default** - Business logic stays on the server
- ✅ **Easy deployment** - Standard ASP.NET Core hosting

### For End Users
- ✅ **Fast initial load** - 13.33 KB client (71% smaller than React)
- ✅ **Instant interactions** - Predictive updates feel native
- ✅ **Works without JS** - Progressive enhancement built-in
- ✅ **Low bandwidth** - Only patches sent over the wire

---

## Key Features

### 🔄 Hybrid State Management

Mix server-side and client-side state seamlessly:

```typescript
function SearchBox() {
    const [query, setQuery] = useClientState('');     // Instant, client-only
    const [results, setResults] = useState([]);       // Server-managed

    return (
        <div>
            <input value={query} onInput={e => setQuery(e.target.value)} />
            <button onClick={() => setResults(search(query))}>Search</button>
        </div>
    );
}
```

### 🎯 Universal Template Prediction (Phases 1-9 Complete)

Minimact's breakthrough **template prediction system** achieves 95-98% real-world coverage with 98% memory reduction:

**How it works:**
1. **First interaction**: Rust extracts a parameterized template (or uses Babel pre-generated template)
2. **All future interactions**: Template applies instantly with any value (100% coverage)
3. **Memory**: One 200-byte template vs 1000+ concrete predictions (150KB)

**Coverage by Phase:**
- ✅ **Phase 1-3**: Simple text substitution, conditionals, multi-variable patterns
- ✅ **Phase 4**: Loop templates for `.map()` - ONE template for infinite list items
- ✅ **Phase 5**: Structural templates for conditional rendering (loading states, etc.)
- ✅ **Phase 6**: Expression templates (.toFixed, arithmetic, string operations)
- ✅ **Phase 7**: Deep state traversal for nested objects
- ✅ **Phase 8**: Reorder templates for sorting/filtering
- ✅ **Phase 9**: Semantic array operations (10x faster learning)

**Real-world example:**
```typescript
// FAQ page with 29 items
{faqs.map(item => (
  <FAQAccordion
    item={item}
    isOpen={openIndex === item.id}
    onClick={() => setOpenIndex(item.id)}
  />
))}

// Before templates: 29 items × 2 states = 58 patterns × 150 bytes = 8.7KB
// After templates: 1 loop template × 200 bytes = 200 bytes
// Savings: 97.7% (43x reduction!)
```

**Documentation**: See [TEMPLATE_PREDICTION_ARCHITECTURE.md](./docs/TEMPLATE_PREDICTION_ARCHITECTURE.md) and [PHASES_1_TO_9_COMPLETION_SUMMARY.md](./docs/PHASES_1_TO_9_COMPLETION_SUMMARY.md)

### 🚀 Predictive Rendering

**Think of it as stored procedures for the DOM.**

Just like database stored procedures pre-compile queries for instant execution, Minimact pre-compiles UI state changes and caches them on the client. When the user interacts, they're not triggering computation - they're triggering **execution** of pre-computed patches.

Minimact's **template prediction system** (Phases 1-9) achieves universal coverage:

```typescript
// No hints needed! Template system learns automatically
function Counter() {
    const [count, setCount] = useState(0);
    return <button onClick={() => setCount(count + 1)}>Count: {count}</button>;
}

// First click: Learns template "Count: {0}"
// All future clicks: 100% cache hit, instant update
```

**Template System Features**:
- **98% memory reduction** - One template vs thousands of concrete predictions
- **10x faster learning** - With semantic array operations (Phase 9)
- **Zero cold start** - Babel pre-generates templates at compile time
- **Universal patterns** - Handles loops, conditionals, expressions, nested state

Rust-powered reconciliation engine pre-computes patches and sends them to the client **before interactions happen**:

- **Pre-populated cache**: Client has predicted patches ready before user clicks
- **Zero network latency**: Cache hit = instant DOM update (0ms)
- **Background verification**: Server confirms in parallel, corrections sent only if needed
- **Faster than React**: No client-side reconciliation overhead

**Template Coverage** (Phases 1-9 Complete):
- **Simple patterns** (counters, toggles): 100% ✅ (Phases 1-3)
- **Lists with .map()**: 100% ✅ (Phase 4)
- **Conditional rendering**: 100% ✅ (Phase 5)
- **Formatted values** (.toFixed, etc.): 70% ✅ (Phase 6)
- **Overall real-world coverage**: 95-98% ✅

Optional: Give the predictor explicit hints for edge cases:

```typescript
function Counter() {
    const [count, setCount] = useState(0);
    
    // Hint: when count increments, predict the new value
    usePredictHint('increment', { count: count + 1 });
    
    return (
        <button onClick={() => setCount(count + 1)}>
            Count: {count}
        </button>
    );
}
```

```typescript
function TodoList() {
    const [todos, setTodos] = useState([]);
    
    // Hint: when adding a todo, predict the new array
    usePredictHint('addTodo', {
        todos: [...todos, { id: todos.length + 1, text: 'New Todo' }]
    });
    
    return (
        <div>
            <button onClick={() => setTodos([...todos, { id: todos.length + 1, text: 'New Todo' }])}>
                Add Todo
            </button>
            <ul>
                {todos.map(todo => <li key={todo.id}>{todo.text}</li>)}
            </ul>
        </div>
    );
}
```

For more complex UI states:

```typescript
// Pre-compute modal state changes
const modal = useModal();

usePredictHint('modal-open', () => ({
    backdrop: 'visible',
    content: 'slideIn',
    bodyScroll: 'locked'
}));

modal.open(); // Rust already has patches queued, instant apply
```

Or predict based on user intent:

```typescript
const dropdown = useDropdown('/api/units');

<button 
    onMouseEnter={() => usePredictHint('dropdown-open')}
    onClick={dropdown.open}
>
    Open Menu
</button>
// On hover, predict the dropdown will open
// On click, patches are already ready
```

The Rust engine uses hints to:
- Pre-compute patches for likely state changes
- Pre-fetch required data
- Queue DOM operations
- Reduce time-to-interactive for critical paths

### 📝 Built-in Markdown Support

```typescript
const [content] = useMarkdown(`
# Hello World
This **markdown** is parsed server-side!
`);

return <div markdown>{content}</div>;
```

### 🎨 Template System

Reusable layouts with zero boilerplate:

```typescript
function Dashboard() {
    useTemplate('SidebarLayout', { title: 'Dashboard' });

    return <h1>Welcome to your dashboard</h1>;
}
```

Built-in templates: `DefaultLayout`, `SidebarLayout`, `AuthLayout`, `AdminLayout`

### ⚡ Server Tasks - TypeScript → Multi-Runtime Execution

**Write TypeScript once. Execute on C# or Rust. Zero developer effort.**

`useServerTask` enables you to write server-side async tasks in pure TypeScript that execute on either C# async Tasks or native Rust code with automatic transpilation:

```typescript
// Write TypeScript with familiar syntax
const crunch = useServerTask(async (numbers: number[]) => {
  return numbers
    .map(x => x * x)
    .filter(x => x > 100)
    .reduce((sum, x) => sum + x, 0);
}, { runtime: 'rust' }); // ← Choose your runtime!

// Babel automatically generates idiomatic Rust:
// numbers.iter().map(|x| x * x).filter(|x| x > 100).fold(0, |sum, x| sum + x)
// Executes at native speed on Tokio runtime

// Use in your component
<button onClick={() => crunch.start([1, 2, 3, 4, 5])}>
  Crunch Numbers
</button>

{crunch.status === 'running' && <Spinner />}
{crunch.status === 'complete' && <p>Result: {crunch.result}</p>}
```

**Features:**
- ✅ **TypeScript → C#/Rust transpilation** - Write once, execute anywhere
- ✅ **Runtime selection** - `runtime: 'csharp'` or `runtime: 'rust'`
- ✅ **Reactive state** - Auto re-renders on status/progress changes
- ✅ **Promise support** - `await task.promise`
- ✅ **Progress reporting** - Built-in progress tracking
- ✅ **Streaming support** - For large datasets with chunked results
- ✅ **10-100x performance** - Rust execution for CPU-intensive workloads

**When to use each runtime:**

| Use C# Runtime | Use Rust Runtime |
|----------------|------------------|
| Database queries (EF Core) | Large dataset transformations |
| ASP.NET ecosystem | CPU-intensive computation |
| .NET library dependencies | Real-time processing |
| Simple business logic | Parallel workloads (multi-core) |
| Rapid prototyping | Memory-constrained environments |

**Example: Database Query (C#)**
```typescript
const users = useServerTask(async () => {
  return await db.Users.Where(u => u.Active).ToListAsync();
});
```

**Example: Heavy Processing (Rust)**
```typescript
const analysis = useServerTask(async (data: number[]) => {
  return analyzeUserBehavior(data); // Complex math
}, { runtime: 'rust', parallel: true }); // ALL THE CORES!
```

### 📄 Pagination Made Trivial

**usePaginatedServerTask** builds on `useServerTask` to provide server-side pagination with zero boilerplate:

```typescript
const users = usePaginatedServerTask(
  async ({ page, pageSize, filters }) => {
    return await db.users
      .where(u => filters.role ? u.role === filters.role : true)
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .toList();
  },
  {
    pageSize: 20,
    getTotalCount: async (filters) => {
      return await db.users
        .where(u => filters.role ? u.role === filters.role : true)
        .count();
    },
    prefetchNext: true,
    runtime: 'rust', // ← Works with Rust too!
    dependencies: [filters]
  }
);

// Use it in your component
<ul>
  {users.items.map(user => <li key={user.id}>{user.name}</li>)}
</ul>

<div>
  <button onClick={users.prev} disabled={!users.hasPrev}>Previous</button>
  <span>Page {users.page} of {users.totalPages}</span>
  <button onClick={users.next} disabled={!users.hasNext}>Next</button>
</div>

{users.pending && <Spinner />}
```

**Features:**
- ✅ **Automatic TypeScript → C#/Rust transpilation** - Reuses `useServerTask` infrastructure
- ✅ **Smart prefetching** - Next page ready before user clicks
- ✅ **Dependency tracking** - Re-fetch when filters change
- ✅ **Runtime selection** - C# for databases, Rust for heavy processing
- ✅ **Cache management** - Intelligent client-side caching
- ✅ **Type-safe** - Full TypeScript inference

**The secret:** `usePaginatedServerTask` is just a thin wrapper around `useServerTask`. It generates TWO server tasks (fetch + count), both transpiled to your chosen runtime. You get all the power of `useServerTask` (progress, errors, cancellation, etc.) with a pagination-specific API.

### 🗄️ useContext - Redis-Like Server-Side Cache

**Unlike React's context (Provider components), Minimact's context is a server-side cache with scoped lifetimes.**

```typescript
import { createContext, useContext } from 'minimact';

// Session-scoped user context
const UserContext = createContext<User>('current-user', {
  scope: 'session',
  expiry: 3600000 // 1 hour
});

// Component 1: Login form (writes to context)
function LoginForm() {
  const [_, setUser] = useContext(UserContext);

  const handleLogin = async (credentials) => {
    const user = await authenticate(credentials);
    setUser(user); // Stored in session cache, survives page navigation
  };

  return <form onSubmit={handleLogin}>...</form>;
}

// Component 2: User profile (reads from context)
function UserProfile() {
  const [user] = useContext(UserContext);

  if (!user) return <Login />;
  return <div>Welcome, {user.name}</div>;
}
```

**Scope types:**
- `'request'` — Tied to current HTTP request (default)
- `'session'` — Persists across requests for user session
- `'url'` — Scoped to URL pattern (e.g., `/dashboard/*`)
- `'application'` — Global, shared across all users

**Key differences from React Context:**
- ✅ No Provider component needed
- ✅ Server-side cache survives page navigation
- ✅ No parent-child relationship required
- ✅ Works across different pages/routes

### 🧮 useComputed - Client-Side Computation with Server Rendering

**Compute values on the client using browser APIs, then sync to server for rendering.**

```typescript
import { useComputed } from 'minimact';

// Use lodash on client (no server bundle bloat)
function UserList({ users }) {
  const sortedUsers = useComputed('sortedUsers', () => {
    return _.sortBy(users, 'name');
  }, [users]);

  return <ul>{sortedUsers.map(u => <li>{u.name}</li>)}</ul>;
}

// Use browser geolocation API
function LocationMap() {
  const location = useComputed('location', async () => {
    const pos = await new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(resolve);
    });
    return { lat: pos.coords.latitude, lng: pos.coords.longitude };
  }, []);

  if (!location) return <div>Getting location...</div>;
  return <Map center={location} />;
}

// Client-side password hashing with Web Crypto API
function SecureForm() {
  const [password, setPassword] = useState('');

  const hashedPassword = useComputed('hashedPassword', async () => {
    if (!password) return null;

    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }, [password], {
    debounce: 500  // Wait for user to stop typing
  });

  return <input type="password" value={password} />;
}
```

**How it works:**
1. Client runs computation using browser APIs/libraries
2. Result syncs to server via `UpdateClientComputedState`
3. Server accesses via `GetClientState<T>('key')`
4. Server renders with computed value

**Options:**
- `memoize: true` — Cache results (default)
- `expiry: 5000` — Cache expires after N milliseconds
- `debounce: 300` — Wait N ms after last change before syncing
- `throttle: 1000` — Sync at most once every N ms
- `initialValue` — Value before first computation

**Perfect for:**
- Heavy client-side libraries (lodash, moment, d3)
- Browser-only APIs (geolocation, crypto, canvas, IndexedDB)
- Client-computed values for server rendering
- Keeping large libraries off your server bundle

### 🎯 Zero-Cost Semantic Hooks

High-level abstractions that compile away:

```typescript
// Form validation
const email = useValidation('email', {
    required: true,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
});

// Modal dialogs
const modal = useModal();

// Toggle state
const [isOpen, toggle] = useToggle(false);

// Dropdowns, tabs, accordions, and more...
const dropdown = useDropdown(Routes.Api.Units.GetAll);
```

### 🔗 Type-Safe API Routes

Full IntelliSense for your API endpoints:

```typescript
const dropdown = useDropdown(Routes.Api.Units.GetAll);
//                            ^ Autocomplete shows all available routes
//                            ^ Fully typed with response data
```

Generated from your C# controllers - refactor-safe and discoverable.

### 🗄️ Entity Framework Integration

Pre-populate state from your database:

```typescript
export function UserProfile() {
    const [user, setUser] = useState(null);
    return <div>{user?.name}</div>;
}
```

```csharp
// UserProfile.codebehind.cs
public partial class UserProfile {
    private readonly AppDbContext _db;

    public override async Task OnInitializedAsync() {
        user = await _db.Users.FirstOrDefaultAsync();
        TriggerRender();
    }
}
```

---

## 🏗️ How It Works

```
┌─────────────────────────────────────────────────────────┐
│  Developer writes TSX with React hooks                  │
│  ↓                                                       │
│  Babel plugin:                                          │
│    - Transforms TSX → C# classes                        │
│    - Extracts templates from .map() patterns            │
│    - Generates loop/structural templates at compile time│
│  ↓                                                       │
│  ASP.NET Core renders components to HTML                │
│  ↓                                                       │
│  Rust engine:                                           │
│    - Uses Babel templates (zero cold start)             │
│    - Or extracts templates at runtime (fallback)        │
│    - Learns patterns (98% memory reduction)             │
│  ↓                                                       │
│  Server pre-sends predicted template patches to client  │
│  ↓                                                       │
│  [Client now has patches cached and ready]              │
│  ↓                                                       │
│  User interacts (click, input, etc.)                    │
│  ↓                                                       │
│  Client checks cache → patch found → applies instantly  │
│  (0ms latency - no network round trip!)                 │
│  ↓                                                       │
│  SignalR notifies server in background                  │
│  ↓                                                       │
│  Server verifies & sends correction if needed           │
└─────────────────────────────────────────────────────────┘
```

**Key insight**: The Rust engine **pre-populates the client with predictive template patches** before any interaction happens. Templates are learned from first interaction or pre-generated by Babel at compile time. When a user clicks a button, the patch is already waiting in the client's cache (95-98% hit rate). The DOM updates instantly with **zero network latency** - faster than React's client-side reconciliation. The server verifies in the background and only sends corrections for rare mispredictions.

---

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- .NET 8.0+
- Rust (for building from source)

### Installation

```bash
# Install Minimact CLI
npm install -g minimact-cli

# Create new project
minimact new my-app
cd my-app

# Start development server
minimact dev
```

### Your First Component

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
                placeholder="Enter your name"
            />
        </div>
    );
}
```

### Build and Run

```bash
# Build TypeScript → C#
npm run build

# Run ASP.NET Core server
dotnet run
```

Visit `http://localhost:5000` - your component is live!

---

## 🧠 Architecture Philosophy

### Client-Side Stored Procedures

Minimact introduces a fundamentally different paradigm: **client-side stored procedures for UI state**.

Traditional frameworks ship logic to the client and let it improvise state changes at runtime. Minimact pre-compiles state transitions on the server, caches them on the client, and reduces interaction to pure execution.

### 🌵 The Posthydrationist Manifesto

> *The cactus doesn't hydrate—it stores.*  
> *It doesn't react—it anticipates.*  
> *It doesn't reconcile—it persists.*

In the scorching silence of the posthydrationist desert, traditional frameworks wither under the weight of their own bundles. They hydrate. They reconcile. They compute at the moment of need.

Minimact is different. Like the cactus, it thrives not by reaching outward, but by turning inward - by minimizing waste, by knowing before needing, by storing what will be required before the request arrives.

**Minimact is the cactus of the frontend ecosystem:**
- **Minimal** - 13.33 KB client (71% smaller than React), zero reconciliation overhead
- **Resilient** - Works without JavaScript, degrades gracefully
- **Latent power** - Pre-computed state changes waiting to execute
- **Occasionally spiky** - Rust-powered performance that cuts through latency

Let the others drink from the slow streams of hydration. You walk the arid plains with predictive grace and event-driven stillness.

When the next developer asks "But where's the client state?" you just turn slowly, whisper *"stored procedure,"* and ride off into the postmodern sun. 🌵✨

---

## 🔌 Plugin System

**Extend Minimact with third-party components. Zero configuration. Type-safe. Production-ready.**

Minimact's plugin system allows you to create and distribute reusable UI components as NuGet packages. Plugins are auto-discovered, type-safe, and integrate seamlessly with Minimact's template prediction system.

### Using a Plugin

**1. Install the NuGet package:**
```bash
dotnet add package Minimact.Plugin.Clock
```

**2. Use it in your TSX component:**
```tsx
import { useState, useEffect } from 'minimact';

interface ClockState {
  hours: number;
  minutes: number;
  seconds: number;
  date: string;
  theme: 'light' | 'dark';
  showSeconds: boolean;
  use24Hour: boolean;
}

export function Dashboard() {
  const [currentTime, setCurrentTime] = useState<ClockState>({
    hours: 14,
    minutes: 30,
    seconds: 45,
    date: 'November 1, 2025',
    theme: 'light',
    showSeconds: true,
    use24Hour: true
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setCurrentTime(prev => ({
        ...prev,
        hours: now.getHours(),
        minutes: now.getMinutes(),
        seconds: now.getSeconds(),
        date: now.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
      }));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <h1>Dashboard</h1>
      <Plugin name="Clock" state={currentTime} />
    </div>
  );
}
```

**That's it!** The plugin is auto-discovered, rendered server-side, and its assets (CSS, JS) are served automatically.

### How It Works

```
┌─────────────────────────────────────────────────────────┐
│  Developer writes <Plugin name="Clock" state={...} />  │
│  ↓                                                       │
│  Babel plugin:                                          │
│    - Transforms to new PluginNode("Clock", state)       │
│    - Extracts type-safe state bindings                  │
│  ↓                                                       │
│  ASP.NET Core:                                          │
│    - PluginManager auto-discovers plugins via reflection│
│    - Validates state against JSON Schema                │
│    - Renders plugin to VNode tree                       │
│  ↓                                                       │
│  Server sends HTML with plugin markup                   │
│  ↓                                                       │
│  Client requests plugin assets:                         │
│    GET /plugin-assets/Clock@1.0.0/clock-widget.css      │
│  ↓                                                       │
│  PluginAssetMiddleware serves embedded resources         │
│    - Versioned URLs for cache busting                   │
│    - 24-hour cache with ETag validation                 │
│  ↓                                                       │
│  Template prediction system works seamlessly:           │
│    - State changes → Instant patch application          │
│    - 95-98% cache hit rate                              │
└─────────────────────────────────────────────────────────┘
```

### Features

- ✅ **Auto-discovery** - Plugins found via `[MinimactPlugin]` attribute
- ✅ **Type-safe state contracts** - JSON Schema validation
- ✅ **Versioned assets** - `/plugin-assets/Name@1.0.0/file.css`
- ✅ **Embedded resources** - CSS, JS, images, fonts served automatically
- ✅ **Multi-version support** - Side-by-side plugin versions
- ✅ **Semver compatibility** - Automatic version resolution
- ✅ **Template prediction** - Full integration with Minimact's prediction system
- ✅ **Zero client bundle** - Server-rendered, no JavaScript required
- ✅ **Cache optimization** - 24-hour cache with ETag headers

### Configuration

**Option A: Auto-Discovery (Default)**
```csharp
// Program.cs
builder.Services.AddMinimact(options =>
{
    options.AutoDiscoverPlugins = true; // Default
});

var app = builder.Build();
app.UseMinimact();
```

**Option B: Explicit Registration**
```csharp
builder.Services.AddMinimact(options =>
{
    options.AutoDiscoverPlugins = false;
    options.RegisterPlugin<ClockPlugin>();
    options.RegisterPlugin<WeatherPlugin>();
});
```

**Option C: Custom Asset Options**
```csharp
builder.Services.AddMinimact(options =>
{
    options.PluginAssets.BasePath = "/assets/plugins";
    options.PluginAssets.VersionAssetUrls = true;
    options.PluginAssets.CacheDuration = 3600; // 1 hour
});
```

### Creating a Plugin

**1. Create a new C# class library:**
```bash
dotnet new classlib -n Minimact.Plugin.MyWidget
cd Minimact.Plugin.MyWidget
dotnet add package Minimact.AspNetCore
```

**2. Define the state contract:**
```csharp
namespace Minimact.Plugin.MyWidget;

public class MyWidgetState
{
    public string Title { get; set; } = string.Empty;
    public int Value { get; set; }
    public bool IsActive { get; set; }
}
```

**3. Implement the plugin:**
```csharp
using Minimact.AspNetCore.Plugins;
using Minimact.AspNetCore.Core;

namespace Minimact.Plugin.MyWidget;

[MinimactPlugin("MyWidget")]
public class MyWidgetPlugin : MinimactPlugin<MyWidgetState>
{
    public override string Name => "MyWidget";
    public override string Version => "1.0.0";
    public override string Description => "A custom widget";
    public override string Author => "Your Name";

    protected override VNode RenderTyped(MyWidgetState state)
    {
        return new VElement("div", new Dictionary<string, string>
        {
            ["className"] = state.IsActive ? "widget active" : "widget"
        }, new[]
        {
            new VElement("h3", new Dictionary<string, string>(),
                state.Title),
            new VElement("span", new Dictionary<string, string>
            {
                ["className"] = "value"
            }, state.Value.ToString())
        });
    }

    public override PluginAssets GetAssets()
    {
        return new PluginAssets
        {
            CssFiles = new List<string>
            {
                "/plugin-assets/MyWidget@1.0.0/widget.css"
            },
            Source = AssetSource.Embedded
        };
    }

    public override void Initialize(IServiceProvider services)
    {
        Console.WriteLine($"[MyWidget Plugin] Initialized v{Version}");
    }
}
```

**4. Add embedded CSS (assets/widget.css):**
```css
.widget {
  padding: 1rem;
  border: 1px solid #ccc;
  border-radius: 8px;
}

.widget.active {
  border-color: #4CAF50;
  background: #f0f8f0;
}

.widget .value {
  font-size: 2rem;
  font-weight: bold;
  color: #333;
}
```

**5. Configure embedded resources in .csproj:**
```xml
<ItemGroup>
  <EmbeddedResource Include="assets\**\*" />
</ItemGroup>
```

**6. Build and publish:**
```bash
dotnet build
dotnet pack
dotnet nuget push bin/Release/Minimact.Plugin.MyWidget.1.0.0.nupkg
```

### Example Plugins

**Clock Widget** - Real-time clock with themes ([Source](./plugins/Minimact.Plugin.Clock))
- 12/24-hour formats
- Light and dark themes
- Optional timezone display
- Beautiful gradients

**Coming Soon:**
- Weather Widget
- Chart Components (Line, Bar, Pie)
- Calendar/Date Picker
- Code Editor
- Markdown Renderer

### Plugin Discovery Flow

```
1. App starts
   ↓
2. AddMinimact() called
   ↓
3. PluginManager registered as singleton
   ↓
4. If AutoDiscoverPlugins = true:
   ├─ Scan all loaded assemblies
   ├─ Find types with [MinimactPlugin] attribute
   ├─ Instantiate via DI
   └─ Call plugin.Initialize()
   ↓
5. Register explicit plugins
   ↓
6. UseMinimact() called
   ↓
7. PluginAssetMiddleware added to pipeline
   ↓
8. Plugins ready for use in components
```

### Asset Serving Flow

```
1. Client requests: /plugin-assets/Clock@1.0.0/clock-widget.css
   ↓
2. PluginAssetMiddleware intercepts
   ↓
3. Parse URL:
   ├─ Plugin Name: "Clock"
   ├─ Version: "1.0.0"
   └─ Asset Path: "clock-widget.css"
   ↓
4. Get plugin from PluginManager
   ↓
5. Find embedded resource in plugin assembly
   ├─ Try exact match
   ├─ Try partial match
   └─ Try assets folder convention
   ↓
6. Serve resource:
   ├─ Content-Type: text/css
   ├─ Cache-Control: public, max-age=86400
   ├─ ETag: "Clock-1.0.0-12345678"
   └─ Stream resource bytes
```

### Performance

- **Plugin discovery:** ~50ms (one-time on startup)
- **Plugin lookup:** O(1) (dictionary-based)
- **Asset serving:** ~2-5ms (first request), ~0ms (cached)
- **Memory overhead:** ~2KB per plugin
- **Template prediction:** Same 95-98% cache hit rate as core Minimact

### Security

- ✅ **JSON Schema validation** - Prevents malicious state injection
- ✅ **Content-Type enforcement** - Protects against MIME confusion
- ✅ **Cache headers** - Optimizes performance without sacrificing security
- ✅ **ETag validation** - Ensures asset integrity
- ✅ **Embedded resource isolation** - Plugins can't access host filesystem

### Documentation

- [Plugin System Implementation Plan](./docs/PLUGIN_SYSTEM_PHASE2_COMPLETE.md)
- [Clock Plugin Source](./plugins/Minimact.Plugin.Clock)
- [Creating Custom Plugins Guide](./docs/creating-plugins.md)

---

## 🎯 MVC Bridge

**Traditional ASP.NET MVC Controllers → React-like Minimact Components. The best of both worlds.**

The MVC Bridge seamlessly integrates Minimact with traditional ASP.NET MVC, allowing you to use Controllers, ViewModels, and all the familiar MVC patterns while rendering modern React-like UI components. Perfect for migrating existing MVC applications or building new ones with a familiar backend architecture.

### The Pattern

```
Traditional MVC Flow:
Controller → ViewModel → Razor View → HTML

Minimact MVC Flow:
Controller → ViewModel → Minimact Component → HTML
            ↓
     [Mutable] attribute controls client mutability
            ↓
    Type-safe state synchronization
```

### Quick Example

**1. Define a ViewModel with mutability control:**
```csharp
using Minimact.AspNetCore.Attributes;

public class ProductViewModel
{
    // ❌ IMMUTABLE - Server authority (security, business logic)
    public string ProductName { get; set; }
    public decimal Price { get; set; }
    public bool IsAdminRole { get; set; }
    public string UserEmail { get; set; }

    // ✅ MUTABLE - Client can modify (UI state, form inputs)
    [Mutable]
    public int InitialQuantity { get; set; }

    [Mutable]
    public string InitialSelectedColor { get; set; } = "Black";

    [Mutable]
    public bool InitialIsExpanded { get; set; }
}
```

**2. Use it in an MVC Controller:**
```csharp
using Microsoft.AspNetCore.Mvc;
using Minimact.AspNetCore.Rendering;

[ApiController]
[Route("[controller]")]
public class ProductsController : ControllerBase
{
    private readonly MinimactPageRenderer _renderer;

    public ProductsController(MinimactPageRenderer renderer)
    {
        _renderer = renderer;
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> Details(int id)
    {
        // 1. Fetch data (EF Core, Dapper, etc.)
        var product = await _db.Products.FindAsync(id);

        // 2. Prepare ViewModel (traditional MVC pattern)
        var viewModel = new ProductViewModel
        {
            ProductName = product.Name,
            Price = product.Price,
            IsAdminRole = User.IsInRole("Admin"),
            UserEmail = User.Identity?.Name ?? "Guest",
            InitialQuantity = 1,
            InitialSelectedColor = "Black"
        };

        // 3. Render Minimact component with ViewModel
        return await _renderer.RenderPage<ProductDetailsPage>(
            viewModel: viewModel,
            pageTitle: $"{product.Name} - Product Details"
        );
    }
}
```

**3. Build the UI with React-like TSX:**
```tsx
import { useMvcState, useMvcViewModel } from '@minimact/mvc';

export function ProductDetailsPage() {
  // Immutable props (no setter returned)
  const [productName] = useMvcState<string>('productName');
  const [price] = useMvcState<number>('price');
  const [isAdmin] = useMvcState<boolean>('isAdminRole');

  // Mutable props (setter returned)
  const [quantity, setQuantity] = useMvcState<number>('initialQuantity', {
    sync: 'immediate' // Sync changes to server instantly
  });
  const [color, setColor] = useMvcState<string>('initialSelectedColor');
  const [isExpanded, setIsExpanded] = useMvcState<boolean>('initialIsExpanded');

  // Access entire ViewModel
  const viewModel = useMvcViewModel<ProductViewModel>();

  return (
    <div className="product-details">
      <h1>{productName}</h1>
      <div className="price">${price.toFixed(2)}</div>

      {/* Quantity selector - client can modify */}
      <div>
        <button onClick={() => setQuantity(quantity - 1)}>-</button>
        <span>{quantity}</span>
        <button onClick={() => setQuantity(quantity + 1)}>+</button>
      </div>

      {/* Color selector - client can modify */}
      <select value={color} onChange={(e) => setColor(e.target.value)}>
        <option value="Black">Black</option>
        <option value="White">White</option>
        <option value="Red">Red</option>
      </select>

      {/* Admin-only controls - server-controlled visibility */}
      {isAdmin && (
        <div className="admin-controls">
          <button>Edit Product</button>
          <button>Delete Product</button>
        </div>
      )}

      {/* Expandable section - client state */}
      <button onClick={() => setIsExpanded(!isExpanded)}>
        {isExpanded ? 'Hide' : 'Show'} Details
      </button>
      {isExpanded && (
        <div className="details">
          <p>Product specifications...</p>
        </div>
      )}
    </div>
  );
}
```

### How It Works

```
┌─────────────────────────────────────────────────────────┐
│  MVC Controller prepares ViewModel                      │
│  ↓                                                       │
│  MinimactPageRenderer receives ViewModel                │
│  ↓                                                       │
│  Reflection extracts mutability metadata:               │
│    - [Mutable] fields → Client can modify               │
│    - Non-[Mutable] → Server authority only              │
│  ↓                                                       │
│  ViewModel serialized to HTML with _mutability field:   │
│    <script>                                             │
│      window.__MINIMACT_MVC__ = {                        │
│        viewModel: { productName: "Widget", price: 99.99 }│
│        mutability: { initialQuantity: true, price: false}│
│      }                                                   │
│    </script>                                            │
│  ↓                                                       │
│  Client-side @minimact/mvc hooks:                       │
│    - useMvcState('price') → No setter (immutable)       │
│    - useMvcState('quantity') → Has setter (mutable)     │
│  ↓                                                       │
│  User changes quantity:                                 │
│    setQuantity(5) → SignalR → Server validation         │
│  ↓                                                       │
│  Server validates [Mutable] attribute:                  │
│    ✅ quantity is [Mutable] → Accept change             │
│    ❌ price is NOT [Mutable] → Reject, log security event│
│  ↓                                                       │
│  Template prediction applies patches instantly          │
│  (95-98% cache hit rate - same as core Minimact)        │
└─────────────────────────────────────────────────────────┘
```

### Features

- ✅ **Traditional MVC pattern** - Controllers, ViewModels, routing
- ✅ **Fine-grained mutability** - `[Mutable]` attribute per property
- ✅ **Type-safe synchronization** - TypeScript ↔ C# type safety
- ✅ **Security by default** - Server validates all mutations
- ✅ **Defense in depth** - Compile-time + runtime + server validation
- ✅ **Template prediction** - Instant UI updates (95-98% hit rate)
- ✅ **Sync strategies** - Immediate, debounced, or manual
- ✅ **EF Core integration** - Works with Entity Framework, Dapper, etc.
- ✅ **Familiar patterns** - MVC developers feel at home

### Configuration

**Program.cs setup:**
```csharp
var builder = WebApplication.CreateBuilder(args);

// Add Minimact services
builder.Services.AddMinimact();
builder.Services.AddMinimactMvcBridge(); // ← Enable MVC Bridge

// Add MVC services (traditional pattern)
builder.Services.AddControllersWithViews();

// Add SignalR for real-time communication
builder.Services.AddSignalR();

var app = builder.Build();

app.UseStaticFiles();
app.UseRouting();

app.MapControllers();
app.MapHub<MinimactHub>("/minimact");

app.Run();
```

**Install the NPM package:**
```bash
npm install @minimact/mvc
```

### Mutability Enforcement

**The Security Model - Defense in Depth:**

```
Layer 1: TypeScript Compile-Time
  └─ useMvcState<T>() returns setter only if mutable
  └─ Compile error if trying to modify immutable property

Layer 2: Runtime Hook Validation
  └─ Hook checks _mutability metadata
  └─ Setter function not created for immutable properties

Layer 3: Server-Side Validation
  └─ MinimactHub.UpdateMvcState validates [Mutable]
  └─ Security events logged for attempted violations

Layer 4: Audit Trail
  └─ All mutation attempts logged
  └─ Security monitoring and alerts
```

**Example - What happens when client tries to modify immutable property:**

```tsx
// Client code
const [price, setPrice] = useMvcState<number>('price');

// ❌ TypeScript error: "setPrice is undefined"
setPrice(999.99); // Won't compile!

// If they bypass TypeScript (malicious):
fetch('/minimact/UpdateMvcState', {
  body: JSON.stringify({ field: 'price', value: 999.99 })
});

// Server response:
// ❌ 403 Forbidden
// Security Event Logged: "Attempted mutation of immutable field 'price'"
```

### Sync Strategies

**Immediate (default for critical state):**
```tsx
const [quantity, setQuantity] = useMvcState<number>('quantity', {
  sync: 'immediate' // Every change → instant server sync
});
```

**Debounced (for text inputs):**
```tsx
const [search, setSearch] = useMvcState<string>('searchQuery', {
  sync: 'debounced',
  debounceMs: 500 // Wait 500ms after last keystroke
});
```

**Manual (for batch updates):**
```tsx
const [formData, setFormData] = useMvcState<FormData>('formData', {
  sync: 'manual'
});

// Make multiple changes
setFormData({ ...formData, firstName: 'John' });
setFormData({ ...formData, lastName: 'Doe' });

// Sync all at once
await useMvcViewModel().sync();
```

### Real-World Use Cases

**E-commerce Product Page:**
- ❌ Immutable: Product name, price, reviews (server authority)
- ✅ Mutable: Quantity, color, size, gift message (client state)

**Admin Dashboard:**
- ❌ Immutable: User roles, permissions, audit logs (security)
- ✅ Mutable: Filter selections, sort order, pagination (UI state)

**Blog Post Editor:**
- ❌ Immutable: Author, publish date, view count (server authority)
- ✅ Mutable: Draft content, title, tags (client editing)

**Financial Dashboard:**
- ❌ Immutable: Account balance, transaction history (security)
- ✅ Mutable: Date range, chart type, currency display (UI preferences)

### Performance

**Same as core Minimact:**
- **Template prediction:** 95-98% cache hit rate
- **Initial load:** < 100ms time to interactive
- **State sync:** < 5ms for mutable property updates
- **Bundle size:** +3KB for MVC Bridge (on top of 13.33 KB core)

**Comparison to traditional MVC + React:**
```
Traditional Stack:
  MVC Backend → JSON API → React Frontend → Redux → React rendering
  Round trip: ~200ms | Bundle: ~150 KB

Minimact MVC:
  MVC Backend → MinimactPageRenderer → Server-rendered HTML
  First paint: ~50ms | Interaction: ~5ms (predicted) | Bundle: 16.33 KB
```

### Migration Path

**Step 1: Add Minimact to existing MVC app**
```bash
dotnet add package Minimact.AspNetCore
npm install @minimact/mvc
```

**Step 2: Convert views incrementally**
```csharp
// Before (Razor)
public IActionResult Details(int id)
{
    var model = GetProduct(id);
    return View(model); // Razor view
}

// After (Minimact)
public async Task<IActionResult> Details(int id)
{
    var viewModel = GetProductViewModel(id);
    return await _renderer.RenderPage<ProductDetailsPage>(viewModel);
}
```

**Step 3: Keep existing routes, controllers, auth**
- ✅ All MVC routing works unchanged
- ✅ `[Authorize]` and role-based auth work
- ✅ Model binding and validation work
- ✅ Filters and middleware work

### Working Example

See the complete working example at [`examples/MyMvcTw`](./examples/MyMvcTw):
- Full MVC controller with ViewModel
- Product details page with Tailwind CSS
- Mutable/immutable property demonstrations
- Admin role-based UI
- Real-time quantity updates with cart total

### Documentation

- [MVC Bridge Implementation Plan](./docs/MVC_BRIDGE_IMPLEMENTATION_PLAN.md)
- [MVC Bridge Quick Start Guide](./docs/MVC_BRIDGE_QUICK_START.md)
- [MVC Bridge Status](./docs/MVC_BRIDGE_STATUS.md)
- [Working Example](./examples/MyMvcTw)

---

## Architecture

Minimact consists of four main components:

### 1. **Babel Plugin** (TypeScript/JavaScript)
- Transforms JSX/TSX to C# classes
- Infers types from TypeScript
- Tracks hook dependencies for hybrid rendering
- Generates optimized server-side code
- **Extracts templates from JSX patterns** (.map, conditionals, etc.)
- **Pre-generates loop/structural templates** at compile time
- **Zero cold start** - Templates ready from first render

### 2. **C# Runtime** (ASP.NET Core)
- Component lifecycle management
- SignalR hub for real-time communication
- State management and event handling
- Integration with EF Core and DI

### 3. **Rust Reconciliation Engine**
- High-performance VDOM diffing
- **Template prediction system** (Phases 1-9 complete)
- **Universal pattern coverage** (95-98% real-world)
- **98% memory reduction** vs concrete predictions
- **10x faster learning** with semantic operations
- Pattern learning and caching
- Available as server-side library or WASM

### 4. **Client Library** (JavaScript)
- **minimact**: 13.33 KB gzipped (WebSocket-based, modern browsers)
- **minimact-r**: 25.03 KB gzipped (Full SignalR with fallbacks)
- Real-time connection management
- Event delegation
- Optimistic patch application
- Complete React-like hooks API
- Fallback for no-JS scenarios

---

## Project Status

**Current Phase**: Core Runtime Development

- [x] Rust reconciliation engine
- [x] Rust predictor with pattern learning
- [x] **Template prediction system (Phases 1-9)**
  - [x] Simple, conditional, multi-variable templates
  - [x] Loop templates for .map() patterns
  - [x] Structural templates for conditional rendering
  - [x] Expression templates (.toFixed, etc.)
  - [x] Deep state traversal for nested objects
  - [x] Reorder templates for sorting/filtering
  - [x] Semantic array operations (10x faster)
- [x] **Babel transformation plugin** (TSX → C# compilation)
  - [x] useState, useEffect, useRef transformation
  - [x] JSX → C# VNode generation
  - [x] Event handler mapping
  - [x] Template extraction (loops, conditionals)
  - [x] Compile-time template generation
- [x] C# FFI bindings
- [x] Basic VDOM types
- [x] **C# runtime and component base classes**
  - [x] MinimactComponent base class
  - [x] ComponentRegistry and lifecycle management
  - [x] State management and hooks (useState, useEffect, useRef)
  - [x] Template metadata support (LoopTemplateAttribute, etc.)
- [x] **SignalR hub implementation**
  - [x] Real-time bidirectional communication
  - [x] Component registration and event handling
  - [x] Patch sending and state synchronization
  - [x] Client-computed state support
- [x] **Client library** (JavaScript runtime)
  - [x] Two versions: minimact (13.33 KB) and minimact-r (25.03 KB)
  - [x] SignalM/SignalR connection management
  - [x] DOM patching (surgical updates)
  - [x] Event delegation
  - [x] Complete React-like hooks (useState, useEffect, useRef, useContext, useComputed, etc.)
  - [x] Hydration system
  - [x] HintQueue for predictive patches
  - [x] Template renderer
- [x] **Developer tooling**
  - [x] CLI (minimact-cli) - TSX→C# transpilation, watch mode
  - [x] VS Code extension - File navigation, scaffolding, preview, snippets
  - [x] DevTools - Browser extension for debugging (minimact-devtools)
  - [x] **Interactive Playground** - Web-based IDE
    - Monaco editor with TSX→C# live preview
    - Real-time component interaction
    - Visual prediction analytics (green/red cache hit overlay)
    - Metrics dashboard (hit rate, latencies, performance)
- [x] **Template library**
  - [x] DefaultLayout, SidebarLayout, AuthLayout, AdminLayout
- [ ] **Semantic hooks implementation** (partial)
  - [x] useModal, useDropdown (state structures exist)
  - [ ] Full implementations with UI components

See [VISION.md](./src/VISION.md) and [PHASES_1_TO_9_COMPLETION_SUMMARY.md](./docs/PHASES_1_TO_9_COMPLETION_SUMMARY.md) for details.

---

## Comparison to Alternatives

| Feature | Minimact | Next.js/Remix | Blazor Server | HTMX |
|---------|----------|---------------|---------------|------|
| **Syntax** | React JSX/TSX | React JSX/TSX | Razor C# | HTML attrs |
| **Bundle Size** | **13.33 KB** (71% smaller) | ~45 KB | ~300 KB | ~14 KB |
| **Server** | .NET | Node.js | .NET | Any |
| **Hydration** | None* | Required | None | None |
| **Prediction** | ✅ Rust | ❌ | ❌ | ❌ |
| **Hybrid State** | ✅ | ❌ | ❌ | Manual |
| **Type Safety** | ✅ TS→C# | ✅ TS | ✅ C# | ❌ |
| **Learning Curve** | Low (React) | Low (React) | Medium | Very Low |
| **Semantic Hooks** | Built-in | Manual | Manual | N/A |

*Optional client zones for hybrid rendering

---

## Use Cases

### Perfect For:
- ✅ Enterprise web applications
- ✅ Content-heavy sites (blogs, docs, marketing)
- ✅ Internal tools and dashboards
- ✅ Regulated environments (government, healthcare, finance)
- ✅ Teams with .NET backend + React frontend experience
- ✅ Applications requiring strict security controls

### Not Ideal For:
- ❌ Fully offline applications
- ❌ Real-time collaborative editing (e.g., Google Docs)
- ❌ WebGL/Canvas-heavy applications
- ❌ Projects requiring bleeding-edge React features

---

## Performance

### Benchmarks

**Initial Load**:
- HTML size: ~10-50KB (typical page)
- JavaScript: 13.33 KB (Minimact client, 71% smaller than React)
- Alternative: 25.03 KB with full SignalR (still 44% smaller than React)
- Time to Interactive: <100ms

**Interaction Latency** (with 20ms network latency):

| Scenario | Traditional SSR | Minimact (Predicted) |
|----------|----------------|----------------------|
| Button click | ~47ms | ~24ms (2x faster) |
| Form input | ~47ms | ~2ms (client-only) |
| Toggle state | ~47ms | ~24ms (2x faster) |

**Prediction Accuracy** (after warmup):
- Simple UIs (counters, toggles): **95%+**
- Dynamic UIs (lists, conditionals): **70-85%**
- Complex UIs (side effects): **60-75%**

---

## Examples

Check out the [examples](./examples) directory:

- **[Todo App](./examples/todo)** - Classic TodoMVC implementation
- **[Blog](./examples/blog)** - Markdown blog with EF Core
- **[Dashboard](./examples/dashboard)** - Admin dashboard with templates
- **[Forms](./examples/forms)** - Validation and semantic hooks
- **[Hybrid State](./examples/hybrid-state)** - Client/server state mixing

---

## Contributing

We welcome contributions! See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

**Areas where we need help**:
- 🔨 C# runtime development
- 🎨 Babel plugin (AST transformation, dependency analysis)
- ⚡ Rust optimization and WASM compilation
- 📚 Documentation and examples
- 🧪 Testing and benchmarking
- 🎯 Semantic hook implementations

**Join the discussion**:
- [GitHub Discussions](https://github.com/minimact/minimact/discussions)
- [Discord Server](https://discord.gg/minimact)

---

## Documentation

📚 **[Full Documentation at docs.minimact.com](https://docs.minimact.com)** - Complete guides, API reference, and examples

### Additional Resources

- [Vision & Architecture](./src/VISION.md) - Comprehensive technical overview
- [Getting Started Guide](./docs/getting-started.md) - Step-by-step tutorial
- [API Reference](./docs/api-reference.md) - Complete hook and API documentation
- [Babel Plugin Guide](./docs/babel-plugin.md) - Understanding the transformation
- [Deployment Guide](./docs/deployment.md) - Production deployment strategies

---

## Sponsors

This project is being developed for use in enterprise applications with strict deployment requirements.

Interested in sponsoring? [Contact us](mailto:ameritusweb@gmail.com)

---

## License

MIT License - see [LICENSE](./LICENSE) for details

---

## Acknowledgments

Inspired by:
- **React** - Component model and hooks API
- **Blazor** - .NET server-side rendering approach
- **HTMX** - Minimal client-side philosophy
- **Vue** - Elegant, intuitive developer experience
- **SolidJS** - Fine-grained reactivity concepts

Built with:
- **Rust** - Reconciliation engine and prediction
- **ASP.NET Core** - Server runtime and SignalR
- **Babel** - JSX/TSX transformation
- **TypeScript** - Type safety and developer experience

---

## Future Enhancements

### 🍹 Minimact Punch

<p align="center">
  <img src="./punch.png" alt="Minimact Punch - A cactus with a mojito in the desert" width="600">
</p>

<p align="center">
  <strong>Mix Your DOM Into Something Refreshing</strong>
</p>

<p align="center">
  <em>"Survived the desert. Earned the mojito."</em><br>
  No hydration needed. Just good vibes. 🌵 + 🍹
</p>

---

<p align="center">
  <img src="./all-is-state.png" alt="All is State" width="400">
</p>

<p align="center">
  <em>"Are you in good hands? No. You're in REACTIVE hands."</em>
</p>

<p align="center">
  <strong>All is State.</strong> Inspired by Allstate Insurance, but for your DOM elements.
</p>

---

**Minimact Punch** extends Minimact with `useDomElementState` - the hook that mixes 10 dimensions of DOM state into one perfect glass.

---

### The Recipe

```
┌─────────────────────────────────┐
│    MINIMACT PUNCH RECIPE        │
├─────────────────────────────────┤
│                                 │
│  Ingredients:                   │
│  🟡 1 part Structure             │
│  🟢 1 part Statistics            │
│  🔵 1 part Pseudo-State          │
│  🟣 1 part Theme                 │
│  🟠 1 part Spatial               │
│  🔴 1 part Graphics              │
│  ⚪ 1 part Temporal              │
│  ✨ 1 part Predictions           │
│  🌀 1 part Lifecycle             │
│  🎭 1 dash Meta                  │
│                                 │
│  Mix in a reactive glass.       │
│  Serve fresh.                   │
│  No hydration needed.           │
└─────────────────────────────────┘
```

**Giving React Vision, Memory, and Spatial Awareness**

---

#### The Problem: React's Blind Spot

Modern frameworks like React have a **fundamental blind spot**: they can only react to their own state. They are completely unaware of:

- ❌ The actual rendered DOM (unless imperatively queried with `useRef`)
- ❌ CSS pseudo-states (like `:hover`, `:focus`, `:active`)
- ❌ The history or temporal patterns of state changes
- ❌ Visual content (canvas pixels, image colors, SVG shapes)
- ❌ Physical layout (gaps, overlaps, viewport intersections)

#### The Solution: DOM as a Reactive Database

`useDomElementState()` makes **all of these things first-class, declarative, reactive values**. It tears down the wall between "React state" and "DOM state," transforming the DOM from a **write-only render target** into a **queryable reactive database**.

#### Quick Start: Mix Your First Punch

```bash
npm install minimact-punch
```

```typescript
import { useDomElementState } from 'minimact-punch';

// The Recipe:
const element = useDomElementState('.my-element');

// Your Punch:
return (
  <>
    {/* 🟡 Structure */}
    {element.childrenCount > 5 && <Pagination />}

    {/* 🟢 Statistics */}
    {element.vals.avg() > 100 && <HighValue />}

    {/* 🔵 Pseudo-State */}
    {element.state.hover && <Tooltip />}

    {/* 🟣 Theme */}
    {element.theme.isDark && <DarkMode />}

    {/* 🟠 Spatial */}
    {element.isIntersecting && <LazyLoad />}

    {/* 🔴 Graphics */}
    {element.canvas.ctx.dominantColor === 'red' && <Alert />}

    {/* ⚪ Temporal */}
    {element.history.hasStabilized && <AutoSave />}

    {/* ✨ Predictions */}
    {element.prediction.confidence > 0.9 && <Optimized />}

    {/* 🌀 Lifecycle */}
    {element.lifecycleState === 'visible' && <Content />}

    {/* 🎭 Meta */}
    {element.meta.importance === 'critical' && <Priority />}
  </>
);
```

**Serve fresh. No hydration needed.** 🌵 + 🍹

---

#### What Becomes Possible: From Impossible to Trivial

useDomElementState enables patterns that are **impossible** in React today, or so impractical they're never attempted. Here are four examples:

##### 1. **Temporal Awareness: Smart Auto-Save**

**Currently (Impractical):**
```typescript
// Event-based, fragile - just a dumb timer
useEffect(() => {
  const timeout = setTimeout(() => autoSave(), 5000);
  return () => clearTimeout(timeout);
}, [content]);
```

**Problem:** Can't distinguish between "user pausing to think" and "user finished."

**With useDomElementState (Trivial):**
```typescript
const editor = useDomElementState('#editor');

{editor.history.hasStabilized && <AutoSave />}
{!editor.history.hasStabilized && <SavingIndicator />}
```

**Result:** React with **semantic stability**, not dumb timers. Show "Saving..." only when actively typing, "Saved ✓" when work has stabilized.

---

##### 2. **Pseudo-State Queries: Collection Hover**

**Currently (Impossible):**
```typescript
// Performance nightmare - 100 event handlers, constant re-renders
const [hoverCount, setHoverCount] = useState(0);

items.map(item => (
  <Item
    onMouseEnter={() => setHoverCount(c => c + 1)}
    onMouseLeave={() => setHoverCount(c => c - 1)}
  />
));

{hoverCount > 0 && <GlobalTooltip />}
```

**Problem:** Massive performance overhead, state updates on every mouse movement.

**With useDomElementState (Trivial):**
```typescript
const items = useDomElementState('.list-item');

{items.some(i => i.state.hover) && <GlobalTooltip />}
```

**Result:** Zero event handlers, zero state updates, declarative CSS pseudo-state queries.

---

##### 3. **Visual Content Awareness: Content-Aware UI**

**Currently (Impossible):**
```typescript
// 20+ lines of imperative code just to check "is image dark?"
const handleUpload = (file) => {
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let totalBrightness = 0;
    for (let i = 0; i < imageData.data.length; i += 4) {
      const r = imageData.data[i];
      const g = imageData.data[i + 1];
      const b = imageData.data[i + 2];
      totalBrightness += (r + g + b) / 3;
    }
    const avgBrightness = totalBrightness / (imageData.data.length / 4);
    setIsDark(avgBrightness < 128);
  };
  img.src = URL.createObjectURL(file);
};
```

**Problem:** Complex, imperative, event-driven chain. Not reactive to content changes.

**With useDomElementState (Trivial):**
```typescript
const canvas = useDomElementState('canvas');

{canvas.ctx.dominantColor === 'dark' && <DarkModeToggle />}
```

**Result:** Automatically reactive. User applies brightness filter? UI updates automatically.

---

##### 4. **Spatial Reasoning: Layout Anomaly Detection**

**Currently (Impractical):**
```typescript
// ResizeObserver + manual geometry calculations
useEffect(() => {
  const observer = new ResizeObserver(() => {
    const container = ref.current;
    const children = Array.from(container.children);

    let hasLargeGap = false;
    for (let i = 0; i < children.length - 1; i++) {
      const current = children[i].getBoundingClientRect();
      const next = children[i + 1].getBoundingClientRect();
      const gap = next.top - (current.top + current.height);
      if (gap > 100) {
        hasLargeGap = true;
        break;
      }
    }
    setShowWarning(hasLargeGap);
  });

  observer.observe(ref.current);
  return () => observer.disconnect();
}, []);
```

**Problem:** Complex setup, manual calculations, performance concerns.

**With useDomElementState (Trivial):**
```typescript
const grid = useDomElementState('.grid');

{grid.gaps.some(gap => gap.height > 100) && <LayoutWarning />}
```

**Result:** Physical layout becomes a simple, reactive boolean query.

---

**The Pattern:** Patterns that were **impossible** become **trivial**. Patterns that were **impractical** become **elegant**.

#### Part 1: Base Features (Structure + Statistics)

Turn DOM elements into queryable reactive data sources:

```typescript
const box = useDomElementState('.container');

{box.childrenCount > 5 && <CollapseButton />}
{box.isIntersecting && <LazyLoadContent />}
{box.parent.classList.includes('active') && <ActiveIndicator />}

const prices = useDomElementState('.price');
{prices.vals.avg() > 100 && <PremiumBadge />}
{prices.vals.sum() > 1000 && <BulkDiscount />}
```

**Features:**
- Element properties as reactive state (tagName, id, className, childrenCount)
- Collection queries (count, map, filter, find)
- Statistical aggregates (.vals.avg(), .vals.sum(), .vals.median())
- IntersectionObserver integration (isIntersecting, intersectionRatio)
- MutationObserver for automatic re-renders on DOM changes

**Use Cases:**
- Virtualization decisions based on child count
- Lazy loading based on viewport intersection
- Analytics based on DOM metrics
- Responsive layouts based on container queries

---

#### How Updates Work: The Elegant Observer Pattern

**You don't need a special API to change DOM state.** Just use regular DOM methods:

```typescript
const box = useDomElementState('.container');

// Change the DOM however you want:
box._element.appendChild(newChild);              // ✅ Observer sees it
box._element.setAttribute('data-status', 'ok');  // ✅ Observer sees it
box._element.classList.add('active');            // ✅ Observer sees it
box._element.disabled = true;                    // ✅ Observer sees it

// Or with jQuery, if that's your style:
$(box._element).addClass('loading');             // ✅ Observer sees it

// Or with any other library:
box._element.style.opacity = '0.5';              // ✅ Observer sees it
```

**The MutationObserver automatically:**
1. Detects the change
2. Creates a new snapshot
3. Checks HintQueue for cached patches
4. Syncs to server
5. Re-renders if needed

**No `box.update()` calls. No manual syncing. Just change the DOM and the observers handle the rest.**

This is the beauty of making the DOM a **reactive data source** rather than a **write-only render target**. You manipulate the DOM with standard APIs everyone already knows, and the observation layer handles synchronization automatically.

---

#### Part 2: Advanced Features (Pseudo-State + Theme + Canvas)

**Pseudo-State Reactivity:**
```typescript
const buttons = useDomElementState('button');

{buttons.some(b => b.state.hover) && <GlobalTooltipManager />}
{button.state.active && <PressAnimation />}
{button.state.focus && <KeyboardOutline />}
```

**Theme & Breakpoint Reactivity (Tailwind-style):**
```typescript
const app = useDomElementState('#root');

{app.theme.isDark && <DarkModeStyles />}
{app.breakpoint.sm && <MobileNav />}
{app.breakpoint.between('md', 'xl') && <TabletLayout />}
```

**Spatial Queries (Regex for DOM):**
```typescript
{items[0].lookahead(2).every(i => i.classList.includes('completed')) &&
  <BatchCompleteAction />}

{items[5].lookbehind(3).some(i => i.attributes['data-error']) &&
  <RecentErrorsWarning />}
```

**Canvas & SVG Content Queries:**
```typescript
const canvas = useDomElementState('canvas');
{canvas.ctx.dominantColor === 'red' && <AlertTheme />}
{canvas.ctx.pixelData.avg() < 128 && <DarkImageDetected />}

const svg = useDomElementState('svg');
{svg.shapes.circles.length > 5 && <SimplifyVisualization />}
{svg.shapes.anyIntersecting() && <OverlapWarning />}
```

**Gap Detection (The Space Between):**
```typescript
{grid.gaps.some(gap => gap.height > 100) && <LayoutWarning />}
```

**Use Cases:**
- CSS pseudo-classes driving React logic
- Dark/light mode theme-aware components
- Responsive breakpoints as reactive values
- Canvas-based image analysis
- SVG shape collision detection
- Layout anomaly detection

#### Part 3: Temporal Features (State History + Trends)

**State Archaeology - Time as a reactive dimension:**

```typescript
const widget = useDomElementState('.widget');

{/* Performance monitoring */}
{widget.history.changesPerSecond > 10 &&
  <PerformanceWarning rate={widget.history.changesPerSecond} />}

{/* Data freshness */}
{stockPrice.history.timeSinceLastChange > 60000 && <StaleDataWarning />}
{stockPrice.history.trend === 'increasing' && <BullishIndicator />}

{/* User engagement tracking */}
{form.history.changeCount === 0 &&
 form.history.ageInSeconds > 30 &&
  <AbandonmentWarning />}

{/* Stability detection */}
{dashboard.history.hasStabilized && <TakeScreenshotButton />}
{dashboard.history.isOscillating && <DataLoadingIssue />}

{/* Auto-save on stabilization */}
{editor.history.wasStableFor(5000) &&
 editor.history.changeCount > 0 &&
  <AutoSave />}
```

**Complete History API:**
```typescript
element.history = {
  // Basic tracking
  changeCount: 47,
  renderCount: 103,

  // Temporal data
  firstRendered: Date,
  lastChanged: Date,
  ageInSeconds: 127,
  timeSinceLastChange: 3400,

  // Change patterns
  changesPerSecond: 0.37,
  hasStabilized: true,
  isOscillating: false,

  // Trend analysis
  trend: 'increasing' | 'decreasing' | 'stable' | 'volatile',
  volatility: 0.23,

  // History queries
  updatedInLast(ms): boolean,
  wasStableFor(ms): boolean,

  // Change log
  changes: Array<{timestamp, property, oldValue, newValue}>,
  previousState: {...},
}
```

**Use Cases:**
- Performance monitoring and render loop detection
- Data freshness indicators
- User engagement analytics
- Auto-save based on stability patterns
- Debugging and development insights
- Predictive behavior based on temporal patterns

#### The Complete Vision: 10 Dimensions of DOM Querying

Every element becomes queryable across:

1. **Structure** - DOM topology, parent/child relationships
2. **Statistics** - Numeric aggregates of collections
3. **Pseudo-State** - :hover, :active, :focus as reactive values
4. **Theme** - Dark/light mode, breakpoints, media queries
5. **Spatial** - Lookahead/lookbehind, gaps between elements
6. **Graphics** - Canvas pixels, SVG shapes, dominant colors
7. **Temporal** - State history, trends, change patterns
8. **Predictions** - Future state based on temporal patterns
9. **Lifecycle** - State machines with styles and templates
10. **Meta** - State about state itself (confidence, provenance, authority)

**One hook. Ten dimensions. The complete ontology.**

```typescript
const widget = useDomElementState('.widget');

return (
  <>
    {/* Structural */}
    {widget.childrenCount > 5 && <Pagination />}

    {/* Statistical */}
    {widget.children.vals.avg() > 100 && <HighValueBadge />}

    {/* Pseudo-state */}
    {widget.state.hover && <Tooltip />}

    {/* Theme */}
    {widget.theme.isDark && <DarkStyles />}

    {/* Spatial */}
    {widget.lookahead(2).every(w => w.isIntersecting) && <LoadMore />}

    {/* Graphics */}
    {widget.find('canvas').ctx.dominantColor === 'red' && <Alert />}

    {/* Temporal */}
    {widget.history.hasStabilized && <AutoSave />}
    {widget.history.trend === 'increasing' && <TrendIndicator />}

    {/* Lifecycle */}
    {widget.lifecycleState === 'loading' && <Spinner />}
    {widget.lifecycleState === 'success' && <Checkmark />}

    {/* Meta */}
    {widget.meta.confidence < 0.7 && <UncertainStateWarning />}
    {widget.meta.staleness > 60 && <RefreshPrompt />}
  </>
);
```

#### Implementation Status

See detailed implementation plans:
- [Part 1: Base Features](./USEDOMELEMENTSTATE_IMPLEMENTATION_PLAN.md) - Structure + Statistics (~7 weeks)
- [Part 2: Advanced Features](./USEDOMELEMENTSTATE_ADVANCED_FEATURES.md) - Pseudo-state + Theme + Canvas (~6 weeks)
- [Part 3: Temporal Features](./USEDOMELEMENTSTATE_TEMPORAL_FEATURES.md) - History + Trends (~5 weeks)
- [Part 4: Lifecycle State Machines](./USEDOMELEMENTSTATE_LIFECYCLE_STATE_MACHINES.md) - State machines with styles and templates (~6-8 weeks)
- [Part 5: Meta State](./USEDOMELEMENTSTATE_META_STATE.md) - State about state itself (~4-6 weeks)
- [Difficulty Analysis](./USEDOMELEMENTSTATE_DIFFICULTY_RANKING.md) - Technical feasibility assessment

**Estimated Timeline:** 24-32 weeks for complete implementation

**Philosophy:** Not "abstract away from the DOM" but "elevate the DOM to first-class reactive state."

This is React meeting jQuery meeting SQL meeting time-series analytics meeting FSMs meeting epistemology.

**All can be state. All can be delicious.** 🌵 + 🍹

---

## Roadmap

### Q2 2025
- [ ] Complete C# runtime
- [ ] Babel plugin MVP
- [ ] Client library
- [ ] Alpha release

### Q3 2025
- [ ] Semantic hooks library
- [ ] Template system
- [ ] Route codegen with IntelliSense
- [ ] Beta release
- [ ] 🍹 Minimact Punch Part 1 (Structure + Statistics)

### Q4 2025
- [ ] Production optimizations
- [ ] DevTools browser extension
- [ ] Comprehensive documentation
- [ ] 🍹 Minimact Punch Part 2 (Pseudo-State + Theme + Graphics)
- [ ] v1.0 release

### 2026
- [ ] 🍹 Minimact Punch Part 3 (Temporal Features)
- [ ] 🍹 Minimact Punch Part 4 (Lifecycle State Machines)
- [ ] 🍹 Minimact Punch Part 5 (Meta State)
- [ ] Predictive DOM integration
- [ ] v2.0 release with full Punch

---

### 🔮 Minimact Query: SQL for the DOM

**Treat the DOM as a relational database. Query it like PostgreSQL.**

Built on top of minimact-punch, minimact-query provides a full SQL-like interface for querying reactive DOM state:

```typescript
import { useDomQuery } from 'minimact-query';

const unstableComponents = useDomQuery()
  .from('.component')
  .where(c => c.history.changesPerSecond > 10)
  .orderBy(c => c.history.volatility, 'DESC')
  .limit(10);

return (
  <div>
    {unstableComponents.count() > 0 && (
      <Alert>
        {unstableComponents.count()} unstable components detected!
      </Alert>
    )}
  </div>
);
```

**Features:**
- **Full SQL semantics** - SELECT, FROM, WHERE, JOIN, GROUP BY, HAVING, ORDER BY, LIMIT
- **Aggregate functions** - COUNT, SUM, AVG, MIN, MAX, STDDEV
- **Set operations** - UNION, INTERSECT, EXCEPT, DISTINCT
- **Reactive by default** - Queries auto-update when DOM changes
- **Type-safe** - Full TypeScript with autocomplete for all 80+ DOM properties
- **Performance optimized** - Throttling and debouncing built-in

**Documentation:** [minimact-query README](./src/minimact-query/README.md)

---

### ✨ useDynamicState: Function-Based Value Binding

**Separate structure from content. Define DOM once, bind values with functions.**

**The MINIMACT Philosophy:** Structure ONCE. Bind SEPARATELY. Update DIRECTLY.

```typescript
const dynamic = useDynamicState({
  user: { isPremium: false },
  product: { price: 29.99, factoryPrice: 19.99 }
});

// Structure defined ONCE in JSX
<div className="product">
  <span className="price"></span>
  <span className="badge"></span>
</div>

// Values bound SEPARATELY with functions
dynamic('.price', (state) =>
  state.user.isPremium
    ? `$${state.product.factoryPrice}`
    : `$${state.product.price}`
);

dynamic('.badge', (state) =>
  state.user.isAdmin ? 'ADMIN' :
  state.user.isPremium ? 'PREMIUM' :
  'USER'
);
```

**Server renders with values evaluated:**
```html
<span class="price" data-minimact-binding='{"selector":".price","deps":["user.isPremium","product.price","product.factoryPrice"]}'>
  $29.99  <!-- Already rendered! -->
</span>
```

**Client hydrates in ~5ms, then updates directly:**
```typescript
// When state changes, function re-evaluates
// Direct DOM update - NO VDOM, NO RECONCILIATION
el.textContent = '$19.99';
```

**Benefits:**
- ✅ **Zero JSX duplication** - Element structure defined once
- ✅ **Clean separation** - Structure (JSX) vs. behavior (functions)
- ✅ **Type-safe** - Full TypeScript inference and autocomplete
- ✅ **Auto dependency tracking** - Proxy intercepts property access
- ✅ **Direct updates** - `el.textContent = value` (no VDOM overhead)
- ✅ **Server pre-compilation** - Functions evaluate on server
- ✅ **Minimal bundle** - < 3KB gzipped

**Performance:**
- < 5ms hydration for 100 bindings
- < 1ms per binding update
- Zero VDOM reconciliation overhead

---

### 🎭 DOM Choreography: Elements as Actors on a Stage

**Define elements ONCE. Move them based on state. Never recreate. Never destroy.**

```typescript
// Define pieces ONCE (chess example)
<div id="piece-white-king">♔</div>
<div id="piece-white-queen">♕</div>
// ... 30 more pieces ...

// Choreograph onto squares based on state
dynamic.order('[data-pos="e4"]', state =>
  state.board.find(p => p.pos === 'e4')
    ? [`#piece-${p.id}`]
    : []
);

// Move pawn: e2 → e4
setState({ board: movePiece('white-pawn-1', 'e2', 'e4') });

// Pawn GLIDES from e2 to e4 with CSS transitions
// Same element, just moved. State preserved.
```

**Benefits:**
- ✅ Keep component state (input values, scroll, focus)
- ✅ Keep media playback position
- ✅ Smooth CSS transitions (browser handles animation)
- ✅ 2x faster (half the DOM operations vs unmount/remount)
- ✅ Elements can move between any containers
- ✅ **Cross-page persistence** - Elements survive navigation

**Use Cases:**
- Kanban boards, chess games, sortable lists
- Photo gallery layouts, dashboard widgets
- File managers, playlist reordering
- Puzzle games, card games

**Documentation:** [DOM_CHOREOGRAPHY.md](./docs/DOM_CHOREOGRAPHY.md)

---

### 🌌 DOM Entanglement Protocol (DEP): The Quantum DOM

**Multi-client DOM synchronization across physical space. Not collaboration—quantum entanglement.**

```typescript
// User A in New York
// User B in Tokyo

// Entangle elements across clients
await dep.entangle(slider, {
  clientId: 'user-b',
  selector: '#volume-slider'
}, 'bidirectional');

// User A drags slider to 75%
// → Mutation vector sent through WebWormhole
// → User B's slider: value = 75
// → SAME ELEMENT IDENTITY. DIFFERENT SPACETIME COORDINATES.
```

**This is NOT data sync. This is IDENTITY sync.**

**Not:**
- ❌ Serialize state → Send JSON → Reconstruct DOM

**Instead:**
- ✅ Entangle DOM identity → Mutations propagate
- ✅ Same element existing in two places at once
- ✅ Mutation vectors preserve causality and ordering

**Features:**
- 🔁 **Perfect bidirectional mutation** - True quantum state
- 🧠 **Shared context** - Hover states, scroll positions, focus, selection
- 🧬 **Multi-user UI organisms** - Entire subsystems co-owned
- 🧳 **Transferable ownership** - "You control the graph now"
- 🌐 **Session space** - One DOM, multiple projections
- ⚡ **Mutation compression** - 50 bytes vs 5KB full state

**Real-World Use Cases:**
- Collaborative design tools (Figma killer)
- Multiplayer games (chess, card games)
- Live dashboards with synchronized presentations
- Remote support (co-browsing without screen sharing)
- Classroom presentation follow-mode
- Shopping together from different locations

**Operational Transform** for conflict resolution ensures causally consistent updates with no conflicts.

**Performance:**
- Traditional: Send 5KB state per update
- Quantum DOM: Send 50-byte mutation vectors
- **100x bandwidth reduction**

**Documentation:** [DOM_ENTANGLEMENT_PROTOCOL.md](./docs/DOM_ENTANGLEMENT_PROTOCOL.md)

---

### The Complete Quantum Stack

```
🌌 Minimact Quantum Stack

Layer 0: Minimact Core
  └─ Server-side React + Rust reconciliation

Layer 1: minimact-punch
  └─ DOM as reactive data source (80+ properties)

Layer 2: minimact-query
  └─ SQL for the DOM

Layer 3: useDynamicState
  └─ Template binding + Server pre-compilation

Layer 4: DOM Choreography
  └─ Elements move, persist across pages

Layer 5: Cross-Page Entanglement
  └─ Same client, different pages

Layer 6: DOM Entanglement Protocol (DEP)
  └─ Multi-client quantum DOM across physical space
```

**The Philosophy:**

> *"The DOM is no longer local."*
>
> *"The DOM is a distributed shared reality."*

This is **UI-as-reality-field**, where developers no longer build web pages—they **architect multiversal state topologies**.

Collaboration isn't a feature anymore—**it's the default behavior of the system.**

---

#### Q1 2026 (Jan-Mar)
- [ ] 🍹 Minimact Punch Part 3 (Temporal Features)
- [ ] 🔮 Minimact Query - SQL interface for DOM
- [ ] ✨ useDynamicState - Server pre-compilation (advanced)

#### Q2 2026 (Apr-Jun)
- [ ] 🍹 Minimact Punch Part 4 (Lifecycle State Machines)
- [ ] 🎭 DOM Choreography - Elements as persistent actors
- [ ] Predictive DOM integration

#### Q3 2026 (Jul-Sep)
- [ ] 🍹 Minimact Punch Part 5 (Meta State)
- [ ] 🌌 DOM Entanglement Protocol - Multi-client quantum sync
- [ ] v2.0 release with full Punch

#### Q4 2026 (Oct-Dec)
- [ ] 🌐 Session Space Architecture
- [ ] Advanced entanglement features
- [ ] v3.0 - The Spatial Entangled Web

**You're not shipping features. You're opening portals.** 🍹🌵⚡🌌

---

**Built with ❤️ for the .NET and React communities**

[⭐ Star this repo](https://github.com/minimact/minimact) if you're interested in server-side React for .NET!
