---
layout: home

hero:
  name: Minimact
  text: The Posthydrationist Framework
  tagline: Server-first UI with zero hydration, predictive patches, instant interactivity, and Rust-fueled performance — built for ASP.NET Core.
  image:
    src: /logo.png
    alt: Minimact
  actions:
    - theme: brand
      text: Get Started
      link: /v1.0/guide/getting-started
    - theme: alt
      text: View on GitHub
      link: https://github.com/minimact/minimact

features:
  - icon: 🌵
    title: Zero Hydration
    details: No client-side VDOM reconciliation. No hydration waterfall. The server pre-computes everything.

  - icon: ⚡
    title: Predictive Patches
    details: Rust engine pre-renders UI updates before user interaction. Patches cached and ready instantly.

  - icon: 🎯
    title: 13.33 KB Bundle
    details: 71% smaller than React. WebSocket-based real-time sync. No bloat, just performance.

  - icon: 🔄
    title: Server-First Architecture
    details: All rendering happens on ASP.NET Core. Client only applies patches. Security by design.

  - icon: 📦
    title: React Syntax
    details: Write familiar JSX/TSX with hooks. Transpiles to C#. No new syntax to learn.

  - icon: 🚀
    title: 2-3ms Interactions
    details: Cached patches execute instantly. 15× faster than traditional server rendering on 3G.
---

## Quick Start

```bash
# Install the .NET tool
dotnet tool install -g minimact

# Create new ASP.NET project with Minimact
dotnet minimact new MyApp
cd MyApp

# Install client dependencies (13.33 KB gzipped by default)
cd client
npm install

# Start dev mode (watches TSX, transpiles to C#, runs server)
npm run dev
```

**Two versions available:**
- `minimact` — 13.33 KB gzipped (WebSocket-based, modern browsers)
- `minimact-r` — 25.03 KB gzipped (Full SignalR with fallbacks)

## Example

Write familiar React code:

```tsx
import { useState } from 'minimact';

export function Counter() {
  const [count, setCount] = useState(0);

  return (
    <button onClick={() => setCount(count + 1)}>
      Count: {count}
    </button>
  );
}
```

Babel transpiles to C#, Rust predicts the next state, and the client applies cached patches instantly (~2-3ms).

> **The cactus doesn't hydrate — it stores.** 🌵

---

## Why Minimact?

### For React Developers
**Finally, a path to .NET without learning Razor.** Keep writing React — get ASP.NET Core's power, security, and enterprise features.

**Bundle size:** 13.33 KB vs React's 45 KB (71% smaller!)

### For .NET Teams
**Modern frontend DX without abandoning your stack.** Your team already knows C# and EF Core. Now they can build UIs with React syntax.

**Performance:** 2-3ms interactions vs 47ms traditional SSR

### For CTOs
**Solve the "React DX + .NET backend" problem.** One stack, one deployment, full type safety from database to DOM. Rust-powered performance makes ASP.NET Core shine.

**Comparison:**
- React 18: 45 KB gzipped
- Vue 3: 34 KB gzipped
- **Minimact: 13.33 KB gzipped** (71% smaller than React)

### Better Than Blazor
Blazor requires learning Razor syntax. Minimact uses React — the syntax millions of developers already know. Lower barrier, faster adoption, bigger talent pool.
