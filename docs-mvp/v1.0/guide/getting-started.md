# Getting Started

Welcome to Minimact! This guide will help you set up your first server-side React application with ASP.NET Core.

## Prerequisites

- [.NET 8.0 SDK](https://dotnet.microsoft.com/download) or later
- [Node.js 16+](https://nodejs.org/) (for client tooling)
- A code editor (VS Code recommended with the [Minimact extension](https://marketplace.visualstudio.com/items?itemName=minimact.minimact-vscode))

## Quick Start

### 1. Install Minimact

Install the .NET tool globally:

```bash
dotnet tool install -g minimact
```

### 2. Create a New Project

```bash
# Create new ASP.NET project with Minimact
dotnet minimact new MyApp
cd MyApp
```

This creates:
```
MyApp/
├── Program.cs              # ASP.NET Core startup
├── MyApp.csproj            # .NET project file
├── client/                 # Workspace for TSX components
│   ├── package.json        # Client dependencies
│   ├── src/
│   │   ├── pages/          # File-based routing
│   │   │   └── index.tsx   # Homepage (route: /)
│   │   └── components/     # Shared components
│   └── public/             # Static assets
└── Generated/              # Auto-generated C# (do not edit)
    └── routes.json         # Route manifest
```

### 3. Install Client Dependencies

```bash
cd client
npm install
```

This installs `minimact` (13.33 KB gzipped) by default.

**Want full SignalR compatibility?** Install `minimact-r` instead (25.03 KB):
```bash
npm install minimact-r
```

Both versions have identical APIs. See [Bundle Size Comparison](#bundle-sizes) below.

### 4. Start Development Server

```bash
npm run dev
```

This will:
1. Watch for TSX file changes
2. Transpile TSX → C# automatically
3. Generate route manifest
4. Start ASP.NET Core server with hot reload

Visit **http://localhost:5000** — your app is live!

---

## File-Based Routing

Minimact uses **Next.js-style file-based routing**. Files in `client/src/pages/` automatically become routes.

### Basic Routes

```
client/src/pages/index.tsx       → /
client/src/pages/about.tsx       → /about
client/src/pages/blog.tsx        → /blog
client/src/pages/contact.tsx     → /contact
```

### Dynamic Routes

```
client/src/pages/blog/[id].tsx       → /blog/:id
client/src/pages/users/[userId].tsx  → /users/:userId
```

### Nested Routes

```
client/src/pages/dashboard/index.tsx    → /dashboard
client/src/pages/dashboard/settings.tsx → /dashboard/settings
client/src/pages/dashboard/profile.tsx  → /dashboard/profile
```

---

## Your First Page

Edit `client/src/pages/index.tsx`:

```tsx
import { useState } from 'minimact';

export default function Home() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <h1>Welcome to Minimact!</h1>
      <p>You clicked {count} times</p>
      <button onClick={() => setCount(count + 1)}>
        Click me
      </button>
    </div>
  );
}
```

**Save the file** — Minimact will:
1. Auto-transpile to C# in `Generated/pages/Index.cs`
2. Babel generates `.templates.json` with extracted templates
3. Update `Generated/routes.json`
4. Hot reload manager detects template changes
5. Send template patches via SignalR to browser
6. Client applies patches **instantly without page refresh**

**Your component state is preserved** — the counter won't reset!

---

## Creating Components

Components (non-pages) go in `client/src/components/`:

**`client/src/components/Counter.tsx`:**

```tsx
import { useState } from 'minimact';

export function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div className="counter">
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>
        Increment
      </button>
      <button onClick={() => setCount(count - 1)}>
        Decrement
      </button>
      <button onClick={() => setCount(0)}>
        Reset
      </button>
    </div>
  );
}
```

**Use it in a page:**

```tsx
import { Counter } from '../components/Counter';

export default function Home() {
  return (
    <div>
      <h1>Counter Demo</h1>
      <Counter />
    </div>
  );
}
```

---

## Project Structure

### The `client/` Workspace

The `client/` folder is a **workspace** with its own `package.json`. This keeps client-side tooling separate from your .NET project.

**`client/package.json`:**

```json
{
  "name": "myapp-client",
  "scripts": {
    "dev": "minimact watch & dotnet watch run --project ..",
    "build": "minimact transpile",
    "clean": "rm -rf ../Generated"
  },
  "dependencies": {
    "minimact": "^0.1.0"
  }
}
```

**npm commands:**
- `npm run dev` — Watch mode + dev server
- `npm run build` — Build for production
- `npm run clean` — Remove generated files

### Generated Files

The `Generated/` folder contains auto-generated C# code. **Do not edit these files manually** — they'll be overwritten on next transpile.

```
Generated/
├── pages/
│   ├── Index.cs         # From client/src/pages/index.tsx
│   ├── About.cs         # From client/src/pages/about.tsx
│   └── Blog.cs          # From client/src/pages/blog.tsx
├── components/
│   └── Counter.cs       # From client/src/components/Counter.tsx
└── routes.json          # Route manifest
```

---

## Configuring Routes

Routes are automatically configured via `MapMinimactPages()`:

**`Program.cs`:**

```csharp
using Minimact.AspNetCore;
using Minimact.AspNetCore.Routing;

var builder = WebApplication.CreateBuilder(args);

// Add Minimact services
builder.Services.AddMinimact();

var app = builder.Build();

// Serve static files (CSS, JS, images)
app.UseStaticFiles();

// Map SignalR hub for real-time communication
app.MapHub<MinimactHub>("/minimact");

// Map all pages from route manifest
app.MapMinimactPages();

app.Run();
```

**How it works:**

1. Transpiler generates `Generated/routes.json`:
```json
[
  {
    "route": "/",
    "componentPath": "Generated/pages/Index.cs",
    "isPage": true
  },
  {
    "route": "/about",
    "componentPath": "Generated/pages/About.cs",
    "isPage": true
  }
]
```

2. `MapMinimactPages()` reads the manifest and registers routes
3. ASP.NET Core maps each route to its component

---

## Server State vs Client State

### Server State (useState)

State managed on the server, synchronized to the client:

```tsx
import { useState } from 'minimact';

export function UserProfile() {
  // Runs on server, syncs to client
  const [user, setUser] = useState({ name: 'Alice', age: 30 });

  return (
    <div>
      <h2>{user.name}</h2>
      <button onClick={() => setUser({ ...user, age: user.age + 1 })}>
        Birthday!
      </button>
    </div>
  );
}
```

### Client State (useClientState)

State managed entirely on the client (no server round-trip):

```tsx
import { useClientState } from 'minimact';

export function SearchBox() {
  // Runs on client only — instant updates
  const [query, setQuery] = useClientState('');

  return (
    <input
      value={query}
      onInput={(e) => setQuery(e.target.value)}
      placeholder="Search..."
    />
  );
}
```

**When to use:**
- **`useState`** — Persisted state, server logic, data from database
- **`useClientState`** — Ephemeral UI state (search query, open/closed, hover)

---

## Server Tasks

Run long-running operations on the server with progress updates:

```tsx
import { useServerTask } from 'minimact';

export function DataProcessor() {
  const [task, startTask] = useServerTask(async (updateProgress) => {
    for (let i = 0; i <= 100; i += 10) {
      await delay(500);
      updateProgress(i);
    }
    return 'Processing complete!';
  });

  return (
    <div>
      <button onClick={startTask} disabled={task.isRunning}>
        Start Processing
      </button>

      {task.isRunning && <p>Progress: {task.progress}%</p>}
      {task.isComplete && <p>Result: {task.result}</p>}
    </div>
  );
}
```

---

## Template-Based Hot Reload

Minimact's hot reload is **faster and more efficient than React Fast Refresh** because it uses the template system.

### How It Works

**1. Build Time — Template Extraction**

When you save a TSX file, Babel extracts templates:

```tsx
// You write:
<h1>Count: {count}</h1>

// Babel generates Counter.templates.json:
{
  "component": "Counter",
  "templates": {
    "h1[0].text[0]": {
      "template": "Count: {0}",
      "bindings": ["count"],
      "slots": [7],
      "path": [0, 0]
    }
  }
}
```

**2. Development — File Watching**

```
You edit Counter.tsx
    ↓
CLI transpiles TSX → C#
    ↓
Babel regenerates Counter.templates.json
    ↓
FileSystemWatcher detects change
    ↓
TemplateHotReloadManager compares old vs new templates
    ↓
Detects: "Count: {0}" changed to "Total: {0}"
```

**3. Runtime — Template Patching**

```
Server sends template patch via SignalR:
{
  "type": "template-patch",
  "componentId": "counter-123",
  "path": [0, 0],
  "template": "Total: {0}",
  "params": [5],  // Current count value
  "bindings": ["count"]
}
    ↓
Client receives patch
    ↓
Client applies template with current state
    ↓
DOM updates instantly: "Total: 5"
    ↓
Component state preserved!
```

### Benefits Over React Fast Refresh

| Feature | React Fast Refresh | Minimact Hot Reload |
|---------|-------------------|---------------------|
| **Size** | Full component + VDOM (~100KB) | Template only (~2KB) |
| **Speed** | Re-render + reconcile (~16ms) | Template application (~1ms) |
| **State** | ✅ Preserved (usually) | ✅ Always preserved |
| **Coverage** | 70-80% (some changes require reload) | 100% (all text/attribute changes) |
| **Network** | Full component code | Just template diff |

### What Gets Hot Reloaded

**✅ All text changes:**
```tsx
// Change "Hello" to "Hi" → Hot reloaded
<h1>Hello World</h1>
<h1>Hi World</h1>
```

**✅ All attribute changes:**
```tsx
// Change className → Hot reloaded
<div className="blue">Content</div>
<div className="red">Content</div>
```

**✅ Template structure:**
```tsx
// Add/remove placeholders → Hot reloaded
<p>Count: {count}</p>
<p>Count: {count} / Max: {max}</p>
```

**⚠️ Component structure changes require reload:**
```tsx
// Adding new elements requires full transpile
<div>Old</div>
<div><span>New child element</span></div>
```

### Watching Template Files

The hot reload manager watches for `.templates.json` changes:

```
Generated/
├── pages/
│   ├── Index.cs
│   └── Index.templates.json     ← Watched
├── components/
│   ├── Counter.cs
│   └── Counter.templates.json   ← Watched
└── routes.json
```

**File watcher configuration:**
- **Path:** `Generated/` folder
- **Filter:** `*.templates.json`
- **Debounce:** 50ms (prevents duplicate triggers)

### State Preservation

Unlike React Fast Refresh, Minimact **never loses state** because:

1. **Templates are parameterized** — Component state fills the template
2. **No re-rendering** — Client just updates text/attributes
3. **Component instance stays alive** — Server maintains state

**Example:**

```tsx
export function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <p>Count: {count}</p>  {/* Change this text */}
      <button onClick={() => setCount(count + 1)}>+</button>
    </div>
  );
}
```

**User clicks button 5 times → count = 5**

**You edit:** `<p>Count: {count}</p>` → `<p>Total: {count}</p>`

**Result:** Browser shows "Total: 5" — **count is still 5!**

### Memory Efficiency

**Traditional hot reload:**
```
Component with 100 possible states:
100 states × 1KB each = 100KB in memory
```

**Minimact template hot reload:**
```
Component with 100 possible states:
1 template × 200 bytes = 200 bytes in memory
→ 500x memory reduction
```

### Debugging Hot Reload

Enable logging to see what's happening:

```csharp
// Program.cs
builder.Services.AddMinimact(options =>
{
    options.EnableHotReload = true;
    options.HotReloadLogging = true;  // Enable debug logs
});
```

**Console output:**
```
[Minimact Templates] 📦 Watching Generated/ for *.templates.json changes
[Minimact Templates] 📝 Template file changed: Counter.templates.json
[Minimact Templates] 🚀 Sent template patch for counter-123: "Count: {0}" → "Total: {0}"
```

**Browser console:**
```
[Minimact HotReload] Received template patch for counter-123
[Minimact HotReload] Applied patch to path [0, 0]: "Total: 5"
```

---

## Next Steps

Now that you have Minimact set up:

- **[Core Concepts](/v1.0/guide/concepts)** — Understand how Minimact works
- **[Predictive Rendering](/v1.0/guide/predictive-rendering)** — Learn about the template system
- **[Use Cases](/v1.0/use-cases)** — Explore real-world examples
- **[Hooks API](/v1.0/api/hooks)** — Complete hook reference
- **[Client Stack](/v1.0/architecture/client-stack)** — Extension ecosystem

---

## Troubleshooting

### Routes not found

If routes aren't working:

1. Check that `Generated/routes.json` exists
2. Run `npm run build` to regenerate routes
3. Ensure `MapMinimactPages()` is called in `Program.cs`

### Transpiler not watching

If file changes aren't detected:

1. Ensure `npm run dev` is running
2. Check that files are in `client/src/pages/` or `client/src/components/`
3. Verify file extensions are `.tsx` or `.jsx`

### Port already in use

If port 5000 is taken:

```bash
# Use a different port
dotnet run --urls "http://localhost:5001"
```

---

## Bundle Sizes

Minimact is available in two versions:

| Version | Transport | Bundle Size (gzipped) | Browser Support |
|---------|-----------|----------------------|-----------------|
| **minimact** | SignalM (WebSocket + JSON) | **13.33 KB** | Modern browsers (95%+ users) |
| **minimact-r** | SignalR (Full client) | **25.03 KB** | All browsers + legacy support |

### Comparison to Other Frameworks

| Framework | Size (gzipped) | vs Minimact |
|-----------|---------------|-------------|
| React 18 | 45 KB | **71% larger** |
| Vue 3 | 34 KB | **155% larger** |
| **Minimact** | **13.33 KB** | ✅ Default |
| Minimact-R | 25.03 KB | 88% larger (still 44% smaller than React) |

### When to Use Each Version

**Use `minimact` (default) if:**
- ✅ You're building for modern browsers (Chrome 51+, Firefox 54+, Safari 10+, Edge 15+)
- ✅ You want the smallest possible bundle
- ✅ You only need WebSocket transport
- ✅ 95%+ of users have WebSocket support

**Use `minimact-r` if:**
- ✅ You need enterprise compatibility (old proxies, firewalls)
- ✅ You need transport fallback (SSE, Long Polling)
- ✅ You want to use the `useSignalR` hook for custom hubs
- ✅ You need MessagePack protocol support

**Migration is seamless** — just swap the package name. No code changes required!

---

## CLI Reference

### `dotnet minimact new <name>`

Create a new Minimact project with workspace structure.

**Options:**
- `--template <template>` — Use a template (default, minimal, full)
- `--output <path>` — Output directory

### `minimact watch`

Watch for TSX file changes and transpile automatically.

**Options:**
- `--input <path>` — Input directory (default: `./src`)
- `--output <path>` — Output directory (default: `../Generated`)

### `minimact transpile`

Transpile TSX files to C# once (no watch mode).

**Options:**
- `--input <path>` — Input directory
- `--output <path>` — Output directory
- `--verbose` — Show detailed output

---

🌵 **You're ready to build with Minimact!** 🌵
