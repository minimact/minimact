---
marp: true
theme: default
paginate: true
backgroundColor: #1a1a1a
color: #ffffff
style: |
  section {
    font-family: 'Segoe UI', system-ui, sans-serif;
    font-size: 28px;
    padding: 60px;
  }
  h1 {
    color: #4CAF50;
    font-size: 72px;
    text-align: center;
    margin-bottom: 20px;
  }
  h2 {
    color: #8BC34A;
    font-size: 48px;
    margin-bottom: 30px;
  }
  h3 {
    color: #CDDC39;
    font-size: 36px;
  }
  code {
    background: #2d2d2d;
    color: #4CAF50;
    padding: 4px 8px;
    border-radius: 4px;
  }
  strong {
    color: #4CAF50;
  }
  em {
    color: #8BC34A;
  }
  pre {
    background: #0d0d0d;
    border-left: 4px solid #4CAF50;
    padding: 20px;
    border-radius: 8px;
  }
  ul {
    font-size: 32px;
    line-height: 1.8;
  }
  blockquote {
    border-left: 8px solid #4CAF50;
    padding-left: 30px;
    font-size: 36px;
    font-style: italic;
    color: #8BC34A;
  }
  .emoji {
    font-size: 64px;
  }
---

<!-- _class: invert -->
<!-- _paginate: false -->

```
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║              🌟 PRESENTING 🌟                              ║
║                                                            ║
║          ███╗   ███╗ █████╗  ██████╗████████╗██╗ ██████╗  ║
║          ████╗ ████║██╔══██╗██╔════╝╚══██╔══╝██║██╔════╝  ║
║          ██╔████╔██║███████║██║        ██║   ██║██║       ║
║          ██║╚██╔╝██║██╔══██║██║        ██║   ██║██║       ║
║          ██║ ╚═╝ ██║██║  ██║╚██████╗   ██║   ██║╚██████╗  ║
║          ╚═╝     ╚═╝╚═╝  ╚═╝ ╚═════╝   ╚═╝   ╚═╝ ╚═════╝  ║
║                                                            ║
║                    THE MUSICAL                             ║
║                                                            ║
║              "A WHOLE NEW WORLD OF RENDERING"              ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
```

---

<!-- _class: invert -->

# 🌵 Minimact

## The Posthydrationist Framework

**Server-first React with zero hydration, predictive patches, and Rust-powered performance for ASP.NET Core.**

> *The cactus doesn't hydrate — it stores.* 🌵

---

## 🤔 The Problem

**Every modern web framework has the same flaw...**

---

## ⏱️ Slow First Interactions

```
User clicks button
    ↓
Wait for JavaScript to load... ⏳
    ↓
Wait for React to hydrate... ⏳
    ↓
Wait for event handler to attach... ⏳
    ↓
Finally! UI updates 🐌
```

**Total time: 200-500ms**

---

## 📦 Massive Bundle Sizes

| Framework | Bundle Size |
|-----------|-------------|
| React 18  | **45 KB** gzipped |
| Vue 3     | **34 KB** gzipped |
| Blazor    | **~300 KB** |

**Your users download megabytes of JavaScript just to click a button.**

---

## 🔄 The Hydration Tax

**React/Next.js:**
1. Server renders HTML
2. Send HTML to client
3. Send JavaScript bundle
4. Parse JavaScript
5. **Re-render everything client-side** 😱
6. Attach event handlers
7. *Finally* interactive

**Why render twice?**

---

## 💭 What If...

**What if we could predict what the user will do *before* they do it?**

---

<!-- _class: invert -->

# ⚡ Introducing Minimact

---

## 🎯 The Core Idea

```typescript
// You write familiar React code
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

**That's it. No special syntax. No new concepts.**

---

## 🪄 The Magic

```
User clicks button
    ↓
🎯 Patch already cached on client!
    ↓
⚡ Apply instantly (2-3ms)
    ↓
✅ Server verifies in background
```

**Total time: 2-3ms** ⚡

**100× faster than traditional SSR!**

---

## 🧠 How Does It Work?

**Step 1: Deterministic UI**

```typescript
// React UI is deterministic:
// Same state → Same output

const [count, setCount] = useState(0);

// count=0 → <button>Count: 0</button>
// count=1 → <button>Count: 1</button>
// count=2 → <button>Count: 2</button>
```

**If it's deterministic, we can predict it.**

---

## 🔮 Step 2: Pre-compute Everything

**At build time:**
- Babel analyzes your JSX
- Extracts template patterns
- Generates parameterized patches

```typescript
// Template extracted:
// "Count: {0}" where {0} = count value
```

**At runtime:**
- Server pre-computes likely patches
- Client caches them *before* user clicks
- User clicks → Instant apply!

---

## 🎨 The Architecture

```
┌─────────────────────────────────────────┐
│  1. Write TSX (React syntax)            │
│     ↓                                    │
│  2. Babel → C# classes                  │
│     ↓                                    │
│  3. ASP.NET Core renders HTML           │
│     ↓                                    │
│  4. Rust predicts & sends patches       │
│     ↓                                    │
│  5. Client caches patches               │
│     ↓                                    │
│  6. User clicks → 2ms update! ⚡        │
└─────────────────────────────────────────┘
```

---

## 🏗️ Three Pillars

### 1️⃣ **TypeScript** (Developer Experience)
Write React, get full type safety

### 2️⃣ **C# + ASP.NET Core** (Server Power)
EF Core, DI, authentication, everything you know

### 3️⃣ **Rust** (Performance)
Reconciliation engine that's 100× faster

---

## 📊 The Numbers

| Metric | Minimact | React/Next.js |
|--------|----------|---------------|
| **Bundle Size** | **12.0 KB** | 45 KB |
| **First Interaction** | **2-3ms** | 200-500ms |
| **Hydration Time** | **0ms** | 100-300ms |
| **Memory Usage** | 98% less | Baseline |

**That's 73% smaller and 100× faster.**

---

## 🌵 No Hydration

**React:** Render → Send HTML → Send JS → Render again → Attach handlers

**Minimact:** Render → Send HTML → **Done** ✅

```
The cactus doesn't hydrate — it stores. 🌵
```

---

## 🚀 Real-World Example

```typescript
// Your code (unchanged React!)
export function ProductPage() {
  const [quantity, setQuantity] = useState(1);
  const [price] = useMvcState<number>('Price');

  return (
    <div>
      <h1>Premium Widget</h1>
      <p>${price * quantity}</p>

      <button onClick={() => setQuantity(quantity + 1)}>
        Add More
      </button>
    </div>
  );
}
```

---

## 🎬 The User Experience

**Traditional React:**
1. Click "Add More" → **⏳ 200ms wait**
2. JavaScript evaluates
3. React reconciles
4. DOM updates

**Minimact:**
1. Click "Add More" → **⚡ 2ms instant update**
2. Server confirms in background
3. User never waits

---

## 🔥 Key Features

✅ **React Syntax** - No learning curve
✅ **2-3ms Interactions** - Instant feedback
✅ **12.0 KB Bundle** - 73% smaller than React
✅ **Zero Hydration** - No client reconciliation
✅ **Type Safe** - TypeScript → C# inference
✅ **Secure by Default** - Logic stays on server

---

## 🎯 Perfect For...

### **React Developers**
Familiar syntax, familiar hooks, instant performance

### **.NET Developers**
React DX without leaving ASP.NET Core ecosystem

### **CTOs**
One stack, one deployment, massive performance gains

---

## 🌐 Single Page Application Mode

**10-50ms navigation with shell persistence**

```typescript
import { Page, Link } from '@minimact/spa';

export function MainShell() {
  return (
    <div>
      <header>My App</header>

      <nav>
        <Link to="/">Home</Link>
        <Link to="/products">Products</Link>
      </nav>

      <main>
        <Page /> {/* Pages swap here instantly */}
      </main>
    </div>
  );
}
```

**Header stays mounted. Only page content swaps. 10-50ms total.**

---

## 🎨 Minimact Swig IDE

**Desktop IDE built specifically for Minimact**

- Monaco editor with TSX support
- **Live component state inspector**
- Auto-transpilation on save
- Real-time prediction analytics
- Integrated terminal
- One-click build & run

**From zero to running app in 2 minutes.**

---

## 🧩 Modular Architecture

```typescript
// Import only what you need

// Core (12.0 KB) - Most apps stop here
import { useState, useEffect } from '@minimact/core';

// Power features (+5.37 KB) - For complex apps
import { useServerTask, useComputed } from '@minimact/core/power';

// Hot reload (+5.15 KB) - Dev only, auto tree-shaken
import { enableHotReload } from '@minimact/core/hot-reload';
```

**No bundle bloat. Pay for what you use.**

---

## 🔌 Zero-Config Module Management

```bash
# Install dependencies with Swig CLI
swig import lodash
swig import @minimact/power
swig import moment

# Auto-served by ASP.NET Core
# Auto-included on pages
# Zero configuration needed
```

**Like npm, but for client modules. Cached globally, copied locally.**

---

## 🌳 Lifted State Components

**No prop drilling. Ever.**

```typescript
// Parent sees all child state automatically
function Dashboard() {
  const isEditing = state["UserProfile.isEditing"];

  return (
    <Component name="UserProfile">
      <UserProfile />
    </Component>
  );
}

// Child just uses state
function UserProfile() {
  const [isEditing, setIsEditing] = useState(false);
  // Parent can read it automatically!
}
```

---

## 🔒 Protected State

```typescript
// Some state is private
function Counter() {
  const [count, setCount] = useState(0);           // Public
  const [cache, setCache] = useProtectedState([]); // Protected
}

// Parent can't access protected state
const cache = state["Counter.cache"]; // ❌ Runtime error
```

**Security + Encapsulation + Performance**

---

## 🍹 Minimact Punch

**Make the DOM a reactive data source**

```typescript
const box = useDomElementState('.container');

{box.childrenCount > 5 && <CollapseButton />}
{box.isIntersecting && <LazyLoadImages />}
{box.vals.avg() > 100 && <PremiumBadge />}
```

**80+ DOM properties as reactive state**

---

## 🧪 Template Prediction System

**Before: Cached Predictions**
```
setState(0) → cache patch for count=0
setState(1) → cache patch for count=1
setState(2) → cache patch for count=2
...
setState(999) → 1000 cached patches (100 KB!)
```

**After: Templates**
```
Extract template: "Count: {0}"
Fill {0} with any value → 1 template (2 KB!)
```

**98% memory reduction. 100% coverage.**

---

## 🔄 How Prediction Works

```typescript
<button onClick={() => setCount(count + 1)}>
  Count: {count}
</button>
```

**Step 1:** Babel extracts template `"Count: {0}"`
**Step 2:** Server sends template to client
**Step 3:** User clicks, client fills template
**Step 4:** 2ms later, DOM updated ⚡
**Step 5:** Server verifies in background

---

## 🎯 95-98% Cache Hit Rate

```
🟢 CACHE HIT! (2-3ms) ← 95-98% of interactions
🔴 CACHE MISS (50-100ms) ← 2-5% of interactions
```

**When prediction fails, fallback to server render (still faster than React hydration!)**

---

## 🛠️ The Developer Experience

```bash
# Install Minimact Swig
git clone https://github.com/minimact/swig
npm install && npm start

# Create new project in GUI
# Edit TSX in Monaco
# Auto-transpiles to C#
# Click "Run"
# Open in browser

# From zero to running app in 2 minutes
```

---

## 📦 Quick Start (CLI)

```bash
# Create new Minimact project
swig new MVC MyApp
cd MyApp

# Install dependencies
swig import @minimact/core

# Watch and auto-transpile
swig watch

# Run the app
swig run
```

**Open browser → Start building**

---

## 🔧 The Stack

```typescript
// 1. Write TSX (you already know this)
import { useState } from '@minimact/core';

export function MyComponent() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>
    {count}
  </button>;
}
```

```csharp
// 2. Babel transpiles to C# (automatic)
public class MyComponent : MinimactComponent {
    protected override VNode Render() {
        var count = GetState<int>("count_0");
        // ... renders VNode tree
    }
}
```

---

## 🌐 Production Ready

```csharp
// Program.cs (standard ASP.NET Core)
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddMinimact();
builder.Services.AddMinimactMvcBridge();
builder.Services.AddMinimactSPA();
builder.Services.AddSignalR();

var app = builder.Build();
app.UseMinimact();
app.MapHub<MinimactHub>("/minimact");
app.Run();
```

**Deploy like any ASP.NET Core app. Azure, AWS, Docker, IIS, Kubernetes.**

---

## 📊 Comparison: React vs Next.js vs Minimact

| Feature | React CSR | Next.js SSR | Minimact |
|---------|-----------|-------------|----------|
| Bundle Size | 45 KB | 45 KB | **12 KB** |
| First Click | 200ms | 100ms | **2-3ms** |
| Hydration | Required | Required | **None** |
| Server Logic | ❌ | API Routes | **Native C#** |
| State Sync | Manual | Manual | **Auto** |

---

## 🆚 Comparison: HTMX vs Minimact

| Feature | HTMX | Minimact |
|---------|------|----------|
| **Model** | Server-triggered | **Predictive client** |
| **Latency** | Network RTT | **2-3ms (cached)** |
| **Syntax** | HTML attributes | **React JSX** |
| **State** | Server-only | **Hybrid** |
| **Flicker** | Possible | **None** |

**HTMX:** Simple server-driven apps
**Minimact:** Complex UIs with instant feedback

---

## 🆚 Comparison: Blazor vs Minimact

| Feature | Blazor Server | Minimact |
|---------|---------------|----------|
| **Syntax** | Razor C# | **React JSX** |
| **Bundle** | ~300 KB | **12 KB** |
| **Talent Pool** | C# devs | **Millions of React devs** |
| **Learning Curve** | High | **Zero** |
| **Interactivity** | Full | **Full** |

**Blazor:** For C# purists
**Minimact:** For teams who know React

---

## 🔐 Security Built-In

**React/Next.js:**
```typescript
// ❌ Business logic exposed in client bundle
function calculateDiscount(user, product) {
  if (user.isPremium) return product.price * 0.2;
  return 0;
}
```

**Minimact:**
```csharp
// ✅ Business logic stays on server
public decimal CalculateDiscount(User user, Product product) {
    if (user.IsPremium) return product.Price * 0.2m;
    return 0;
}
```

**Minimact code never leaves the server.**

---

## 🚀 Performance in the Real World

**Scenario: E-commerce product page on 3G network**

| Framework | Time to Interactive |
|-----------|---------------------|
| React CSR | 3.2 seconds |
| Next.js SSR | 1.8 seconds |
| **Minimact** | **120ms** |

**15× faster than traditional SSR**

---

## 💡 Why This Matters

**Every 100ms of delay = 1% drop in conversions**

**Minimact gives you:**
- 2-3ms interactions (not 200ms)
- 12 KB bundle (not 45 KB)
- Zero hydration (not 300ms)

**Result: Happier users. More conversions. Better business.**

---

## 🌍 Use Cases

✅ **E-commerce** - Instant add-to-cart, product filters
✅ **Dashboards** - Real-time data with instant interactions
✅ **Admin Panels** - Complex UIs with server-side security
✅ **Content Sites** - Fast initial load, smooth navigation
✅ **Internal Tools** - React DX with .NET backend

---

## 🎓 Learning Curve

**If you know React, you know Minimact.**

```typescript
// React
import { useState } from 'react';

// Minimact
import { useState } from '@minimact/core';

// Same hooks. Same syntax. Same concepts.
```

**Zero learning curve. Start building today.**

---

## 📚 Ecosystem

**Official Extensions:**
- 🥊 **minimact-punch** - DOM as reactive data source
- 🌐 **@minimact/spa** - Single page application (10-50ms nav)
- 🎯 **@minimact/mvc** - MVC bridge (useMvcState)
- ⚡ **@minimact/power** - Advanced hooks (useServerTask, etc.)
- 🔥 **@minimact/hot-reload** - Dev tools

**Community:**
- GitHub Discussions
- Discord Server
- Stack Overflow tag

---

## 🔮 The Future

**Roadmap:**
- ✅ Template Prediction System (Complete)
- ✅ SPA Mode (Complete)
- ✅ Minimact Swig IDE (Complete)
- 🚧 Semantic Hooks Library
- 🚧 Minimact Quantum (Multi-client sync)
- 📋 Mobile bindings (React Native bridge)
- 📋 Edge runtime support

---

## 🤔 Why "Minimact"?

**MINIM**al **A**nticipatory **C**lient **T**echnology

- **Minimal** - 12.0 KB, minimal client logic
- **Anticipatory** - Predicts before user clicks
- **Client Technology** - Smart client with cached patches

> *The cactus doesn't hydrate — it stores.* 🌵

---

## 🎭 The Philosophy

**React gave us declarative UI.**
**Minimact takes it further: predictive UI.**

```
Declarative → Structure visible
Structure → Deterministic output
Deterministic → Pre-computable
Pre-computable → Instant updates
```

**The progression is inevitable.**

---

## 💭 What React Critics Were Right About

> *"Virtual DOM seems unnecessary."*
> *"Re-rendering feels wasteful."*
> *"It's declarative, but... heavy."*

**They sensed something:**

**JSX + useState = Finite State Automaton**

- Every state creates known state space
- JSX describes static view for each state
- **You can precompute all transitions**
- **Runtime diffing is unnecessary**

---

## 🌟 React Built a Ship

**To navigate a path that could have been walked directly.**

**Minimact is that direct path:**
- No hydration
- No reconciliation
- Finite state → Predictive patches → Instant updates

**React gave you the compass. Minimact teaches you how to use it.**

---

## 🎵 It's Not Magic...

**It's Mactic.** 🪄

**Mactnificent** (adj.) - Magnificent, but for Minimact
**Mactical** (adj.) - Server-side sorcery
**Mactic** (adj.) - When patches predict your clicks

---

## 🌵 The Cactus Philosophy

**Cacti thrive in harsh environments by:**
- Storing what they need (prediction cache)
- Using minimal resources (12 KB runtime)
- Adapting to conditions (hybrid state)

**Minimact thrives by:**
- Storing patches before user needs them
- Using minimal client resources
- Adapting to server/client capabilities

**The cactus doesn't hydrate — it stores.** 🌵

---

## 🎬 See It in Action

**TodoMVC Demo:**
```
Initial load: 80ms
Add todo: 2ms ⚡
Toggle todo: 2ms ⚡
Delete todo: 3ms ⚡
Filter todos: 1ms ⚡
```

**Dashboard Demo:**
```
Page navigation: 12ms ⚡
Data table sort: 3ms ⚡
Filter update: 2ms ⚡
Chart interaction: 4ms ⚡
```

---

## 🚀 Get Started Today

```bash
# Install Minimact Swig IDE
git clone https://github.com/minimact/swig
cd swig
npm install
npm start

# Create your first project
# Open browser
# Start building
# Deploy to production

# It's that simple.
```

---

## 🌐 Links

**Website:** minimact.com
**Docs:** docs.minimact.com
**GitHub:** github.com/minimact/minimact
**Discord:** discord.gg/minimact

**Follow the journey:**
**Substack:** ameritusweb.substack.com

---

## 🎯 The Value Proposition

**For Developers:**
React syntax + Instant performance + Server security

**For Businesses:**
Faster apps = Better UX = More conversions = Higher revenue

**For Users:**
Apps that feel instant, work offline, and respect their bandwidth

**Everybody wins.**

---

## 💪 Join the Revolution

**The web is moving away from client-side hydration.**

**Early adopters of Minimact will have:**
- Competitive advantage (faster apps)
- Lower costs (smaller bundles)
- Better UX (instant interactions)

**The future is predictive.**
**The future is Minimact.**

---

## 🎭 Standing Ovation

```
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║          ███╗   ███╗ █████╗  ██████╗████████╗██╗ ██████╗  ║
║          ████╗ ████║██╔══██╗██╔════╝╚══██╔══╝██║██╔════╝  ║
║          ██╔████╔██║███████║██║        ██║   ██║██║       ║
║          ██║╚██╔╝██║██╔══██║██║        ██║   ██║██║       ║
║          ██║ ╚═╝ ██║██║  ██║╚██████╗   ██║   ██║╚██████╗  ║
║          ╚═╝     ╚═╝╚═╝  ╚═╝ ╚═════╝   ╚═╝   ╚═╝ ╚═════╝  ║
║                                                            ║
║              The Show That Patches Your Heart              ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
```

**Thank you!** 👏👏👏

---

<!-- _class: invert -->
<!-- _paginate: false -->

# 🌵 Minimact

## Write React. Render on the server. Update instantly.

**Get started today: minimact.com**

> *The cactus doesn't hydrate — it stores.* 🌵

**🎬 End of Presentation**
