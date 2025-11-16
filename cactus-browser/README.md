# 🌵 Cactus Browser

**The World's First TSX-Native, GitHub-Native, Posthydrationist Web Browser**

<p align="center">
  <strong>Phase 1-3: COMPLETE ✅ | Next: Tauri Integration 🚀</strong>
</p>

---

## What Is This?

Cactus Browser is a revolutionary web browser that:
- Treats **GitHub repositories** as websites
- Renders **TSX files** as web pages (not HTML)
- Uses **Minimact** for zero-hydration, predictive rendering
- Provides **instant interactions** (2-5ms latency)
- Requires **zero deployment** (just `git push`)

---

## Status: Phases 1-3 ✅ COMPLETE

### What Works

**Phase 1: Boot the Runtime**
- ✅ Tauri desktop application shell
- ✅ Load local `.tsx` files
- ✅ Compile TSX → C# using **babel-plugin-minimact**

**Phase 2: GitHub Loader**
- ✅ `gh://` protocol parser
- ✅ GitHub API client with caching
- ✅ Import resolver (recursive dependencies)
- ✅ Full compilation pipeline

**Phase 3: Native AOT Runtime**
- ✅ 33MB native executable (no .NET runtime needed!)
- ✅ Dynamic C# compilation (Roslyn)
- ✅ Execute `RenderComponent()` method
- ✅ VNode → JSON serialization
- ✅ VNode → HTML generation

### What's Next (Phase 4)

- Wire Tauri to call Native AOT runtime
- Display rendered HTML in browser
- Handle events (onClick, etc.)

---

## Installation

### Prerequisites

```bash
# Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Node.js 18+
nvm install 18 && nvm use 18

# pnpm (recommended)
npm install -g pnpm
```

### Setup

```bash
# Install dependencies
pnpm install

# Build babel plugin (from parent directory)
cd ../src/babel-plugin-minimact
npm install
npm run build
cd ../../cactus-browser

# Start development server
pnpm tauri:dev
```

---

## Project Structure

```
cactus-browser/
├── src/                          # React frontend
│   ├── main.tsx                  # Entry point
│   ├── App.tsx                   # Main application
│   ├── core/
│   │   └── local-loader.ts       # TSX → C# compiler
│   └── styles/
│       └── app.css               # UI styles
│
├── src-tauri/                    # Rust backend
│   ├── src/
│   │   └── main.rs               # Tauri commands
│   ├── Cargo.toml
│   └── tauri.conf.json
│
├── test-pages/                   # Test TSX files
│   └── index.tsx                 # Test component
│
├── package.json
├── tsconfig.json
└── README.md
```

---

## How It Works (Phase 1)

1. **Load TSX File**: Read `test-pages/index.tsx` from disk
2. **Compile with Babel**: Use `babel-plugin-minimact` to transform TSX → C#
3. **Extract Metadata**: Generate templates, hex keys, and event handlers
4. **Display Results**: Show compilation output in browser

---

## Test Component

See `test-pages/index.tsx`:

```typescript
import { useState } from '@minimact/core';

export function HomePage() {
  const [count, setCount] = useState(0);
  const [message, setMessage] = useState('Welcome to Cactus Browser!');

  return (
    <div className="container">
      <h1>🌵 Welcome to Cactus Browser!</h1>
      <p>{message}</p>

      <div className="counter">
        <button onClick={() => setCount(count - 1)}>-</button>
        <span>Count: {count}</span>
        <button onClick={() => setCount(count + 1)}>+</button>
      </div>
    </div>
  );
}
```

This gets compiled to:
- C# `MinimactComponent` class
- Template metadata for predictions
- Hex keys for element navigation

---

## Development

### Run Development Mode

```bash
pnpm tauri:dev
```

This opens a Tauri window showing:
- Compilation status
- Generated C# code
- Extracted templates
- Hex key mappings

### Build for Production

```bash
pnpm tauri:build
```

Output in `src-tauri/target/release/bundle/`

---

## Next Steps

See [CACTUS_BROWSER_IMPLEMENTATION_PLAN.md](../docs/CACTUS_BROWSER_IMPLEMENTATION_PLAN.md) for the full roadmap.

**Phase 2**: GitHub Repo Loader
- `gh://` protocol parser
- GitHub API client
- Import resolution

**Phase 3**: Compile + Predict + Render
- Embed .NET runtime
- Execute C# components
- Generate predictions
- Render to DOM

---

## Contributing

Cactus Browser is part of the Minimact project. See the main repo for contribution guidelines.

---

## License

MIT License - See LICENSE for details

---

<p align="center">
  <strong>The cactus doesn't hydrate — it stores.</strong>
</p>

<p align="center">
  Phase 1 Complete 🌵 | Next: GitHub Integration 🚀
</p>
