using System;
using System.Collections.Generic;
using System.Linq;

namespace Minimact.AspNetCore.Core;

/// <summary>
/// CSS Properties for lifecycle state styles
/// Framework-agnostic dictionary of CSS property-value pairs
/// </summary>
public class CssProperties : Dictionary<string, string>
{
    public CssProperties() : base(StringComparer.OrdinalIgnoreCase)
    {
    }

    public CssProperties(IDictionary<string, string> properties)
        : base(properties, StringComparer.OrdinalIgnoreCase)
    {
    }
}

/// <summary>
/// Configuration for a lifecycle state machine
/// </summary>
public class LifecycleStateConfig
{
    /// <summary>
    /// All available states in the state machine
    /// </summary>
    public List<string> States { get; set; } = new();

    /// <summary>
    /// The initial state
    /// </summary>
    public string DefaultState { get; set; } = string.Empty;

    /// <summary>
    /// CSS styles for each state
    /// </summary>
    public Dictionary<string, CssProperties>? Styles { get; set; }

    /// <summary>
    /// Valid transitions from each state
    /// If null, all transitions are allowed
    /// </summary>
    public Dictionary<string, List<string>>? Transitions { get; set; }

    /// <summary>
    /// Auto-transition durations in milliseconds
    /// State will automatically transition after this duration
    /// </summary>
    public Dictionary<string, int>? Durations { get; set; }

    /// <summary>
    /// CSS easing functions for each state
    /// </summary>
    public Dictionary<string, string>? Easings { get; set; }
}

/// <summary>
/// Single entry in transition history
/// </summary>
public class TransitionHistoryEntry
{
    /// <summary>
    /// State transitioned from
    /// </summary>
    public string From { get; set; } = string.Empty;

    /// <summary>
    /// State transitioned to
    /// </summary>
    public string To { get; set; } = string.Empty;

    /// <summary>
    /// When the transition occurred
    /// </summary>
    public DateTime Timestamp { get; set; }

    /// <summary>
    /// How long was spent in the 'From' state (milliseconds)
    /// </summary>
    public double DurationInState { get; set; }
}

/// <summary>
/// Finite state machine for component lifecycle states
/// Manages transitions between defined states with validation
/// </summary>
public class LifecycleStateMachine
{
    private readonly LifecycleStateConfig _config;
    private string _currentState;
    private string? _previousState;
    private DateTime _stateStartTime;
    private readonly List<TransitionHistoryEntry> _transitionHistory = new();
    private const int MaxHistorySize = 100;

    /// <summary>
    /// Lifecycle hooks - called on state enter
    /// </summary>
    public Action<string, string?>? OnEnter { get; set; }

    /// <summary>
    /// Lifecycle hooks - called on state exit
    /// </summary>
    public Action<string, string?>? OnExit { get; set; }

    /// <summary>
    /// Lifecycle hooks - called on any transition
    /// </summary>
    public Action<string, string>? OnTransition { get; set; }

    public LifecycleStateMachine(LifecycleStateConfig config)
    {
        _config = config ?? throw new ArgumentNullException(nameof(config));
        _currentState = config.DefaultState;
        _stateStartTime = DateTime.UtcNow;

        ValidateConfig();
    }

    // ============================================================
    // PUBLIC API - State Transitions
    // ============================================================

    /// <summary>
    /// Transition to a new state
    /// </summary>
    /// <param name="newState">Target state</param>
    /// <returns>True if transition was successful, false if invalid</returns>
    public bool TransitionTo(string newState)
    {
        if (!CanTransitionTo(newState))
        {
            return false;
        }

        var oldState = _currentState;
        var durationInState = (DateTime.UtcNow - _stateStartTime).TotalMilliseconds;

        // Call onExit hook
        OnExit?.Invoke(oldState, newState);

        // Update state
        _previousState = oldState;
        _currentState = newState;
        _stateStartTime = DateTime.UtcNow;

        // Record history
        _transitionHistory.Add(new TransitionHistoryEntry
        {
            From = oldState,
            To = newState,
            Timestamp = DateTime.UtcNow,
            DurationInState = durationInState
        });

        // Trim history if too large
        if (_transitionHistory.Count > MaxHistorySize)
        {
            _transitionHistory.RemoveAt(0);
        }

        // Call onEnter hook
        OnEnter?.Invoke(newState, oldState);

        // Call onTransition hook
        OnTransition?.Invoke(oldState, newState);

        return true;
    }

    /// <summary>
    /// Check if transition to a state is valid
    /// </summary>
    public bool CanTransitionTo(string newState)
    {
        // Validate state exists
        if (!_config.States.Contains(newState))
        {
            return false;
        }

        // No transition rules = all transitions allowed
        if (_config.Transitions == null)
        {
            return true;
        }

        // Check if transition is explicitly allowed
        if (!_config.Transitions.TryGetValue(_currentState, out var allowedStates))
        {
            return false;
        }

        return allowedStates.Contains(newState);
    }

    // ============================================================
    // PUBLIC API - State Access
    // ============================================================

    /// <summary>
    /// Get current lifecycle state
    /// </summary>
    public string LifecycleState => _currentState;

    /// <summary>
    /// Get previous lifecycle state
    /// </summary>
    public string? PrevLifecycleState => _previousState;

    /// <summary>
    /// Get all available states
    /// </summary>
    public IReadOnlyList<string> AvailableStates => _config.States;

    /// <summary>
    /// Get states that are valid transitions from current state
    /// </summary>
    public IReadOnlyList<string> NextStates
    {
        get
        {
            if (_config.Transitions == null)
            {
                return _config.States.Where(s => s != _currentState).ToList();
            }

            if (_config.Transitions.TryGetValue(_currentState, out var nextStates))
            {
                return nextStates;
            }

            return Array.Empty<string>();
        }
    }

    // ============================================================
    // PUBLIC API - Style & Template Access
    // ============================================================

    /// <summary>
    /// Get current styles for this state
    /// </summary>
    public CssProperties? Style
    {
        get
        {
            if (_config.Styles == null)
            {
                return null;
            }

            return _config.Styles.TryGetValue(_currentState, out var style) ? style : null;
        }
    }

    /// <summary>
    /// Get style for a specific state (without transitioning)
    /// </summary>
    public CssProperties? GetStyleFor(string state)
    {
        if (_config.Styles == null)
        {
            return null;
        }

        return _config.Styles.TryGetValue(state, out var style) ? style : null;
    }

    // ============================================================
    // PUBLIC API - Timing
    // ============================================================

    /// <summary>
    /// Get time spent in current state (milliseconds)
    /// </summary>
    public double TimeInState => (DateTime.UtcNow - _stateStartTime).TotalMilliseconds;

    /// <summary>
    /// Get configured duration for current state (if any)
    /// </summary>
    public int? StateDuration
    {
        get
        {
            if (_config.Durations == null)
            {
                return null;
            }

            return _config.Durations.TryGetValue(_currentState, out var duration) ? duration : null;
        }
    }

    /// <summary>
    /// Get progress through current state (0-1)
    /// Returns null if no duration configured
    /// </summary>
    public double? StateProgress
    {
        get
        {
            var duration = StateDuration;
            if (duration == null)
            {
                return null;
            }

            return Math.Min(TimeInState / duration.Value, 1.0);
        }
    }

    // ============================================================
    // PUBLIC API - History
    // ============================================================

    /// <summary>
    /// Get full transition history
    /// </summary>
    public IReadOnlyList<TransitionHistoryEntry> History => _transitionHistory;

    /// <summary>
    /// Get recent transition history (last N entries)
    /// </summary>
    public IReadOnlyList<TransitionHistoryEntry> GetRecentHistory(int count)
    {
        return _transitionHistory.TakeLast(count).ToList();
    }

    /// <summary>
    /// Check if a transition has occurred before
    /// </summary>
    public bool HasTransitioned(string from, string to)
    {
        return _transitionHistory.Any(e => e.From == from && e.To == to);
    }

    /// <summary>
    /// Count how many times a transition has occurred
    /// </summary>
    public int CountTransitions(string from, string to)
    {
        return _transitionHistory.Count(e => e.From == from && e.To == to);
    }

    /// <summary>
    /// Get average time spent in a state (across all history)
    /// </summary>
    public double GetAverageTimeInState(string state)
    {
        var entries = _transitionHistory.Where(e => e.From == state).ToList();

        if (entries.Count == 0)
        {
            return 0;
        }

        return entries.Average(e => e.DurationInState);
    }

    // ============================================================
    // PUBLIC API - Predictions
    // ============================================================

    /// <summary>
    /// Predict most likely next state based on history
    /// Returns null if no history or no valid transitions
    /// </summary>
    public (string State, double Confidence)? PredictNextState()
    {
        var nextStates = NextStates;

        if (nextStates.Count == 0)
        {
            return null;
        }

        // If only one option, high confidence
        if (nextStates.Count == 1)
        {
            return (nextStates[0], 0.95);
        }

        // Calculate probability based on historical transitions
        var currentStateTransitions = _transitionHistory
            .Where(e => e.From == _currentState)
            .ToList();

        if (currentStateTransitions.Count == 0)
        {
            // No history, equal probability
            return (nextStates[0], 1.0 / nextStates.Count);
        }

        // Count transitions to each next state
        var transitionCounts = nextStates.ToDictionary(
            state => state,
            state => currentStateTransitions.Count(e => e.To == state)
        );

        // Find most common transition
        var mostCommon = transitionCounts.OrderByDescending(kvp => kvp.Value).First();
        var confidence = (double)mostCommon.Value / currentStateTransitions.Count;

        return (mostCommon.Key, confidence);
    }

    // ============================================================
    // PRIVATE - Validation
    // ============================================================

    private void ValidateConfig()
    {
        // 1. Ensure defaultState is in states
        if (!_config.States.Contains(_config.DefaultState))
        {
            throw new ArgumentException(
                $"DefaultState '{_config.DefaultState}' not found in States array",
                nameof(_config.DefaultState)
            );
        }

        // 2. Ensure states array is not empty
        if (_config.States.Count == 0)
        {
            throw new ArgumentException("States array cannot be empty", nameof(_config.States));
        }

        // 3. Check for duplicate states
        var duplicates = _config.States
            .GroupBy(s => s)
            .Where(g => g.Count() > 1)
            .Select(g => g.Key)
            .ToList();

        if (duplicates.Count > 0)
        {
            Console.WriteLine(
                $"[LifecycleStateMachine] Warning: Duplicate states detected: {string.Join(", ", duplicates)}"
            );
        }

        // 4. Validate transition rules reference valid states
        if (_config.Transitions != null)
        {
            foreach (var (from, toStates) in _config.Transitions)
            {
                if (!_config.States.Contains(from))
                {
                    Console.WriteLine(
                        $"[LifecycleStateMachine] Warning: Transition rule for unknown state: {from}"
                    );
                }

                foreach (var to in toStates)
                {
                    if (!_config.States.Contains(to))
                    {
                        Console.WriteLine(
                            $"[LifecycleStateMachine] Warning: Transition {from} → {to} references unknown state: {to}"
                        );
                    }
                }
            }

            // 5. Warn about unreachable states
            var reachable = FindReachableStates();
            var unreachable = _config.States.Except(reachable).ToList();

            if (unreachable.Count > 0)
            {
                Console.WriteLine(
                    $"[LifecycleStateMachine] Warning: Unreachable states detected: {string.Join(", ", unreachable)}"
                );
            }
        }
    }

    /// <summary>
    /// Find all states reachable from defaultState
    /// </summary>
    private HashSet<string> FindReachableStates()
    {
        if (_config.Transitions == null)
        {
            return new HashSet<string>(_config.States);
        }

        var reachable = new HashSet<string>();
        var queue = new Queue<string>();
        queue.Enqueue(_config.DefaultState);

        while (queue.Count > 0)
        {
            var state = queue.Dequeue();

            if (reachable.Contains(state))
            {
                continue;
            }

            reachable.Add(state);

            if (_config.Transitions.TryGetValue(state, out var nextStates))
            {
                foreach (var nextState in nextStates)
                {
                    queue.Enqueue(nextState);
                }
            }
        }

        return reachable;
    }

    /// <summary>
    /// Check if state machine has any transition loops
    /// </summary>
    public bool HasTransitionLoops()
    {
        if (_config.Transitions == null)
        {
            return false;
        }

        var visited = new HashSet<string>();
        var recursionStack = new HashSet<string>();

        bool Dfs(string state)
        {
            visited.Add(state);
            recursionStack.Add(state);

            if (_config.Transitions.TryGetValue(state, out var nextStates))
            {
                foreach (var nextState in nextStates)
                {
                    if (!visited.Contains(nextState))
                    {
                        if (Dfs(nextState))
                        {
                            return true;
                        }
                    }
                    else if (recursionStack.Contains(nextState))
                    {
                        return true; // Loop detected
                    }
                }
            }

            recursionStack.Remove(state);
            return false;
        }

        foreach (var state in _config.States)
        {
            if (!visited.Contains(state))
            {
                if (Dfs(state))
                {
                    return true;
                }
            }
        }

        return false;
    }
}
