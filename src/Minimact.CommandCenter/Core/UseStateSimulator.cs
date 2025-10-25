using Minimact.CommandCenter.Models;
using System.Diagnostics;

namespace Minimact.CommandCenter.Core;

/// <summary>
/// Simulate useState hook behavior
///
/// CRITICAL: This MUST mirror the browser's useState implementation exactly!
/// Any divergence will cause tests to pass but browser to fail.
/// </summary>
public class UseStateSimulator
{
    private readonly ComponentContext _context;
    private int _stateIndex = 0;

    public UseStateSimulator(ComponentContext context)
    {
        _context = context;
    }

    /// <summary>
    /// Simulate useState hook
    /// Returns (value, setValue) tuple matching browser useState behavior
    /// setValue accepts either a value or a function updater
    /// </summary>
    public (T value, Action<object> setValue) UseState<T>(T initialValue)
    {
        var stateKey = $"state_{_stateIndex++}";

        // Initialize state if first render
        if (!_context.State.ContainsKey(stateKey))
        {
            _context.State[stateKey] = initialValue;
        }

        var currentValue = (T)_context.State[stateKey];

        // Create setState function (mirrors browser behavior)
        Action<object> setValueInternal = (newValue) =>
        {
            var startTime = Stopwatch.GetTimestamp();

            // Handle function updates (e.g., setState(prev => prev + 1))
            T actualValue;
            if (newValue is Func<T, T> updater)
            {
                actualValue = updater((T)_context.State[stateKey]);
            }
            else
            {
                actualValue = (T)newValue;
            }

            // Build state changes object (for hint queue matching)
            var stateChanges = new Dictionary<string, object>
            {
                [stateKey] = actualValue!
            };

            // Check hint queue FIRST (instant feedback!)
            var hint = _context.HintQueue.MatchHint(_context.ComponentId, stateChanges);

            if (hint != null)
            {
                // 🟢 CACHE HIT! Apply patches immediately
                var latency = Stopwatch.GetElapsedTime(startTime).TotalMilliseconds;
                Console.WriteLine($"[MockClient] 🟢 CACHE HIT! Hint '{hint.HintId}' matched - applying {hint.Patches.Count} patches in {latency:F2}ms");

                _context.DOMPatcher.ApplyPatches(_context.Element, hint.Patches);

                // Notify playground bridge
                _context.PlaygroundBridge?.CacheHit(new CacheHitData
                {
                    ComponentId = _context.ComponentId,
                    HintId = hint.HintId,
                    Latency = latency,
                    Confidence = hint.Confidence,
                    PatchCount = hint.Patches.Count
                });
            }
            else
            {
                // 🔴 CACHE MISS - No prediction found
                var latency = Stopwatch.GetElapsedTime(startTime).TotalMilliseconds;
                Console.WriteLine($"[MockClient] 🔴 CACHE MISS - waiting for server");

                _context.PlaygroundBridge?.CacheMiss(new CacheMissData
                {
                    ComponentId = _context.ComponentId,
                    MethodName = $"setState({stateKey})",
                    Latency = latency,
                    PatchCount = 0
                });
            }

            // Update local state (keep client in sync)
            _context.State[stateKey] = actualValue!;

            // Sync to server (keep server state in sync!)
            // This is CRITICAL - without this, server will have stale data
            _ = _context.SignalR.UpdateComponentStateAsync(
                _context.ComponentId,
                stateKey,
                actualValue!
            );
        };

        return (currentValue, setValueInternal);
    }

    /// <summary>
    /// Reset state index (call before each render)
    /// This ensures hooks are called in the same order
    /// </summary>
    public void Reset()
    {
        _stateIndex = 0;
    }
}
