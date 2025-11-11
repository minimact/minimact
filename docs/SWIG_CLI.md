# Minimact Swig CLI

The Minimact Swig CLI (`@minimact/swig`) is a command-line tool for creating, managing, and developing Minimact applications. Use it directly with `npx` without installation, or install it globally for convenience.

## Quick Start

```bash
# Create a new Minimact project (interactive mode)
npx @minimact/swig new

# Or specify template and name directly
npx @minimact/swig new counter MyCounterApp

# Navigate to your project
cd MyCounterApp

# Watch for TSX changes and auto-transpile
npx @minimact/swig watch

# In another terminal, run the app
npx @minimact/swig run
```

## Installation

### Global Installation (Optional)

```bash
npm install -g @minimact/swig
```

After global installation, you can use `swig` instead of `npx @minimact/swig`:

```bash
swig new counter MyApp
swig watch
swig run
```

### Using with npx (No Installation)

```bash
npx @minimact/swig <command>
```

## Commands

### `swig new` - Create a New Project

Create a new Minimact project with interactive prompts or direct arguments.

**Interactive Mode:**
```bash
npx @minimact/swig new
```

Prompts you for:
- Project name (PascalCase or underscores, no dashes)
- Template selection (Counter, Todo List, Dashboard, MVC Bridge, etc.)
- Tailwind CSS option
- Visual Studio solution file option
- Hook examples to include

**Direct Mode:**
```bash
npx @minimact/swig new <template> <name> [options]
```

**Examples:**
```bash
# Create a counter app
npx @minimact/swig new counter MyCounterApp

# Create an MVC app with Tailwind
npx @minimact/swig new mvc MyMvcApp --tailwind

# Create a dashboard with specific hooks
npx @minimact/swig new dashboard MyDashboard --hooks useState,useEffect

# Skip solution file creation
npx @minimact/swig new counter MyApp --no-solution
```

**Available Templates:**
- `Counter` - Simple counter app with useState
- `TodoList` - Todo list app with add/delete/toggle
- `Dashboard` - Dashboard with charts (BarChart, LineChart, PieChart, AreaChart)
- `MVC` - MVC Bridge pattern with ViewModels
- `MVC-Dashboard` - MVC Bridge + Dashboard with charts
- `Electron-FileManager` - Desktop file manager with Electron + Minimact

**Options:**
- `--tailwind` - Enable Tailwind CSS
- `--no-solution` - Skip creating .sln file
- `--hooks <hooks>` - Comma-separated list of hook examples (useState, useEffect, useRef, useMvcState, useMvcViewModel)

---

### `swig add` - Add a Page with Controller

Generate a new page with its controller and optional ViewModel.

**Interactive Mode:**
```bash
npx @minimact/swig add
```

Prompts you for:
- Page name (e.g., ProductDetails)
- Route path (e.g., Products/{id})
- MVC Bridge pattern option

**Direct Mode:**
```bash
npx @minimact/swig add <pageName> <routePath> [options]
```

**Examples:**
```bash
# Add a home page at the root route
npx @minimact/swig add HomePage "index"
npx @minimact/swig add HomePage "/"
npx @minimact/swig add HomePage ""

# Add a product details page with route parameter
npx @minimact/swig add ProductDetails "Products/{id}"

# Add a page with MVC Bridge pattern (includes ViewModel)
npx @minimact/swig add UserProfile "Users/{userId}/Profile" --mvc
```

**What it generates:**
1. **Controller** (`Controllers/ProductDetailsController.cs`)
   - Route attributes
   - Action methods with parameters
   - MinimactPageRenderer integration
2. **Page** (`Pages/ProductDetailsPage.tsx`)
   - Component with useState or useMvcViewModel
   - Auto-transpiles to C#
3. **ViewModel** (if `--mvc` flag) (`ViewModels/ProductDetailsViewModel.cs`)
   - Template with property placeholders

**Special Route Handling:**
- `index`, `/`, or `` → Routes to `/` (root)
- `Products/{id}` → Routes to `/Products/{id}` with parameter
- `Users/{userId}/Profile` → Routes to `/Users/{userId}/Profile`

**Options:**
- `--mvc` - Use MVC Bridge pattern with ViewModel
- `-p, --project <path>` - Project root directory (default: current directory)

---

### `swig remove` - Remove a Page

Remove a page and all its associated files (controller, ViewModel, generated files).

**Interactive Mode:**
```bash
npx @minimact/swig remove
```

Shows a list of existing pages to select from, then prompts for confirmation.

**Direct Mode:**
```bash
npx @minimact/swig remove <pageName>
```

**Examples:**
```bash
# Remove a page (prompts for confirmation)
npx @minimact/swig remove ProductDetails

# Remove without confirmation
npx @minimact/swig remove ProductDetails --force
```

**What it removes:**
- `Pages/ProductDetailsPage.tsx`
- `Pages/ProductDetailsPage.cs`
- `Pages/ProductDetailsPage.tsx.keys`
- `Pages/ProductDetailsPage.hooks.json`
- `Pages/ProductDetailsPage.templates.json`
- `Pages/ProductDetailsPage.structural-changes.json`
- `Controllers/ProductDetailsController.cs`
- `ViewModels/ProductDetailsViewModel.cs` (if exists)

**Options:**
- `--force` - Skip confirmation prompt
- `-p, --project <path>` - Project root directory (default: current directory)

---

### `swig transpile` - Transpile TSX to C#

Transpile TSX files to C# using babel-plugin-minimact.

**Transpile entire project:**
```bash
npx @minimact/swig transpile
```

**Transpile specific files:**
```bash
npx @minimact/swig transpile Pages/CounterPage.tsx
npx @minimact/swig transpile Pages/CounterPage.tsx Components/Header.tsx
```

**What it does:**
- Parses TSX with Babel
- Generates C# component classes
- Creates `.tsx.keys` file (keyed version for structural change detection)
- Replaces original TSX with keyed version
- Generates metadata files (`.hooks.json`, `.templates.json`, `.structural-changes.json`)

**Options:**
- `-p, --project <path>` - Project root directory (default: current directory)

---

### `swig watch` - Auto-Transpile on Save

Watch for TSX/JSX file changes and automatically transpile them.

```bash
npx @minimact/swig watch
```

**What it does:**
- Runs initial transpilation of entire project
- Watches for file changes (200ms debounce)
- Auto-transpiles on save
- Shows success/error messages for each transpilation

**Options:**
- `-p, --project <path>` - Project root directory (default: current directory)

**Tip:** Run this in one terminal while developing, and run `swig run` in another terminal.

---

### `swig run` - Run the Application

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

# Run on custom port
npx @minimact/swig run --port 3000
```

**What it does:**
1. Runs `dotnet build` (unless `--no-build`)
2. Runs `dotnet run` with optional port configuration
3. Starts the ASP.NET Core server

**Options:**
- `--port <port>` - Port number (default: 5000)
- `--no-build` - Skip dotnet build

---

### `swig install` - Install Swig GUI

Download and install the Minimact Swig GUI (Electron app) to your system.

```bash
npx @minimact/swig install
```

**What it does:**
1. Clones the Swig repository from GitHub
2. Extracts the `swig` subfolder
3. Copies it to your AppData directory
4. Runs `npm install`

**Installation Locations:**
- **Windows:** `%APPDATA%\minimact-swig`
- **macOS:** `~/Library/Application Support/minimact-swig`
- **Linux:** `~/.local/share/minimact-swig`

**Options:**
- `--force` - Force reinstall even if already installed

---

### `swig launch` - Launch Swig GUI

Launch the Minimact Swig GUI (Electron app).

```bash
npx @minimact/swig launch
```

**Requirements:** Must run `swig install` first.

**What it does:**
- Checks if Swig is installed
- Runs `npm start` in the Swig installation directory
- Opens the Electron GUI

---

## Typical Workflows

### Workflow 1: CLI-Only Development

```bash
# Create project
npx @minimact/swig new counter MyApp
cd MyApp

# Add pages
npx @minimact/swig add HomePage "/"
npx @minimact/swig add ProductDetails "Products/{id}" --mvc

# Start development (two terminals)
# Terminal 1: Watch for TSX changes
npx @minimact/swig watch

# Terminal 2: Run the app
npx @minimact/swig run

# Navigate to http://localhost:5000
```

### Workflow 2: GUI + CLI Hybrid

```bash
# Install GUI (one-time)
npx @minimact/swig install

# Launch GUI for visual development
npx @minimact/swig launch

# Use CLI for quick page generation
npx @minimact/swig add UserProfile "Users/{id}"

# Remove pages via CLI
npx @minimact/swig remove ProductDetails --force
```

### Workflow 3: CI/CD Pipeline

```bash
# In your GitHub Actions / CI pipeline
- name: Transpile TSX files
  run: npx @minimact/swig transpile

- name: Build .NET project
  run: dotnet build

- name: Run tests
  run: dotnet test

- name: Publish
  run: dotnet publish -c Release
```

---

## Tips & Best Practices

### Project Structure

Minimact projects follow this structure:

```
MyMinimactApp/
├── Controllers/          # ASP.NET Core controllers
│   ├── HomeController.cs
│   └── ProductsController.cs
├── Pages/                # Minimact pages (TSX + generated C#)
│   ├── CounterPage.tsx
│   ├── CounterPage.cs    # Generated by transpiler
│   └── CounterPage.tsx.keys
├── ViewModels/           # MVC Bridge ViewModels (optional)
│   └── ProductViewModel.cs
├── Components/           # Reusable components
├── wwwroot/             # Static files
│   ├── js/
│   │   └── minimact.js  # Client runtime
│   └── css/
├── Program.cs           # ASP.NET Core entry point
└── MyMinimactApp.csproj
```

### Naming Conventions

- **Pages:** Use PascalCase with `Page` suffix (e.g., `CounterPage`, `ProductDetailsPage`)
- **Controllers:** Use PascalCase with `Controller` suffix (e.g., `HomeController`, `ProductsController`)
- **ViewModels:** Use PascalCase with `ViewModel` suffix (e.g., `ProductViewModel`)
- **Routes:** Use kebab-case or route parameters (e.g., `products/{id}`, `users/{userId}/profile`)

### Development Tips

1. **Run `swig watch` in the background** - Auto-transpilation on save keeps your C# files in sync
2. **Use `--mvc` for data-heavy pages** - ViewModels provide a clean separation between server data and client state
3. **Leverage route parameters** - Use `{id}`, `{userId}` etc. in routes for dynamic pages
4. **Test with `npx` first** - Before installing globally, test commands with `npx @minimact/swig`
5. **Use `swig remove --force` in scripts** - Skip confirmation prompts in automated workflows

### Troubleshooting

**Error: "Failed to copy client runtime"**
- Make sure the client runtime is built: `cd src/client-runtime && npm run build`
- For published packages, this is handled automatically

**Transpilation fails**
- Check your TSX syntax for errors
- Ensure you're importing from `@minimact/core` or `@minimact/mvc`
- Run `npx @minimact/swig transpile <file>` to see specific errors

**Port already in use**
- Use `--port` flag: `npx @minimact/swig run --port 3000`
- Or kill the process using port 5000

**Page not showing up**
- Make sure you ran `swig transpile` or `swig watch`
- Check that the route matches in both the controller and browser
- Verify the controller action returns `MinimactPageRenderer.RenderPage<YourPage>()`

---

## Getting Help

```bash
# Show all commands
npx @minimact/swig --help

# Show help for a specific command
npx @minimact/swig new --help
npx @minimact/swig add --help
```

## Version

```bash
npx @minimact/swig --version
```

---

## Related Documentation

- [Minimact Overview](./README.md)
- [Client Runtime](./CLIENT_RUNTIME.md)
- [MVC Bridge Pattern](./MVC_BRIDGE.md)
- [Hooks API](./HOOKS.md)
- [Babel Plugin](./BABEL_PLUGIN.md)

---

## Contributing

Found a bug or have a feature request? Open an issue on [GitHub](https://github.com/minimact/minimact/issues).
