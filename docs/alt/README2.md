<p align="center">
  <img src="./src/minimact-logo.png" alt="Minimact Logo" width="600">
</p>

<h1 align="center">Minimact</h1>
<h2 align="center">The Posthydrationist Framework</h2>

<p align="center">
  <strong>Server-first React with zero hydration, predictive patches, and Rust-powered performance for ASP.NET Core.</strong>
</p>

<p align="center">
  <em>The cactus doesn't hydrate — it stores.</em> 🌵
</p>

<p align="center">
  <a href="https://docs.minimact.com"><img src="https://img.shields.io/badge/docs-minimact.com-blue.svg" alt="Documentation"></a>
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License: MIT"></a>
  <a href="https://www.rust-lang.org/"><img src="https://img.shields.io/badge/rust-%23000000.svg?style=flat&logo=rust&logoColor=white" alt="Rust"></a>
  <a href="https://dotnet.microsoft.com/"><img src="https://img.shields.io/badge/.NET-512BD4?style=flat&logo=dotnet&logoColor=white" alt=".NET"></a>
</p>

---

## 📚 Quick Nav

🚀 [Quick Start](#quick-start) •
💡 [Why Minimact?](#why-minimact) •
🧠 [Core Innovations](#core-innovations) •
🌳 [Lifted State](#-lifted-state-components) •
🔐 [Protected State](#-useprotectedstate) •
🎨 [Swig IDE](#-minimact-swig---desktop-ide-for-minimact) •
🏗️ [Architecture](#architecture-overview) •
📊 [Comparison](#comparison) •
🧪 [Examples](#examples)

---

## What is Minimact?

**Write React. Render on the server. Update instantly with predictive patches.**

```typescript
import { useState } from '@minimact/core';

export function Counter() {
    const [count, setCount] = useState(0);

    return (
        <button onClick={() => setCount(count + 1)}>
            Count: {count}
        </button>
    );
}
```

**That's it.** Write familiar React code, get server-rendered HTML with 2-3ms perceived latency.

> **The cactus doesn't hydrate — it stores.** 🌵

## How It Works (in 5 seconds)

```
User clicks →
[Browser checks prediction cache] →
✅ Patch found →
⏱️ 2ms DOM update →
🚀 Server verified in background
```

**No hydration. No diffing. Just pure speed.**

---

## Why Minimact?

### For React Developers
**Finally, a path to .NET without learning Razor.** Keep writing React — get ASP.NET Core's power, security, and enterprise features.

**Bundle size:** 12.01 KB vs React's 45 KB (71% smaller!)

### For .NET Teams
**Modern frontend DX without abandoning your stack.** Your team already knows C# and EF Core. Now they can build UIs with React syntax.

**Performance:** 2-3ms interactions vs 47ms traditional SSR

### For CTOs
**Solve the "React DX + .NET backend" problem.** One stack, one deployment, full type safety from database to DOM. Rust-powered performance makes ASP.NET Core shine.

**Comparison:**
- React 18: 45 KB gzipped
- Vue 3: 34 KB gzipped
- **Minimact: 12.01 KB gzipped** (71% smaller than React)

### Better Than Blazor
Blazor requires learning Razor syntax. Minimact uses React — the syntax millions of developers already know. Lower barrier, faster adoption, bigger talent pool.

### SSR vs CSR vs Minimact

| Feature | React (CSR) | Next.js (SSR) | Minimact (Prediction) |
|---------|-------------|---------------|----------------------|
| **First Paint** | ⚠️ Depends on JS | ✅ Fast | ✅ Fast |
| **Interactivity** | ✅ JS required | ⚠️ Re-hydration | ✅ Instant (2-3ms) |
| **State Sync** | 🔄 Manual | 🔄 Manual | ✅ Auto |
| **Bundle Size** | ~45 KB | ~45 KB | **12.01 KB** |
| **Server Logic** | ❌ None | ⚠️ API routes | ✅ Native C# |
| **Offline Friendly** | ✅ Yes | ⚠️ Partial | ⚠️ Prediction-only |

### Key Benefits
- ⚡ **2-3ms interactions** - Predictive patches cached before user clicks
- 📦 **12.01 KB bundle** - 71% smaller than React
- 🏗️ **Familiar syntax** - Write JSX/TSX with React hooks
- 🔐 **Secure by default** - Business logic stays on server
- 🚀 **15× faster** than traditional SSR on 3G networks

---

## Quick Start

```bash
# Clone and run Swig - the official Minimact IDE
git clone https://github.com/minimact/swig
cd swig
npm install
npm start
```

### Create Your First App

Once Swig launches:

1. **Create Project** - Click "New Project" and choose a directory
2. **Edit Components** - Write TSX in Monaco editor (auto-transpiles to C#)
3. **Build** - Click "Build" to compile your app
4. **Run** - Click "Run" and open in browser

That's it! From zero to running app in under 2 minutes.

**Two runtime versions available:**
- `@minimact/core` — 12.01 KB gzipped (WebSocket-based, modern browsers)
- `@minimact/core/r` — 25.03 KB gzipped (Full SignalR with fallbacks)

**📦 Real-world examples:**
- [✅ TodoMVC](./examples/todo) - Classic todo app
- [📊 Dashboard](./examples/dashboard) - Admin dashboard with templates
- [📝 Blog](./examples/blog) - Markdown blog with EF Core
- [📋 Forms](./examples/forms) - Validation and semantic hooks

**[📚 Full Getting Started Guide →](./docs/getting-started.md)**

---

## Why You'll Love Minimact

🧠 **React syntax, C# backend** — No Razor needed
⚡ **Instant interactions** — <3ms click-to-DOM
🌵 **No hydration** — Predictive updates instead
🛠️ **Desktop IDE** with live state + TSX editing
🧬 **Full state tree visibility** — Perfect prediction
🔐 **Secure by default** — Logic runs server-side
📦 **71% smaller** than React (12.01 KB vs 45 KB)
🔌 **Plugin system** via NuGet packages

---

## Core Innovations

### 🎯 Template Prediction System
Pre-computed parameterized patches for 100% state coverage:

```typescript
// First interaction: Extracts template "Count: {0}"
// All future clicks: Instant update with any value
<span>Count: {count}</span>
```

**Benefits:**
- ✅ 100% coverage from first render (zero cold start)
- ✅ 98% memory reduction vs cached predictions
- ✅ Babel extracts templates at build time
- ✅ Works with loops, conditionals, expressions

**[📐 Template System Details →](./docs/TEMPLATE_PATCH_SYSTEM.md)**

---

### 🌳 Lifted State Components
All child state automatically lives in parent. Zero prop drilling:

```
Dashboard
└── UserProfile (Component)
    ├── isEditing (lifted ✅ visible)
    ├── username (lifted ✅ visible)
    └── cache (lifted 🔒 protected)

Access: state["UserProfile.isEditing"]
```

```typescript
// Parent sees ALL child state
function Dashboard() {
  const isEditing = state["UserProfile.isEditing"];  // Just read it!

  return (
    <Component name="UserProfile" state={{ isEditing: false }}>
      <UserProfile />
    </Component>
  );
}

// Child accesses seamlessly
function UserProfile() {
  const isEditing = state.isEditing;  // Auto-prefixed
  setState('isEditing', true);         // Updates parent!
}
```

**Benefits:**
- ✅ Zero prop drilling, no callbacks
- ✅ Parent can observe/control any child state
- ✅ Perfect prediction (full state tree visible)
- ✅ Hot reload preserves state

**[🌳 Lifted State Guide →](./docs/LIFTED_STATE_COMPONENT_SYSTEM.md)**

---

### 🔒 useProtectedState
Lifted state with access control:

```typescript
function Counter() {
  const [count, setCount] = useState(0);                     // Public
  const [animationQueue, setQueue] = useProtectedState([]);  // Protected
}

// Parent can't touch protected state!
const queue = state["Counter.animationQueue"];  // ❌ Runtime error
```

**[🔒 Protected State Details →](./docs/USE_PROTECTED_STATE.md)**

---

### 🎨 Minimact Swig IDE
Desktop development environment with real-time component inspection:

<p align="center">
  <img src="./docs/assets/swig-screenshot.png" alt="Minimact Swig IDE" width="800">
</p>

**Features:**
- Monaco editor with full TSX support
- Auto-transpilation watch mode
- Live component state inspector
- Visual prediction analytics
- Integrated terminal and file tree

**Quick Start:**
```bash
git clone https://github.com/minimact/swig
cd swig
npm install
npm start
```

**What Makes Swig Special:**
- **Hot reload preserves state** - State lives in parent, survives reloads
- **Real-time component inspector** - See state changes as they happen via SignalR
- **Visual prediction analytics** - Green/red cache hit overlay shows prediction accuracy
- **Performance dashboard** - Hit rate, latencies, and metrics in real-time
- **Zero configuration** - From clone to running app in 2 minutes

**[🎨 Swig IDE Guide →](./docs/MINIMACT_SWIG_ELECTRON_PLAN.md)**

---

### 🍹 Minimact Punch
DOM as a reactive data source - 80+ properties as state:

```typescript
const box = useDomElementState('.container');

{box.childrenCount > 5 && <CollapseButton />}
{box.isIntersecting && <LazyLoad />}
{box.vals.avg() > 100 && <PremiumBadge />}
```

**[🍹 Minimact Punch Details →](./docs/USEDOMELEMENTSTATE_IMPLEMENTATION_PLAN.md)**

---

## Official Extensions

**The Minimact Quantum Stack** - Transform the DOM into a queryable, reactive, distributed database.

| Extension | Description | Key Feature |
|-----------|-------------|-------------|
| **🥊 minimact-punch** | DOM as reactive data source (80+ properties) | `useDomElementState('.card')` |
| **🗃️ minimact-query** | SQL for the DOM with full query syntax | `.from('.card').where().orderBy()` |
| **🌌 minimact-quantum** | Multi-client DOM identity sync (7-17ms) | Mutation vectors, not data sync |
| **🎯 minimact-bundle** | Declarative control without wrappers | Apply styles/classes to any selector |
| **📐 minimact-spatial** | Viewport regions as 2D database | Query spatial areas reactively |
| **🌳 minimact-trees** | Universal decision trees (0-1ms predicted) | XState but declarative & minimal |

**Philosophy:** *"The DOM is no longer a view layer - it's a queryable, reactive, distributed database."*

**[🌌 Explore Extensions →](./extensions)**

---

## Advanced Features

### 🔌 Plugin System - Extend via NuGet
**Distribute reusable UI components as NuGet packages. Auto-discovered. Type-safe. Zero config.**

```bash
# Install plugin
dotnet add package Minimact.Plugin.Clock

# Use in TSX
<Plugin name="Clock" state={{ hours: 14, theme: 'dark' }} />
```

**Benefits:**
- ✅ Auto-discovery via `[MinimactPlugin]` attribute
- ✅ Type-safe state contracts (JSON Schema validation)
- ✅ Versioned assets with cache optimization
- ✅ Works with template prediction system
- ✅ Server-rendered, no client JavaScript required

**[🔌 Plugin System Guide →](./docs/PLUGIN_SYSTEM_PHASE2_COMPLETE.md)**

### More Advanced Features

| Feature | Description | Learn More |
|---------|-------------|------------|
| **useServerTask** | TypeScript → C#/Rust transpilation for async tasks | [📄 Docs](./docs/server-tasks.md) |
| **useContext** | Redis-like server-side cache (session/request/url scoped) | [📄 Docs](./docs/use-context.md) |
| **useComputed** | Client-side computation with server rendering | [📄 Docs](./docs/use-computed.md) |
| **MVC Bridge** | Integrate with traditional ASP.NET MVC | [🎯 MVC Bridge](./docs/MVC_BRIDGE_IMPLEMENTATION_PLAN.md) |
| **Semantic Hooks** | High-level abstractions (useModal, useDropdown, etc.) | [🎯 Hooks API](./docs/api-reference.md) |

---

## Architecture Overview

```
┌─────────────────────────────────────────┐
│  Developer writes TSX with React hooks  │
│  ↓                                       │
│  Babel: TSX → C# + Extract templates    │
│  ↓                                       │
│  ASP.NET Core renders HTML               │
│  ↓                                       │
│  Rust: Predicts patches, sends to client│
│  ↓                                       │
│  [Client has patches cached]            │
│  ↓                                       │
│  User clicks → 0ms (cache hit!)         │
│  ↓                                       │
│  Server verifies in background          │
└─────────────────────────────────────────┘
```

**7 Main Components:**
1. **Babel Plugin** - TSX → C# transformation
2. **C# Runtime** - ASP.NET Core integration
3. **Rust Engine** - High-performance reconciliation
4. **Client Library** - 12.01 KB runtime
5. **Lifted State** - Automatic state architecture
6. **Minimact Punch** - DOM state extensions
7. **Minimact Swig** - Desktop IDE

### Technical Innovations

**SignalM - Minimal WebSocket Protocol**
- Custom lightweight protocol (vs full SignalR)
- **12.01 KB** runtime with SignalM
- **25.03 KB** runtime with full SignalR (fallbacks for older browsers)
- Real-time bidirectional communication
- Optimized for patch delivery

**Hex Paths - Stable Element Identifiers**
- Hexadecimal gap-based allocation (0x10000000, 0x20000000, 0x30000000...)
- Example: "10000000.30000000.20000000" (stable IDs, not DOM indices)
- Elements keep stable IDs across insertions/deletions
- Enables precise DOM targeting without re-indexing
- PathConverter translates hex paths → DOM indices (accounts for VNull)

**VNull Nodes - Explicit Conditionals**
- Represents `{condition && <Component />}` explicitly in VNode tree
- Rust reconciler understands conditional rendering
- Patches target exact positions, not shifting indices
- Eliminates "DOM shift" bugs from traditional reconcilers

**[📖 Complete Architecture →](./docs/MINIMACT_COMPLETE_ARCHITECTURE.md)**

---

## Core Technical Innovations

### Hex Paths - Stable Element Identity
Every element gets a persistent hex path ID (e.g., `1.2.F.3`). Unlike DOM indices that shift when elements are added/removed, hex paths use **gap-based allocation** to maintain stability.

**Why it matters:**
- Patches target exact elements, even as DOM changes
- Hot reload works perfectly (paths don't shift)
- Prediction system can reference elements precisely

### VNull Nodes - Explicit Conditional Rendering
Minimact represents `{condition && <Component />}` with explicit `VNull` nodes instead of omitting them from the tree.

**Why it matters:**
- PathConverter can accurately map hex paths → DOM indices
- Accounts for conditionally rendered elements
- Makes reconciliation deterministic and predictable

**[🔧 Technical Deep Dive →](./docs/HEX_PATH_SYSTEM.md)**

---

## Runtime Comparison: SignalM vs SignalR

Minimact offers two runtime versions optimized for different scenarios:

| Feature | `@minimact/core` (SignalM) | `@minimact/core/r` (SignalR) |
|---------|---------------------------|------------------------------|
| **Size** | 12.01 KB gzipped | 25.03 KB gzipped |
| **Protocol** | Custom WebSocket | Full SignalR with fallbacks |
| **Use Case** | Modern browsers, micro-patches | IE11+, corporate networks |
| **Fallbacks** | None | Long polling, SSE, forever frame |
| **Latency** | ~2ms | ~3-5ms |

**SignalM** is a custom WebSocket protocol optimized specifically for Minimact's patch delivery system. It's 47% smaller than SignalR and designed for predictive micro-patch streaming.

**When to use SignalM:**
- Modern browser support (Chrome 90+, Firefox 88+, Safari 14+)
- Public-facing apps with controlled environments
- Maximum performance is critical

**When to use SignalR:**
- Enterprise environments with older browsers
- Corporate networks with WebSocket restrictions
- Need guaranteed compatibility

---

## Performance

| Metric | Value |
|--------|-------|
| **Initial Load** | 12.01 KB (71% smaller than React) |
| **Time to Interactive** | < 100ms |
| **Interaction Latency** | ~2-5ms (with prediction) |
| **Cache Hit Rate** | 95-98% (after warmup) |
| **Memory vs Caching** | 98% reduction (templates vs concrete patches) |

**[📊 Benchmarks →](./docs/benchmarks.md)**

---

## Comparison

| Feature | Minimact | Next.js | Blazor Server | HTMX |
|---------|----------|---------|---------------|------|
| **Bundle Size** | **12.01 KB** | ~45 KB | ~300 KB | ~14 KB |
| **Syntax** | React JSX | React JSX | Razor C# | HTML attrs |
| **Hydration** | None | Required | None | None |
| **Update Model** | **Predictive (client)** | Reactive (client) | Reactive (server) | **Triggered (server)** |
| **Prediction** | ✅ Rust | ❌ | ❌ | ❌ |
| **Hybrid State** | ✅ | ❌ | ❌ | Manual |
| **Type Safety** | ✅ TS→C# | ✅ TS | ✅ C# | ❌ |
| **Client Interactivity** | ✅ Full | ✅ Full | ✅ Full | ❌ Server-only |

### Why Minimact > HTMX

**HTMX is server-triggered** (user clicks → server responds → HTML swaps)
**Minimact is predictively client-updated** (patches pre-cached → instant apply)

**Key differences:**
- ✅ **No flicker** - Patches already cached, apply instantly
- ✅ **No hydration** - But full client interactivity (unlike HTMX)
- ✅ **Optimistic updates** - UI responds before server confirms
- ✅ **95-98% instant** - Most interactions hit cache, no network wait
- ✅ **React DX** - Familiar hooks and component model

**HTMX use case:** Simple server-driven apps, minimal JS
**Minimact use case:** Complex UIs with instant feedback and React DX

---

## Project Status

**Current Phase:** Production-Ready Core + Advanced Features ✅

### Recently Completed (2025)
- ✅ Template Prediction System (Phases 1-9)
- ✅ Lifted State Component System
- ✅ useProtectedState Hook
- ✅ Minimact Swig IDE
- ✅ Minimact Punch (Base Features)
- ✅ State Synchronization (client → server)

### In Progress
- 🚧 Minimact Punch Advanced Features (Parts 2-5)
- 🚧 Semantic Hooks Library

**[📋 Full Status & Roadmap →](./docs/roadmap.md)**

---

## Examples

- **[Todo App](./examples/todo)** - Classic TodoMVC
- **[Blog](./examples/blog)** - Markdown blog with EF Core
- **[Dashboard](./examples/dashboard)** - Admin dashboard with templates
- **[Forms](./examples/forms)** - Validation and semantic hooks

---

## Documentation

📚 **[docs.minimact.com](https://docs.minimact.com)** - Complete guides and API reference

### Quick Links
- [Getting Started](./docs/getting-started.md)
- [Architecture Overview](./docs/MINIMACT_COMPLETE_ARCHITECTURE.md)
- [API Reference](./docs/api-reference.md)
- [Babel Plugin Guide](./docs/babel-plugin.md)
- [Deployment Guide](./docs/deployment.md)

---

## Why the Name Minimact?

**Minimact** stands for **MINIMal Anticipatory Client Technology**.

- **Minimal** — Tiny 12.01 KB runtime, minimal client logic
- **Anticipatory** — Predictive patches pre-sent before user interaction
- **Client Technology** — Smart client that applies cached patches instantly

And yes — the cactus 🌵 doesn't hydrate. It stores.

---

## Contributing

We welcome contributions! See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

**Join the discussion:**
- [GitHub Discussions](https://github.com/minimact/minimact/discussions)
- [Discord Server](https://discord.gg/minimact)

---

## License

MIT License - see [LICENSE](./LICENSE) for details

---

## Acknowledgments

Inspired by **React**, **Blazor**, **HTMX**, **Vue**, and **SolidJS**.

Built with **Rust**, **ASP.NET Core**, **Babel**, and **TypeScript**.

---

<p align="center">
  <strong>Built with ❤️ for the .NET and React communities</strong>
</p>

<p align="center">
  <a href="https://github.com/minimact/minimact">⭐ Star this repo</a> if you're interested in server-side React for .NET!
</p>
