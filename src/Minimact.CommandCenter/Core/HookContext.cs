namespace Minimact.CommandCenter.Core;

/// <summary>
/// Hook context - provides hook simulators for component testing
///
/// This is the main interface for using hooks in MockClient tests.
/// It manages all hook simulators and ensures hook call order is maintained.
///
/// Usage:
/// <code>
/// var hooks = new HookContext(componentContext, dom);
///
/// // In your "component render" function:
/// hooks.Reset(); // Reset before each render
/// var (count, setCount) = hooks.UseState(0);
/// hooks.UseEffect(() => Console.WriteLine("Mounted!"), Array.Empty<object>());
/// var counterRef = hooks.UseRef<int>(0);
/// var domState = hooks.UseDomElementState(".my-element");
/// </code>
/// </summary>
public class HookContext
{
    private readonly UseStateSimulator _useState;
    private readonly UseEffectSimulator _useEffect;
    private readonly UseRefSimulator _useRef;
    private readonly UseDomElementStateSimulator _useDomElementState;

    public HookContext(ComponentContext context, MockDOM dom)
    {
        _useState = new UseStateSimulator(context);
        _useEffect = new UseEffectSimulator(context);
        _useRef = new UseRefSimulator(context);
        _useDomElementState = new UseDomElementStateSimulator(context, dom);
    }

    // ========================================
    // Hook Methods
    // ========================================

    /// <summary>
    /// useState hook - returns (value, setValue) tuple
    /// setValue accepts either a value or a function updater Func&lt;T, T&gt;
    /// </summary>
    public (T value, Action<object> setValue) UseState<T>(T initialValue)
    {
        return _useState.UseState(initialValue);
    }

    /// <summary>
    /// useEffect hook with cleanup function
    /// </summary>
    public void UseEffect(Func<Action?> callback, object[]? dependencies = null)
    {
        _useEffect.UseEffect(callback, dependencies);
    }

    /// <summary>
    /// useEffect hook without cleanup
    /// </summary>
    public void UseEffect(Action callback, object[]? dependencies = null)
    {
        _useEffect.UseEffect(callback, dependencies);
    }

    /// <summary>
    /// useRef hook - returns ref object with Current property
    /// </summary>
    public Ref UseRef<T>(T initialValue)
    {
        return _useRef.UseRef(initialValue);
    }

    /// <summary>
    /// useRef hook with null initial value
    /// </summary>
    public Ref UseRef()
    {
        return _useRef.UseRef();
    }

    /// <summary>
    /// useDomElementState hook (Minimact Punch)
    /// Returns DOM element state tracker
    /// </summary>
    public DomElementState UseDomElementState(string? selector = null)
    {
        return _useDomElementState.UseDomElementState(selector);
    }

    // ========================================
    // Lifecycle Management
    // ========================================

    /// <summary>
    /// Reset all hook indices
    /// CRITICAL: Call this before each render to ensure hook call order
    /// </summary>
    public void Reset()
    {
        _useState.Reset();
        _useEffect.Reset();
        _useRef.Reset();
        _useDomElementState.Reset();
    }

    /// <summary>
    /// Cleanup all effects (called on component unmount)
    /// </summary>
    public void Cleanup()
    {
        _useEffect.CleanupAll();
    }

    /// <summary>
    /// Trigger all DOM element state changes
    /// Called by MockClient when DOM changes
    /// </summary>
    public void TriggerDomElementStateChanges()
    {
        _useDomElementState.TriggerAllChanges();
    }
}
