# Minimact SWIG Electron - Architecture Documentation

## Overview

**SWIG** (Server-Web Instrumentation Gateway) is an Electron-based DevTools suite for Minimact applications. It provides real-time inspection, debugging, and performance analysis for server-side React applications using the dehydrationist architecture.

## Core Features

### 1. **Project Management**
- Create, load, and manage Minimact projects
- Auto-detect project structure and configuration
- Port management and process control

### 2. **Code Editor**
- Monaco-based editor with TypeScript support
- File tree navigation
- Auto-transpile TSX → C# on save

### 3. **Terminal Integration**
- xterm.js terminal for build/run output
- Real-time process monitoring
- Color-coded logs

### 4. **State Inspector** ⭐
- Hierarchical component tree view
- Live state inspection (useState, useRef, useDomElementState, useQuery, useComputed)
- Loop template metadata from `[LoopTemplate]` attributes
- Effect tracking with dependency arrays
- **Live state editing** - Modify state values and see instant updates
- **Computed state inspector** - View and manually re-run useComputed values
- **Visual DOM preview** - Highlight which DOM elements will be affected by state changes
- **Patch order visualization** - Show the sequence of DOM mutations

### 5. **Template Inspector** (Planned)
- View all `[LoopTemplate]` attributes for components
- Template bindings visualization
- Template preview with custom state
- Template coverage analysis
- Performance metrics

### 6. **SignalR Monitor** (Planned)
- Real-time message flow visualization
- Patch inspection (view DOM patches)
- Network latency breakdown
- Cache hit/miss statistics

### 7. **Performance Profiler** (Planned)
- Render timing (server → Rust → client)
- Flamegraphs for slow renders
- Memory usage tracking
- Template application vs full render comparison

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Minimact SWIG Electron                      │
│                                                                   │
│  ┌────────────┐  ┌────────────┐  ┌─────────────┐  ┌──────────┐ │
│  │  Project   │  │   Code     │  │  Terminal   │  │  State   │ │
│  │  Manager   │  │  Editor    │  │             │  │Inspector │ │
│  └────────────┘  └────────────┘  └─────────────┘  └──────────┘ │
│                                                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    IPC Bridge                              │  │
│  │  - file.ts (File operations)                              │  │
│  │  - process.ts (dotnet build/run)                          │  │
│  │  - transpiler.ts (TSX → C#)                               │  │
│  │  - signalr.ts (Hub communication)                         │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                   Main Process Services                    │  │
│  │  - SignalRClient (Connect to target app)                  │  │
│  │  - TranspilerService (babel-plugin-minimact)              │  │
│  │  - ProcessController (dotnet processes)                   │  │
│  │  - FileWatcher (Auto-transpile on save)                   │  │
│  │  - ProjectManager (Project metadata)                      │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                               │
                               │ SignalR Connection
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Target Minimact Application                     │
│                  (ASP.NET Core + Minimact)                       │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                      MinimactHub                            │ │
│  │  - InvokeComponentMethod()                                 │ │
│  │  - UpdateComponentState()                                  │ │
│  │  - UpdateDomElementState()                                 │ │
│  │  - UpdateQueryResults()                                    │ │
│  │  - GetComponentTree() ⭐                                   │ │
│  │  - GetComponentState() ⭐                                  │ │
│  │  - GetComponentMetadata() (Templates) ⭐                   │ │
│  │  - PreviewTemplate()                                       │ │
│  │  - GetTemplatePerformance()                                │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                  MinimactComponent                          │ │
│  │  - GetStateSnapshot() ⭐                                   │ │
│  │  - GetLoopTemplates()                                      │ │
│  │  - SetStateFromClient() (Sync)                             │ │
│  │  - SetDomStateFromClient() (Sync)                          │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │              Component State (Server-Side)                  │ │
│  │  - State: Dictionary<string, object>                       │ │
│  │  - Refs: Dictionary<string, object>                        │ │
│  │  - [LoopTemplate] attributes (from Babel)                  │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. **Component Tree Inspection**

```
User clicks "Inspector"
  → Renderer calls window.api.signalr.getComponentTree()
  → IPC to Main Process
  → SignalRClient.invoke('GetComponentTree')
  → MinimactHub.GetComponentTree()
  → ComponentRegistry.GetAllComponentIds()
  → Returns List<ComponentTreeNode>
  → ComponentTree.tsx displays hierarchy
```

### 2. **State Inspection**

```
User clicks component in tree
  → Renderer calls window.api.signalr.getComponentState(componentId)
  → IPC to Main Process
  → SignalRClient.invoke('GetComponentState', componentId)
  → MinimactHub.GetComponentState(componentId)
  → component.GetStateSnapshot()
  → Returns ComponentStateSnapshot with:
       - State values
       - Refs
       - DomElementStates
       - QueryResults
       - Effects
       - Loop templates ([LoopTemplate] attributes)
  → StateInspector.tsx displays all data
```

### 3. **Live State Editing**

```
User edits state value in Inspector
  → Renderer calls window.api.signalr.updateComponentState(componentId, key, value)
  → IPC to Main Process
  → SignalRClient.invoke('UpdateComponentState', componentId, key, value)
  → MinimactHub.UpdateComponentState()
  → component.SetStateFromClient(key, value)
  → component.TriggerRender()
  → Rust reconciler generates patches
  → Patches sent to client via SignalR
  → Client DOM updates instantly
```

### 4. **Computed State Inspection & Re-running**

```
User views computed states
  → StateInspector displays useComputed values from ComponentStateSnapshot
  → Shows:
     - Key (e.g., "sortedUsers")
     - Current value
     - Dependencies (state keys that trigger recomputation)
     - Last computed timestamp

User clicks "Re-run" button next to computed value
  → Renderer calls window.api.signalr.recomputeClientComputed(componentId, key)
  → IPC to Main Process
  → SignalRClient.invoke('RecomputeClientComputed', componentId, key)
  → MinimactHub.RecomputeClientComputed()
  → Server sends SignalR event to client: "RecomputeClientComputed"
  → Client receives event:
     1. Calls computeFn() again (e.g., _.sortBy(users, 'name'))
     2. Updates local state via setValue()
     3. Syncs to server via updateClientComputedState()
     4. Server re-renders with new computed value
     5. Patches sent to client
     6. DOM updates
  → Inspector refreshes to show new value
```

### 5. **Visual DOM Change Preview**

```
User hovers over state value or clicks "Preview Changes" button
  → StateInspector sends preview request with hypothetical new value
  → window.api.signalr.previewStateChange(componentId, stateKey, newValue)
  → IPC to Main Process
  → SignalRClient.invoke('PreviewStateChange', componentId, stateKey, newValue)
  → MinimactHub.PreviewStateChange()
  → Server renders with hypothetical state (doesn't save):
     1. Clone current component state
     2. Apply hypothetical state change
     3. Call Render() with new state
     4. Rust reconciler computes patches
     5. Returns patches WITHOUT applying them
  → SWIG receives patches with metadata:
     - Patch type (setText, setAttribute, addClass, insertElement, etc.)
     - Target selector/path
     - Old value → New value
     - Order index
  → SWIG injects overlay script into target app:
     - Highlights affected elements with colored borders
     - Shows numbered badges (1, 2, 3...) for patch order
     - Displays tooltips with change details
     - Color coding:
       • Green: New elements (insertElement)
       • Blue: Text changes (setText)
       • Yellow: Attribute changes (setAttribute, addClass)
       • Red: Removals (removeElement)
  → User can:
     - Click "Apply" to actually apply the changes
     - Click "Cancel" to dismiss preview
     - Hover over highlighted elements to see change details
```

**Example UI:**

```
State Inspector:
┌─────────────────────────────────────┐
│ TodoList Component                  │
├─────────────────────────────────────┤
│ State:                              │
│   todos: [...]                      │
│   isOpen: false [Preview] [Edit]   │  ← User clicks Preview
│   filter: "all"                     │
└─────────────────────────────────────┘

Preview Modal:
┌─────────────────────────────────────────────────────────────┐
│ Preview: isOpen = true                                      │
├─────────────────────────────────────────────────────────────┤
│ Affected Elements: 3                                        │
│                                                             │
│ ① <div id="menu"> - classList: add "visible"     [YELLOW] │
│ ② <div#menu> - style.display: "none" → "block"   [YELLOW] │
│ ③ <span.icon> - textContent: "▶" → "▼"          [BLUE]   │
│                                                             │
│ [Apply Changes]  [Cancel]                                  │
└─────────────────────────────────────────────────────────────┘

Target App (with overlay):
┌─────────────────────────────────────┐
│ ╔═══════════════════════════════╗   │  ← Yellow border
│ ║ ① Menu                        ║   │  ← Badge "1"
│ ║   - Item 1                    ║   │
│ ║   - Item 2                    ║   │
│ ╚═══════════════════════════════╝   │
│                                     │
│ [ ③ ▼ Toggle ]                      │  ← Blue border + Badge "3"
└─────────────────────────────────────┘
```

### 6. **Template Inspection**

```
User views component templates
  → Renderer calls window.api.signalr.getComponentMetadata(componentId)
  → MinimactHub.GetComponentMetadata()
  → Reflection: GetCustomAttributes(typeof(LoopTemplateAttribute))
  → Returns all [LoopTemplate] JSON
  → TemplateInspector.tsx displays:
       - Template structure
       - Bindings (item.text, item.done, etc.)
       - Conditional branches
       - Preview with current state
```

## Key Types

### Client-Side (TypeScript)

#### ComponentStateSnapshot
```typescript
interface ComponentStateSnapshot {
  componentId: string;
  componentName: string;
  state: Record<string, any>;               // useState values
  refs: Record<string, any>;                // useRef values
  domElementStates: Record<string, DomElementStateSnapshot>;  // useDomElementState
  queryResults: Record<string, any[]>;      // useQuery results
  computedStates: Record<string, ComputedStateInfo>;  // useComputed values
  effects: EffectInfo[];                    // useEffect metadata
  templates: LoopTemplateInfo[];            // [LoopTemplate] attributes
  timestamp: number;
}
```

#### ComputedStateInfo
```typescript
interface ComputedStateInfo {
  key: string;                              // "sortedUsers"
  value: any;                               // Current computed value
  dependencies: string[];                   // ["users"] - state keys
  lastComputedTimestamp: number | null;     // When last computed
}
```

#### DomElementStateSnapshot
```typescript
interface DomElementStateSnapshot {
  selector: string | null;
  isIntersecting: boolean;
  intersectionRatio: number;
  childrenCount: number;
  grandChildrenCount: number;
  attributes: Record<string, string>;
  classList: string[];
  exists: boolean;
  count: number;
  // ... 80+ properties from minimact-punch
}
```

#### LoopTemplateInfo
```typescript
interface LoopTemplateInfo {
  stateKey: string;                          // "todos"
  arrayBinding: string;                      // "todos"
  itemVar: string;                           // "todo"
  indexVar: string | null;                   // "index"
  keyBinding: string | null;                 // "item.id"
  itemTemplate: {                            // Full template structure
    type: "Element" | "Text" | "conditional";
    tag?: string;
    propsTemplates?: Record<string, TemplateBinding>;
    childrenTemplates?: any[];
  };
}
```

### Server-Side (C#)

#### ComponentStateSnapshot
```csharp
public class ComponentStateSnapshot
{
    public string ComponentId { get; set; }
    public string ComponentName { get; set; }
    public Dictionary<string, object?> State { get; set; }
    public Dictionary<string, object?> Refs { get; set; }
    public Dictionary<string, DomElementStateSnapshot> DomElementStates { get; set; }
    public Dictionary<string, object?> QueryResults { get; set; }
    public List<EffectInfo> Effects { get; set; }
    public List<LoopTemplateInfo> Templates { get; set; }
    public long Timestamp { get; set; }
}
```

#### LoopTemplateAttribute
```csharp
[AttributeUsage(AttributeTargets.Class, AllowMultiple = true)]
public class LoopTemplateAttribute : Attribute
{
    public string StateKey { get; set; }
    public string TemplateJson { get; set; }
}
```

## Template System Integration

### Build-Time Template Generation

1. **Developer writes TSX**:
```tsx
export function TodoList() {
  const [todos] = useState([
    { text: "Buy milk", done: false },
    { text: "Walk dog", done: true }
  ]);

  return (
    <ul>
      {todos.map(todo => (
        <li className={todo.done ? "done" : "pending"}>
          <span>{todo.text}</span>
          <span>{todo.done ? "✓" : "○"}</span>
        </li>
      ))}
    </ul>
  );
}
```

2. **babel-plugin-minimact analyzes JSX** and generates:
   - C# component class
   - `[LoopTemplate]` attribute with JSON template
   - Template includes:
     - Bindings: `["item.text", "item.done"]`
     - Conditional branches: `{ "true": "✓", "false": "○" }`
     - Element structure with slots

3. **C# output**:
```csharp
[LoopTemplate("todos", @"{
  ""stateKey"": ""todos"",
  ""arrayBinding"": ""todos"",
  ""itemVar"": ""todo"",
  ""itemTemplate"": { /* Full JSON structure */ }
}")]
[Component]
public partial class TodoList : MinimactComponent
{
    [State]
    private List<dynamic> todos = new();

    // ... rest of component
}
```

4. **Runtime**: Rust predictor uses template to generate patches for ANY array length/content

### Template Advantages Over Hint Queue

| Feature | Hint Queue (Old) | Templates (New) |
|---------|-----------------|-----------------|
| **Coverage** | Limited to predicted states | 100% - works with ANY value |
| **Cold Start** | Requires learning/prediction | Works from first render |
| **Memory** | Caches patches for each state | Single template (metadata) |
| **Accuracy** | May miss edge cases | Perfect - from source code |
| **Generation** | Runtime (ML-based) | Build-time (static analysis) |

## Development Workflow

### 1. **Opening a Project**

```
User: Open SWIG Electron → Home screen
  → Click "Open Project" → Select .csproj file
  → Dashboard loads with:
     - File tree (left)
     - Code editor (center)
     - Terminal (bottom)
     - Inspector (right, hidden initially)
```

### 2. **Building and Running**

```
User: Click "Build" button
  → ProcessController.build(projectPath)
  → Terminal shows: dotnet build output
  → Success: ✅ Build succeeded
  → Failure: ❌ Errors displayed

User: Click "Run" button
  → ProcessController.start(projectPath, port)
  → Terminal shows: dotnet run output
  → App starts on http://localhost:5000
  → SignalR auto-connects to MinimactHub
  → Status badge: "● Running on :5000"
```

### 3. **Editing Code**

```
User: Click file in tree → Opens in Monaco editor
  → User edits TSX component
  → User saves (Ctrl+S)
  → FileWatcher detects change
  → TranspilerService.transpileFile(path)
  → babel-plugin-minimact runs
  → Generates C# with [LoopTemplate] attributes
  → Terminal shows: "✅ Transpiled in 45ms"
```

### 4. **Inspecting State**

```
User: Click "Inspector" button → Right panel slides in
  → ComponentTree loads via GetComponentTree()
  → User clicks "TodoList" component
  → StateInspector loads via GetComponentState('TodoList')
  → Displays:
     - State: { todos: [ ... ] }
     - Refs: { inputRef: { current: ... } }
     - DOM States: { scroll: { isIntersecting: true } }
     - Templates: [ { stateKey: "todos", ... } ]
```

### 5. **Live Editing State**

```
User: Clicks "Edit" icon next to state value
  → Modal opens with JSON editor
  → User changes value
  → Click "Apply"
  → UpdateComponentState() via SignalR
  → Server re-renders with new state
  → Patches sent to client
  → DOM updates instantly
  → Inspector refreshes
```

## File Structure

```
src/minimact-swig-electron/
├── src/
│   ├── main/                   # Electron main process
│   │   ├── index.ts           # Entry point
│   │   ├── ipc/               # IPC handlers
│   │   │   ├── file.ts        # File operations
│   │   │   ├── process.ts     # dotnet processes
│   │   │   ├── transpiler.ts  # TSX → C#
│   │   │   ├── project.ts     # Project management
│   │   │   └── signalr.ts     # SignalR communication
│   │   └── services/          # Core services
│   │       ├── SignalRClient.ts
│   │       ├── TranspilerService.ts
│   │       ├── ProcessController.ts
│   │       ├── FileWatcher.ts
│   │       └── ProjectManager.ts
│   ├── preload/               # Preload scripts
│   │   ├── index.ts
│   │   └── index.d.ts         # Type definitions
│   └── renderer/              # React UI
│       └── src/
│           ├── App.tsx
│           ├── pages/
│           │   ├── Home.tsx
│           │   ├── CreateProject.tsx
│           │   └── Dashboard.tsx
│           ├── components/
│           │   ├── editor/
│           │   │   ├── FileTree.tsx
│           │   │   └── CodeEditor.tsx
│           │   ├── terminal/
│           │   │   └── Terminal.tsx
│           │   └── inspector/
│           │       ├── ComponentTree.tsx
│           │       ├── StateInspector.tsx
│           │       └── TemplateInspector.tsx (planned)
│           └── types/
│               └── component-state.ts
└── package.json
```

## SignalR Hub Methods

### State Inspector Methods

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `GetComponentTree` | - | `List<ComponentTreeNode>` | Get component hierarchy |
| `GetComponentState` | `componentId` | `ComponentStateSnapshot` | Get full state snapshot |
| `UpdateComponentState` | `componentId, stateKey, value` | - | Update state value |
| `UpdateDomElementState` | `componentId, stateKey, snapshot` | - | Update DOM state |
| `UpdateQueryResults` | `componentId, queryKey, results` | - | Update query results |
| `RecomputeClientComputed` | `componentId, specificKey?` | - | Request client to re-run useComputed |

### Template Inspector Methods

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `GetComponentMetadata` | `componentId` | `{ templates, state, bindings }` | Get all templates |
| `GetAllComponents` | - | `List<ComponentInfo>` | List all components |
| `PreviewTemplate` | `componentId, templateKey, state` | `{ html, performance }` | Render template with custom state |
| `GetTemplateUsageStats` | `componentId` | `{ templates, usage }` | Template usage statistics |
| `GetTemplatePerformance` | `componentId` | `{ metrics }` | Template performance metrics |

## Performance Considerations

### 1. **State Snapshot Caching**
- GetStateSnapshot() is called frequently
- Consider caching on server with invalidation on state changes
- Only serialize necessary data (avoid large objects)

### 2. **Component Tree Polling**
- Current: Poll every 2 seconds
- Better: SignalR event on component mount/unmount
- Event: `ComponentRegistered`, `ComponentUnregistered`

### 3. **Template Metadata**
- Templates are static (from attributes)
- Cache reflection results per component type
- Only need to extract once per app lifetime

### 4. **SignalR Connection**
- Single connection from SWIG to target app
- Automatic reconnection on disconnect
- Connection pooling for multiple apps (future)

## Security Considerations

1. **Local Development Only**: SWIG is for development, not production
2. **No Authentication**: Assumes local trusted environment
3. **File System Access**: Limited to project directory
4. **Process Control**: Can start/stop dotnet processes
5. **State Editing**: Can modify application state (debugging tool)

## Future Enhancements

### Phase 1: Core Inspector (✅ Completed)
- [x] Component tree view
- [x] State inspection (useState, useRef, useDomElementState, useQuery, useComputed)
- [x] Live state editing
- [x] Loop template metadata
- [x] Computed state inspection with manual re-run

### Phase 2: Template Inspector
- [ ] Template visualization
- [ ] Binding graphs
- [ ] Template preview
- [ ] Coverage analysis

### Phase 3: Performance Profiler
- [ ] Render timing
- [ ] Flamegraphs
- [ ] Memory tracking
- [ ] Network analysis

### Phase 4: SignalR Monitor
- [ ] Message flow timeline
- [ ] Patch inspection
- [ ] Cache hit/miss visualization
- [ ] Latency breakdown

### Phase 5: Hot Reload
- [ ] Edit TSX in SWIG editor
- [ ] Auto-transpile on save
- [ ] Hot-swap component on server
- [ ] Instant refresh without reload

## Troubleshooting

### Common Issues

**1. "SignalR connection failed"**
- Ensure target app is running
- Check port configuration (default: 5000)
- Verify MinimactHub is registered in Program.cs

**2. "Component not found"**
- Component may not be registered yet
- Refresh component tree
- Check ComponentRegistry

**3. "Transpilation failed"**
- Check babel-plugin-minimact installation
- Verify TSX syntax is valid
- Check terminal for error details

**4. "State changes not reflecting"**
- Verify UpdateComponentState is implemented
- Check server logs for errors
- Ensure TriggerRender() is called

## Contributing

When adding new features to SWIG:

1. **Add IPC handler** in `src/main/ipc/`
2. **Add SignalR method** in `MinimactHub.cs`
3. **Add UI component** in `src/renderer/src/components/`
4. **Update types** in `component-state.ts` and `ComponentStateSnapshot.cs`
5. **Test** end-to-end flow
6. **Document** in this file

## License

MIT
