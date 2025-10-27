# Real Runtime Integration for Minimact Command Center

## Overview

Minimact.CommandCenter now supports **Real Runtime Testing** using:
- **ClearScript V8** - Real JavaScript engine executing the actual Minimact client runtime
- **AngleSharp** - Real HTML DOM parser and manipulator
- **Embedded minimact.js** - The actual client runtime script used in production

This allows Rangers to test against the **real Minimact stack** instead of just mocks.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Minimact.CommandCenter                 │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌──────────────┐          ┌──────────────┐             │
│  │ IMinimactClient│◄───────│ Rangers Tests │            │
│  └──────▲───────┘          └──────────────┘             │
│         │                                                 │
│    ┌────┴────────────────┐                               │
│    │                     │                               │
│  ┌─┴──────────┐    ┌────┴──────────┐                   │
│  │MockClient  │    │  RealClient    │                   │
│  │            │    │                │                   │
│  │  MockDOM   │    │  RealDOM       │◄─AngleSharp      │
│  │  HintQueue │    │  JSRuntime     │◄─ClearScript V8  │
│  │  DOMPatcher│    │  DOMBridge     │                   │
│  └────────────┘    │  minimact.js   │◄─Embedded        │
│                     └────────────────┘                   │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

## Components

### 1. RealDOM (AngleSharp-based)

**File**: `Core/RealDOM.cs`

Real HTML DOM using AngleSharp browser engine:

```csharp
var dom = new RealDOM();
dom.LoadHTML("<div id='root'></div>");
var element = dom.GetElementById("root");
dom.SetAttribute(element, "class", "active");
```

**Features:**
- Full HTML5 parsing
- DOM manipulation (createElement, appendChild, etc.)
- CSS selectors (querySelector, querySelectorAll)
- Event handler detection
- HTML serialization

### 2. JSRuntime (ClearScript V8)

**File**: `Core/JSRuntime.cs`

JavaScript execution engine with Minimact runtime:

```csharp
var runtime = new JSRuntime(dom);
runtime.LoadMinimactRuntime(); // Loads minimact.js
runtime.Execute("console.log('Hello from V8!')");
runtime.InitializeMinimactClient("Counter", "root");
```

**Features:**
- V8 JavaScript engine
- Minimact client runtime execution
- DOM API bridging
- Console logging
- Function invocation
- Global variable management

### 3. DOMBridge

**File**: `Core/DOMBridge.cs`

Bridge between JavaScript and AngleSharp DOM:

```csharp
var bridge = new DOMBridge(dom);
// Exposes to JavaScript:
// - document.getElementById()
// - document.querySelector()
// - element.appendChild()
// - console.log()
```

**JavaScript Access:**
```javascript
// From inside V8 engine
var element = document.getElementById('root');
element.className = 'active';
console.log('Element:', element.tagName);
```

### 4. RealClient

**File**: `Core/RealClient.cs`

Complete Minimact client using real runtime:

```csharp
var client = new RealClient();
await client.ConnectAsync("http://localhost:5000/minimact");

var context = client.InitializeComponent("Counter", "root");
client.SimulateClick("increment-btn");

var html = client.GetBodyHTML();
```

**Features:**
- SignalR connection management
- Component initialization
- Event simulation (click, input)
- Patch application via JS runtime
- Hint queue management

### 5. MinimactClientFactory

**File**: `Core/MinimactClientFactory.cs`

Factory for creating Mock or Real clients:

```csharp
// Create real client (default)
var client = MinimactClientFactory.Create(ClientType.Real);

// Create mock client (lightweight)
var client = MinimactClientFactory.Create(ClientType.Mock);

// Use environment variable
// Set MINIMACT_CLIENT_TYPE=Mock or Real
var client = MinimactClientFactory.CreateDefault();
```

## Using in Rangers

### Option 1: Default (Real Client)

```csharp
public class RedRanger : RangerTest
{
    public override string Name => "🔴 Red Ranger";
    public override string Description => "Core Minimact functionality";

    // ClientType defaults to Real - no override needed!

    public override async Task RunAsync()
    {
        // client is RealClient with V8 + AngleSharp
        await client.ConnectAsync("http://localhost:5000/minimact");
        var context = client.InitializeComponent("Counter", "root");

        // DOM is RealDOM (AngleSharp)
        var dom = (RealDOM)client.DOM;
        var element = dom.GetElementById("root");
    }
}
```

### Option 2: Override to Mock

```csharp
public class YellowRanger : RangerTest
{
    // Use Mock for lightweight testing
    protected override MinimactClientFactory.ClientType ClientType
        => MinimactClientFactory.ClientType.Mock;

    public override async Task RunAsync()
    {
        // client is MockClient (no JS engine, faster)
        await client.ConnectAsync("http://localhost:5000/minimact");
    }
}
```

## Setup Requirements

### 1. Install NuGet Packages

```xml
<PackageReference Include="Microsoft.ClearScript.V8" Version="7.4.5" />
<PackageReference Include="AngleSharp" Version="1.1.2" />
```

### 2. Embed Client Runtime

The `minimact.js` file from `src/client-runtime/dist/` is embedded as a resource:

```xml
<EmbeddedResource Include="..\..\client-runtime\dist\minimact.js"
                  Link="Resources\minimact.js" />
```

### 3. Build Client Runtime

Before running tests, ensure client runtime is built:

```bash
cd src/client-runtime
npm install
npm run build
```

This generates `dist/minimact.js` which gets embedded.

## Running Tests

### Via Visual Studio

1. Build solution
2. Open Test Explorer
3. Run individual Rangers or "Run All"

### Via Command Line

```bash
cd src/Minimact.CommandCenter
dotnet test
```

### Via WPF UI

```bash
cd src/Minimact.CommandCenter
dotnet run
```

Then click Ranger buttons in the UI.

## Environment Variables

Control client type via environment:

```bash
# Use Real client (default)
set MINIMACT_CLIENT_TYPE=Real
dotnet test

# Use Mock client
set MINIMACT_CLIENT_TYPE=Mock
dotnet test
```

## Debugging

### JavaScript Debugging

ClearScript V8 is initialized with debugging support:

```csharp
_engine = new V8ScriptEngine(
    V8ScriptEngineFlags.EnableDebugging |
    V8ScriptEngineFlags.EnableDynamicModuleImports
);
```

### Console Output

All JavaScript `console.log()` calls are redirected to C# console:

```javascript
console.log("Hello from JavaScript!");
// Output: [JS] Hello from JavaScript!
```

### DOM Inspection

Inspect AngleSharp DOM at any point:

```csharp
var dom = (RealDOM)client.DOM;
var html = dom.ToHTML();
Console.WriteLine(html);
```

### Script Errors

JavaScript errors are caught and logged with stack traces:

```
[JSRuntime] Script error: ReferenceError: foo is not defined
[JSRuntime] Stack trace: at <eval>:1:1
```

## Performance Considerations

| Feature | Mock Client | Real Client |
|---------|------------|-------------|
| Startup | ~10ms | ~200ms (V8 init) |
| Memory | ~5MB | ~50MB (V8 heap) |
| DOM ops | ~0.1ms | ~1ms (through bridge) |
| JS execution | N/A | ~0.5ms per call |
| Best for | Unit tests, fast CI | Integration tests, E2E validation |

**Recommendation**: Use Real client for critical E2E tests, Mock for fast unit tests.

## Troubleshooting

### Error: "Could not find embedded resource: minimact.js"

**Solution**: Build client runtime first:

```bash
cd src/client-runtime
npm run build
```

### Error: "V8ScriptEngine failed to initialize"

**Solution**: Ensure Visual C++ Redistributable is installed (required by ClearScript).

### Error: "Function 'Minimact.init' not found"

**Solution**: Check that `minimact.js` exports the Minimact API correctly. Inspect with:

```csharp
runtime.Execute("console.log(typeof Minimact)");
```

### SignalR Connection Fails

**Solution**: Ensure ASP.NET Core server is running on `http://localhost:5000`.

## Future Enhancements

1. **Real SignalR Messages**: Intercept actual SignalR messages from server
2. **Performance Profiling**: Measure JS execution times
3. **Snapshot Testing**: Capture DOM snapshots before/after
4. **Coverage Reporting**: Track which code paths in minimact.js are tested
5. **Headless Browser**: Compare against Puppeteer/Playwright

## API Reference

### RealDOM Methods

```csharp
// Document methods
IElement? GetElementById(string id)
IElement? QuerySelector(string selector)
IHtmlCollection<IElement> QuerySelectorAll(string selector)
IElement CreateElement(string tagName)
IText CreateTextNode(string data)

// HTML access
string BodyHtml { get; set; }
string ToHTML()
void LoadHTML(string html)

// DOM manipulation
void SetAttribute(IElement element, string name, string value)
string? GetAttribute(IElement element, string name)
void AppendChild(INode parent, INode child)
void RemoveChild(INode parent, INode child)

// Utilities
INode? GetElementByPath(int[] path)
RealDOM Clone()
void Clear()
```

### JSRuntime Methods

```csharp
// Script execution
void LoadMinimactRuntime()
object? Execute(string code)
void ExecuteVoid(string code)
object? CallFunction(string functionName, params object[] args)

// Global access
object? GetGlobal(string name)
void SetGlobal(string name, object value)

// Host objects
void AddHostObject(string name, object obj)
void AddHostType(string name, Type type)

// Minimact-specific
void InitializeMinimactClient(string componentId, string rootElementId)
void ApplyPatches(string componentId, string patchesJson)
void QueueHint(string componentId, string hintId, string patchesJson, double confidence)

// Event simulation
void SimulateClick(string elementId)
void SimulateInput(string elementId, string value)
```

### RealClient Methods

```csharp
// Connection
Task ConnectAsync(string? hubUrl = null)
Task DisconnectAsync()
string ConnectionState { get; }

// Components
ComponentContext InitializeComponent(string componentId, string rootElementId)
ComponentContext? GetComponent(string componentId)

// Simulation
void SimulateClick(string elementId)
void SimulateInput(string elementId, string value)

// DOM access
string GetHTML()
string GetBodyHTML()

// Properties
RealDOM DOM { get; }
JSRuntime JSRuntime { get; }
```

## Credits

Built with:
- **ClearScript** by Microsoft - JavaScript engine for .NET
- **AngleSharp** - The .NET HTML parser
- **Minimact** - Server-side React for ASP.NET Core

---

**It's Morphin' Time! 🦕⚡**

*Now testing with REAL power!*
