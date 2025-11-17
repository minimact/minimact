# 🌵 Cactus Browser

<div align="center">

**The Fastest Browser in the West**

*No servers. No builds. No bull. Just pure TSX, straight from the git.*

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Built with Rust](https://img.shields.io/badge/Built%20with-Rust-orange.svg)](https://www.rust-lang.org/)
[![Powered by Tauri](https://img.shields.io/badge/Powered%20by-Tauri-blue.svg)](https://tauri.app/)
[![SignalM²](https://img.shields.io/badge/SignalM%C2%B2-Enabled-green.svg)](https://github.com/minimact/minimact)

[Download](#-download) • [Features](#-features) • [Quick Start](#-quick-start) • [Examples](#-examples) • [Architecture](#-architecture)

</div>

---

## 🏜️ What is This?

Cactus Browser is the **world's first TSX-native, GitHub-native, posthydrationist web browser**. It runs React/TSX components directly from GitHub repositories with native desktop performance—no servers, no build steps, no deployment needed.

```
Traditional Web App:                Cactus Browser:
─────────────────────               ───────────────
Write code                          Write code
Build/bundle                        Git push
Deploy to server         vs.        Done! 🎉
Pay for hosting
Maintain infrastructure
Debug deployment issues
```

## ⚡ Features

### 🔫 Lightning Fast
- **~0.1ms latency** (100x faster than WebSocket)
- Native desktop performance via Tauri
- Direct process-to-process communication (no network overhead)

### 🌵 No Servers Required
- Runs TSX components locally using Roslyn + Rust reconciler
- GitHub serves as the "CDN" (files loaded via GitHub API)
- Zero infrastructure costs

### 🏜️ Offline-First
- Components cached locally after first load
- Works without internet connection
- Native file system access

### 📦 Zero Build Step
- Write `.tsx` files, push to GitHub, done
- No webpack, no vite, no build pipeline needed
- Components compiled dynamically at runtime

### 🎯 Full React API
- `useState`, `useEffect`, `useRef` - everything works
- Server-side hooks execute in C# runtime
- Client-side state via `useClientState`
- Real DOM patching via Minimact reconciler

## 🚀 Quick Start

### Installation

**Windows:**
```bash
# Download from releases
https://github.com/minimact/cactus-browser/releases/latest
```

**macOS:**
```bash
# Coming soon
```

**Linux:**
```bash
# Coming soon
```

### Your First Component

1. **Create a TSX file:**

```tsx
// Counter.tsx
import { useState } from 'react';

export default function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>Count: {count}</h1>
      <button onClick={() => setCount(count + 1)}>
        Increment
      </button>
      <button onClick={() => setCount(count - 1)}>
        Decrement
      </button>
    </div>
  );
}
```

2. **Push to GitHub:**

```bash
git add Counter.tsx
git commit -m "Add counter component"
git push origin main
```

3. **Open in Cactus Browser:**

```
gh://yourusername/yourrepo/Counter.tsx
```

**That's it!** No build step, no deployment, no server setup.

## 🗺️ Examples

### Simple Counter
```
gh://minimact/docs/pages/index.tsx
```
A basic counter demonstrating state management.

### Todo List
```
gh://minimact/examples/todo.tsx
```
Full CRUD operations with local state.

### Real-time Dashboard
```
gh://minimact/examples/dashboard.tsx
```
Live data updates with SignalM².

### More Examples
Browse the [examples repository](https://github.com/minimact/examples) for more components you can run instantly.

## 🛠️ How It Works

### The Architecture

```
┌─────────────────────────────────────────────────────────┐
│ Tauri Webview (Chromium/WebKit)                        │
│  • Renders HTML/CSS/JS                                  │
│  • Runs client-runtime.js (DOM patching, events)      │
└─────────────────────────────────────────────────────────┘
                        ↕ Tauri IPC (~0.1ms)
┌─────────────────────────────────────────────────────────┐
│ Rust Backend (signalm.rs)                              │
│  • Component registry                                   │
│  • State management                                     │
│  • Reconciliation (Rust reconciler → surgical patches)  │
└─────────────────────────────────────────────────────────┘
                        ↕ Process call
┌─────────────────────────────────────────────────────────┐
│ C# Runtime (Native AOT)                                 │
│  • Roslyn compiler (TSX → C# compilation)              │
│  • MinimactComponent execution                          │
│  • VNode rendering                                      │
└─────────────────────────────────────────────────────────┘
                        ↕ GitHub API
┌─────────────────────────────────────────────────────────┐
│ GitHub Repository                                       │
│  • Source of truth for TSX files                       │
│  • Version control built-in                             │
│  • Free CDN/hosting                                     │
└─────────────────────────────────────────────────────────┘
```

### The Flow

1. **User enters `gh://` URL** → Cactus Browser loads TSX from GitHub
2. **Babel compiles TSX → C#** → Using `@minimact/babel-plugin`
3. **Roslyn compiles C# at runtime** → Creates `MinimactComponent` instance
4. **Component renders to VNode** → Server-side rendering
5. **VNode → HTML** → Wrapped in complete HTML document with client-runtime
6. **SignalM² initializes** → TauriTransport connects client ↔ backend
7. **User interacts** → Events via SignalM → State updates → Patches → DOM updates

### Key Technologies

- **[Tauri](https://tauri.app/)** - Native desktop app framework (Rust + WebView)
- **[Minimact](https://github.com/minimact/minimact)** - Server-side React with Rust reconciler
- **[Roslyn](https://github.com/dotnet/roslyn)** - C# compiler API for dynamic compilation
- **[SignalM²](docs/SIGNALM2_ARCHITECTURE.md)** - Transport abstraction (Tauri IPC replaces SignalR)
- **[Babel](https://babeljs.io/)** - TSX → C# transpilation

## 🎯 Use Cases

### ✅ Perfect For:
- **Desktop tools** - Native performance, file system access
- **Internal tools** - No server infrastructure needed
- **Prototypes** - Instant deployment via git push
- **Offline apps** - Works without internet
- **Learning** - No build complexity, instant feedback

### ❌ Not Ideal For:
- **Public websites** - Use traditional Minimact with ASP.NET Core
- **Mobile apps** - Desktop only (for now)
- **Large teams** - Still experimental
- **Production** - Beta software, expect bugs

## 📚 Documentation

- **[Architecture Overview](docs/CACTUS_BROWSER_CLIENT_RUNTIME_INTEGRATION.md)** - Deep dive into client-runtime integration
- **[SignalM² Design](SIGNALM2_ARCHITECTURE.md)** - Transport abstraction layer
- **[Minimact Docs](https://github.com/minimact/minimact)** - Parent framework documentation
- **[gh:// Protocol](docs/GH_PROTOCOL.md)** - How GitHub URLs are resolved

## 🏗️ Development

### Prerequisites

```bash
# Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# .NET 8 SDK
# Download from: https://dotnet.microsoft.com/download/dotnet/8.0

# Node.js + pnpm
npm install -g pnpm
```

### Build from Source

```bash
# Clone the repository
git clone https://github.com/minimact/cactus-browser.git
cd cactus-browser

# Install dependencies
pnpm install

# Build the C# runtime
./build-runtime.bat  # Windows
./build-runtime.sh   # macOS/Linux

# Run in development mode
pnpm tauri dev
```

### Project Structure

```
cactus-browser/
├── src/                          # Tauri frontend (React + Vite)
│   ├── core/
│   │   ├── github-loader.ts      # Load TSX from GitHub
│   │   ├── gh-protocol.ts        # gh:// URL parsing
│   │   └── signalm/
│   │       └── TauriTransport.ts # SignalM² Tauri transport
│   └── App-phase3.tsx            # Main UI
├── src-tauri/                    # Tauri backend (Rust)
│   └── src/
│       ├── runtime.rs            # C# runtime execution
│       └── signalm.rs            # SignalM² hub replacement
├── minimact-runtime-aot/         # C# runtime (Native AOT)
│   ├── ComponentExecutor.cs      # Execute components
│   ├── DynamicCompiler.cs        # Roslyn compilation
│   └── VNodeSerializer.cs        # VNode → JSON
└── public/
    └── minimact-client-runtime.js # Client-runtime bundle
```

## 🤝 Contributing

We welcome contributions! This is an experimental project pushing the boundaries of what's possible with desktop apps and GitHub.

**Areas needing help:**
- 🍎 macOS support
- 🐧 Linux support
- 📱 Mobile (Tauri mobile preview)
- 🎨 UI/UX improvements
- 📝 Documentation
- 🐛 Bug fixes
- ✨ New features

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## 🌵 Philosophy

### Posthydrationism

We believe the web took a wrong turn with the server-client split. Why send HTML over the network when you can generate it locally? Why pay for servers when GitHub is free? Why deal with deployment when git push works perfectly?

**Cactus Browser represents a return to simpler times:**
- Write code
- Push to git
- Run locally

No CI/CD. No containers. No cloud bills. Just code that runs.

### The Wild West of the Web

The web used to be wild and free. Anyone could view source, remix, and deploy. Then came the build tools, the bundlers, the deployment pipelines, the cloud providers.

**We're bringing back the frontier:**
- View any component's source on GitHub
- Fork and modify instantly
- No permission needed to run
- No gatekeepers, no middlemen

## 📜 License

MIT License - see [LICENSE](LICENSE) for details.

## 🙏 Acknowledgments

- **[Tauri Team](https://tauri.app/)** - Making native desktop apps accessible
- **[Roslyn Team](https://github.com/dotnet/roslyn)** - Incredible C# compiler infrastructure
- **[Minimact Contributors](https://github.com/minimact/minimact)** - Building the future of React
- **[Rust Community](https://www.rust-lang.org/community)** - For the amazing tooling

## 💬 Community

- **GitHub Discussions** - [Ask questions, share components](https://github.com/minimact/cactus-browser/discussions)
- **Discord** - [Join the community](https://discord.gg/minimact) (coming soon)
- **Twitter** - [@minimact](https://twitter.com/minimact) (coming soon)

---

<div align="center">

**"In the Wild West of the web, we don't need no stinking servers."** 🌵

Made with ⚡ by cowboys who believe the web should be wild and free.

[⬆ Back to Top](#-cactus-browser)

</div>
