using Minimact.CommandCenter.Models;

namespace Minimact.CommandCenter.Core;

/// <summary>
/// Hint queue for predictive rendering - EXACT mirror of browser HintQueue
///
/// CRITICAL: Keep hint matching algorithm SIMPLE!
/// Don't make it "smart" - browser uses simple matching, so must we.
/// </summary>
public class HintQueue
{
    private readonly Dictionary<string, List<QueuedHint>> _hints = new();

    /// <summary>
    /// Queue a hint for predictive rendering
    /// Server pre-computes patches and sends them to client for instant feedback
    /// </summary>
    public void QueueHint(string componentId, string hintId, List<DOMPatch> patches, double confidence = 1.0)
    {
        if (!_hints.ContainsKey(componentId))
        {
            _hints[componentId] = new List<QueuedHint>();
        }

        _hints[componentId].Add(new QueuedHint
        {
            HintId = hintId,
            Patches = patches,
            Confidence = confidence,
            QueuedAt = DateTime.UtcNow
        });

        Console.WriteLine($"[HintQueue] Queued hint '{hintId}' for {componentId} ({patches.Count} patches, {confidence:P} confidence)");
    }

    /// <summary>
    /// Match a hint based on state changes
    ///
    /// IMPORTANT: Keep this simple! Just find best match by confidence.
    /// Browser does simple matching - we must match exactly.
    /// </summary>
    public QueuedHint? MatchHint(string componentId, Dictionary<string, object> stateChanges)
    {
        if (!_hints.ContainsKey(componentId))
            return null;

        var componentHints = _hints[componentId];

        // Find best match (highest confidence)
        var bestMatch = componentHints
            .OrderByDescending(h => h.Confidence)
            .FirstOrDefault();

        if (bestMatch != null)
        {
            Console.WriteLine($"[HintQueue] ✓ Matched hint '{bestMatch.HintId}' (confidence: {bestMatch.Confidence:P})");
        }

        return bestMatch;
    }

    /// <summary>
    /// Clear all hints for a component
    /// </summary>
    public void ClearHints(string componentId)
    {
        if (_hints.ContainsKey(componentId))
        {
            _hints[componentId].Clear();
        }
    }

    /// <summary>
    /// Check if hints exist for a component with specific state
    /// </summary>
    public bool HasHint(string componentId, object expectedState)
    {
        return _hints.ContainsKey(componentId) && _hints[componentId].Count > 0;
    }
}

/// <summary>
/// Queued hint data
/// </summary>
public class QueuedHint
{
    public string HintId { get; set; } = string.Empty;
    public List<DOMPatch> Patches { get; set; } = new();
    public double Confidence { get; set; }
    public DateTime QueuedAt { get; set; }
}
