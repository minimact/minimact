# Minimact Swig CLI

**Quick Command-Line Tool for Minimact Development**

**Status**: ✅ Fully Implemented
**Package**: `@minimact/swig`
**Version**: 1.0

---

## Overview

The **Minimact Swig CLI** (`@minimact/swig`) is a lightweight command-line tool for creating, managing, and developing Minimact applications. It provides a fast, scriptable interface to Minimact's core functionality without requiring the full Electron GUI.

**Key Features**:
- 🚀 Zero installation with `npx`
- 📦 Create projects from templates
- ➕ Add/remove pages with controllers
- 🔄 Auto-transpile TSX to C# on save
- ⚡ Run and build applications
- 🎨 Interactive prompts with beautiful UX

---

## Quick Start

```bash
# Create a new project (interactive)
npx @minimact/swig new

# Watch for changes and auto-transpile
cd MyApp
npx @minimact/swig watch

# Run the application (in another terminal)
npx @minimact/swig run
```

---

## Installation

### Option 1: Use with npx (No Installation)

```bash
npx @minimact/swig <command>
```

**Advantages**:
- Always uses latest version
- No global installation needed
- Perfect for CI/CD pipelines

### Option 2: Global Installation

```bash
npm install -g @minimact/swig
```

**Advantages**:
- Shorter commands (`swig` instead of `npx @minimact/swig`)
- Faster execution (no download step)
- Better for daily development

---

## Commands Reference

### `swig new` - Create Project

Create a new Minimact project with interactive prompts.

**Interactive Mode:**
```bash
npx @minimact/swig new
```

**Prompts**:
1. Project name (PascalCase or underscores)
2. Template selection
3. Tailwind CSS option
4. Visual Studio solution file
5. Hook examples to include

**Direct Mode:**
```bash
npx @minimact/swig new <template> <name> [options]
```

**Examples:**
```bash
# Counter app
npx @minimact/swig new counter MyCounterApp

# MVC app with Tailwind
npx @minimact/swig new mvc MyMvcApp --tailwind

# Dashboard with hooks
npx @minimact/swig new dashboard MyDashboard --hooks useState,useEffect
```

**Available Templates:**
| Template | Description |
|----------|-------------|
| `Counter` | Simple counter with useState |
| `TodoList` | Todo list with add/delete/toggle |
| `Dashboard` | Charts and metrics (BarChart, LineChart, etc.) |
| `MVC` | MVC Bridge pattern with ViewModels |
| `MVC-Dashboard` | MVC + Charts |
| `Electron-FileManager` | Desktop file manager |

**Options:**
- `--tailwind` - Enable Tailwind CSS
- `--no-solution` - Skip .sln file
- `--hooks <hooks>` - Comma-separated hook examples

---

### `swig add` - Add Page

Generate a new page with its controller and optional ViewModel.

**Interactive Mode:**
```bash
npx @minimact/swig add
```

**Direct Mode:**
```bash
npx @minimact/swig add <pageName> <routePath> [options]
```

**Examples:**
```bash
# Home page at root (/)
npx @minimact/swig add HomePage "index"
npx @minimact/swig add HomePage "/"

# Product details with route parameter
npx @minimact/swig add ProductDetails "Products/{id}"

# User profile with MVC pattern
npx @minimact/swig add UserProfile "Users/{userId}/Profile" --mvc
```

**Generated Files:**
1. **Controller** - `Controllers/ProductDetailsController.cs`
   - Route attributes
   - Action method with parameters
   - MinimactPageRenderer call
2. **Page** - `Pages/ProductDetailsPage.tsx`
   - Component code
   - Auto-transpiles to `.cs`
3. **ViewModel** (if `--mvc`) - `ViewModels/ProductDetailsViewModel.cs`

**Route Handling:**
- `index`, `/`, `""` → Routes to `/` (root)
- `Products/{id}` → Routes to `/Products/{id}`
- `Users/{userId}/Profile` → Routes to `/Users/{userId}/Profile`

**Options:**
- `--mvc` - Use MVC Bridge with ViewModel
- `-p, --project <path>` - Project directory

---

### `swig remove` - Remove Page

Remove a page and all associated files.

**Interactive Mode:**
```bash
npx @minimact/swig remove
```

Shows list of pages, prompts for confirmation.

**Direct Mode:**
```bash
npx @minimact/swig remove <pageName>
```

**Examples:**
```bash
# Remove with confirmation
npx @minimact/swig remove ProductDetails

# Remove without confirmation
npx @minimact/swig remove ProductDetails --force
```

**Removes:**
- `Pages/ProductDetailsPage.tsx`
- `Pages/ProductDetailsPage.cs`
- `Pages/ProductDetailsPage.tsx.keys`
- `Pages/ProductDetailsPage.hooks.json`
- `Pages/ProductDetailsPage.templates.json`
- `Pages/ProductDetailsPage.structural-changes.json`
- `Controllers/ProductDetailsController.cs`
- `ViewModels/ProductDetailsViewModel.cs` (if exists)

**Options:**
- `--force` - Skip confirmation
- `-p, --project <path>` - Project directory

---

### `swig transpile` - Transpile TSX

Transpile TSX files to C# using babel-plugin-minimact.

**Full Project:**
```bash
npx @minimact/swig transpile
```

**Specific Files:**
```bash
npx @minimact/swig transpile Pages/CounterPage.tsx
npx @minimact/swig transpile Pages/*.tsx
```

**What Happens:**
1. Babel parses TSX
2. Generates C# component class
3. Creates `.tsx.keys` (keyed version)
4. Replaces original TSX with keyed version
5. Generates metadata files

**Options:**
- `-p, --project <path>` - Project directory

---

### `swig watch` - Auto-Transpile

Watch for TSX changes and auto-transpile on save.

```bash
npx @minimact/swig watch
```

**Features:**
- Initial transpilation of entire project
- 200ms debounce for rapid changes
- Real-time success/error messages
- Graceful shutdown (Ctrl+C)

**Typical Usage:**
```bash
# Terminal 1: Watch mode
npx @minimact/swig watch

# Terminal 2: Run app
npx @minimact/swig run

# Edit files → Auto-transpiles → Hot reload (if configured)
```

**Options:**
- `-p, --project <path>` - Project directory

---

### `swig run` - Run Application

Build and run the ASP.NET Core application.

```bash
npx @minimact/swig run
```

**Examples:**
```bash
# Build and run
npx @minimact/swig run

# Run without building
npx @minimact/swig run --no-build

# Custom port
npx @minimact/swig run --port 3000
```

**Process:**
1. Runs `dotnet build` (unless `--no-build`)
2. Runs `dotnet run`
3. Starts ASP.NET Core server
4. Ctrl+C to stop

**Options:**
- `--port <port>` - Port number (default: 5000)
- `--no-build` - Skip build step

---

### `swig install` - Install GUI

Download and install the Minimact Swig GUI (Electron app).

```bash
npx @minimact/swig install
```

**What Happens:**
1. Clones `https://github.com/minimact/swig.git`
2. Extracts `swig` subfolder
3. Copies to AppData
4. Runs `npm install`

**Installation Paths:**
- **Windows:** `%APPDATA%\minimact-swig`
- **macOS:** `~/Library/Application Support/minimact-swig`
- **Linux:** `~/.local/share/minimact-swig`

**Options:**
- `--force` - Force reinstall

---

### `swig launch` - Launch GUI

Launch the Minimact Swig GUI.

```bash
npx @minimact/swig launch
```

**Requirements:**
- Must run `swig install` first
- Runs `npm start` in AppData directory

---

## Workflows

### Workflow 1: Quick Start (CLI Only)

```bash
# 1. Create project
npx @minimact/swig new counter MyApp
cd MyApp

# 2. Add pages
npx @minimact/swig add HomePage "/"
npx @minimact/swig add About "about"

# 3. Start development
# Terminal 1
npx @minimact/swig watch

# Terminal 2
npx @minimact/swig run

# 4. Open browser
# http://localhost:5000
```

### Workflow 2: GUI + CLI Hybrid

```bash
# Install GUI (one-time)
npx @minimact/swig install

# Use GUI for main development
npx @minimact/swig launch

# Use CLI for quick operations
npx @minimact/swig add UserProfile "users/{id}"
npx @minimact/swig remove OldPage --force
```

### Workflow 3: CI/CD Pipeline

```yaml
# .github/workflows/deploy.yml
- name: Transpile TSX
  run: npx @minimact/swig transpile

- name: Build
  run: dotnet build

- name: Test
  run: dotnet test

- name: Publish
  run: dotnet publish -c Release
```

---

## Tips & Best Practices

### Project Structure

```
MyMinimactApp/
├── Controllers/          # ASP.NET Core controllers
├── Pages/                # Minimact pages (TSX + C#)
├── ViewModels/           # MVC ViewModels (optional)
├── Components/           # Reusable components
├── wwwroot/             # Static files
│   ├── js/
│   │   └── minimact.js  # Client runtime
│   └── css/
├── Program.cs
└── MyMinimactApp.csproj
```

### Naming Conventions

- **Pages:** `CounterPage`, `ProductDetailsPage` (PascalCase + `Page`)
- **Controllers:** `HomeController`, `ProductsController` (PascalCase + `Controller`)
- **ViewModels:** `ProductViewModel`, `UserViewModel` (PascalCase + `ViewModel`)
- **Routes:** `products/{id}`, `users/{userId}/profile` (kebab-case)

### Development Habits

1. **Always run `swig watch`** - Keep transpilation running
2. **Use `--mvc` for data-heavy pages** - Clean separation of concerns
3. **Route parameters** - `{id}`, `{userId}` for dynamic pages
4. **Test with `npx` first** - Before installing globally
5. **Use `--force` in scripts** - Skip confirmations in automation

### Troubleshooting

**"Failed to copy client runtime"**
- Client runtime is auto-bundled in published packages
- For dev: `cd src/client-runtime && npm run build`

**Transpilation fails**
- Check TSX syntax
- Verify imports from `@minimact/core` or `@minimact/mvc`
- Run `npx @minimact/swig transpile <file>` for details

**Port already in use**
- Use `--port`: `npx @minimact/swig run --port 3000`
- Kill process on port 5000

**Page not showing**
- Run `swig transpile` or `swig watch`
- Check controller route matches browser URL
- Verify controller returns `MinimactPageRenderer.RenderPage<YourPage>()`

---

## Comparison: CLI vs GUI

| Feature | CLI | GUI |
|---------|-----|-----|
| **Installation** | None (npx) | One-time |
| **Speed** | ⚡ Instant | Slower |
| **Scriptable** | ✅ Yes | ❌ No |
| **CI/CD** | ✅ Perfect | ❌ Not suitable |
| **Visual Editor** | ❌ No | ✅ Monaco |
| **State Inspector** | ❌ No | ✅ Yes |
| **File Tree** | ❌ No | ✅ Yes |
| **Terminal** | ✅ Native | ✅ Integrated |
| **Best For** | Scripts, automation, quick tasks | Visual development, debugging |

**Recommendation**: Use **CLI for quick tasks** and **CI/CD**, use **GUI for active development** and **debugging**.

---

## API for Developers

If you're building tools that use Swig:

```typescript
import { ProjectManager, TranspilerService, FileWatcher } from '@minimact/swig-shared';

// Create projects programmatically
const pm = new ProjectManager('/path/to/data');
const project = await pm.createProject('/path/to/project', 'Counter');

// Transpile files
const transpiler = new TranspilerService();
const result = await transpiler.transpileFile('/path/to/Page.tsx');

// Watch for changes
const watcher = new FileWatcher();
watcher.watch('/path/to/project', (filePath) => {
  transpiler.transpileFile(filePath);
});
```

---

## Related Documentation

- [Minimact Swig GUI](/v1.0/guide/minimact-swig) - Full Electron DevTools
- [Getting Started](/v1.0/guide/getting-started) - Minimact basics
- [MVC Bridge Pattern](/v1.0/extensions/mvc-bridge) - useMvcState, useMvcViewModel
- [Hooks API](/v1.0/api/hooks) - useState, useEffect, useRef

---

## Getting Help

```bash
# Show all commands
npx @minimact/swig --help

# Show command-specific help
npx @minimact/swig new --help
npx @minimact/swig add --help
```

**Version:**
```bash
npx @minimact/swig --version
```

**Issues:** [github.com/minimact/minimact/issues](https://github.com/minimact/minimact/issues)
