using Microsoft.ClearScript;
using Microsoft.ClearScript.V8;
using System;
using System.IO;
using System.Reflection;

namespace Minimact.CommandCenter.Core;

/// <summary>
/// JavaScript runtime using ClearScript V8 engine
/// Executes the real Minimact client runtime
/// </summary>
public class JSRuntime : IDisposable
{
    private readonly V8ScriptEngine _engine;
    private readonly RealDOM _dom;
    private readonly DOMBridge _domBridge;
    private bool _minimactLoaded = false;

    public JSRuntime(RealDOM dom)
    {
        _dom = dom;
        _domBridge = new DOMBridge(dom);

        // Create V8 engine with debugging support
        _engine = new V8ScriptEngine(V8ScriptEngineFlags.EnableDebugging | V8ScriptEngineFlags.EnableDynamicModuleImports);
        _engine.DocumentSettings.AccessFlags = DocumentAccessFlags.EnableFileLoading;

        // Setup global objects
        SetupGlobals();
    }

    /// <summary>
    /// Setup global JavaScript objects
    /// </summary>
    private void SetupGlobals()
    {
        // Add DOM API
        _engine.AddHostObject("document", _domBridge.Document);
        _engine.AddHostObject("console", _domBridge.Console);

        // Add window object (minimal implementation)
        _engine.Execute(@"
            var window = {
                document: document,
                console: console,
                addEventListener: function() {},
                removeEventListener: function() {}
            };
            var global = window;
        ");

        Console.WriteLine("[JSRuntime] Global objects initialized");
    }

    /// <summary>
    /// Expose a hub connection to JavaScript
    /// JavaScript can then call: connection.invoke('MethodName', args...)
    /// This must be called BEFORE LoadMinimactRuntime()
    /// </summary>
    public void ExposeHubConnection(object hub)
    {
        var hubBridge = new HubBridge(hub, this);
        _engine.AddHostObject("__hubConnection", hubBridge);

        // Create a fake SignalR connection that will be used by SignalRManager
        _engine.Execute(@"
            (function() {
                // Create fake HubConnection that bridges to C# RealHub
                var fakeConnection = {
                    start: function() {
                        console.log('[FakeConnection] start');
                        return Promise.resolve();
                    },
                    stop: function() {
                        console.log('[FakeConnection] stop');
                        return Promise.resolve();
                    },
                    invoke: function(methodName) {
                        var args = Array.prototype.slice.call(arguments, 1);
                        console.log('[FakeConnection] invoke:', methodName, args);
                        return __hubConnection.invoke(methodName, ...args);
                    },
                    send: function(methodName) {
                        var args = Array.prototype.slice.call(arguments, 1);
                        console.log('[FakeConnection] send:', methodName, args);
                        __hubConnection.send(methodName, ...args);
                    },
                    on: function(methodName, callback) {
                        console.log('[FakeConnection] on:', methodName);
                        __hubConnection.on(methodName, callback);
                    },
                    state: 1, // HubConnectionState.Connected
                    connectionId: 'fake-connection-id'
                };

                // Store globally so PatchSignalRManager can find it
                window.__fakeSignalRConnection = fakeConnection;

                console.log('[JSRuntime] Fake SignalR connection created');
            })();
        ");

        Console.WriteLine("[JSRuntime] Hub connection exposed to JavaScript");
    }

    /// <summary>
    /// Load the Minimact client runtime from embedded resource
    /// </summary>
    public void LoadMinimactRuntime()
    {
        if (_minimactLoaded)
            return;

        try
        {
            // Load minimact.js from embedded resource
            var assembly = Assembly.GetExecutingAssembly();
            var resourceName = "Minimact.CommandCenter.Resources.minimact.js";

            using var stream = assembly.GetManifestResourceStream(resourceName);
            if (stream == null)
            {
                throw new FileNotFoundException($"Could not find embedded resource: {resourceName}");
            }

            using var reader = new StreamReader(stream);
            var minimactScript = reader.ReadToEnd();

            // Execute the Minimact runtime
            _engine.Execute(minimactScript);
            _minimactLoaded = true;

            Console.WriteLine("[JSRuntime] Minimact client runtime loaded successfully");

            // Patch the SignalRManager to use our fake connection
            PatchSignalRManager();
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"[JSRuntime] Failed to load Minimact runtime: {ex.Message}");
            throw;
        }
    }

    /// <summary>
    /// Load an external library script from file system
    /// </summary>
    /// <param name="scriptPath">Absolute path to the JavaScript file</param>
    public void LoadExternalLibrary(string scriptPath)
    {
        if (!File.Exists(scriptPath))
        {
            throw new FileNotFoundException($"Script file not found: {scriptPath}");
        }

        try
        {
            var scriptContent = File.ReadAllText(scriptPath);
            _engine.Execute(scriptContent);
            Console.WriteLine($"[JSRuntime] Loaded external library: {Path.GetFileName(scriptPath)}");
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"[JSRuntime] Failed to load library {Path.GetFileName(scriptPath)}: {ex.Message}");
            throw;
        }
    }

    /// <summary>
    /// Patch SignalRManager to use our fake hub connection instead of real SignalR
    /// This is called AFTER minimact.js loads to override its SignalRManager
    /// </summary>
    private void PatchSignalRManager()
    {
        Execute(@"
            (function() {
                // Check if Minimact module exists
                if (typeof Minimact === 'undefined') {
                    console.warn('[JSRuntime] Minimact module not found, cannot patch SignalRManager');
                    return;
                }

                // Store reference to our injected connection
                var fakeConnection = window.__fakeSignalRConnection;
                if (!fakeConnection) {
                    console.warn('[JSRuntime] Fake SignalR connection not found');
                    return;
                }

                // Override the SignalRManager constructor
                var OriginalSignalRManager = Minimact.SignalRManager;

                Minimact.SignalRManager = function(hubUrl, options) {
                    console.log('[Minimact] Using patched SignalRManager with fake connection');

                    // Set properties that SignalRManager normally has
                    this.connection = fakeConnection;
                    this.reconnectInterval = (options && options.reconnectInterval) || 5000;
                    this.debugLogging = (options && options.debugLogging) || false;
                    this.eventHandlers = new Map();

                    // Copy methods from original prototype
                    var proto = OriginalSignalRManager.prototype;
                    for (var key in proto) {
                        if (typeof proto[key] === 'function' && key !== 'constructor') {
                            this[key] = proto[key];
                        }
                    }
                };

                // Copy static members and prototype
                Minimact.SignalRManager.prototype = OriginalSignalRManager.prototype;

                console.log('[JSRuntime] SignalRManager patched successfully');
            })();
        ");

        Console.WriteLine("[JSRuntime] SignalRManager patched to use fake connection");
    }

    /// <summary>
    /// Execute JavaScript code
    /// </summary>
    public object? Execute(string code)
    {
        try
        {
            return _engine.Evaluate(code);
        }
        catch (ScriptEngineException ex)
        {
            Console.Error.WriteLine($"[JSRuntime] Script error: {ex.Message}");
            Console.Error.WriteLine($"[JSRuntime] Stack trace: {ex.ErrorDetails}");
            throw;
        }
    }

    /// <summary>
    /// Execute JavaScript code without return value
    /// </summary>
    public void ExecuteVoid(string code)
    {
        try
        {
            _engine.Execute(code);
        }
        catch (ScriptEngineException ex)
        {
            Console.Error.WriteLine($"[JSRuntime] Script error: {ex.Message}");
            Console.Error.WriteLine($"[JSRuntime] Stack trace: {ex.ErrorDetails}");
            throw;
        }
    }

    /// <summary>
    /// Call a JavaScript function
    /// </summary>
    public object? CallFunction(string functionName, params object[] args)
    {
        try
        {
            var func = _engine.Script[functionName];
            if (func == null)
            {
                throw new InvalidOperationException($"Function '{functionName}' not found in JavaScript context");
            }

            return _engine.Invoke(functionName, args);
        }
        catch (ScriptEngineException ex)
        {
            Console.Error.WriteLine($"[JSRuntime] Error calling function '{functionName}': {ex.Message}");
            Console.Error.WriteLine($"[JSRuntime] Stack trace: {ex.ErrorDetails}");
            throw;
        }
    }

    /// <summary>
    /// Get a JavaScript global variable
    /// </summary>
    public object? GetGlobal(string name)
    {
        return _engine.Script[name];
    }

    /// <summary>
    /// Set a JavaScript global variable
    /// </summary>
    public void SetGlobal(string name, object value)
    {
        _engine.Script[name] = value;
    }

    /// <summary>
    /// Add a host object to the JavaScript context
    /// </summary>
    public void AddHostObject(string name, object obj)
    {
        _engine.AddHostObject(name, obj);
    }

    /// <summary>
    /// Add a host type to the JavaScript context
    /// </summary>
    public void AddHostType(string name, Type type)
    {
        _engine.AddHostType(name, type);
    }

    /// <summary>
    /// Initialize Minimact client for a component
    /// </summary>
    public void InitializeMinimactClient(string componentId, string rootElementId)
    {
        if (!_minimactLoaded)
        {
            LoadMinimactRuntime();
        }

        // Call Minimact initialization
        Execute($@"
            if (typeof Minimact !== 'undefined' && Minimact.init) {{
                Minimact.init('{componentId}', '{rootElementId}');
            }}
        ");
    }

    /// <summary>
    /// Apply DOM patches using Minimact's DOMPatcher
    /// </summary>
    public void ApplyPatches(string componentId, string patchesJson)
    {
        Execute($@"
            if (typeof Minimact !== 'undefined' && Minimact.applyPatches) {{
                var patches = JSON.parse({System.Text.Json.JsonSerializer.Serialize(patchesJson)});
                Minimact.applyPatches('{componentId}', patches);
            }}
        ");
    }

    /// <summary>
    /// Queue a hint in the HintQueue
    /// </summary>
    public void QueueHint(string componentId, string hintId, string patchesJson, double confidence)
    {
        Execute($@"
            if (typeof Minimact !== 'undefined' && Minimact.queueHint) {{
                var patches = JSON.parse({System.Text.Json.JsonSerializer.Serialize(patchesJson)});
                Minimact.queueHint('{componentId}', '{hintId}', patches, {confidence});
            }}
        ");
    }

    /// <summary>
    /// Simulate a click event on an element
    /// </summary>
    public void SimulateClick(string elementId)
    {
        Execute($@"
            var element = document.getElementById('{elementId}');
            if (element) {{
                var event = {{ type: 'click', target: element }};
                if (typeof Minimact !== 'undefined' && Minimact.handleEvent) {{
                    Minimact.handleEvent(event);
                }}
            }}
        ");
    }

    /// <summary>
    /// Simulate an input event on an element
    /// </summary>
    public void SimulateInput(string elementId, string value)
    {
        Execute($@"
            var element = document.getElementById('{elementId}');
            if (element) {{
                element.value = '{value}';
                var event = {{ type: 'input', target: element }};
                if (typeof Minimact !== 'undefined' && Minimact.handleEvent) {{
                    Minimact.handleEvent(event);
                }}
            }}
        ");
    }

    public void Dispose()
    {
        _engine?.Dispose();
    }
}
