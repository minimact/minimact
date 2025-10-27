---
layout: home

hero:
  name: Minimact
  text: Server-side React for ASP.NET Core
  tagline: Build reactive web apps with predictive rendering powered by Rust
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
  - icon: 🦕
    title: Server-Side React
    details: Write React components that run on the server with automatic state synchronization to the client.

  - icon: ⚡
    title: Predictive Rendering
    details: Rust-powered reconciliation engine that predicts and pre-renders UI updates before user interactions.

  - icon: 🎯
    title: ASP.NET Core Integration
    details: Seamlessly integrates with ASP.NET Core using SignalR for real-time communication.

  - icon: 🔄
    title: Automatic State Sync
    details: State changes on the server automatically sync to the client with minimal overhead.

  - icon: 📦
    title: Component-Based
    details: Build reusable server-side components with familiar React patterns and hooks.

  - icon: 🚀
    title: High Performance
    details: Optimized for speed with differential updates and efficient patch-based rendering.
---

## Quick Start

```bash
# Install the .NET tool
dotnet tool install -g minimact

# Create new ASP.NET project with Minimact
dotnet minimact new MyApp
cd MyApp

# Install client dependencies
cd client
npm install

# Start dev mode (watches TSX, transpiles to C#, runs server)
npm run dev
```

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

## Why Minimact?

### For React Developers
**Finally, a path to .NET without learning Razor.** Keep writing React — get ASP.NET Core's power, security, and enterprise features.

### For .NET Teams
**Modern frontend DX without abandoning your stack.** Your team already knows C# and EF Core. Now they can build UIs with React syntax.

### For CTOs
**Solve the "React DX + .NET backend" problem.** One stack, one deployment, full type safety from database to DOM. Rust-powered performance makes ASP.NET Core shine (2-3ms interactions vs 47ms traditional SSR).

### Better Than Blazor
Blazor requires learning Razor syntax. Minimact uses React — the syntax millions of developers already know. Lower barrier, faster adoption, bigger talent pool.
