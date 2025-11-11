# @minimact/swig

CLI tool for Minimact development - Create, transpile, and run Minimact applications.

## Installation

```bash
npm install -g @minimact/swig
# or use npx
npx @minimact/swig <command>
```

## Commands

### `swig install`

Install Minimact Swig GUI to AppData.

```bash
swig install           # Install Swig GUI
swig install --force   # Force reinstall
```

The GUI is installed to:
- **Windows**: `%APPDATA%\minimact-swig`
- **macOS**: `~/Library/Application Support/minimact-swig`
- **Linux**: `~/.local/share/minimact-swig`

### `swig launch`

Launch the Minimact Swig GUI.

```bash
swig launch
```

### `swig new`

Create a new Minimact project.

```bash
swig new <template> <name>

# Examples
swig new counter MyCounterApp
swig new mvc MyMvcApp --tailwind
swig new dashboard MyDashboard --hooks useState,useEffect
```

**Templates:**
- `counter` - Simple counter app
- `todolist` - Todo list app
- `dashboard` - Dashboard with charts
- `mvc` - MVC Bridge pattern
- `mvc-dashboard` - MVC + Dashboard

**Options:**
- `--tailwind` - Enable Tailwind CSS
- `--no-solution` - Skip creating .sln file
- `--hooks <hooks>` - Comma-separated list of hook examples

### `swig transpile`

Transpile TSX files to C#.

```bash
swig transpile                         # Transpile entire project
swig transpile Pages/CounterPage.tsx   # Transpile specific file
swig transpile Pages/**/*.tsx          # Transpile multiple files
```

**Options:**
- `-p, --project <path>` - Project root directory (default: current directory)

### `swig run`

Run the ASP.NET Core application.

```bash
swig run              # Build and run
swig run --no-build   # Run without building
swig run --port 3000  # Run on custom port
```

**Options:**
- `--port <port>` - Port number (default: 5000)
- `--no-build` - Skip dotnet build

### `swig watch`

Watch for TSX changes and auto-transpile.

```bash
swig watch
```

**Options:**
- `-p, --project <path>` - Project root directory (default: current directory)

## Workflow Examples

### Quick Start

```bash
# Create new project
npx @minimact/swig new counter MyApp

# Navigate to project
cd MyApp

# Watch for changes and run
npx @minimact/swig watch   # Terminal 1
npx @minimact/swig run     # Terminal 2
```

### Using the GUI

```bash
# Install Swig GUI (one-time)
npx @minimact/swig install

# Launch GUI
npx @minimact/swig launch
```

### CI/CD

```bash
# In your CI/CD pipeline
npx @minimact/swig transpile  # Transpile TSX to C#
dotnet build                   # Build the project
dotnet test                    # Run tests
```

## Architecture

`@minimact/swig` is a lightweight CLI wrapper around `@minimact/swig-shared`, which contains the core services:

- **ProjectManager** - Create and manage projects
- **TranspilerService** - Transpile TSX to C# using babel-plugin-minimact
- **FileWatcher** - Watch files and trigger auto-transpilation

The same services power both the CLI and the Swig Electron GUI.

## Requirements

- Node.js 18+
- .NET 9.0 SDK
- Git (for `swig install`)

## License

MIT
