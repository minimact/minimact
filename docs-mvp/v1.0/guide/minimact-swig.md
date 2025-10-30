# Minimact SWIG - Development Tools

**SWIG** = Server-Web Instrumentation Gateway
**Status**: ✅ Fully Implemented
**Version**: 1.0
**Last Updated**: October 29, 2025

---

## Overview

**Minimact SWIG** is a professional Electron-based DevTools suite for debugging and inspecting Minimact server-side React applications. It provides real-time inspection, state editing, template debugging, and advanced visualization features comparable to React DevTools and Vue DevTools, but specifically designed for server-rendered applications.

---

## Key Features

### 1. 🗂️ Project Management
- Create new Minimact projects from templates
- Open and load existing projects
- Recent projects list with quick access
- Auto-detect project structure and configuration

### 2. 📝 Code Editor
- **Monaco Editor** integration (same editor as VS Code)
- TypeScript and TSX syntax highlighting
- File tree navigation
- Auto-transpile TSX → C# on save
- Real-time error detection

### 3. 🔨 Build & Run Controls
- One-click build (`dotnet build`)
- One-click run (`dotnet run`)
- Real-time terminal output
- Error and warning parsing
- Process lifecycle management

### 4. 🔍 State Inspector ⭐
- **Component tree visualization** - Hierarchical view of all components
- **Live state inspection** - View all state in real-time:
  - `useState` values
  - `useRef` values
  - `useDomElementState` snapshots
  - `useQuery` results
  - `useComputed` values
  - `useEffect` metadata (dependencies, cleanup status)
- **Live state editing** - Modify state values and see instant updates
- **Loop template metadata** - View `[LoopTemplate]` attributes

### 5. 🌊 Reactive Cascade Visualization ⭐
- **Preview state change cascades** - See what would happen if you changed a value
- **Wave-by-wave visualization** - Understand dependency chains:
  - Wave 0: Primary change
  - Wave 1: Effects/computed triggered by Wave 0
  - Wave 2: Effects/computed triggered by Wave 1
  - Wave N: Continues until no more changes
- **Circular dependency detection** - Identify infinite loops
- **DOM patch inspection** - View exact DOM changes for each wave
- **Color-coded highlighting** - Visual feedback in target app (planned)

### 6. 📋 Template Inspector (Planned)
- View all `[LoopTemplate]` definitions
- Template structure tree visualization
- Binding graphs
- Template preview with custom state
- Coverage tracking
- Performance profiling

---

## Installation

### Prerequisites

- **Node.js**: 18+ (for Electron)
- **.NET SDK**: 8.0+ (for building Minimact projects)
- **Windows, macOS, or Linux**

### Download

```bash
# Clone the repository
git clone https://github.com/minimact/minimact-swig-electron.git
cd minimact-swig-electron

# Install dependencies
npm install

# Start in development mode
npm run dev

# Build for production
npm run build

# Create distributable
npm run build:win   # Windows
npm run build:mac   # macOS
npm run build:linux # Linux
```

---

## Quick Start

### 1. Launch SWIG

```bash
npm run dev
```

### 2. Open or Create a Project

**Option A**: Open existing project
- Click "Open Project"
- Select your Minimact project folder

**Option B**: Create new project
- Click "Create New Project"
- Enter project name
- Select template (Counter, TodoList, Dashboard)
- Choose target directory
- SWIG creates project structure automatically

### 3. Start Developing

**Dashboard View**:
- **Left**: File tree - Navigate project files
- **Center**: Monaco editor - Edit TSX components
- **Bottom**: Terminal - Build/run output
- **Right**: Inspector - Component state (toggle with button)

**Workflow**:
1. Edit TSX file in Monaco editor
2. Press Save (Ctrl+S / Cmd+S) → Auto-transpiles to C#
3. Click "Build" → Compiles project
4. Click "Run" → Starts dev server
5. Click "Inspector" → Opens state inspection panel
6. Select component in tree → View/edit state

---

## State Inspector

### Component Tree

The component tree shows all registered Minimact components in a hierarchical structure:

```
📦 App
├── 🔵 Header
├── 📦 MainContent
│   ├── 🔵 Sidebar
│   ├── 📦 ContentArea
│   │   ├── 🔵 TodoList
│   │   └── 🔵 TodoItem (x5)
│   └── 🔵 Footer
```

**Features**:
- Click to select component
- Expand/collapse nested components
- Real-time updates (polls every 2 seconds)

### State Sections

When you select a component, the inspector shows:

#### 1. State (useState values)

```
📊 State
├── count: 42 [Edit]
├── isLoggedIn: true [Edit]
└── user: { name: "Alice", id: 123 } [Edit]
```

**Live Editing**:
- Click [Edit] button
- Modify value in modal
- Click "Update" → Instant update in target app

#### 2. Refs (useRef values)

```
🔗 Refs
├── inputRef: <input type="text" />
└── containerRef: <div class="container">
```

#### 3. DOM Element States (useDomElementState)

```
📐 DOM Element States
└── headerState:
    ├── isIntersecting: true
    ├── childrenCount: 3
    ├── exists: true
    └── classList: ["header", "sticky"]
```

#### 4. Query Results (useQuery)

```
🔎 Query Results
└── usersQuery:
    ├── status: "success"
    ├── data: [{ id: 1, name: "Alice" }, ...]
    └── lastFetched: "2025-10-29T12:00:00Z"
```

#### 5. Effects (useEffect)

```
⚡ Effects
└── Effect #1
    ├── Dependencies: ["count", "isLoggedIn"]
    ├── Has Cleanup: true
    └── Last Run: "2025-10-29T12:05:30Z"
```

#### 6. Templates ([LoopTemplate] metadata)

```
📋 Templates
└── todos:
    ├── arrayBinding: "todos"
    ├── itemVar: "todo"
    ├── keyBinding: "item.id"
    └── itemTemplate: { ... }
```

---

## Reactive Cascade Visualization

### What is a Cascade?

When you change state, it can trigger **cascading effects**:

1. **Wave 0** (Primary): You change `count = 5`
2. **Wave 1** (Secondary): `useEffect` depending on `count` runs → changes `doubledCount = 10`
3. **Wave 2** (Tertiary): `useEffect` depending on `doubledCount` runs → changes `message = "Even"`
4. **Wave N**: Continues until no more effects trigger

### How to Use

1. **Open Inspector** → Select component
2. **Find state value** you want to preview
3. **Click "Preview Cascade"** button
4. **Modal opens** showing:
   - Total waves
   - Total affected elements
   - Computation time
   - Wave-by-wave breakdown
   - DOM patches for each wave
   - Circular dependency warnings (if any)

### Example Cascade

```
State Change Preview: count → 5

🌊 Wave 0 (Primary)
   Trigger: count changed from 3 to 5
   Affects: 1 element

   DOM Patches:
   ├── SetText @ #counter-display → "5"

🌊 Wave 1 (Secondary - 2ms later)
   Trigger: useEffect [count] executed
   Affects: 2 elements

   DOM Patches:
   ├── SetText @ #doubled-display → "10"
   └── SetAttribute @ #status-badge .className → "even"

🌊 Wave 2 (Tertiary - 3ms later)
   Trigger: useEffect [doubledCount] executed
   Affects: 1 element

   DOM Patches:
   └── SetText @ #message → "Your count doubled is even"

✅ No more changes (cascade completed)
```

### Circular Dependency Detection

If SWIG detects a circular dependency:

```
⚠️ CIRCULAR DEPENDENCY DETECTED

Cycle: count → doubledCount → count → ...

This creates an infinite loop!
Waves: 0 → 1 → 2 → 3 → 4 → 5 → 6 → ...
```

**Solution**: Refactor effects to break the cycle (use cleanup, add dependency checks, etc.)

---

## Template Inspector (Planned)

### Overview

The Template Inspector provides deep insight into loop templates extracted by babel-plugin-minimact.

### Features

**1. Template List**
- All components with `[LoopTemplate]` attributes
- Click to inspect template structure

**2. Template Tree**
```
TodoList.todos
├── itemTemplate: <li>
│   ├── props:
│   │   └── className: {item.done} ? "done" : "pending"
│   └── children:
│       ├── <span>{item.text}</span>
│       └── <button onClick={toggleTodo({item.id})}>
│           └── {item.done ? "✓" : "○"}
```

**3. Binding Graph**
```
todos (state)
  ↓
item.done → className conditional
item.text → span text content
item.id   → button onClick handler
item.id   → li key
```

**4. Template Preview**

**Live preview with custom state**:
```javascript
// Input
todos = [
  { id: 1, text: "Learn Minimact", done: false },
  { id: 2, text: "Build app", done: true }
]

// Preview Output (rendered HTML)
<li key="1" class="pending">
  <span>Learn Minimact</span>
  <button onclick="toggleTodo(1)">○</button>
</li>
<li key="2" class="done">
  <span>Build app</span>
  <button onclick="toggleTodo(2)">✓</button>
</li>
```

**5. Coverage Analysis**

Track which templates are being used:

```
Template Usage Stats
├── todos: 156 applications (98% hit rate)
├── comments: 45 applications (92% hit rate)
└── users: 12 applications (100% hit rate)
```

**6. Performance Profiling**

Compare template application time vs full renders:

```
Performance Comparison
├── Template Application: 2.3ms avg
├── Full Server Render: 45ms avg
└── Speedup: 19.6x
```

---

## Architecture

### Three-Layer Design

```
┌──────────────────────────────────────────┐
│   React Renderer (UI Components)        │
│   - Pages (Home, Dashboard, Inspector)  │
│   - Components (FileTree, CodeEditor)   │
│   - State management (Zustand)          │
└────────────────┬─────────────────────────┘
                 │ IPC (window.api)
┌────────────────▼─────────────────────────┐
│   Preload Script (API Bridge)            │
│   - Exposes IPC methods to renderer      │
│   - Type-safe API surface                │
└────────────────┬─────────────────────────┘
                 │ electron.ipcRenderer
┌────────────────▼─────────────────────────┐
│   Main Process (Services & IPC)          │
│   - Services (SignalR, Transpiler, etc.) │
│   - IPC Handlers (project, file, etc.)   │
└────────────────┬─────────────────────────┘
                 │ SignalR Hub Connection
┌────────────────▼─────────────────────────┐
│   Target Minimact App (ASP.NET Core)    │
│   - MinimactHub (SignalR endpoint)       │
│   - Components with state                │
└──────────────────────────────────────────┘
```

### Services

**1. SignalRClient**
- Establishes connection to target app's SignalR hub
- Bidirectional communication (invoke methods, receive events)
- Automatic reconnection

**2. TranspilerService**
- Runs Babel with babel-plugin-minimact
- Transpiles TSX → C#
- Error reporting

**3. ProcessController**
- Spawns dotnet build/run processes
- Captures stdout/stderr
- Parses errors and warnings

**4. ProjectManager**
- Stores project metadata
- Recent projects list
- Project creation from templates

**5. FileWatcher**
- Watches project files for changes
- Triggers auto-transpilation

**6. WaveHighlighter** (Planned)
- Injects overlay into target app
- Highlights DOM elements by wave
- Animated visualization

---

## Technology Stack

### Frontend (Renderer)
- **React 19** - UI framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Monaco Editor** - Code editing
- **xterm.js** - Terminal emulation
- **Lucide React** - Icons
- **React Router** - Navigation

### Backend (Main Process)
- **Electron** - Desktop application shell
- **Node.js** - JavaScript runtime
- **Babel** - TSX transpilation (via babel-plugin-minimact)
- **execa** - Process spawning
- **chokidar** - File watching
- **@microsoft/signalr** - SignalR client

### Communication
- **Electron IPC** - Renderer ↔ Main
- **SignalR WebSockets** - Main ↔ Target App

---

## API Reference

### window.api (Preload API)

#### Project APIs

```typescript
// Create new project
window.api.project.create(path: string, template: string): Promise<Project>

// Load existing project
window.api.project.load(path: string): Promise<Project>

// Get recent projects
window.api.project.getRecent(): Promise<RecentProject[]>

// Scan project files
window.api.project.scanFiles(path: string): Promise<ProjectFile[]>

// Open directory picker
window.api.project.selectDirectory(): Promise<string>
```

#### Transpiler APIs

```typescript
// Transpile single file
window.api.transpiler.transpileFile(filePath: string): Promise<TranspileResult>

// Transpile entire project
window.api.transpiler.transpileProject(projectPath: string): Promise<TranspileProjectResult>
```

#### Process APIs

```typescript
// Build project
window.api.process.build(projectPath: string): Promise<BuildResult>

// Start development server
window.api.process.start(projectPath: string, port: number): Promise<void>

// Stop running process
window.api.process.stop(): Promise<void>

// Check if process is running
window.api.process.isRunning(): Promise<boolean>

// Subscribe to output stream
window.api.process.subscribeOutput(callback: (data: string) => void): void

// Listen for output events
window.api.process.onOutput(callback: (data: string) => void): () => void
```

#### File APIs

```typescript
// Read file contents
window.api.file.read(filePath: string): Promise<string>

// Write file contents
window.api.file.write(filePath: string, content: string): Promise<void>

// Open in external editor
window.api.file.openInEditor(filePath: string, editor?: string): Promise<void>

// Open in file explorer
window.api.file.showInFolder(filePath: string): Promise<void>
```

#### SignalR APIs

```typescript
// Connect to target app
window.api.signalr.connect(url: string): Promise<void>

// Disconnect
window.api.signalr.disconnect(): Promise<void>

// Check connection status
window.api.signalr.isConnected(): Promise<boolean>

// Get component tree
window.api.signalr.getComponentTree(): Promise<ComponentTreeNode[]>

// Get component state snapshot
window.api.signalr.getComponentState(componentId: string): Promise<ComponentState>

// Update component state (live editing)
window.api.signalr.updateComponentState(
  componentId: string,
  stateKey: string,
  value: any
): Promise<void>

// Get all components
window.api.signalr.getAllComponents(): Promise<Component[]>

// Trigger component re-render
window.api.signalr.triggerRender(componentId: string): Promise<void>

// Subscribe to component changes
window.api.signalr.subscribeStateChanges(componentId: string): Promise<void>

// Unsubscribe
window.api.signalr.unsubscribeStateChanges(componentId: string): Promise<void>

// Preview state change cascade
window.api.signalr.previewCascade(
  componentId: string,
  stateKey: string,
  value: any
): Promise<CascadePreview>
```

---

## Best Practices

### 1. Development Workflow

**Recommended flow**:
1. Open project in SWIG
2. Edit components in Monaco editor (or external VS Code)
3. Save → Auto-transpiles
4. Build → Verify no errors
5. Run → Start dev server
6. Inspector → Debug state issues
7. Cascade Preview → Understand effect chains

### 2. State Debugging

**When to use Inspector**:
- State not updating as expected
- Understanding effect dependencies
- Verifying state persistence
- Testing edge cases with live editing

**When to use Cascade Preview**:
- Complex effect chains
- Unexpected re-renders
- Circular dependency debugging
- Understanding wave propagation

### 3. Template Debugging (Planned)

**When to use Template Inspector**:
- Verify template extraction
- Check binding correctness
- Profile template performance
- Test template with edge-case data

---

## Troubleshooting

### SWIG Won't Connect to App

**Problem**: Inspector shows "Not connected"

**Solutions**:
1. Verify target app is running (`dotnet run`)
2. Check SignalR hub endpoint (default: `/minimact`)
3. Verify port (default: 5000)
4. Check firewall settings

### Build Fails

**Problem**: Build button shows errors

**Solutions**:
1. Check terminal output for specific error
2. Verify `.csproj` file is correct
3. Ensure .NET SDK is installed (`dotnet --version`)
4. Check C# generated from TSX for syntax errors

### Transpilation Errors

**Problem**: TSX → C# transpilation fails

**Solutions**:
1. Check babel-plugin-minimact version
2. Verify TSX syntax is valid
3. Look for unsupported patterns (dynamic tags, etc.)
4. Check terminal output for Babel errors

---

## Keyboard Shortcuts

### Editor
- **Ctrl/Cmd + S**: Save file (triggers auto-transpile)
- **Ctrl/Cmd + F**: Find in file
- **Ctrl/Cmd + H**: Find and replace
- **Ctrl/Cmd + /**: Toggle comment

### Application
- **Ctrl/Cmd + B**: Build project
- **Ctrl/Cmd + R**: Run project
- **Ctrl/Cmd + Shift + S**: Stop process
- **Ctrl/Cmd + I**: Toggle Inspector

---

## Comparison to React DevTools

| Feature | React DevTools | Minimact SWIG |
|---------|----------------|---------------|
| **Component Tree** | ✅ Yes | ✅ Yes |
| **State Inspection** | ✅ Read-only | ✅ Live editing |
| **Props Inspection** | ✅ Yes | ✅ Yes |
| **Effect Dependencies** | ❌ No | ✅ Yes |
| **Template Metadata** | ❌ No | ✅ Yes |
| **Cascade Visualization** | ❌ No | ✅ Yes |
| **Circular Dep Detection** | ❌ No | ✅ Yes |
| **Code Editor** | ❌ No | ✅ Monaco |
| **Build/Run Controls** | ❌ No | ✅ Yes |
| **Template Inspector** | ❌ No | ✅ Planned |

---

## Future Enhancements

### Phase 2 Features

1. **Hot Reload** - Edit → Transpile → Swap without restart
2. **Wave Highlighting** - Visual highlighting in target app
3. **Template Coverage Dashboard** - Track template usage across app
4. **Performance Profiler** - Flamegraphs, memory analysis
5. **Git Integration** - Commit, push, pull from SWIG
6. **Deployment Tools** - Deploy to Azure/AWS

### Phase 3 Features

1. **Component Marketplace** - Browse and install components
2. **Visual Component Builder** - Drag-and-drop UI
3. **AI Assistant** - Code completion, bug detection
4. **Collaboration** - Share projects, pair programming
5. **Plugin System** - Extend SWIG with custom plugins

---

## Contributing

SWIG is open source! Contributions welcome.

**Repository**: [github.com/minimact/minimact-swig-electron](https://github.com/minimact/minimact-swig-electron)

**Areas for contribution**:
- Template Inspector UI implementation
- Wave highlighting visualization
- Additional editor features
- Performance improvements
- Bug fixes

---

## Related Documentation

- [Template Patch System Deep Dive](/v1.0/architecture/template-patch-system-deep-dive)
- [Predictive Rendering](/v1.0/guide/predictive-rendering)
- [Getting Started](/v1.0/guide/getting-started)
- [Hooks API](/v1.0/api/hooks)
