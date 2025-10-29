namespace Minimact.AspNetCore.Core;

/// <summary>
/// Manages the state of a server reducer
/// </summary>
public class ServerReducerState<TState, TAction>
{
    public string ReducerId { get; }
    public TState State { get; private set; }
    public bool Dispatching { get; private set; }
    public Exception? Error { get; private set; }
    public DateTime? LastDispatchedAt { get; private set; }
    public string? LastActionType { get; private set; }

    private readonly Func<TState, TAction, TState> _reducer;
    private readonly MinimactComponent _component;

    public ServerReducerState(
        string reducerId,
        TState initialState,
        Func<TState, TAction, TState> reducer,
        MinimactComponent component)
    {
        ReducerId = reducerId;
        State = initialState;
        _reducer = reducer;
        _component = component;
        Dispatching = false;
    }

    /// <summary>
    /// Dispatch an action to the reducer
    /// </summary>
    public async Task Dispatch(TAction action)
    {
        Dispatching = true;
        Error = null;
        LastDispatchedAt = DateTime.UtcNow;

        // Extract action type for debugging (if action has a 'type' field)
        if (action != null)
        {
            var typeProperty = action.GetType().GetProperty("type") ?? action.GetType().GetProperty("Type");
            if (typeProperty != null)
            {
                var typeValue = typeProperty.GetValue(action);
                if (typeValue != null)
                {
                    LastActionType = typeValue.ToString();
                }
            }
        }

        // Trigger immediate re-render to show "dispatching" state
        _component.TriggerRender();

        try
        {
            // Run reducer (could be async if needed, but typically synchronous state transition)
            await Task.Run(() =>
            {
                var newState = _reducer(State, action);
                State = newState;
            });

            Dispatching = false;

            // Trigger re-render with new state
            _component.TriggerRender();

            // Send state update to client via SignalR
            await _component.SendReducerStateUpdate(ReducerId, State, null);
        }
        catch (Exception ex)
        {
            Dispatching = false;
            Error = ex;

            // Trigger re-render with error
            _component.TriggerRender();

            // Send error to client
            await _component.SendReducerStateUpdate(ReducerId, State, ex.Message);
        }
    }

    /// <summary>
    /// Get a snapshot of the reducer state for serialization
    /// </summary>
    public object GetSnapshot()
    {
        return new
        {
            state = State,
            dispatching = Dispatching,
            error = Error?.Message,
            lastDispatchedAt = LastDispatchedAt,
            lastActionType = LastActionType
        };
    }
}
