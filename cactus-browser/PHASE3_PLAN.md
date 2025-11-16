# 🌵 Phase 3: Compile + Predict + Render

**Goal:** Execute compiled C# components and render them to actual DOM

---

## What We're Building

### The Full Pipeline

```
TSX Source (from GitHub)
    ↓
Babel Compilation (✅ Phase 2)
    ↓
C# Code + Templates (✅ Phase 2)
    ↓
Execute C# Component (🚧 Phase 3)
    ↓
Generate VNode Tree (🚧 Phase 3)
    ↓
Rust Reconciliation (🚧 Phase 3)
    ↓
DOM Patches (🚧 Phase 3)
    ↓
Apply to Browser DOM (🚧 Phase 3)
    ↓
RENDERED! 🎉
```

---

## Implementation Tasks

### 3.1: Set Up .NET Runtime Execution

**Two Options:**

**Option A: Call dotnet CLI (Simpler, slower)**
- Pros: Easy to implement, no native bindings
- Cons: Slow startup (~500ms), requires .NET SDK installed

**Option B: NativeAOT + Tauri Command (Faster, production-ready)**
- Pros: Fast (<50ms), ships as single binary
- Cons: More complex build process

**Recommendation: Start with Option A, migrate to Option B later**

#### Files to Create:

1. `minimact-runtime/Program.cs` - CLI entry point
2. `minimact-runtime/ComponentExecutor.cs` - Execute C# components
3. `minimact-runtime/DynamicCompiler.cs` - Roslyn compilation
4. `minimact-runtime/VNodeSerializer.cs` - Serialize VNodes to JSON
5. `src-tauri/src/dotnet.rs` - Rust wrapper for .NET calls

---

### 3.2: Dynamic C# Compilation

**Using Microsoft.CodeAnalysis (Roslyn)**

```csharp
// Input: C# source code from Babel
string source = @"
using Minimact.AspNetCore.Core;

public class Counter : MinimactComponent
{
    [State] private int count = 0;

    protected override VNode Render()
    {
        return new VElement(""div"", new())
        {
            Children = new List<VNode>
            {
                new VText($""Count: {count}"")
            }
        };
    }
}
";

// Output: Compiled assembly in memory
Assembly assembly = DynamicCompiler.Compile(source);
MinimactComponent instance = DynamicCompiler.CreateInstance(assembly);
```

**Key Challenges:**
- Reference Minimact assemblies correctly
- Handle compilation errors gracefully
- Support hot reload (recompile on changes)

---

### 3.3: Execute Component Render()

```csharp
// Create instance
var component = new Counter();

// Execute Render() method
VNode vnode = component.Render();

// Result: VNode tree
{
  "type": "element",
  "tag": "div",
  "key": "10000000",
  "children": [
    {
      "type": "text",
      "content": "Count: 0"
    }
  ]
}
```

---

### 3.4: Serialize VNode to JSON

**For sending to Rust reconciler:**

```csharp
string json = VNodeSerializer.Serialize(vnode);

// Output:
{
  "type": "VElement",
  "tag": "div",
  "hexPath": "10000000",
  "attributes": {},
  "children": [
    {
      "type": "VText",
      "content": "Count: 0",
      "hexPath": "10000000.20000000"
    }
  ]
}
```

---

### 3.5: Rust Reconciliation

**Call minimact-rust-reconciler from Tauri:**

```rust
use minimact_reconciler::{VNode, reconcile, Patch};

pub fn generate_patches(old_vnode: VNode, new_vnode: VNode) -> Vec<Patch> {
    reconcile(old_vnode, new_vnode)
}
```

**Patches sent to client:**

```json
[
  {
    "type": "CreateElement",
    "tag": "div",
    "path": [0]
  },
  {
    "type": "UpdateText",
    "content": "Count: 0",
    "path": [0, 0]
  }
]
```

---

### 3.6: Apply Patches to DOM

**In React frontend:**

```typescript
import { Minimact } from '@minimact/core';

const minimact = new Minimact({
  root: document.getElementById('site-viewer')!
});

// Apply patches
minimact.applyPatches(patches);
```

---

## Step-by-Step Implementation

### Step 1: Create .NET Runtime Project

```bash
cd cactus-browser
mkdir minimact-runtime
cd minimact-runtime

dotnet new console
dotnet add package Microsoft.CodeAnalysis.CSharp
dotnet add package Newtonsoft.Json
```

**Add reference to Minimact:**

```xml
<!-- minimact-runtime.csproj -->
<ItemGroup>
  <Reference Include="Minimact.AspNetCore">
    <HintPath>../../../src/Minimact.AspNetCore/bin/Debug/net8.0/Minimact.AspNetCore.dll</HintPath>
  </Reference>
</ItemGroup>
```

---

### Step 2: Implement DynamicCompiler.cs

```csharp
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using System.Reflection;
using System.Runtime.Loader;

namespace CactusBrowser.Runtime;

public static class DynamicCompiler
{
    public static Assembly Compile(string source)
    {
        var syntaxTree = CSharpSyntaxTree.ParseText(source);

        var references = new[]
        {
            MetadataReference.CreateFromFile(typeof(object).Assembly.Location),
            MetadataReference.CreateFromFile(typeof(Console).Assembly.Location),
            MetadataReference.CreateFromFile(typeof(MinimactComponent).Assembly.Location),
            MetadataReference.CreateFromFile(Assembly.Load("System.Runtime").Location),
            MetadataReference.CreateFromFile(Assembly.Load("System.Collections").Location),
        };

        var compilation = CSharpCompilation.Create(
            assemblyName: $"DynamicComponent_{Guid.NewGuid():N}",
            syntaxTrees: new[] { syntaxTree },
            references: references,
            options: new CSharpCompilationOptions(OutputKind.DynamicallyLinkedLibrary)
        );

        using var ms = new MemoryStream();
        var result = compilation.Emit(ms);

        if (!result.Success)
        {
            var errors = string.Join("\n", result.Diagnostics
                .Where(d => d.Severity == DiagnosticSeverity.Error)
                .Select(d => $"{d.Location}: {d.GetMessage()}"));

            throw new Exception($"Compilation failed:\n{errors}");
        }

        ms.Seek(0, SeekOrigin.Begin);
        return AssemblyLoadContext.Default.LoadFromStream(ms);
    }

    public static MinimactComponent CreateInstance(Assembly assembly)
    {
        var componentType = assembly.GetTypes()
            .FirstOrDefault(t => t.IsSubclassOf(typeof(MinimactComponent)));

        if (componentType == null)
        {
            throw new Exception("No MinimactComponent subclass found in assembly");
        }

        return (MinimactComponent)Activator.CreateInstance(componentType)!;
    }
}
```

---

### Step 3: Implement ComponentExecutor.cs

```csharp
using Minimact.AspNetCore.Core;
using Newtonsoft.Json;

namespace CactusBrowser.Runtime;

public class ComponentExecutor
{
    public static ExecutionResult Execute(string csharpSource)
    {
        try
        {
            // 1. Compile C#
            var assembly = DynamicCompiler.Compile(csharpSource);

            // 2. Create instance
            var component = DynamicCompiler.CreateInstance(assembly);

            // 3. Execute Render()
            var vnode = component.Render();

            // 4. Serialize to JSON
            var vnodeJson = VNodeSerializer.Serialize(vnode);

            // 5. Generate initial HTML (for SSR)
            var html = VNodeToHtml(vnode);

            return new ExecutionResult
            {
                Success = true,
                VNodeJson = vnodeJson,
                Html = html,
                Error = null
            };
        }
        catch (Exception ex)
        {
            return new ExecutionResult
            {
                Success = false,
                VNodeJson = null,
                Html = null,
                Error = ex.ToString()
            };
        }
    }

    private static string VNodeToHtml(VNode vnode)
    {
        return vnode switch
        {
            VElement element => $"<{element.Tag}>{string.Join("", element.Children.Select(VNodeToHtml))}</{element.Tag}>",
            VText text => text.Content,
            VNull => "",
            _ => ""
        };
    }
}

public class ExecutionResult
{
    public bool Success { get; set; }
    public string? VNodeJson { get; set; }
    public string? Html { get; set; }
    public string? Error { get; set; }
}
```

---

### Step 4: Implement VNodeSerializer.cs

```csharp
using Minimact.AspNetCore.Core;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace CactusBrowser.Runtime;

public static class VNodeSerializer
{
    public static string Serialize(VNode vnode)
    {
        var json = SerializeNode(vnode);
        return JsonConvert.SerializeObject(json, Formatting.Indented);
    }

    private static JObject SerializeNode(VNode vnode)
    {
        return vnode switch
        {
            VElement element => new JObject
            {
                ["type"] = "VElement",
                ["tag"] = element.Tag,
                ["hexPath"] = element.HexPath,
                ["attributes"] = JObject.FromObject(element.Attributes),
                ["children"] = new JArray(element.Children.Select(SerializeNode))
            },
            VText text => new JObject
            {
                ["type"] = "VText",
                ["content"] = text.Content,
                ["hexPath"] = text.HexPath
            },
            VNull vnull => new JObject
            {
                ["type"] = "VNull",
                ["hexPath"] = vnull.HexPath
            },
            _ => throw new NotSupportedException($"Unknown VNode type: {vnode.GetType()}")
        };
    }
}
```

---

### Step 5: Implement Program.cs (CLI Entry Point)

```csharp
using CactusBrowser.Runtime;
using Newtonsoft.Json;

if (args.Length == 0)
{
    Console.Error.WriteLine("Usage: minimact-runtime <request.json>");
    return 1;
}

// Read request
var requestPath = args[0];
var requestJson = File.ReadAllText(requestPath);
var request = JsonConvert.DeserializeObject<RenderRequest>(requestJson);

if (request == null)
{
    Console.Error.WriteLine("Invalid request JSON");
    return 1;
}

// Execute component
var result = ComponentExecutor.Execute(request.CSharp);

// Write response
var responseJson = JsonConvert.SerializeObject(result);
Console.WriteLine(responseJson);

return result.Success ? 0 : 1;

public class RenderRequest
{
    public string CSharp { get; set; } = "";
    public object? Templates { get; set; }
    public object? InitialState { get; set; }
}
```

---

### Step 6: Add Tauri Command to Call .NET

**src-tauri/src/dotnet.rs:**

```rust
use serde::{Deserialize, Serialize};
use std::process::Command;
use std::fs;
use std::path::PathBuf;

#[derive(Serialize, Deserialize)]
pub struct RenderRequest {
    pub csharp: String,
    pub templates: serde_json::Value,
    pub initial_state: serde_json::Value,
}

#[derive(Serialize, Deserialize)]
pub struct RenderResponse {
    pub success: bool,
    pub vnode_json: Option<String>,
    pub html: Option<String>,
    pub error: Option<String>,
}

#[tauri::command]
pub fn execute_component(request: RenderRequest) -> Result<RenderResponse, String> {
    // Write request to temp file
    let temp_dir = std::env::temp_dir();
    let request_path = temp_dir.join(format!("cactus-request-{}.json", uuid::Uuid::new_v4()));

    let request_json = serde_json::to_string(&request)
        .map_err(|e| format!("Failed to serialize request: {}", e))?;

    fs::write(&request_path, request_json)
        .map_err(|e| format!("Failed to write request file: {}", e))?;

    // Execute .NET runtime
    let output = Command::new("dotnet")
        .args(&[
            "run",
            "--project", "./minimact-runtime",
            "--", &request_path.to_string_lossy()
        ])
        .output()
        .map_err(|e| format!("Failed to execute dotnet: {}", e))?;

    // Clean up temp file
    let _ = fs::remove_file(&request_path);

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("dotnet execution failed:\n{}", stderr));
    }

    // Parse response
    let response: RenderResponse = serde_json::from_slice(&output.stdout)
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    Ok(response)
}
```

**src-tauri/src/main.rs:**

```rust
mod dotnet;

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            dotnet::execute_component,
            // ... other commands
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

---

### Step 7: Update Frontend to Execute and Render

**src/core/execution-engine.ts:**

```typescript
import { invoke } from '@tauri-apps/api/tauri';

export interface ExecutionResult {
  success: boolean;
  vnodeJson: string | null;
  html: string | null;
  error: string | null;
}

export async function executeComponent(
  csharp: string,
  templates: any,
  initialState: any = {}
): Promise<ExecutionResult> {
  try {
    const result = await invoke<ExecutionResult>('execute_component', {
      request: {
        csharp,
        templates,
        initial_state: initialState
      }
    });

    return result;
  } catch (err: any) {
    return {
      success: false,
      vnodeJson: null,
      html: null,
      error: err.toString()
    };
  }
}
```

**src/App.tsx (update to execute and render):**

```typescript
import { useState } from 'react';
import { loadFromGitHub } from './core/github-loader';
import { executeComponent } from './core/execution-engine';

export default function App() {
  const [url, setUrl] = useState('');
  const [status, setStatus] = useState('Ready');
  const [html, setHtml] = useState('');
  const [error, setError] = useState('');

  async function handleGo() {
    setStatus('Loading from GitHub...');
    setError('');
    setHtml('');

    try {
      // 1. Load from GitHub (Phase 2)
      const result = await loadFromGitHub(url);

      setStatus('Executing component...');

      // 2. Execute C# component (Phase 3)
      const execution = await executeComponent(
        result.compiled.csharp,
        result.compiled.templates,
        {}
      );

      if (!execution.success) {
        setError(execution.error || 'Execution failed');
        setStatus('Error');
        return;
      }

      // 3. Render HTML
      setHtml(execution.html || '');
      setStatus('Rendered successfully! 🌵');

    } catch (err: any) {
      setError(err.message);
      setStatus('Error');
    }
  }

  return (
    <div className="app">
      <div className="address-bar">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="gh://user/repo/path.tsx"
          onKeyDown={(e) => e.key === 'Enter' && handleGo()}
        />
        <button onClick={handleGo}>Go</button>
      </div>

      <div className="status">{status}</div>

      {error && (
        <div className="error">
          <h3>Error:</h3>
          <pre>{error}</pre>
        </div>
      )}

      {html && (
        <div className="site-viewer">
          <h3>Rendered Component:</h3>
          <div dangerouslySetInnerHTML={{ __html: html }} />
        </div>
      )}
    </div>
  );
}
```

---

## Testing Phase 3

### Test 1: Simple Counter Component

**Create test file:**

```typescript
// test-tsx/counter.tsx
import { useState } from '@minimact/core';

export function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <h1>Counter</h1>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>Increment</button>
    </div>
  );
}
```

**Expected output:**

```html
<div>
  <h1>Counter</h1>
  <p>Count: 0</p>
  <button>Increment</button>
</div>
```

---

### Test 2: Component with Props

```typescript
// test-tsx/greeting.tsx
export function Greeting({ name }: { name: string }) {
  return <h1>Hello, {name}!</h1>;
}
```

**Expected output:**

```html
<h1>Hello, World!</h1>
```

---

## Success Criteria

- ✅ .NET runtime project compiles
- ✅ Dynamic C# compilation works (Roslyn)
- ✅ Component instance created successfully
- ✅ Render() method executes
- ✅ VNode tree generated
- ✅ VNode serialized to JSON
- ✅ HTML rendered in browser
- ✅ No compilation errors
- ✅ No runtime errors

---

## Known Challenges

### Challenge 1: Assembly References

**Problem:** Roslyn compilation needs correct references to Minimact assemblies

**Solution:**
```csharp
// Find Minimact.AspNetCore.dll path
var minimactPath = Path.Combine(
    Directory.GetCurrentDirectory(),
    "../../../src/Minimact.AspNetCore/bin/Debug/net8.0/Minimact.AspNetCore.dll"
);

MetadataReference.CreateFromFile(minimactPath);
```

### Challenge 2: Missing System References

**Problem:** C# code uses types not referenced

**Solution:** Add all System.* assemblies:
```csharp
var systemAssemblies = new[]
{
    "System.Runtime",
    "System.Collections",
    "System.Linq",
    "System.Console",
    "netstandard"
};

foreach (var name in systemAssemblies)
{
    references.Add(MetadataReference.CreateFromFile(
        Assembly.Load(name).Location
    ));
}
```

### Challenge 3: Hot Reload

**Problem:** Recompiling same class name causes conflicts

**Solution:** Generate unique assembly names:
```csharp
assemblyName: $"DynamicComponent_{Guid.NewGuid():N}"
```

---

## Next Steps After Phase 3

Once components render, we need:

1. **Interactive events** - onClick, onChange handlers
2. **State updates** - Trigger re-renders on setState
3. **Predictions** - Cache patches for instant feedback
4. **Routing** - Navigate between pages
5. **Full Minimact integration** - All hooks working

But first... **LET'S GET IT RENDERING! 🚀**

---

## Commands to Run

```bash
# 1. Create .NET runtime
cd cactus-browser
mkdir minimact-runtime
cd minimact-runtime
dotnet new console
dotnet add package Microsoft.CodeAnalysis.CSharp
dotnet add package Newtonsoft.Json

# 2. Copy code from this plan into:
#    - Program.cs
#    - DynamicCompiler.cs
#    - ComponentExecutor.cs
#    - VNodeSerializer.cs

# 3. Build runtime
dotnet build

# 4. Update Tauri (add src-tauri/src/dotnet.rs)

# 5. Update frontend (add execution-engine.ts)

# 6. Run!
cd ..
pnpm tauri:dev
```

Enter: `gh://minimact/docs/pages/index.tsx`

Click Go → See it RENDER! 🌵🎉
