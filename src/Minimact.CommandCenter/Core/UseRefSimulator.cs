namespace Minimact.CommandCenter.Core;

/// <summary>
/// Simulate useRef hook behavior
///
/// CRITICAL: This MUST mirror the browser's useRef implementation exactly!
/// Key behaviors:
/// - Ref persists across renders
/// - Changing ref.Current does NOT trigger re-render
/// - Ref is initialized once and reused
/// </summary>
public class UseRefSimulator
{
    private readonly ComponentContext _context;
    private int _refIndex = 0;

    public UseRefSimulator(ComponentContext context)
    {
        _context = context;
    }

    /// <summary>
    /// Simulate useRef hook
    /// Returns a Ref object with Current property
    /// </summary>
    /// <typeparam name="T">Type of the ref value</typeparam>
    /// <param name="initialValue">Initial value for the ref</param>
    /// <returns>Ref object that persists across renders</returns>
    public Ref UseRef<T>(T initialValue)
    {
        var refKey = $"ref_{_refIndex++}";

        // Initialize ref if first render
        if (!_context.Refs.ContainsKey(refKey))
        {
            _context.Refs[refKey] = new Ref { Current = initialValue };
            Console.WriteLine($"[UseRef] Created ref '{refKey}' with initial value: {initialValue}");
        }

        return _context.Refs[refKey];
    }

    /// <summary>
    /// Simulate useRef with no initial value (null)
    /// </summary>
    public Ref UseRef()
    {
        return UseRef<object?>(null);
    }

    /// <summary>
    /// Reset ref index (call before each render)
    /// This ensures hooks are called in the same order
    /// </summary>
    public void Reset()
    {
        _refIndex = 0;
    }
}
