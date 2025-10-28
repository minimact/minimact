using Minimact.AspNetCore.Core;
using Minimact.Testing.Core;

namespace Minimact.Testing.Fluent;

/// <summary>
/// Fluent test interface for a rendered component
/// Provides chainable methods for interactions and assertions
///
/// Example:
/// <code>
/// test.Click("button")
///     .AssertText("button", "Count: 1")
///     .AssertState("count", 1);
/// </code>
/// </summary>
public class ComponentTest<T> where T : MinimactComponent
{
    private readonly T _component;
    private readonly MockElement _element;
    private readonly ComponentContext _context;
    private readonly MockDOM _dom;
    private readonly bool _debugLogging;

    internal ComponentTest(
        T component,
        MockElement element,
        ComponentContext context,
        MockDOM dom,
        bool debugLogging)
    {
        _component = component;
        _element = element;
        _context = context;
        _dom = dom;
        _debugLogging = debugLogging;
    }

    // ============================================================
    // DOM Queries
    // ============================================================

    /// <summary>
    /// Query single element (throws if not found)
    /// </summary>
    public MockElement Query(string selector) =>
        _element.QuerySelector(selector) ?? throw new ElementNotFoundException(selector);

    /// <summary>
    /// Try query single element (returns null if not found)
    /// </summary>
    public MockElement? TryQuery(string selector) => _element.QuerySelector(selector);

    /// <summary>
    /// Get root element
    /// </summary>
    public MockElement Root => _element;

    // ============================================================
    // Interactions
    // ============================================================

    /// <summary>
    /// Click an element
    /// Usage: test.Click("button");
    /// </summary>
    public ComponentTest<T> Click(string selector)
    {
        var element = Query(selector);
        Log($"Click: {selector}");

        // 1. Get onClick handler from attributes
        var onClickAttr = element.GetAttribute("data-onclick") ?? element.GetAttribute("onClick");
        if (string.IsNullOrEmpty(onClickAttr))
        {
            throw new Exception($"Element '{selector}' has no click handler");
        }

        // 2. Parse method name (e.g., "Increment()" -> "Increment")
        var methodName = ParseMethodName(onClickAttr);

        // 3. Invoke method and re-render
        InvokeMethodAndRerender(methodName);

        return this;
    }

    private string ParseMethodName(string handler)
    {
        var parenIndex = handler.IndexOf('(');
        return parenIndex > 0 ? handler.Substring(0, parenIndex) : handler;
    }

    private void InvokeMethodAndRerender(string methodName, params object[] args)
    {
        // 1. Invoke the component method
        var method = typeof(T).GetMethod(methodName,
            System.Reflection.BindingFlags.Public |
            System.Reflection.BindingFlags.NonPublic |
            System.Reflection.BindingFlags.Instance);

        if (method == null)
        {
            throw new Exception($"Method '{methodName}' not found on component {typeof(T).Name}");
        }

        var result = method.Invoke(_component, args);
        if (result is Task task)
        {
            task.GetAwaiter().GetResult();
        }

        // 2. Get old VNode
        var oldVNode = _component.CurrentVNode;

        // 3. Re-render component to get new VNode
        var newVNode = _component.Render();

        // 4. Use REAL Rust reconciler to compute patches (same as production!)
        //    Then apply them to MockDOM (same as browser!)
        var patcher = new DOMPatcher(_dom);
        VNodeRenderer.ApplyRerender(_element, oldVNode!, newVNode, patcher);

        // 5. Update stored VNode for next render
        _component.CurrentVNode = newVNode;

        Log($"✓ Re-rendered after {methodName} (using Rust reconciler)");
    }

    /// <summary>
    /// Input text into element
    /// Usage: await test.InputAsync("input", "Hello");
    /// </summary>
    public ComponentTest<T> Input(string selector, string value)
    {
        var element = Query(selector);
        element.SetAttribute("value", value);
        Log($"Input: {selector} = \"{value}\"");

        return this;
    }

    // ============================================================
    // Assertions
    // ============================================================

    /// <summary>
    /// Assert element text content
    /// Usage: test.AssertText("button", "Count: 1");
    /// </summary>
    public ComponentTest<T> AssertText(string selector, string expected)
    {
        var element = Query(selector);
        var actual = element.TextContent?.Trim() ?? "";

        if (actual != expected)
        {
            throw new AssertionException(
                $"Text mismatch for '{selector}'.\nExpected: {expected}\nActual: {actual}"
            );
        }

        Log($"✓ Assert text: {selector} = \"{expected}\"");
        return this;
    }

    /// <summary>
    /// Assert element exists
    /// Usage: test.AssertExists(".active");
    /// </summary>
    public ComponentTest<T> AssertExists(string selector)
    {
        if (TryQuery(selector) == null)
            throw new AssertionException($"Element '{selector}' not found");

        Log($"✓ Assert exists: {selector}");
        return this;
    }

    /// <summary>
    /// Assert element doesn't exist
    /// Usage: test.AssertNotExists(".hidden");
    /// </summary>
    public ComponentTest<T> AssertNotExists(string selector)
    {
        if (TryQuery(selector) != null)
            throw new AssertionException($"Element '{selector}' should not exist but does");

        Log($"✓ Assert not exists: {selector}");
        return this;
    }

    /// <summary>
    /// Assert component state
    /// Usage: test.AssertState("count", 1);
    /// </summary>
    public ComponentTest<T> AssertState(string key, object expected)
    {
        if (!_context.State.TryGetValue(key, out var actual))
            throw new AssertionException($"State key '{key}' not found");

        if (!Equals(actual, expected))
        {
            throw new AssertionException(
                $"State mismatch for '{key}'.\nExpected: {expected}\nActual: {actual}"
            );
        }

        Log($"✓ Assert state: {key} = {expected}");
        return this;
    }

    /// <summary>
    /// Assert HTML matches (normalized whitespace)
    /// Usage: test.AssertHtml("<button>Count: 1</button>");
    /// </summary>
    public ComponentTest<T> AssertHtml(string expected)
    {
        var actual = _element.ToHTML(indent: 0);

        if (NormalizeHtml(actual) != NormalizeHtml(expected))
        {
            throw new AssertionException(
                $"HTML mismatch.\nExpected:\n{expected}\n\nActual:\n{actual}"
            );
        }

        Log($"✓ Assert HTML matches");
        return this;
    }

    // ============================================================
    // Debug Utilities
    // ============================================================

    /// <summary>
    /// Print current HTML to console
    /// </summary>
    public ComponentTest<T> Debug()
    {
        Console.WriteLine("=== Current HTML ===");
        Console.WriteLine(_element.ToHTML(indent: 0));
        Console.WriteLine();
        return this;
    }

    /// <summary>
    /// Print component state to console
    /// </summary>
    public ComponentTest<T> DebugState()
    {
        Console.WriteLine("=== Component State ===");
        foreach (var (key, value) in _context.State)
        {
            Console.WriteLine($"  {key}: {value}");
        }
        Console.WriteLine();
        return this;
    }

    // ============================================================
    // Advanced Access
    // ============================================================

    /// <summary>
    /// Get component instance (for advanced assertions)
    /// </summary>
    public T Component => _component;

    /// <summary>
    /// Get component context (for advanced assertions)
    /// </summary>
    public ComponentContext Context => _context;

    // ============================================================
    // Helpers
    // ============================================================

    private void Log(string message)
    {
        if (_debugLogging)
        {
            Console.WriteLine($"[Test] {message}");
        }
    }

    private static string NormalizeHtml(string html)
    {
        return System.Text.RegularExpressions.Regex.Replace(html, @"\s+", " ").Trim();
    }
}

/// <summary>
/// Exception thrown when element not found
/// </summary>
public class ElementNotFoundException : Exception
{
    public ElementNotFoundException(string selector)
        : base($"Element not found: {selector}") { }
}

/// <summary>
/// Exception thrown when assertion fails
/// </summary>
public class AssertionException : Exception
{
    public AssertionException(string message) : base(message) { }
}
