# Getting Started

Hey Minimalists! 👋

Welcome to Minimact - the server-side React framework that eliminates hydration and delivers instant interactivity. This guide will help you set up your first application with ASP.NET Core and predictive rendering.

:::tip New to Minimact?
A **Minimalist** is a developer who uses Minimact - someone who embraces minimal code, maximum control, and DOM domination. Check out the [Glossary](/v1.0/glossary) for all Minimact terminology.
:::

## Prerequisites

- [.NET 8.0 SDK](https://dotnet.microsoft.com/download) or later
- [Node.js 18+](https://nodejs.org/) (for Swig IDE)

## Quick Start

### 1. Download Minimact Swig

**Swig** is the official IDE for Minimact development. It provides a visual interface for creating projects, editing code, and running your apps.

```bash
git clone https://github.com/minimact/swig
cd swig/swig
npm install
npm start
```

The Swig IDE will launch automatically! 🎉

### 2. Create a New Project

In the Swig IDE:

1. Click **"Create New Project"**
2. Choose a directory for your project
3. Select a template:
   - **Empty** — Minimal starter
   - **Todo App** — Simple CRUD example
   - **Electron File Manager** — Desktop app with native features
4. Click **"Create"**

Swig will scaffold your project with:
```
MyApp/
├── Program.cs              # ASP.NET Core startup
├── MyApp.csproj            # .NET project file
├── Controllers/            # ASP.NET Core MVC controllers
│   └── HomeController.cs   # Route handler
├── Pages/                  # Minimact TSX pages
│   ├── HomePage.tsx        # Homepage component
│   └── HomePage.cs         # Auto-generated C# (do not edit)
└── Components/             # Shared components
    ├── Counter.tsx
    └── Counter.cs          # Auto-generated C# (do not edit)
```

### 3. Start Development

In Swig:

1. Click **"Transpile"** to convert TSX → C#
2. Click **"Build"** to compile the project
3. Click **"Run"** to start your app
4. Click **"Open in Browser"** to view it

That's it! Your app is live at **http://localhost:5000**

### 4. Edit Your First Page

In the Swig editor, open `Pages/HomePage.tsx`:

```tsx
import { useState } from '@minimact/core';

export default function HomePage() {
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

**Save the file (Ctrl+S)** — Swig will:
1. Auto-transpile to C# in `Pages/HomePage.cs` (same directory)
2. Generate template metadata in `HomePage.templates.json`
3. Hot reload your browser with the changes
4. **Preserve your component state** — the counter won't reset!

---

## Controller-Based Routing

Minimact uses **ASP.NET Core MVC routing** via controllers. Controllers handle routes and render Minimact pages.

### Basic Setup

**`Controllers/HomeController.cs`:**
```csharp
using Microsoft.AspNetCore.Mvc;
using Minimact.AspNetCore.Rendering;

[ApiController]
[Route("")]
public class HomeController : ControllerBase
{
    private readonly MinimactPageRenderer _renderer;

    public HomeController(MinimactPageRenderer renderer)
    {
        _renderer = renderer;
    }

    [HttpGet]
    public async Task<IActionResult> Index()
    {
        return await _renderer.RenderPage<HomePage>();
    }
}
```

### Route Examples

```csharp
// Root route (/)
[Route("")]
[HttpGet]
public async Task<IActionResult> Index()

// About page (/about)
[Route("about")]
[HttpGet]
public async Task<IActionResult> About()

// Blog post with ID (/blog/{id})
[Route("blog")]
[HttpGet("{id}")]
public async Task<IActionResult> Post(int id)

// User profile (/users/{userId}/profile)
[Route("users")]
[HttpGet("{userId}/profile")]
public async Task<IActionResult> Profile(int userId)
```

### Using Swig CLI

Add pages quickly with the CLI:

```bash
# Add a page at root
npx @minimact/swig add HomePage "/"

# Add a page with route parameter
npx @minimact/swig add ProductDetails "Products/{id}"

# Add a page with MVC ViewModel
npx @minimact/swig add UserProfile "Users/{userId}" --mvc
```

This generates the controller, page component, and ViewModel (if --mvc flag is used).

---

## Swig IDE Features

### Monaco Editor

The built-in Monaco editor provides:
- Full TypeScript/TSX syntax highlighting
- IntelliSense and autocomplete
- Error checking and linting
- Multi-file editing

### Real-Time Transpilation

As you type:
1. Swig watches for file changes
2. Auto-transpiles TSX → C# on save
3. Generates template metadata
4. Updates the generated C# code in real-time

### Integrated Terminal

Run commands directly in Swig:
- `dotnet build` to compile
- `dotnet run` to start the server
- View build output and errors

### Live Component Inspector

While your app is running, Swig connects via SignalR to show:
- **Component Tree** — Visual hierarchy of active components
- **State Inspector** — Real-time state values
- **Template Viewer** — See the generated templates

---

## Creating Components

In Swig, create a new component:

1. Right-click in the **File Tree**
2. Select **"New Component"**
3. Enter name: `Counter.tsx`

**`Components/Counter.tsx`:**

```tsx
import { useState } from '@minimact/core';

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
import { Counter } from '../Components/Counter';

export default function HomePage() {
  return (
    <div>
      <h1>Counter Demo</h1>
      <Counter />
    </div>
  );
}
```

Swig will auto-transpile both files when you save!

---

## Project Structure

Minimact projects created with Swig have a clean structure:

```
MyApp/
├── Program.cs              # ASP.NET Core startup
├── MyApp.csproj            # .NET project file
├── Controllers/            # ASP.NET Core MVC controllers
│   ├── HomeController.cs   # Route: / (you edit this)
│   └── AboutController.cs  # Route: /about
├── Pages/                  # Minimact TSX pages
│   ├── HomePage.tsx        # Homepage component (you edit this)
│   ├── HomePage.cs         # Auto-generated C# (do not edit)
│   ├── HomePage.templates.json  # Template metadata
│   ├── AboutPage.tsx       # About page component
│   ├── AboutPage.cs        # Auto-generated C#
│   └── AboutPage.templates.json
└── Components/             # Shared components
    ├── Counter.tsx         # Reusable component (you edit this)
    ├── Counter.cs          # Auto-generated C# (do not edit)
    └── Counter.templates.json
```

### Generated Files

**C# files (`.cs`)** are auto-generated in the **same directory** as your TSX files. **Do not edit them manually** — Swig overwrites them when you save the corresponding `.tsx` file.

**Template files (`.templates.json`)** contain the extracted template metadata used for hot reload and predictive rendering.

Swig shows generated files in a separate pane so you can see the C# output in real-time!

---

## Configuring Routes

Routes are configured via ASP.NET Core MVC controllers:

**`Program.cs`:**

```csharp
using Minimact.AspNetCore;

var builder = WebApplication.CreateBuilder(args);

// Add Minimact services
builder.Services.AddMinimact();

// Add MVC controllers
builder.Services.AddControllers();

var app = builder.Build();

// Serve static files (CSS, JS, images)
app.UseStaticFiles();

// Map SignalR hub for real-time communication
app.MapHub<MinimactHub>("/minimacthub");

// Map MVC controllers
app.MapControllers();

app.Run();
```

**How it works:**

1. Swig transpiles `Pages/HomePage.tsx` → `Pages/HomePage.cs`
2. Controllers use `MinimactPageRenderer` to render pages
3. Routes are defined using standard MVC routing attributes:
   ```csharp
   [Route("")]           // Root: /
   [Route("about")]      // About: /about
   [Route("blog/{id}")]  // Blog post: /blog/123
   ```

---

## Server State vs Client State

### Server State (useState)

State managed on the server, synchronized to the client:

```tsx
import { useState } from '@minimact/core';

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

**When to use `useState`:**
- All interactive state (buttons, inputs, toggles)
- Data from server/database
- State that needs to persist across renders
- Any state that affects rendering logic

**Note:** All state in Minimact is server-managed and synced to the client. This ensures consistent rendering and prevents stale data issues.

---

## Server Tasks

Run long-running operations on the server with progress updates:

```tsx
import { useServerTask } from '@minimact/core';

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

### Swig won't start

If Swig fails to launch:

1. Ensure Node.js 18+ is installed: `node --version`
2. Reinstall dependencies:
   ```bash
   cd swig/swig
   rm -rf node_modules
   npm install
   npm start
   ```

### Routes not found

If routes aren't working:

1. In Swig, click **"Transpile"** to regenerate routes
2. Check that `.cs` files exist next to your `.tsx` files
3. Ensure `MapMinimactPages()` is called in `Program.cs`

### Transpiler not working

If file changes aren't detected in Swig:

1. Check that files have `.tsx` extension
2. Look for errors in the Swig terminal output
3. Try clicking **"Transpile"** manually

### Port already in use

If port 5000 is taken:

1. In Swig terminal, run:
   ```bash
   dotnet run --urls "http://localhost:5001"
   ```
2. Or stop the other process using port 5000

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

## Advanced Features in Swig

### Template Inspector

View the extracted templates from your components:

1. Click **"Inspector"** tab
2. Select a component from the tree
3. See all extracted templates with bindings
4. Filter by type: static, dynamic, conditional, loop

### File Watcher

Swig automatically watches for file changes and rebuilds:
- TSX files → Transpiles to C#
- Template changes → Hot reloads browser
- C# files → Triggers dotnet build

### Project Templates

Swig includes several starter templates:
- **Empty** — Minimal Minimact project
- **Todo App** — CRUD operations example
- **Electron File Manager** — Desktop app with native APIs
- **Dashboard** — Admin panel with charts

---

🌵 **You're ready to build with Minimact and Swig!** 🌵

For advanced CLI usage (optional), see the [CLI Reference](/v1.0/cli/commands).
