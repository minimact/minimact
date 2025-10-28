# Minimact Testing Framework Implementation Plan V2

## Executive Summary

This plan builds on Minimact's **existing testing infrastructure** (AngleSharp + ClearScript + SignalR-less abstraction) to create a first-class testing framework for developers.

**Key Insight:** We're not mocking the server—we're testing the **actual server-side rendering and patch logic** without network transport. This is architecturally superior to JSDOM-based approaches.

**Timeline:** 8-10 weeks
**Team Size:** 2 developers
**Foundation:** AngleSharp (DOM), ClearScript (JS runtime), existing patch engine

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│           MINIMACT TESTING FRAMEWORK (V2)                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────────────────┐               │
│  │   Public Test Harness (New Layer)        │               │
│  │   - MinimactTestContext                  │               │
│  │   - Fluent assertion API                 │               │
│  │   - Template inspection                  │               │
│  │   - Performance profiling                │               │
│  └──────────┬───────────────────────────────┘               │
│             │                                                │
│  ┌──────────▼───────────────────────────────┐               │
│  │   Existing Infrastructure (CommandCenter)│               │
│  │                                           │               │
│  │   ┌──────────────┐  ┌──────────────┐    │               │
│  │   │  AngleSharp  │  │  ClearScript │    │               │
│  │   │              │  │              │    │               │
│  │   │ Pure .NET    │  │ JS/TS inside │    │               │
│  │   │ HTML Parser  │  │ .NET         │    │               │
│  │   │ + DOM        │  │              │    │               │
│  │   └──────┬───────┘  └──────┬───────┘    │               │
│  │          │                  │            │               │
│  │          └────────┬─────────┘            │               │
│  │                   │                      │               │
│  │   ┌───────────────▼──────────────┐      │               │
│  │   │   SignalR-less Abstraction   │      │               │
│  │   │                               │      │               │
│  │   │   - Patch engine without      │      │               │
│  │   │     socket transport          │      │               │
│  │   │   - Direct method invocation  │      │               │
│  │   │   - State synchronization     │      │               │
│  │   └───────────────────────────────┘      │               │
│  │                                           │               │
│  └───────────────────────────────────────────┘               │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## What You Already Have (✅ CommandCenter)

### 1. **AngleSharp** - Pure .NET HTML Parser + DOM
```csharp
// You can already do this:
var document = await context.OpenAsync(req => req.Content(html));
var button = document.QuerySelector("button");
var text = button.TextContent; // "Count: 0"
```

**Benefits:**
- ✅ Full DOM API in .NET (no browser, no JSDOM)
- ✅ CSS selector queries
- ✅ Element manipulation
- ✅ Events (simulated)

### 2. **ClearScript** - JS/TS Runtime in .NET
```csharp
// You can already do this:
using var engine = new V8ScriptEngine();
engine.Execute(@"
  const count = 42;
  const result = count * 2;
");
var result = engine.Script.result; // 84
```

**Benefits:**
- ✅ Execute generated JS patches directly
- ✅ Test client-side logic server-side
- ✅ No need for Node.js or browser

### 3. **SignalR-less Abstraction** - Direct Patch Testing
```csharp
// You can already do this:
var component = new CounterComponent();
var oldVNode = component.Render();

component.Increment(); // Call method directly

var newVNode = component.Render();
var patches = reconciler.ComputePatches(oldVNode, newVNode);

// patches = [{ type: 'UpdateText', path: [0, 0], content: 'Count: 1' }]
```

**Benefits:**
- ✅ Test patch generation without SignalR
- ✅ Direct method invocation (no network)
- ✅ Fast (no serialization overhead)

---

## What's Missing (🚧 To Build)

### 1. Public Test Harness API
Wrap your existing infrastructure in a developer-friendly API.

### 2. Fluent Assertion Library
Make assertions readable and discoverable.

### 3. Template Inspection Tools
Expose template cache, bindings, and materialization.

### 4. Performance Profiling
Track template materialization, patch generation, DOM updates.

### 5. Developer Documentation
Guide developers on how to write tests.

---

## Phase 1: Public Test Harness (Weeks 1-3)

### Objective
Create a public API that wraps AngleSharp + ClearScript + SignalR-less abstraction.

### Deliverable: `MinimactTestContext`

**File:** `Minimact.Testing/MinimactTestContext.cs`

```csharp
using AngleSharp;
using Microsoft.ClearScript.V8;
using Minimact.AspNetCore.Core;
using Minimact.Reconciler;

namespace Minimact.Testing;

/// <summary>
/// Test context for Minimact components
/// Wraps AngleSharp (DOM) + ClearScript (JS) + patch engine
/// </summary>
public class MinimactTestContext : IDisposable
{
    private readonly IBrowsingContext _browsingContext;
    private readonly V8ScriptEngine _scriptEngine;
    private readonly RustReconciler _reconciler;
    private readonly ComponentRegistry _componentRegistry;
    private readonly TemplateCache _templateCache;

    // Track operations for assertions
    private readonly List<PatchOperation> _patchHistory = new();
    private readonly List<TemplateOperation> _templateHistory = new();

    public MinimactTestContext(MinimactTestOptions? options = null)
    {
        options ??= new MinimactTestOptions();

        // 1. Initialize AngleSharp (DOM)
        var config = Configuration.Default;
        _browsingContext = BrowsingContext.New(config);

        // 2. Initialize ClearScript (JS runtime)
        _scriptEngine = new V8ScriptEngine();

        // 3. Initialize reconciler
        _reconciler = new RustReconciler(new ReconcilerOptions
        {
            EnableTemplateExtraction = options.EnableTemplateExtraction
        });

        // 4. Initialize component registry
        _componentRegistry = new ComponentRegistry();

        // 5. Initialize template cache
        _templateCache = new TemplateCache();

        // 6. Set up tracking hooks
        SetupTracking();
    }

    /// <summary>
    /// Render a component and return test interface
    /// </summary>
    public async Task<ComponentTestContext<TComponent>> RenderAsync<TComponent>(
        Action<TComponent>? configure = null
    ) where TComponent : MinimactComponent, new()
    {
        // 1. Instantiate component
        var component = new TComponent();
        var componentId = Guid.NewGuid().ToString();

        // 2. Configure if needed
        configure?.Invoke(component);

        // 3. Call lifecycle methods
        await component.OnInitializedAsync();

        // 4. Render to VNode
        var vnode = component.Render();

        // 5. Convert VNode to HTML
        var html = _reconciler.VNodeToHtml(vnode);

        // 6. Parse HTML into AngleSharp DOM
        var document = await _browsingContext.OpenAsync(req => req.Content(html));

        // 7. Register component
        _componentRegistry.Register(componentId, component, vnode);

        // 8. Extract templates
        if (_reconciler.Options.EnableTemplateExtraction)
        {
            var templates = _reconciler.ExtractTemplates(vnode);
            _templateCache.Store(componentId, templates);
        }

        // 9. Return test context
        return new ComponentTestContext<TComponent>(
            component: component,
            componentId: componentId,
            document: document.DocumentElement,
            testContext: this
        );
    }

    /// <summary>
    /// Execute client-side JavaScript
    /// </summary>
    public TResult ExecuteScript<TResult>(string script)
    {
        _scriptEngine.Execute(script);
        return (TResult)_scriptEngine.Script;
    }

    /// <summary>
    /// Apply patches to DOM (simulate client-side patch application)
    /// </summary>
    public void ApplyPatches(IElement rootElement, IEnumerable<Patch> patches)
    {
        foreach (var patch in patches)
        {
            ApplyPatch(rootElement, patch);

            // Track for assertions
            _patchHistory.Add(new PatchOperation
            {
                Timestamp = DateTime.UtcNow,
                Patch = patch
            });
        }
    }

    private void ApplyPatch(IElement rootElement, Patch patch)
    {
        var element = NavigateToPath(rootElement, patch.Path);

        switch (patch.Type)
        {
            case PatchType.UpdateText:
                element.TextContent = patch.Content;
                break;

            case PatchType.UpdateProps:
                foreach (var (key, value) in patch.Props)
                {
                    if (value == null)
                        element.RemoveAttribute(key);
                    else
                        element.SetAttribute(key, value.ToString());
                }
                break;

            case PatchType.Create:
                var newElement = CreateElementFromVNode(patch.Node);
                element.ParentElement?.AppendChild(newElement);
                break;

            case PatchType.Remove:
                element.ParentElement?.RemoveChild(element);
                break;

            case PatchType.Replace:
                var replacement = CreateElementFromVNode(patch.Node);
                element.ParentElement?.ReplaceChild(replacement, element);
                break;

            // Template patches
            case PatchType.UpdateTextTemplate:
                var materialized = _reconciler.MaterializeTemplate(patch.TemplatePatch, patch.State);
                element.TextContent = materialized;

                // Track template operation
                _templateHistory.Add(new TemplateOperation
                {
                    Timestamp = DateTime.UtcNow,
                    TemplatePatch = patch.TemplatePatch,
                    State = patch.State,
                    MaterializedValue = materialized
                });
                break;

            case PatchType.UpdatePropsTemplate:
                var propValue = _reconciler.MaterializeTemplate(patch.TemplatePatch, patch.State);
                element.SetAttribute(patch.PropName, propValue);

                _templateHistory.Add(new TemplateOperation
                {
                    Timestamp = DateTime.UtcNow,
                    TemplatePatch = patch.TemplatePatch,
                    State = patch.State,
                    MaterializedValue = propValue
                });
                break;
        }
    }

    private IElement NavigateToPath(IElement root, int[] path)
    {
        var current = root;

        foreach (var index in path)
        {
            current = (IElement)current.ChildNodes[index];
        }

        return current;
    }

    private IElement CreateElementFromVNode(VNode vnode)
    {
        // Convert VNode back to AngleSharp element
        // Implementation depends on VNode structure
        throw new NotImplementedException();
    }

    private void SetupTracking()
    {
        // Hook into reconciler events for tracking
        // Implementation depends on reconciler API
    }

    // Inspection APIs for assertions
    public IReadOnlyList<PatchOperation> PatchHistory => _patchHistory;
    public IReadOnlyList<TemplateOperation> TemplateHistory => _templateHistory;
    public TemplateCache TemplateCache => _templateCache;

    public void Dispose()
    {
        _scriptEngine?.Dispose();
        _browsingContext?.Dispose();
    }
}

/// <summary>
/// Options for test context
/// </summary>
public class MinimactTestOptions
{
    public bool EnableTemplateExtraction { get; set; } = true;
    public bool EnableDebugLogging { get; set; } = false;
}

/// <summary>
/// Tracked patch operation
/// </summary>
public record PatchOperation
{
    public DateTime Timestamp { get; init; }
    public Patch Patch { get; init; } = null!;
}

/// <summary>
/// Tracked template operation
/// </summary>
public record TemplateOperation
{
    public DateTime Timestamp { get; init; }
    public TemplatePatch TemplatePatch { get; init; } = null!;
    public Dictionary<string, object> State { get; init; } = null!;
    public string MaterializedValue { get; init; } = null!;
}
```

### Deliverable: `ComponentTestContext<T>`

**File:** `Minimact.Testing/ComponentTestContext.cs`

```csharp
using AngleSharp.Dom;
using Minimact.AspNetCore.Core;

namespace Minimact.Testing;

/// <summary>
/// Test interface for a rendered component
/// Provides fluent API for interactions and assertions
/// </summary>
public class ComponentTestContext<TComponent> where TComponent : MinimactComponent
{
    private readonly TComponent _component;
    private readonly string _componentId;
    private readonly IElement _rootElement;
    private readonly MinimactTestContext _testContext;

    internal ComponentTestContext(
        TComponent component,
        string componentId,
        IElement document,
        MinimactTestContext testContext)
    {
        _component = component;
        _componentId = componentId;
        _rootElement = document;
        _testContext = testContext;
    }

    // ============================================================
    // DOM Queries
    // ============================================================

    /// <summary>
    /// Query element by CSS selector
    /// </summary>
    public IElement Query(string selector)
    {
        var element = _rootElement.QuerySelector(selector);
        if (element == null)
            throw new ElementNotFoundException(selector);
        return element;
    }

    /// <summary>
    /// Query all elements by CSS selector
    /// </summary>
    public IHtmlCollection<IElement> QueryAll(string selector)
    {
        return _rootElement.QuerySelectorAll(selector);
    }

    /// <summary>
    /// Get root element
    /// </summary>
    public IElement Root => _rootElement;

    // ============================================================
    // Interactions
    // ============================================================

    /// <summary>
    /// Click element by selector
    /// </summary>
    public async Task<ComponentTestContext<TComponent>> ClickAsync(string selector)
    {
        var element = Query(selector);

        // 1. Get click handler from element attributes
        var onClick = element.GetAttribute("data-minimact-click");
        if (string.IsNullOrEmpty(onClick))
            throw new Exception($"Element '{selector}' has no click handler");

        // 2. Parse method name and args
        var (methodName, args) = ParseHandler(onClick);

        // 3. Get old VNode
        var oldVNode = _component.CurrentVNode;

        // 4. Invoke method on component
        var method = typeof(TComponent).GetMethod(methodName);
        if (method == null)
            throw new Exception($"Method '{methodName}' not found on {typeof(TComponent).Name}");

        var result = method.Invoke(_component, args);

        // Await if async
        if (result is Task task)
            await task;

        // 5. Re-render
        var newVNode = _component.Render();

        // 6. Compute patches
        var patches = _testContext.Reconciler.ComputePatches(oldVNode, newVNode);

        // 7. Apply patches to DOM
        _testContext.ApplyPatches(_rootElement, patches);

        // 8. Update stored VNode
        _component.CurrentVNode = newVNode;

        return this;
    }

    /// <summary>
    /// Input text into element
    /// </summary>
    public async Task<ComponentTestContext<TComponent>> InputAsync(string selector, string value)
    {
        var element = Query(selector);

        // 1. Set value
        element.SetAttribute("value", value);

        // 2. Get input handler
        var onInput = element.GetAttribute("data-minimact-input");
        if (string.IsNullOrEmpty(onInput))
            return this; // No handler, just update value

        // 3. Parse and invoke handler
        var (methodName, args) = ParseHandler(onInput);

        var oldVNode = _component.CurrentVNode;

        var method = typeof(TComponent).GetMethod(methodName);
        var result = method?.Invoke(_component, args);

        if (result is Task task)
            await task;

        var newVNode = _component.Render();
        var patches = _testContext.Reconciler.ComputePatches(oldVNode, newVNode);
        _testContext.ApplyPatches(_rootElement, patches);

        _component.CurrentVNode = newVNode;

        return this;
    }

    /// <summary>
    /// Invoke method directly on component
    /// </summary>
    public async Task<ComponentTestContext<TComponent>> InvokeAsync(
        string methodName,
        params object[] args)
    {
        var oldVNode = _component.CurrentVNode;

        var method = typeof(TComponent).GetMethod(methodName);
        if (method == null)
            throw new Exception($"Method '{methodName}' not found");

        var result = method.Invoke(_component, args);

        if (result is Task task)
            await task;

        var newVNode = _component.Render();
        var patches = _testContext.Reconciler.ComputePatches(oldVNode, newVNode);
        _testContext.ApplyPatches(_rootElement, patches);

        _component.CurrentVNode = newVNode;

        return this;
    }

    // ============================================================
    // Assertions
    // ============================================================

    /// <summary>
    /// Assert HTML matches expected
    /// </summary>
    public ComponentTestContext<TComponent> AssertHtml(string expected)
    {
        var actual = _rootElement.InnerHtml;
        if (actual.Trim() != expected.Trim())
        {
            throw new AssertionException(
                $"HTML mismatch.\nExpected:\n{expected}\n\nActual:\n{actual}"
            );
        }
        return this;
    }

    /// <summary>
    /// Assert element text content
    /// </summary>
    public ComponentTestContext<TComponent> AssertText(string selector, string expected)
    {
        var element = Query(selector);
        var actual = element.TextContent.Trim();

        if (actual != expected)
        {
            throw new AssertionException(
                $"Text mismatch for '{selector}'.\nExpected: {expected}\nActual: {actual}"
            );
        }

        return this;
    }

    /// <summary>
    /// Assert element exists
    /// </summary>
    public ComponentTestContext<TComponent> AssertExists(string selector)
    {
        var element = _rootElement.QuerySelector(selector);
        if (element == null)
            throw new AssertionException($"Element '{selector}' not found");
        return this;
    }

    /// <summary>
    /// Assert element does not exist
    /// </summary>
    public ComponentTestContext<TComponent> AssertNotExists(string selector)
    {
        var element = _rootElement.QuerySelector(selector);
        if (element != null)
            throw new AssertionException($"Element '{selector}' should not exist but does");
        return this;
    }

    /// <summary>
    /// Assert component state
    /// </summary>
    public ComponentTestContext<TComponent> AssertState(string key, object expected)
    {
        var actual = _component.State[key];
        if (!Equals(actual, expected))
        {
            throw new AssertionException(
                $"State mismatch for '{key}'.\nExpected: {expected}\nActual: {actual}"
            );
        }
        return this;
    }

    /// <summary>
    /// Assert template was used
    /// </summary>
    public ComponentTestContext<TComponent> AssertTemplateUsed(string template)
    {
        var templates = _testContext.TemplateHistory;
        var found = templates.Any(t => t.TemplatePatch.Template == template);

        if (!found)
        {
            throw new AssertionException($"Template '{template}' was not used");
        }

        return this;
    }

    /// <summary>
    /// Assert patch count
    /// </summary>
    public ComponentTestContext<TComponent> AssertPatchCount(int expected)
    {
        var actual = _testContext.PatchHistory.Count;
        if (actual != expected)
        {
            throw new AssertionException(
                $"Patch count mismatch.\nExpected: {expected}\nActual: {actual}"
            );
        }
        return this;
    }

    // ============================================================
    // Utilities
    // ============================================================

    /// <summary>
    /// Get component instance (for advanced assertions)
    /// </summary>
    public TComponent Component => _component;

    /// <summary>
    /// Get test context (for advanced operations)
    /// </summary>
    public MinimactTestContext TestContext => _testContext;

    /// <summary>
    /// Debug: Print current HTML
    /// </summary>
    public ComponentTestContext<TComponent> Debug()
    {
        Console.WriteLine("=== Current HTML ===");
        Console.WriteLine(_rootElement.InnerHtml);
        Console.WriteLine();
        return this;
    }

    /// <summary>
    /// Debug: Print component state
    /// </summary>
    public ComponentTestContext<TComponent> DebugState()
    {
        Console.WriteLine("=== Component State ===");
        foreach (var (key, value) in _component.State)
        {
            Console.WriteLine($"{key}: {value}");
        }
        Console.WriteLine();
        return this;
    }

    private (string methodName, object[] args) ParseHandler(string handler)
    {
        // Parse handler like "Increment()" or "SetCount(42)"
        // Simple implementation - real version would parse properly

        var parenIndex = handler.IndexOf('(');
        if (parenIndex == -1)
            return (handler, Array.Empty<object>());

        var methodName = handler.Substring(0, parenIndex);
        // Parse args... (simplified)

        return (methodName, Array.Empty<object>());
    }
}

public class ElementNotFoundException : Exception
{
    public ElementNotFoundException(string selector)
        : base($"Element not found: {selector}") { }
}

public class AssertionException : Exception
{
    public AssertionException(string message) : base(message) { }
}
```

---

## Phase 2: Fluent Assertions (Weeks 4-5)

### Objective
Build a comprehensive assertion library for templates, state, and performance.

### Deliverable: Template Assertions

**File:** `Minimact.Testing/Assertions/TemplateAssertions.cs`

```csharp
namespace Minimact.Testing.Assertions;

public static class TemplateAssertions
{
    /// <summary>
    /// Assert template exists in cache
    /// </summary>
    public static void ShouldHaveTemplate(
        this ComponentTestContext context,
        string template)
    {
        var templates = context.TestContext.TemplateCache.GetAll(context.ComponentId);
        var found = templates.Any(t => t.Template == template);

        if (!found)
        {
            throw new AssertionException(
                $"Template '{template}' not found in cache.\n" +
                $"Available templates:\n{string.Join("\n", templates.Select(t => t.Template))}"
            );
        }
    }

    /// <summary>
    /// Assert template was materialized with specific state
    /// </summary>
    public static void ShouldHaveMaterialized(
        this ComponentTestContext context,
        string template,
        Dictionary<string, object> state)
    {
        var operations = context.TestContext.TemplateHistory;
        var found = operations.Any(op =>
            op.TemplatePatch.Template == template &&
            state.All(kvp => op.State.ContainsKey(kvp.Key) && op.State[kvp.Key].Equals(kvp.Value))
        );

        if (!found)
        {
            throw new AssertionException(
                $"Template '{template}' was not materialized with state: {SerializeState(state)}"
            );
        }
    }

    /// <summary>
    /// Assert loop template exists
    /// </summary>
    public static void ShouldHaveLoopTemplate(
        this ComponentTestContext context,
        string arrayBinding)
    {
        var templates = context.TestContext.TemplateCache.GetAll(context.ComponentId);
        var found = templates.Any(t =>
            t.LoopTemplate != null &&
            t.LoopTemplate.ArrayBinding == arrayBinding
        );

        if (!found)
        {
            throw new AssertionException(
                $"Loop template with array binding '{arrayBinding}' not found"
            );
        }
    }

    /// <summary>
    /// Assert conditional template has branches
    /// </summary>
    public static void ShouldHaveConditionalBranches(
        this ComponentTestContext context,
        string conditionBinding,
        Dictionary<string, string> branches)
    {
        var templates = context.TestContext.TemplateCache.GetAll(context.ComponentId);
        var template = templates.FirstOrDefault(t =>
            t.ConditionalTemplates != null &&
            t.Bindings.Contains(conditionBinding)
        );

        if (template == null)
        {
            throw new AssertionException(
                $"Conditional template with binding '{conditionBinding}' not found"
            );
        }

        foreach (var (value, expectedBranch) in branches)
        {
            if (!template.ConditionalTemplates.TryGetValue(value, out var actualBranch))
            {
                throw new AssertionException(
                    $"Conditional branch for '{value}' not found"
                );
            }

            if (actualBranch != expectedBranch)
            {
                throw new AssertionException(
                    $"Conditional branch mismatch for '{value}'.\n" +
                    $"Expected: {expectedBranch}\n" +
                    $"Actual: {actualBranch}"
                );
            }
        }
    }

    private static string SerializeState(Dictionary<string, object> state)
    {
        return string.Join(", ", state.Select(kvp => $"{kvp.Key}={kvp.Value}"));
    }
}
```

### Deliverable: Performance Assertions

**File:** `Minimact.Testing/Assertions/PerformanceAssertions.cs`

```csharp
namespace Minimact.Testing.Assertions;

public static class PerformanceAssertions
{
    /// <summary>
    /// Assert template materialization is fast
    /// </summary>
    public static void ShouldMaterializeFast(
        this ComponentTestContext context,
        int maxMilliseconds = 5)
    {
        var operations = context.TestContext.TemplateHistory;

        if (operations.Count == 0)
            throw new AssertionException("No template operations recorded");

        // Calculate average materialization time
        // This requires tracking timing in TemplateOperation
        // For now, simple version:

        var lastOp = operations.Last();
        // Timing logic here...
    }

    /// <summary>
    /// Assert cache hit rate meets minimum
    /// </summary>
    public static void ShouldHaveCacheHitRate(
        this ComponentTestContext context,
        double minRate)
    {
        var cache = context.TestContext.TemplateCache;
        var stats = cache.GetStats(context.ComponentId);

        var hitRate = (double)stats.CacheHits / (stats.CacheHits + stats.CacheMisses);

        if (hitRate < minRate)
        {
            throw new AssertionException(
                $"Cache hit rate {hitRate:P} is below minimum {minRate:P}"
            );
        }
    }

    /// <summary>
    /// Assert patch count is minimal
    /// </summary>
    public static void ShouldApplyMinimalPatches(
        this ComponentTestContext context,
        int maxPatches)
    {
        var patches = context.TestContext.PatchHistory;

        if (patches.Count > maxPatches)
        {
            throw new AssertionException(
                $"Too many patches applied: {patches.Count} (max: {maxPatches})"
            );
        }
    }
}
```

---

## Phase 3: Developer Experience (Weeks 6-8)

### Objective
Create documentation, examples, and helper utilities.

### Deliverable: Example Test Suite

**File:** `Minimact.Testing.Examples/CounterTests.cs`

```csharp
using Xunit;
using Minimact.Testing;
using Minimact.Testing.Assertions;

namespace Minimact.Testing.Examples;

public class CounterTests
{
    [Fact]
    public async Task Counter_Increments_OnClick()
    {
        // Arrange
        using var ctx = new MinimactTestContext();
        var component = await ctx.RenderAsync<CounterComponent>();

        // Act
        await component.ClickAsync("button");

        // Assert
        component.AssertText("button", "Count: 1");
        component.AssertState("count", 1);
    }

    [Fact]
    public async Task Counter_UsesTemplate_AfterFirstClick()
    {
        // Arrange
        using var ctx = new MinimactTestContext();
        var component = await ctx.RenderAsync<CounterComponent>();

        // Act - First click (learns template)
        await component.ClickAsync("button");

        // Assert template exists
        component.ShouldHaveTemplate("Count: {0}");

        // Act - Second click (uses template)
        await component.ClickAsync("button");

        // Assert template was materialized
        component.ShouldHaveMaterialized(
            "Count: {0}",
            new Dictionary<string, object> { ["count"] = 2 }
        );
    }

    [Fact]
    public async Task Counter_MaintainsHighCacheHitRate()
    {
        // Arrange
        using var ctx = new MinimactTestContext();
        var component = await ctx.RenderAsync<CounterComponent>();

        // Act - Click 100 times
        for (int i = 0; i < 100; i++)
        {
            await component.ClickAsync("button");
        }

        // Assert - 99% cache hit rate (first click is miss)
        component.ShouldHaveCacheHitRate(0.99);
    }

    [Fact]
    public async Task Counter_AppliesMinimalPatches()
    {
        // Arrange
        using var ctx = new MinimactTestContext();
        var component = await ctx.RenderAsync<CounterComponent>();

        // Act
        await component.ClickAsync("button");

        // Assert - Only 1 patch (UpdateTextTemplate)
        component.AssertPatchCount(1);
    }
}
```

**File:** `Minimact.Testing.Examples/TodoListTests.cs`

```csharp
public class TodoListTests
{
    [Fact]
    public async Task TodoList_AddsItem_WithLoopTemplate()
    {
        // Arrange
        using var ctx = new MinimactTestContext();
        var component = await ctx.RenderAsync<TodoListComponent>();

        // Act - Add first todo
        await component
            .InputAsync("input", "Buy milk")
            .ClickAsync("button.add");

        // Assert loop template created
        component.ShouldHaveLoopTemplate("todos");

        // Act - Add second todo (uses template)
        await component
            .InputAsync("input", "Buy eggs")
            .ClickAsync("button.add");

        // Assert
        component.AssertExists("li:nth-child(1)");
        component.AssertExists("li:nth-child(2)");
        component.AssertText("li:nth-child(1)", "Buy milk");
        component.AssertText("li:nth-child(2)", "Buy eggs");
    }

    [Fact]
    public async Task TodoList_DeletesItem_WithReorderTemplate()
    {
        // Arrange
        using var ctx = new MinimactTestContext();
        var component = await ctx.RenderAsync<TodoListComponent>(c =>
        {
            c.State["todos"] = new List<Todo>
            {
                new() { Id = 1, Text = "A" },
                new() { Id = 2, Text = "B" },
                new() { Id = 3, Text = "C" }
            };
        });

        // Act - Delete middle item
        await component.ClickAsync("li:nth-child(2) .delete");

        // Assert
        var items = component.QueryAll("li");
        Assert.Equal(2, items.Length);
        component.AssertText("li:nth-child(1)", "A");
        component.AssertText("li:nth-child(2)", "C");
    }
}
```

### Deliverable: README

**File:** `Minimact.Testing/README.md`

```markdown
# Minimact.Testing

Official testing framework for Minimact components.

## Why This Is Better

Unlike traditional frameworks that mock the server with JSDOM, Minimact.Testing tests your **actual server-side rendering logic** using:

- **AngleSharp** - Pure .NET HTML parser (no browser needed)
- **ClearScript** - Execute JS/TS inside .NET (no Node.js needed)
- **SignalR-less abstraction** - Test patch generation directly (no network needed)

This means you're testing the **real code that runs in production**, not a mock.

## Quick Start

```csharp
using Minimact.Testing;
using Xunit;

public class CounterTests
{
    [Fact]
    public async Task Increments_OnClick()
    {
        using var ctx = new MinimactTestContext();
        var component = await ctx.RenderAsync<CounterComponent>();

        await component.ClickAsync("button");

        component.AssertText("button", "Count: 1");
        component.AssertState("count", 1);
    }
}
```

## Features

✅ **Pure .NET testing** - No browser, no Node.js, no JSDOM
✅ **Real patch engine** - Test actual Rust reconciler
✅ **Template inspection** - Assert on template cache, bindings, materialization
✅ **Fluent API** - Readable, chainable assertions
✅ **Performance profiling** - Track cache hit rates, patch counts
✅ **Fast** - Tests run in milliseconds

## API Reference

### MinimactTestContext

```csharp
using var ctx = new MinimactTestContext(new MinimactTestOptions
{
    EnableTemplateExtraction = true,
    EnableDebugLogging = false
});

var component = await ctx.RenderAsync<MyComponent>(c =>
{
    c.State["count"] = 42;
});
```

### Interactions

```csharp
await component.ClickAsync("button");
await component.InputAsync("input", "Hello");
await component.InvokeAsync("SetCount", 42);
```

### Assertions

```csharp
// DOM assertions
component.AssertHtml("<p>Count: 1</p>");
component.AssertText("button", "Count: 1");
component.AssertExists(".active");
component.AssertNotExists(".hidden");

// State assertions
component.AssertState("count", 1);

// Template assertions
component.ShouldHaveTemplate("Count: {0}");
component.ShouldHaveLoopTemplate("todos");
component.ShouldHaveCacheHitRate(0.95);

// Performance assertions
component.AssertPatchCount(1);
component.ShouldApplyMinimalPatches(5);
```

## Examples

See `/examples` directory for complete test suites.

## Architecture

```
Test Code (C#)
    ↓
MinimactTestContext
    ↓
AngleSharp (DOM) + ClearScript (JS) + Patch Engine
    ↓
Actual Minimact Components (server-side)
    ↓
Real Rust Reconciler
    ↓
Assertions ✅
```

No mocks. No JSDOM. Just your actual code.

## License

MIT
```

---

## Phase 4: Advanced Features (Weeks 9-10)

### Optional Enhancements

#### 4.1 Snapshot Testing

```csharp
[Fact]
public async Task Counter_MatchesSnapshot()
{
    using var ctx = new MinimactTestContext();
    var component = await ctx.RenderAsync<CounterComponent>();

    await component.ToMatchSnapshot();
}
```

#### 4.2 Performance Profiling

```csharp
[Fact]
public async Task TodoList_MeetsPerformanceRequirements()
{
    using var profiler = new MinimactProfiler();
    using var ctx = new MinimactTestContext();
    var component = await ctx.RenderAsync<TodoListComponent>();

    profiler.Start();

    for (int i = 0; i < 100; i++)
    {
        await component.ClickAsync("button.add");
    }

    var report = profiler.Stop();

    Assert.True(report.AvgPatchGeneration < 5); // < 5ms
    Assert.True(report.CacheHitRate > 0.95); // > 95%
}
```

---

## Timeline Summary

| Phase | Duration | Deliverables |
|-------|----------|--------------|
| 1. Public API | 3 weeks | MinimactTestContext, ComponentTestContext |
| 2. Assertions | 2 weeks | Template, state, performance assertions |
| 3. Developer UX | 3 weeks | Examples, docs, migration guide |
| 4. Advanced | 2 weeks | Snapshots, profiling (optional) |
| **Total** | **10 weeks** | Production-ready testing framework |

---

## Success Metrics

1. **Accuracy** - Tests use actual production code (no mocks)
2. **Speed** - Test suite runs in < 5 seconds (100+ tests)
3. **Developer Experience** - Fluent API, clear errors, great docs
4. **Coverage** - Can test all Minimact features (templates, state, patches)

---

## Why This Beats JSDOM Approaches

| Feature | Minimact.Testing | JSDOM Approach |
|---------|------------------|----------------|
| **Server code** | ✅ Tests actual C# | ❌ Tests JS mock |
| **Reconciler** | ✅ Tests actual Rust | ❌ Tests JS mock |
| **Templates** | ✅ Real template cache | ❌ Mocked |
| **Speed** | ✅ Fast (pure .NET) | ⚠️ Slower (Node.js) |
| **Setup** | ✅ Simple (NuGet) | ❌ Complex (npm + .NET) |
| **Fidelity** | ✅ 100% real | ⚠️ ~80% real |

---

## Next Steps

1. Review existing CommandCenter infrastructure
2. Identify minimal changes needed for public API
3. Build MinimactTestContext wrapper
4. Create example test suite
5. Write documentation
6. Ship v1.0

---

**Built on your existing infrastructure. Zero mocks. 100% real.**
