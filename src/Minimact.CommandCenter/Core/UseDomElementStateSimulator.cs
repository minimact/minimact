using Minimact.AspNetCore.Abstractions;
using Minimact.CommandCenter.Models;
using System.Diagnostics;

namespace Minimact.CommandCenter.Core;

/// <summary>
/// Simulate useDomElementState hook behavior (Minimact Punch)
///
/// CRITICAL: This MUST mirror the browser's useDomElementState implementation exactly!
/// Handles:
/// - DOM element state tracking
/// - Intersection observer simulation
/// - Mutation observer simulation (children count)
/// - State change callbacks
/// - Server synchronization
/// </summary>
public class UseDomElementStateSimulator
{
    private readonly ComponentContext _context;
    private readonly MockDOM _dom;
    private int _domStateIndex = 0;

    public UseDomElementStateSimulator(ComponentContext context, MockDOM dom)
    {
        _context = context;
        _dom = dom;
    }

    /// <summary>
    /// Simulate useDomElementState hook
    /// Returns a DomElementState object that tracks DOM changes
    /// </summary>
    /// <param name="selector">CSS selector for the element to track (null = component root)</param>
    /// <returns>DomElementState object with reactive properties</returns>
    public DomElementState UseDomElementState(string? selector = null)
    {
        var stateKey = $"domElementState_{_domStateIndex++}";

        if (!_context.DomElementStates.ContainsKey(stateKey))
        {
            var domState = new DomElementState
            {
                Selector = selector
            };

            // Set up change callback (mirrors browser behavior)
            domState.OnChange = (snapshot) =>
            {
                var startTime = Stopwatch.GetTimestamp();

                Console.WriteLine($"[UseDomElementState] DOM change detected for '{selector ?? "root"}' in {_context.ComponentId}");

                // Build state changes object (for hint queue matching)
                var stateChanges = new Dictionary<string, object>
                {
                    [stateKey] = new
                    {
                        isIntersecting = snapshot.IsIntersecting,
                        intersectionRatio = snapshot.IntersectionRatio,
                        childrenCount = snapshot.ChildrenCount,
                        grandChildrenCount = snapshot.GrandChildrenCount,
                        attributes = snapshot.Attributes,
                        classList = snapshot.ClassList,
                        exists = snapshot.Exists,
                        count = snapshot.Count
                    }
                };

                // Check hint queue (instant feedback!)
                var hint = _context.HintQueue.MatchHint(_context.ComponentId, stateChanges);

                if (hint != null)
                {
                    // 🟢 CACHE HIT!
                    var latency = Stopwatch.GetElapsedTime(startTime).TotalMilliseconds;
                    Console.WriteLine($"[MockClient] 🟢 DOM State change - applying {hint.Patches.Count} patches in {latency:F2}ms");

                    _context.DOMPatcher.ApplyPatches(_context.Element, hint.Patches);

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
                    // 🔴 CACHE MISS
                    var latency = Stopwatch.GetElapsedTime(startTime).TotalMilliseconds;
                    Console.WriteLine($"[MockClient] 🔴 DOM State change - no prediction");

                    _context.PlaygroundBridge?.CacheMiss(new CacheMissData
                    {
                        ComponentId = _context.ComponentId,
                        MethodName = $"domChange({stateKey})",
                        Latency = latency,
                        PatchCount = 0
                    });
                }

                // Sync to server (keep server aware of DOM changes!)
                // This is CRITICAL - server needs to know about DOM state for accurate rendering
                _ = _context.SignalR.UpdateDomElementStateAsync(
                    _context.ComponentId,
                    stateKey,
                    new DomElementStateSnapshot
                    {
                        IsIntersecting = snapshot.IsIntersecting,
                        IntersectionRatio = snapshot.IntersectionRatio,
                        ChildrenCount = snapshot.ChildrenCount,
                        GrandChildrenCount = snapshot.GrandChildrenCount,
                        Attributes = snapshot.Attributes,
                        ClassList = snapshot.ClassList,
                        Exists = snapshot.Exists,
                        Count = snapshot.Count
                    }
                );
            };

            _context.DomElementStates[stateKey] = domState;

            // Initialize state from current DOM
            UpdateDomElementState(domState);

            Console.WriteLine($"[UseDomElementState] Created DOM state tracker '{stateKey}' for selector '{selector ?? "root"}'");
        }

        return _context.DomElementStates[stateKey];
    }

    /// <summary>
    /// Update DOM element state from current DOM
    /// Called on initialization and when DOM changes
    /// </summary>
    public void UpdateDomElementState(DomElementState domState)
    {
        var element = string.IsNullOrEmpty(domState.Selector)
            ? _context.Element
            : _dom.QuerySelector(domState.Selector);

        if (element == null)
        {
            domState.Exists = false;
            domState.Count = 0;
            return;
        }

        // Update state from element
        domState.Exists = true;
        domState.Count = 1;
        domState.ChildrenCount = element.Children?.Count ?? 0;
        domState.GrandChildrenCount = element.Children?.Sum(c => c.Children?.Count ?? 0) ?? 0;
        domState.Attributes = new Dictionary<string, string>(element.Attributes);
        domState.ClassList = element.Attributes.TryGetValue("class", out var classList)
            ? classList.Split(' ', StringSplitOptions.RemoveEmptyEntries).ToList()
            : new List<string>();

        // Intersection state (set by MockClient.SimulateScroll)
        // BoundingBox is already set on the element
    }

    /// <summary>
    /// Trigger all DOM element state change callbacks
    /// Called by MockClient when DOM changes (e.g., after scroll)
    /// </summary>
    public void TriggerAllChanges()
    {
        foreach (var (stateKey, domState) in _context.DomElementStates)
        {
            // Update state from current DOM
            UpdateDomElementState(domState);

            // Trigger change callback
            domState.OnChange?.Invoke(domState);
        }
    }

    /// <summary>
    /// Reset DOM state index (call before each render)
    /// This ensures hooks are called in the same order
    /// </summary>
    public void Reset()
    {
        _domStateIndex = 0;
    }
}
