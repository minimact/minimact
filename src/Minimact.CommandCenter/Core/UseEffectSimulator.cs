namespace Minimact.CommandCenter.Core;

/// <summary>
/// Simulate useEffect hook behavior
///
/// CRITICAL: This MUST mirror the browser's useEffect implementation exactly!
/// Handles:
/// - Effect execution on mount
/// - Effect execution when dependencies change
/// - Cleanup function execution
/// - Dependency comparison
/// </summary>
public class UseEffectSimulator
{
    private readonly ComponentContext _context;
    private int _effectIndex = 0;

    public UseEffectSimulator(ComponentContext context)
    {
        _context = context;
    }

    /// <summary>
    /// Simulate useEffect hook
    /// </summary>
    /// <param name="callback">Effect callback function</param>
    /// <param name="dependencies">Dependency array (null = run every render, empty = run once)</param>
    public void UseEffect(Func<Action?> callback, object[]? dependencies = null)
    {
        // Ensure we have an effect slot
        if (_effectIndex >= _context.Effects.Count)
        {
            // First time - add new effect
            _context.Effects.Add(new Effect
            {
                Callback = () => { },
                Dependencies = dependencies,
                HasRun = false
            });
        }

        var effect = _context.Effects[_effectIndex++];

        // Check if we should run this effect
        bool shouldRun = ShouldRunEffect(effect, dependencies);

        if (shouldRun)
        {
            // Run cleanup from previous effect
            effect.Cleanup?.Invoke();

            Console.WriteLine($"[UseEffect] Running effect {_effectIndex - 1} for {_context.ComponentId}");

            // Run new effect
            var cleanup = callback();
            effect.Cleanup = cleanup;
            effect.Dependencies = dependencies;
            effect.HasRun = true;
        }
    }

    /// <summary>
    /// Simulate useEffect with void callback (no cleanup)
    /// </summary>
    public void UseEffect(Action callback, object[]? dependencies = null)
    {
        UseEffect(() =>
        {
            callback();
            return null;
        }, dependencies);
    }

    /// <summary>
    /// Determine if effect should run based on dependencies
    /// Mirrors browser logic exactly
    /// </summary>
    private bool ShouldRunEffect(Effect effect, object[]? dependencies)
    {
        // First run - always execute
        if (!effect.HasRun)
            return true;

        // No dependencies array - run every render
        if (dependencies == null)
            return true;

        // Empty dependencies array - run only once (on mount)
        if (dependencies.Length == 0)
            return false;

        // Check if dependencies changed
        return DependenciesChanged(effect.Dependencies, dependencies);
    }

    /// <summary>
    /// Compare dependency arrays
    /// CRITICAL: Uses same equality logic as browser
    /// </summary>
    private bool DependenciesChanged(object[]? oldDeps, object[]? newDeps)
    {
        if (oldDeps == null || newDeps == null)
            return true;

        if (oldDeps.Length != newDeps.Length)
            return true;

        for (int i = 0; i < oldDeps.Length; i++)
        {
            // Use Object.Equals for comparison (same as browser Object.is)
            if (!Equals(oldDeps[i], newDeps[i]))
                return true;
        }

        return false;
    }

    /// <summary>
    /// Run all effect cleanups (called on component unmount)
    /// </summary>
    public void CleanupAll()
    {
        Console.WriteLine($"[UseEffect] Cleaning up all effects for {_context.ComponentId}");

        foreach (var effect in _context.Effects)
        {
            effect.Cleanup?.Invoke();
        }
    }

    /// <summary>
    /// Reset effect index (call before each render)
    /// This ensures hooks are called in the same order
    /// </summary>
    public void Reset()
    {
        _effectIndex = 0;
    }
}
