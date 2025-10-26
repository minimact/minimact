# Minimact Hot Reload - Design Document

**Status**: Planning
**Priority**: High - Critical for DX
**Complexity**: High - Requires coordination across TSX, C#, and runtime

---

## Problem Statement

Minimact currently requires:
1. **File save** → Babel transform
2. **C# rebuild** → dotnet watch rebuild
3. **Manual refresh** → Browser reload
4. **SignalR reconnect** → Lost state

**Total**: 5-10 seconds + lost application state

**Goal**: Achieve **<500ms hot reload** with **state preservation**

---

## Architecture Overview

### Three Types of Hot Reload

#### 1. **TSX-Only Changes** (Fastest - <100ms)
Changes to JSX/rendering logic that don't affect C# signatures.

**Example**:
```tsx
// Before
<p>Count: {count}</p>

// After
<p>Counter value: {count}</p>  // ← Just text change
```

**Strategy**: Transform TSX → Send VNode diff → Apply patches **without C# rebuild**

#### 2. **State/Logic Changes** (Medium - ~500ms)
Changes to hooks, event handlers, or state that require C# rebuild.

**Example**:
```tsx
// Before
const [count, setCount] = useState(0);

// After
const [count, setCount] = useState(0);
const [name, setName] = useState('');  // ← New state
```

**Strategy**: Rebuild C# → Hot swap assembly → Preserve state → Re-render

#### 3. **Codebehind Changes** (Slow - ~2s)
Changes to business logic, database queries, etc.

**Example**:
```csharp
// Counter.codebehind.cs
private async Task<int> LoadInitialCount()
{
    return await _db.Settings.FirstAsync();  // ← Changed query
}
```

**Strategy**: Full rebuild → Graceful reconnect → Attempt state preservation

---

## Proposed Solution: Three-Tier Hot Reload System

### Tier 1: Client-Side VNode Patching (TSX-Only)

**When**: TSX changes that don't affect C# interface

**Flow**:
```
1. File watcher detects Counter.tsx change
2. Babel transforms TSX → new VNode tree
3. Compare with previous VNode (client-side diffing)
4. If no C# changes needed:
   a. Send VNode tree to client via SignalR
   b. Client applies patches
   c. Done! (~50-100ms)
```

**Implementation**:

```typescript
// File: src/client-runtime/src/hotReload.ts

export class HotReloadManager {
  private previousVNodes = new Map<string, VNode>();

  async handleTsxChange(componentId: string, tsxCode: string) {
    // 1. Transform TSX to VNode (client-side Babel)
    const newVNode = await this.transformTsxToVNode(tsxCode);

    // 2. Get previous VNode
    const prevVNode = this.previousVNodes.get(componentId);

    // 3. Check if C# rebuild needed
    if (this.requiresCSharpRebuild(prevVNode, newVNode)) {
      // Tier 2: Trigger C# rebuild
      return this.handleCSharpRebuild(componentId);
    }

    // 4. Client-side patching only
    const patches = this.computePatches(prevVNode, newVNode);
    this.applyPatches(componentId, patches);

    // 5. Update cache
    this.previousVNodes.set(componentId, newVNode);

    console.log('✅ Hot reload (TSX-only): 50ms');
  }

  private requiresCSharpRebuild(prev: VNode, next: VNode): boolean {
    // Check for signature changes
    return (
      this.stateChanged(prev, next) ||
      this.effectsChanged(prev, next) ||
      this.refsChanged(prev, next) ||
      this.eventHandlersChanged(prev, next)
    );
  }
}
```

**SignalR Protocol**:
```csharp
// Server sends
{
  "type": "HotReload:VNodeUpdate",
  "componentId": "counter",
  "patches": [
    { "op": "replace", "path": "/children/0/children/0", "value": "Counter value: 5" }
  ]
}
```

---

### Tier 2: C# Hot Swap (State/Logic Changes)

**When**: New hooks, event handlers, or state added/removed

**Flow**:
```
1. File watcher detects TSX change
2. Babel transforms TSX → Counter.cs
3. Roslyn compiles Counter.cs → Counter.dll (in-memory)
4. Hot swap assembly:
   a. Unload old assembly
   b. Load new assembly
   c. Migrate component state
   d. Re-render with new logic
5. Send patches to client
6. Done! (~500ms)
```

**Implementation**:

```csharp
// File: Minimact.AspNetCore/HotReload/HotSwapManager.cs

public class HotSwapManager
{
    private readonly Dictionary<string, ComponentMetadata> _componentCache = new();

    public async Task<bool> TryHotSwap(string componentName, string csharpCode)
    {
        // 1. Compile C# code to assembly (in-memory)
        var compilation = CSharpCompilation.Create(
            $"{componentName}_HotReload_{Guid.NewGuid()}",
            syntaxTrees: new[] { CSharpSyntaxTree.ParseText(csharpCode) },
            references: GetReferences(),
            options: new CSharpCompilationOptions(OutputKind.DynamicallyLinkedLibrary)
        );

        using var ms = new MemoryStream();
        var result = compilation.Emit(ms);

        if (!result.Success)
        {
            // Compilation failed - show errors to user
            await NotifyCompilationErrors(result.Diagnostics);
            return false;
        }

        // 2. Load assembly
        ms.Seek(0, SeekOrigin.Begin);
        var assembly = AssemblyLoadContext.Default.LoadFromStream(ms);

        // 3. Get component type
        var componentType = assembly.GetType(componentName);
        if (componentType == null) return false;

        // 4. Migrate existing instances
        await MigrateComponentInstances(componentName, componentType);

        // 5. Update cache
        _componentCache[componentName] = new ComponentMetadata
        {
            Type = componentType,
            Assembly = assembly,
            LastModified = DateTime.UtcNow
        };

        Console.WriteLine($"✅ Hot swap: {componentName} (~500ms)");
        return true;
    }

    private async Task MigrateComponentInstances(string componentName, Type newType)
    {
        var instances = _componentRegistry.GetInstances(componentName);

        foreach (var instance in instances)
        {
            // 1. Extract state from old instance
            var state = ExtractState(instance);

            // 2. Create new instance with DI
            var newInstance = ActivatorUtilities.CreateInstance(_serviceProvider, newType);

            // 3. Restore state
            RestoreState(newInstance, state);

            // 4. Replace in registry
            _componentRegistry.Replace(instance.ComponentId, newInstance);

            // 5. Trigger re-render
            await newInstance.TriggerRender();
        }
    }

    private Dictionary<string, object> ExtractState(MinimactComponent component)
    {
        var state = new Dictionary<string, object>();

        // Extract [State] fields
        var fields = component.GetType()
            .GetFields(BindingFlags.Instance | BindingFlags.NonPublic)
            .Where(f => f.GetCustomAttribute<StateAttribute>() != null);

        foreach (var field in fields)
        {
            state[field.Name] = field.GetValue(component);
        }

        return state;
    }

    private void RestoreState(MinimactComponent newComponent, Dictionary<string, object> state)
    {
        foreach (var (key, value) in state)
        {
            var field = newComponent.GetType()
                .GetField(key, BindingFlags.Instance | BindingFlags.NonPublic);

            if (field != null && field.FieldType == value.GetType())
            {
                field.SetValue(newComponent, value);
            }
        }
    }
}
```

**VS Code Integration**:
```typescript
// tools/minimact-vscode/src/providers/hotReload.ts

export class HotReloadProvider {
  private watcher: vscode.FileSystemWatcher;

  activate() {
    // Watch TSX files
    this.watcher = vscode.workspace.createFileSystemWatcher('**/*.tsx');

    this.watcher.onDidChange(async (uri) => {
      const content = await vscode.workspace.fs.readFile(uri);
      const tsxCode = Buffer.from(content).toString('utf8');

      // Send to dev server
      await this.sendToDevServer({
        type: 'file-change',
        path: uri.fsPath,
        content: tsxCode
      });
    });
  }

  private async sendToDevServer(message: any) {
    // WebSocket to dev server
    this.ws.send(JSON.stringify(message));
  }
}
```

---

### Tier 3: Graceful Rebuild (Codebehind Changes)

**When**: Business logic, database queries, dependencies change

**Flow**:
```
1. File watcher detects Counter.codebehind.cs change
2. Full dotnet rebuild
3. Notify client of pending reload
4. Show "Reloading..." overlay
5. Wait for rebuild (~2-5s)
6. SignalR reconnect with state restoration
7. Hide overlay
```

**Implementation**:

```csharp
// File: Minimact.AspNetCore/HotReload/GracefulReloadManager.cs

public class GracefulReloadManager
{
    public async Task HandleCodebehindChange(string filePath)
    {
        // 1. Notify all connected clients
        await _hubContext.Clients.All.SendAsync("HotReload:Rebuilding", new
        {
            message = "Rebuilding...",
            estimatedTime = 3000 // ms
        });

        // 2. Capture current state of all components
        var stateSnapshot = await CaptureGlobalState();

        // 3. Trigger dotnet watch rebuild (it's already watching)
        // Just wait for rebuild to complete...

        // 4. After rebuild, restore state
        await RestoreGlobalState(stateSnapshot);

        // 5. Notify clients rebuild complete
        await _hubContext.Clients.All.SendAsync("HotReload:Complete");
    }

    private async Task<GlobalStateSnapshot> CaptureGlobalState()
    {
        var snapshot = new GlobalStateSnapshot();

        foreach (var component in _componentRegistry.GetAllComponents())
        {
            snapshot.ComponentStates[component.ComponentId] = new
            {
                State = component.State,
                DomState = component.DomElementStates,
                ScrollPosition = await GetScrollPosition(component.ComponentId)
            };
        }

        return snapshot;
    }
}
```

**Client Side**:
```typescript
// src/client-runtime/src/hotReload.ts

export class GracefulReloadHandler {
  private stateSnapshot: any = {};

  onRebuilding() {
    // 1. Show overlay
    this.showOverlay('Rebuilding...', { progress: true });

    // 2. Capture client-side state
    this.stateSnapshot = {
      scrollPosition: window.scrollY,
      focusedElement: document.activeElement?.id,
      formData: this.captureFormData()
    };
  }

  async onComplete() {
    // 1. Restore client state
    window.scrollTo(0, this.stateSnapshot.scrollPosition);
    document.getElementById(this.stateSnapshot.focusedElement)?.focus();
    this.restoreFormData(this.stateSnapshot.formData);

    // 2. Hide overlay
    this.hideOverlay();

    // 3. Show success toast
    this.showToast('✅ Hot reload complete', { duration: 2000 });
  }
}
```

---

## File Watcher Architecture

### Server-Side File Watcher

```csharp
// File: Minimact.AspNetCore/HotReload/FileWatcherService.cs

public class FileWatcherService : BackgroundService
{
    private readonly FileSystemWatcher _tsxWatcher;
    private readonly FileSystemWatcher _codebehindWatcher;

    protected override Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // Watch TSX files
        _tsxWatcher = new FileSystemWatcher("wwwroot/components")
        {
            Filter = "*.tsx",
            NotifyFilter = NotifyFilters.LastWrite
        };

        _tsxWatcher.Changed += async (s, e) =>
        {
            var content = await File.ReadAllTextAsync(e.FullPath);
            await _hotReloadManager.HandleTsxChange(e.Name, content);
        };

        _tsxWatcher.EnableRaisingEvents = true;

        // Watch codebehind files
        _codebehindWatcher = new FileSystemWatcher("Components")
        {
            Filter = "*.codebehind.cs",
            NotifyFilter = NotifyFilters.LastWrite
        };

        _codebehindWatcher.Changed += async (s, e) =>
        {
            await _gracefulReloadManager.HandleCodebehindChange(e.FullPath);
        };

        _codebehindWatcher.EnableRaisingEvents = true;

        return Task.CompletedTask;
    }
}
```

---

## State Preservation Strategy

### What State to Preserve

1. **Component State** (`[State]` fields)
   - ✅ Preserve: Values are serializable
   - Method: Reflection to extract/restore

2. **DOM Element State** (useDomElementState)
   - ✅ Preserve: Intersection, scroll, etc.
   - Method: Client-side cache + server sync

3. **Refs** (useRef)
   - ⚠️ Partial: Only primitive values
   - Method: Skip DOM refs, preserve data refs

4. **Effects** (useEffect)
   - ❌ Don't preserve: Re-run on mount
   - Method: Clean up old, run new

5. **Client-Only State** (form inputs, scroll)
   - ✅ Preserve: Via client-side snapshot
   - Method: Capture before reload, restore after

### State Migration Algorithm

```csharp
public class StateMigration
{
    public void Migrate(MinimactComponent oldInstance, MinimactComponent newInstance)
    {
        var oldFields = GetStateFields(oldInstance);
        var newFields = GetStateFields(newInstance);

        foreach (var (name, oldField) in oldFields)
        {
            if (newFields.TryGetValue(name, out var newField))
            {
                // Field exists in both - migrate value
                if (oldField.FieldType == newField.FieldType)
                {
                    newField.SetValue(newInstance, oldField.GetValue(oldInstance));
                }
                else
                {
                    // Type changed - try to convert
                    TryConvertAndSet(oldField, newField, oldInstance, newInstance);
                }
            }
            else
            {
                // Field removed - log warning
                Console.WriteLine($"⚠️ State field '{name}' removed during hot reload");
            }
        }

        // Check for new fields
        foreach (var (name, newField) in newFields)
        {
            if (!oldFields.ContainsKey(name))
            {
                Console.WriteLine($"ℹ️ New state field '{name}' added with default value");
            }
        }
    }
}
```

---

## Error Handling

### Compilation Errors

```typescript
// Client receives compilation error
signalR.on('HotReload:CompilationError', (errors) => {
  // Show inline errors in VS Code
  vscode.window.showErrorMessage(
    `Hot reload failed: ${errors[0].message}`,
    'View Errors'
  ).then(selection => {
    if (selection === 'View Errors') {
      // Open problems panel
      vscode.commands.executeCommand('workbench.actions.view.problems');
    }
  });

  // Keep old version running
  console.log('⚠️ Hot reload failed - keeping old version');
});
```

### State Migration Failures

```csharp
try
{
    await _hotSwapManager.TryHotSwap(componentName, code);
}
catch (StateMigrationException ex)
{
    // Fall back to full reload
    await _hubContext.Clients.All.SendAsync("HotReload:MigrationFailed", new
    {
        message = "State migration failed - full reload required",
        reason = ex.Message
    });

    // Trigger full page reload
    await _hubContext.Clients.All.SendAsync("HotReload:FullReload");
}
```

---

## Performance Optimization

### Debouncing

```typescript
// Debounce file changes (user typing)
let debounceTimer: NodeJS.Timeout;

fileWatcher.onDidChange((uri) => {
  clearTimeout(debounceTimer);

  debounceTimer = setTimeout(async () => {
    await handleHotReload(uri);
  }, 300); // Wait 300ms after last keystroke
});
```

### Incremental Compilation

```csharp
// Cache Roslyn compilation between changes
private CSharpCompilation _baseCompilation;

public async Task<CSharpCompilation> GetIncrementalCompilation(string code)
{
    if (_baseCompilation == null)
    {
        _baseCompilation = CreateBaseCompilation();
    }

    // Only recompile changed syntax tree
    var syntaxTree = CSharpSyntaxTree.ParseText(code);

    return _baseCompilation.ReplaceSyntaxTree(
        _baseCompilation.SyntaxTrees.First(),
        syntaxTree
    );
}
```

### Parallel Processing

```csharp
// Process multiple component changes in parallel
await Task.WhenAll(
    changedComponents.Select(c => _hotReloadManager.HandleTsxChange(c.Name, c.Code))
);
```

---

## VS Code Extension Integration

### Hot Reload Status Indicator

```typescript
// Update status bar during hot reload
statusBarItem.text = '$(loading~spin) Minimact: Hot reloading...';
statusBarItem.tooltip = 'Applying changes...';

// After reload
statusBarItem.text = '$(check) Minimact: Hot reload (120ms)';
setTimeout(() => {
  statusBarItem.text = '$(cactus) Minimact: Watching';
}, 2000);
```

### Inline Error Display

```typescript
// Show errors inline in editor
const diagnosticCollection = vscode.languages.createDiagnosticCollection('minimact-hotreload');

signalR.on('HotReload:CompilationError', (errors) => {
  const diagnostics: vscode.Diagnostic[] = errors.map(err => new vscode.Diagnostic(
    new vscode.Range(err.line, err.column, err.line, err.column + err.length),
    err.message,
    vscode.DiagnosticSeverity.Error
  ));

  diagnosticCollection.set(vscode.Uri.file(filePath), diagnostics);
});
```

---

## Implementation Roadmap

### Phase 1: Foundation (Week 1)
- [ ] Set up file watchers (TSX, C#)
- [ ] Implement SignalR hot reload protocol
- [ ] Basic VNode diffing client-side
- [ ] Simple overlay UI for reload status

### Phase 2: Tier 1 - TSX-Only (Week 2)
- [ ] Client-side Babel integration
- [ ] VNode comparison logic
- [ ] Patch application without C# rebuild
- [ ] Test with simple UI changes

### Phase 3: Tier 2 - C# Hot Swap (Week 3-4)
- [ ] Roslyn in-memory compilation
- [ ] Assembly hot swapping
- [ ] State extraction/restoration
- [ ] Test with hook changes

### Phase 4: Tier 3 - Graceful Rebuild (Week 5)
- [ ] Global state capture
- [ ] Rebuild coordination
- [ ] State restoration after rebuild
- [ ] Form data preservation

### Phase 5: VS Code Integration (Week 6)
- [ ] Hot reload status in extension
- [ ] Inline error display
- [ ] Configuration settings
- [ ] Performance metrics

### Phase 6: Polish & Testing (Week 7-8)
- [ ] Error handling edge cases
- [ ] Performance optimization
- [ ] User documentation
- [ ] Beta testing with real apps

---

## Configuration

```json
// appsettings.Development.json
{
  "Minimact": {
    "HotReload": {
      "Enabled": true,
      "DebounceMs": 300,
      "PreserveState": true,
      "ShowOverlay": true,
      "LogLevel": "Information"
    }
  }
}
```

```json
// VS Code settings
{
  "minimact.hotReload.enabled": true,
  "minimact.hotReload.showNotifications": true,
  "minimact.hotReload.preserveScrollPosition": true
}
```

---

## Success Metrics

**Goals**:
- TSX-only changes: <100ms
- State/logic changes: <500ms
- Codebehind changes: <2s
- State preservation: >95% success rate
- Zero crashes during reload

---

## Conclusion

Hot reload for Minimact is **feasible** with a three-tier approach:

1. **Tier 1 (TSX-only)**: Client-side VNode patching - fastest
2. **Tier 2 (State changes)**: C# hot swap with Roslyn - medium
3. **Tier 3 (Codebehind)**: Graceful rebuild - slowest but acceptable

**Key Challenges**:
- State migration across assembly versions
- Maintaining SignalR connection during reload
- Handling compilation errors gracefully

**Key Benefits**:
- Dramatically improved DX
- Competitive with SPA frameworks
- State preservation reduces context switching

**Recommendation**: Start with **Tier 1** (TSX-only) as MVP, then add Tier 2/3 based on user feedback.

🌵 **Hot reload will make Minimact feel truly modern!** ⚡
