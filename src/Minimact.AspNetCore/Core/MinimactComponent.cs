using Minimact.AspNetCore.DynamicState;
using Minimact.AspNetCore.Abstractions;
using System.Reflection;

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
    /// Context cache for useContext hook (server-side shared state)
    /// </summary>
    internal IContextCache? ContextCache { get; set; }

    /// <summary>
    /// Lifecycle state machine (optional - for components with distinct lifecycle states)
    /// </summary>
    protected LifecycleStateMachine? Lifecycle { get; set; }

    /// <summary>
    /// Dynamic value compiler for this component
    /// Enables minimal dynamic bindings: Structure ONCE. Bind SEPARATELY. Update DIRECTLY.
    /// </summary>
    protected DynamicValueCompiler DynamicBindings { get; }

    /// <summary>
    /// Last array operation metadata (Phase 9: Array State Helpers)
    /// Used by predictor for precise template extraction
    /// </summary>
    internal ArrayOperation? LastArrayOperation { get; set; }

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

    #region Context Methods (useContext hook support)

    /// <summary>
    /// Get a context value
    /// </summary>
    /// <typeparam name="T">Type of the context value</typeparam>
    /// <param name="key">Context key</param>
    /// <param name="scope">Scope of the context (default: Request)</param>
    /// <param name="urlPattern">URL pattern (required for URL scope)</param>
    /// <returns>Context value or default if not found</returns>
    protected T? GetContext<T>(string key, ContextScope scope = ContextScope.Request, string? urlPattern = null)
    {
        if (ContextCache == null)
            return default;

        return ContextCache.Get<T>(key, scope, urlPattern);
    }

    /// <summary>
    /// Set a context value
    /// </summary>
    /// <typeparam name="T">Type of the context value</typeparam>
    /// <param name="key">Context key</param>
    /// <param name="value">Value to store</param>
    /// <param name="scope">Scope of the context (default: Request)</param>
    /// <param name="urlPattern">URL pattern (required for URL scope)</param>
    /// <param name="expiryMs">Expiry time in milliseconds (null = no expiry)</param>
    protected void SetContext<T>(string key, T value, ContextScope scope = ContextScope.Request, string? urlPattern = null, int? expiryMs = null)
    {
        if (ContextCache == null)
            return;

        ContextCache.Set(key, value, scope, urlPattern, expiryMs);
    }

    /// <summary>
    /// Clear a context value
    /// </summary>
    /// <param name="key">Context key</param>
    /// <param name="scope">Scope of the context (default: Request)</param>
    /// <param name="urlPattern">URL pattern (required for URL scope)</param>
    protected void ClearContext(string key, ContextScope scope = ContextScope.Request, string? urlPattern = null)
    {
        if (ContextCache == null)
            return;

        ContextCache.Clear(key, scope, urlPattern);
    }

    #endregion

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
            try
            {
                CurrentVNode = VNode.Normalize(Render());
                PreviousState = new Dictionary<string, object>(State);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[Minimact] Error during first render of {ComponentId}: {ex.Message}");

                var fallbackVNode = OnRenderError(ex);
                if (fallbackVNode != null)
                {
                    CurrentVNode = VNode.Normalize(fallbackVNode);
                    PreviousState = new Dictionary<string, object>(State);
                }
                else
                {
                    throw; // Re-throw if no fallback provided
                }
            }
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

        // Now render the actual new tree with error boundary
        VNode newVNode;
        try
        {
            newVNode = VNode.Normalize(Render());
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[Minimact] Error during render of {ComponentId}: {ex.Message}");

            var fallbackVNode = OnRenderError(ex);
            if (fallbackVNode != null)
            {
                // Use fallback UI
                newVNode = VNode.Normalize(fallbackVNode);
            }
            else
            {
                throw; // Re-throw if no fallback provided
            }
        }

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
    /// Called when an error occurs during rendering (Error Boundary pattern)
    /// Override to provide fallback UI instead of crashing
    /// </summary>
    /// <param name="exception">The exception that occurred during rendering</param>
    /// <returns>Fallback VNode to display, or null to re-throw the exception</returns>
    protected virtual VNode? OnRenderError(Exception exception)
    {
        // Default: Return null to re-throw
        // Override to provide custom error UI:
        // return new VElement("div",
        //     new Dictionary<string, string> { ["class"] = "error-boundary" },
        //     new VText($"Error: {exception.Message}")
        // );
        return null;
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

    #region Server Tasks (useServerTask support)

    /// <summary>
    /// Server task instances for this component
    /// </summary>
    private readonly Dictionary<string, object> _serverTasks = new();

    /// <summary>
    /// Server reducer instances for this component
    /// </summary>
    private readonly Dictionary<string, object> _serverReducers = new();

    /// <summary>
    /// Get or create a server task by ID
    /// </summary>
    protected ServerTaskState<T> GetServerTask<T>(string taskId)
    {
        if (!_serverTasks.ContainsKey(taskId))
        {
            // Find method with [ServerTask(taskId)] attribute
            var method = FindServerTaskMethod(taskId);
            if (method == null)
            {
                throw new InvalidOperationException($"No method found with [ServerTask(\"{taskId}\")]");
            }

            // Create task state with factory that invokes the method
            var taskState = new ServerTaskState<T>(
                taskId,
                (progress, cancellationToken) =>
                {
                    // Invoke the method with progress and cancellation token
                    var parameters = new List<object>();
                    foreach (var param in method.GetParameters())
                    {
                        if (param.ParameterType == typeof(IProgress<double>))
                            parameters.Add(progress);
                        else if (param.ParameterType == typeof(CancellationToken))
                            parameters.Add(cancellationToken);
                    }

                    var result = method.Invoke(this, parameters.ToArray());
                    if (result is Task<T> taskResult)
                    {
                        return taskResult;
                    }

                    throw new InvalidOperationException($"Method {method.Name} must return Task<{typeof(T).Name}>");
                },
                this
            );

            _serverTasks[taskId] = taskState;
        }

        return (ServerTaskState<T>)_serverTasks[taskId];
    }

    /// <summary>
    /// Find method with [ServerTask] attribute by task ID
    /// </summary>
    private System.Reflection.MethodInfo? FindServerTaskMethod(string taskId)
    {
        return GetType()
            .GetMethods(System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.Instance)
            .FirstOrDefault(m =>
            {
                var attr = m.GetCustomAttribute<ServerTaskAttribute>();
                return attr != null && attr.TaskId == taskId;
            });
    }

    /// <summary>
    /// Get task state for client serialization
    /// </summary>
    internal object? GetServerTaskState(string taskId)
    {
        if (!_serverTasks.ContainsKey(taskId))
        {
            return new
            {
                taskId,
                status = "idle",
                progress = 0.0,
                result = (object?)null,
                error = (string?)null,
                startedAt = (DateTime?)null,
                completedAt = (DateTime?)null,
                duration = (double?)null
            };
        }

        var task = _serverTasks[taskId];
        var taskType = task.GetType();

        // Use reflection to call GetStateForClient
        var method = taskType.GetMethod("GetStateForClient");
        if (method != null)
        {
            return method.Invoke(task, null);
        }

        return null;
    }

    /// <summary>
    /// Get all server task states for this component
    /// </summary>
    internal Dictionary<string, object> GetAllServerTaskStates()
    {
        var states = new Dictionary<string, object>();

        // Get all methods with [ServerTask] attribute
        var taskMethods = GetType()
            .GetMethods(System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.Instance)
            .Where(m => m.GetCustomAttribute<ServerTaskAttribute>() != null);

        foreach (var method in taskMethods)
        {
            var attr = method.GetCustomAttribute<ServerTaskAttribute>();
            if (attr != null)
            {
                var state = GetServerTaskState(attr.TaskId);
                if (state != null)
                {
                    states[attr.TaskId] = state;
                }
            }
        }

        return states;
    }

    #endregion

    #region Server Reducers (useServerReducer support)

    /// <summary>
    /// Get or create a server reducer by ID
    /// </summary>
    protected ServerReducerState<TState, TAction> GetServerReducer<TState, TAction>(string reducerId)
    {
        if (!_serverReducers.ContainsKey(reducerId))
        {
            // Find method with [ServerReducer(reducerId)] attribute
            var method = FindServerReducerMethod(reducerId);
            if (method == null)
            {
                throw new InvalidOperationException($"No method found with [ServerReducer(\"{reducerId}\")]");
            }

            // Get initial state from first parameter's default value or create new instance
            var parameters = method.GetParameters();
            if (parameters.Length < 2)
            {
                throw new InvalidOperationException($"Reducer method must have at least 2 parameters (state, action)");
            }

            var stateType = parameters[0].ParameterType;
            TState initialState = default!;

            // Try to get initial state from method default value or create new instance
            if (parameters[0].HasDefaultValue)
            {
                initialState = (TState)parameters[0].DefaultValue!;
            }
            else
            {
                initialState = Activator.CreateInstance<TState>();
            }

            // Create reducer state
            var reducerState = new ServerReducerState<TState, TAction>(
                reducerId,
                initialState,
                (state, action) =>
                {
                    // Invoke the reducer method
                    var result = method.Invoke(this, new object[] { state!, action! });
                    return (TState)result!;
                },
                this
            );

            _serverReducers[reducerId] = reducerState;
        }

        return (ServerReducerState<TState, TAction>)_serverReducers[reducerId];
    }

    /// <summary>
    /// Find method with [ServerReducer] attribute by reducer ID
    /// </summary>
    private MethodInfo? FindServerReducerMethod(string reducerId)
    {
        return GetType()
            .GetMethods(BindingFlags.NonPublic | BindingFlags.Public | BindingFlags.Instance)
            .FirstOrDefault(m =>
            {
                var attr = m.GetCustomAttribute<ServerReducerAttribute>();
                return attr != null && attr.ReducerId == reducerId;
            });
    }

    /// <summary>
    /// Send reducer state update to client via PatchSender
    /// </summary>
    internal async Task SendReducerStateUpdate(string reducerId, object newState, string? error)
    {
        if (PatchSender == null)
        {
            return;
        }

        await PatchSender.SendReducerStateUpdateAsync(ComponentId, reducerId, newState, error);
    }

    /// <summary>
    /// Get the current state of a server reducer for serialization
    /// </summary>
    internal object? GetServerReducerState(string reducerId)
    {
        if (!_serverReducers.ContainsKey(reducerId))
        {
            return new
            {
                reducerId,
                state = (object?)null,
                dispatching = false,
                error = (string?)null,
                lastDispatchedAt = (DateTime?)null,
                lastActionType = (string?)null
            };
        }

        var reducer = _serverReducers[reducerId];
        var reducerType = reducer.GetType();

        // Use reflection to call GetSnapshot
        var method = reducerType.GetMethod("GetSnapshot");
        if (method != null)
        {
            return method.Invoke(reducer, null);
        }

        return null;
    }

    /// <summary>
    /// Get all server reducer states for this component (for initial hydration)
    /// </summary>
    internal Dictionary<string, object?> GetAllServerReducerStates()
    {
        var states = new Dictionary<string, object?>();

        var methods = GetType()
            .GetMethods(BindingFlags.NonPublic | BindingFlags.Public | BindingFlags.Instance);

        foreach (var method in methods)
        {
            var attr = method.GetCustomAttribute<ServerReducerAttribute>();
            if (attr != null)
            {
                var state = GetServerReducerState(attr.ReducerId);
                if (state != null)
                {
                    states[attr.ReducerId] = state;
                }
            }
        }

        return states;
    }

    #endregion

    #region DevTools Telemetry

    /// <summary>
    /// Get complete component state snapshot for DevTools inspection
    /// </summary>
    public Models.ComponentStateSnapshot GetStateSnapshot()
    {
        return new Models.ComponentStateSnapshot
        {
            ComponentId = ComponentId,
            ComponentName = GetType().Name,
            State = State.ToDictionary(kvp => kvp.Key, kvp => (object?)kvp.Value),
            Refs = new Dictionary<string, object?>(),  // Refs are client-side only
            DomElementStates = new Dictionary<string, Models.DomElementStateSnapshot>(),  // Also client-side
            QueryResults = new Dictionary<string, object?>(),  // Client-side query results
            Effects = new List<Models.EffectInfo>(),  // Effects are client-side
            Templates = GetLoopTemplates(),
            Timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
        };
    }

    /// <summary>
    /// Extract loop template metadata from [LoopTemplate] attributes
    /// </summary>
    private List<Models.LoopTemplateInfo> GetLoopTemplates()
    {
        var templates = new List<Models.LoopTemplateInfo>();

        var loopTemplateAttrs = GetType()
            .GetCustomAttributes(typeof(LoopTemplateAttribute), inherit: true)
            .Cast<LoopTemplateAttribute>();

        foreach (var attr in loopTemplateAttrs)
        {
            // Parse the JSON template metadata
            // The LoopTemplateAttribute stores JSON string with template info
            templates.Add(new Models.LoopTemplateInfo
            {
                StateKey = attr.StateKey,
                ArrayBinding = attr.StateKey,  // Usually same as state key
                ItemVar = "item",  // Default from Babel plugin
                IndexVar = null,
                KeyBinding = null,
                ItemTemplate = null  // TODO: Parse full template JSON
            });
        }

        return templates;
    }

    #endregion
}
