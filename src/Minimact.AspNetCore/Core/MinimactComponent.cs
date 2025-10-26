using Minimact.AspNetCore.DynamicState;
using Minimact.AspNetCore.Abstractions;

namespace Minimact.AspNetCore.Core;

/// <summary>
/// Base class for all Minimact components
/// Generated components inherit from this class
/// </summary>
public abstract class MinimactComponent
{
    /// <summary>
    /// Unique identifier for this component instance
    /// </summary>
    public string ComponentId { get; protected set; }

    /// <summary>
    /// SignalR connection ID for real-time updates
    /// </summary>
    public string? ConnectionId { get; internal set; }

    /// <summary>
    /// Internal state dictionary
    /// </summary>
    internal Dictionary<string, object> State { get; }

    /// <summary>
    /// Previous state snapshot for diff comparison
    /// </summary>
    internal Dictionary<string, object> PreviousState { get; set; }

    /// <summary>
    /// Current rendered VNode tree
    /// </summary>
    internal VNode? CurrentVNode { get; set; }

    /// <summary>
    /// Patch sender for sending updates to client (abstracted transport layer)
    /// </summary>
    internal IPatchSender? PatchSender { get; set; }

    /// <summary>
    /// Global predictor instance (shared across all components)
    /// </summary>
    internal static RustBridge.Predictor? GlobalPredictor { get; set; }

    /// <summary>
    /// Client-computed state dictionary (values computed in browser via external libraries)
    /// </summary>
    protected Dictionary<string, object> ClientState { get; set; }

    /// <summary>
    /// Lifecycle state machine (optional - for components with distinct lifecycle states)
    /// </summary>
    protected LifecycleStateMachine? Lifecycle { get; set; }

    /// <summary>
    /// Dynamic value compiler for this component
    /// Enables minimal dynamic bindings: Structure ONCE. Bind SEPARATELY. Update DIRECTLY.
    /// </summary>
    protected DynamicValueCompiler DynamicBindings { get; }

    protected MinimactComponent()
    {
        ComponentId = Guid.NewGuid().ToString();
        State = new Dictionary<string, object>();
        PreviousState = new Dictionary<string, object>();
        ClientState = new Dictionary<string, object>();
        DynamicBindings = new DynamicValueCompiler();
    }

    /// <summary>
    /// Main render method - must be implemented by derived components
    /// </summary>
    protected abstract VNode Render();

    /// <summary>
    /// Public method to trigger rendering (for testing and framework use)
    /// </summary>
    public VNode RenderComponent()
    {
        return Render();
    }

    /// <summary>
    /// Override this to register dynamic value bindings
    /// Called before rendering to set up minimal dynamic bindings
    ///
    /// Example:
    /// <code>
    /// protected override void ConfigureDynamicBindings()
    /// {
    ///     DynamicBindings.RegisterBinding(".price", (state) =>
    ///     {
    ///         var s = (MyState)state;
    ///         return s.IsPremium ? s.FactoryPrice : s.RetailPrice;
    ///     });
    /// }
    /// </code>
    /// </summary>
    protected virtual void ConfigureDynamicBindings()
    {
        // Override in derived components to register bindings
    }

    /// <summary>
    /// Render with dynamic bindings compiled
    /// Server evaluates binding functions and inserts values into VNode tree
    /// </summary>
    public VNode RenderWithDynamicBindings()
    {
        // Call user's dynamic binding configuration
        ConfigureDynamicBindings();

        // Render normal VNode tree
        var vnode = Render();

        // Apply dynamic bindings to VNode tree
        DynamicBindings.ApplyToVNode(vnode, State);

        // Clear bindings for next render
        DynamicBindings.Clear();

        return vnode;
    }

    /// <summary>
    /// Update state and trigger re-render
    /// </summary>
    protected void SetState(string key, object value)
    {
        // Store previous value
        if (State.ContainsKey(key))
        {
            PreviousState[key] = State[key];
        }

        // Update state
        State[key] = value;

        // Sync state back to fields
        StateManager.SyncStateToMembers(this);

        // Trigger render cycle
        TriggerRender();
    }

    /// <summary>
    /// Get current state value
    /// </summary>
    protected T? GetState<T>(string key)
    {
        if (State.TryGetValue(key, out var value))
        {
            return (T)value;
        }
        return default;
    }

    /// <summary>
    /// Get current state value (non-generic)
    /// </summary>
    protected object? GetState(string key)
    {
        return State.TryGetValue(key, out var value) ? value : null;
    }

    /// <summary>
    /// Get a client-computed value with type safety and default fallback.
    /// Client-computed values are calculated in the browser using external libraries
    /// (like lodash, moment, etc.) and synced to the server via SignalR.
    /// </summary>
    /// <typeparam name="T">The expected type of the client-computed value</typeparam>
    /// <param name="key">The key used to identify this client-computed value</param>
    /// <param name="defaultValue">Default value to return if not yet computed or synced</param>
    /// <returns>The client-computed value or the default if unavailable</returns>
    protected T GetClientState<T>(string key, T defaultValue = default!)
    {
        if (ClientState.TryGetValue(key, out var value))
        {
            try
            {
                // Handle JsonElement deserialization (from SignalR)
                if (value is System.Text.Json.JsonElement jsonElement)
                {
                    return System.Text.Json.JsonSerializer.Deserialize<T>(jsonElement.GetRawText()) ?? defaultValue;
                }

                // Direct cast
                if (value is T typedValue)
                {
                    return typedValue;
                }

                // Attempt conversion
                return (T)Convert.ChangeType(value, typeof(T)) ?? defaultValue;
            }
            catch
            {
                // If conversion fails, return default
                return defaultValue;
            }
        }
        return defaultValue;
    }

    /// <summary>
    /// Update client-computed state (called by SignalR when client sends computed values).
    /// This does NOT trigger a re-render by itself, as it's typically called before
    /// the render cycle that will use these values.
    /// </summary>
    /// <param name="updates">Dictionary of client-computed values to update</param>
    public void UpdateClientState(Dictionary<string, object> updates)
    {
        foreach (var kvp in updates)
        {
            ClientState[kvp.Key] = kvp.Value;
        }
    }

    /// <summary>
    /// Set state from client-side useState hook
    /// Keeps server state in sync with client to prevent stale data
    /// </summary>
    /// <param name="key">State key from useState hook</param>
    /// <param name="value">New value from client</param>
    public void SetStateFromClient(string key, object value)
    {
        // Store previous value for diff
        if (State.ContainsKey(key))
        {
            PreviousState[key] = State[key];
        }

        // Update state dictionary
        State[key] = value;

        // Sync state back to fields (if there's a corresponding [State] field)
        StateManager.SyncStateToMembers(this);

        // Note: We don't call TriggerRender() here because the client already
        // applied cached patches. We just need to keep state in sync so the
        // next render (from other causes) has correct data.
    }

    /// <summary>
    /// Set DOM element state from client-side useDomElementState hook
    /// Keeps server aware of DOM changes for accurate rendering
    /// </summary>
    /// <param name="key">State key from useDomElementState hook</param>
    /// <param name="snapshot">DOM element state snapshot from client</param>
    public void SetDomStateFromClient(string key, DomElementStateSnapshot snapshot)
    {
        // Store DOM state in the State dictionary
        // This allows components to access DOM state in their Render() method
        if (State.ContainsKey(key))
        {
            PreviousState[key] = State[key];
        }

        State[key] = snapshot;

        // Note: We don't call TriggerRender() here because the client already
        // applied cached patches. We just need to keep state in sync so the
        // next render (from other causes) has correct data.
    }

    /// <summary>
    /// Get current state dictionary for template parameterization
    /// Used by hot reload to fill template parameters with current values
    /// </summary>
    public Dictionary<string, object> GetState()
    {
        return new Dictionary<string, object>(State);
    }

    /// <summary>
    /// Set query results from client-side useDomQuery hook
    /// Keeps server aware of query results for accurate rendering
    /// </summary>
    /// <param name="key">Query key from useDomQuery hook</param>
    /// <param name="results">Query result snapshots from client</param>
    public void SetQueryResultsFromClient(string key, List<Dictionary<string, object>> results)
    {
        // Store query results in the State dictionary
        // This allows components to access query results in their Render() method
        if (State.ContainsKey(key))
        {
            PreviousState[key] = State[key];
        }

        State[key] = results;

        // Note: We don't call TriggerRender() here because the client already
        // applied cached patches. We just need to keep state in sync so the
        // next render (from other causes) has correct data.
    }

    /// <summary>
    /// Transition lifecycle state from client
    /// Keeps server lifecycle machine in sync with client transitions
    /// </summary>
    /// <param name="newState">Target state to transition to</param>
    /// <returns>True if transition was successful, false if invalid</returns>
    public bool TransitionLifecycleFromClient(string newState)
    {
        if (Lifecycle == null)
        {
            Console.WriteLine($"[MinimactComponent] Cannot transition lifecycle - no lifecycle machine configured");
            return false;
        }

        var success = Lifecycle.TransitionTo(newState);

        if (!success)
        {
            Console.WriteLine(
                $"[MinimactComponent] Invalid lifecycle transition: {Lifecycle.LifecycleState} → {newState}"
            );
        }

        // Note: We don't call TriggerRender() here because the client already
        // applied cached patches from the lifecycle state. We just need to keep
        // the server's lifecycle machine in sync so the next render has correct state.

        return success;
    }

    /// <summary>
    /// Helper method to initialize a lifecycle state machine for this component
    /// Call this in the component constructor
    /// </summary>
    protected void InitializeLifecycle(LifecycleStateConfig config)
    {
        Lifecycle = new LifecycleStateMachine(config);
    }

    /// <summary>
    /// Trigger a re-render cycle with predictive patching
    /// </summary>
    internal void TriggerRender()
    {
        if (CurrentVNode == null || PatchSender == null || ConnectionId == null)
        {
            // First render - no prediction needed
            CurrentVNode = VNode.Normalize(Render());
            PreviousState = new Dictionary<string, object>(State);
            return;
        }

        // Get changed state keys
        var changedKeys = State.Keys
            .Where(k => !PreviousState.ContainsKey(k) || !Equals(State[k], PreviousState[k]))
            .ToArray();

        if (changedKeys.Length == 0)
        {
            return; // No state changes
        }

        // Call lifecycle hook
        OnStateChanged(changedKeys);

        // Try to predict patches for instant feedback
        Prediction? prediction = null;
        if (GlobalPredictor != null && changedKeys.Length == 1)
        {
            var key = changedKeys[0];
            var stateChange = new StateChange
            {
                ComponentId = ComponentId,
                StateKey = key,
                OldValue = PreviousState.ContainsKey(key) ? PreviousState[key] : null,
                NewValue = State[key]
            };

            prediction = GlobalPredictor.Predict(stateChange, CurrentVNode);

            if (prediction != null && prediction.Confidence >= 0.7)
            {
                Console.WriteLine($"[Minimact] Prediction: {prediction.Patches.Count} patches with {prediction.Confidence:F2} confidence");

                // Send prediction immediately for instant UI feedback
                _ = PatchSender.SendHintAsync(ComponentId, $"predict_{key}", prediction.Patches, prediction.Confidence);
            }
        }

        // Now render the actual new tree
        var newVNode = VNode.Normalize(Render());

        // Compute actual patches using Rust reconciliation engine
        var actualPatches = RustBridge.Reconcile(CurrentVNode, newVNode);

        if (actualPatches.Count > 0)
        {
            // Check if prediction was correct
            bool predictionCorrect = prediction != null &&
                                    PatchesMatch(prediction.Patches, actualPatches);

            if (prediction != null && !predictionCorrect)
            {
                Console.WriteLine($"[Minimact] Prediction was wrong, sending correction");

                // Send correction as regular patches
                _ = PatchSender.SendPatchesAsync(ComponentId, actualPatches);
            }
            else if (prediction == null)
            {
                // No prediction was made, send patches normally
                _ = PatchSender.SendPatchesAsync(ComponentId, actualPatches);
            }
            // If prediction was correct, do nothing - client already has the correct state!
        }

        // Learn from this state change for future predictions
        if (GlobalPredictor != null && changedKeys.Length == 1)
        {
            var key = changedKeys[0];
            var stateChange = new StateChange
            {
                ComponentId = ComponentId,
                StateKey = key,
                OldValue = PreviousState.ContainsKey(key) ? PreviousState[key] : null,
                NewValue = State[key]
            };

            // Get component metadata (Babel-generated loop templates)
            var metadata = GetMetadata();

            // Pass all component state for multi-variable template extraction + metadata
            GlobalPredictor.LearnWithMetadata(stateChange, CurrentVNode, newVNode, State, metadata);
            Console.WriteLine($"[Minimact] Learned pattern for {ComponentId}::{key} (metadata: {metadata?.LoopTemplates?.Count ?? 0} loop templates)");
        }

        // Update current tree
        CurrentVNode = newVNode;

        // Reset previous state
        PreviousState = new Dictionary<string, object>(State);
    }

    /// <summary>
    /// Check if two patch lists are equivalent
    /// </summary>
    private bool PatchesMatch(List<Patch> a, List<Patch> b)
    {
        if (a.Count != b.Count) return false;

        for (int i = 0; i < a.Count; i++)
        {
            if (a[i].Type != b[i].Type) return false;
            if (!a[i].Path.SequenceEqual(b[i].Path)) return false;

            // For UpdateText, check content matches
            if (a[i].Type == "UpdateText" && a[i].Content != b[i].Content)
                return false;
        }

        return true;
    }

    /// <summary>
    /// Initialize component state synchronously
    /// Called once when component is first created
    /// </summary>
    protected virtual void OnInitialized()
    {
        // Override in derived components for synchronous initialization
    }

    /// <summary>
    /// Initialize component state and perform async setup
    /// Called once when component is first created
    /// </summary>
    public virtual Task OnInitializedAsync()
    {
        OnInitialized(); // Call synchronous init first
        return Task.CompletedTask;
    }

    /// <summary>
    /// Called after state changes, before patches are sent
    /// </summary>
    /// <param name="changedKeys">Keys of state properties that changed</param>
    public virtual void OnStateChanged(string[] changedKeys)
    {
        // Override in derived components for custom logic
    }

    /// <summary>
    /// Called after component is first mounted on the client
    /// </summary>
    public virtual void OnComponentMounted()
    {
        // Override in derived components for custom logic
    }

    /// <summary>
    /// Called before component is unmounted from the client
    /// </summary>
    public virtual void OnComponentUnmounted()
    {
        // Override in derived components for cleanup
    }

    /// <summary>
    /// Initialize and render component for the first time
    /// </summary>
    internal async Task<VNode> InitializeAndRenderAsync()
    {
        await OnInitializedAsync();
        // Normalize the initial render to match DOM structure
        CurrentVNode = VNode.Normalize(Render());
        return CurrentVNode;
    }

    /// <summary>
    /// Force a re-render without state change
    /// </summary>
    protected void ForceUpdate()
    {
        TriggerRender();
    }

    /// <summary>
    /// Register a prediction hint for usePredictHint
    /// This pre-computes patches for likely state changes
    /// </summary>
    protected void RegisterHint(string hintId, Dictionary<string, object> predictedState)
    {
        if (CurrentVNode == null || PatchSender == null || ConnectionId == null || GlobalPredictor == null)
        {
            return;
        }

        // Build state changes from predicted state
        var stateChanges = new List<StateChange>();
        foreach (var (key, newValue) in predictedState)
        {
            var oldValue = State.ContainsKey(key) ? State[key] : null;
            stateChanges.Add(new StateChange
            {
                ComponentId = ComponentId,
                StateKey = key,
                OldValue = oldValue,
                NewValue = newValue
            });
        }

        // Get prediction from Rust engine
        var result = GlobalPredictor.PredictHint(hintId, ComponentId, stateChanges, CurrentVNode);

        if (result?.Ok == true && result.Data != null)
        {
            Console.WriteLine($"[Minimact] Hint '{hintId}': {result.Data.Patches.Count} patches queued with {result.Data.Confidence:F2} confidence");

            // Send hint to client to queue
            _ = PatchSender.SendHintAsync(ComponentId, hintId, result.Data.Patches, result.Data.Confidence);
        }
        else
        {
            Console.WriteLine($"[Minimact] Hint '{hintId}': No prediction available");
        }
    }

    /// <summary>
    /// Get component metadata for Rust predictor.
    /// Extracts loop templates from attributes for use in predictive rendering.
    /// </summary>
    /// <returns>ComponentMetadata with loop templates</returns>
    public ComponentMetadata GetMetadata()
    {
        var metadata = new ComponentMetadata
        {
            ComponentId = ComponentId,
            ComponentName = GetType().Name
        };

        // Extract loop templates from [LoopTemplate] attributes
        var loopTemplateAttrs = GetType().GetCustomAttributes(typeof(LoopTemplateAttribute), false)
            .Cast<LoopTemplateAttribute>();

        foreach (var attr in loopTemplateAttrs)
        {
            metadata.LoopTemplates[attr.StateKey] = attr.TemplateJson;
        }

        return metadata;
    }
}
