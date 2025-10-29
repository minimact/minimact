/**
 * Server Reducer - Client-side representation of a reducer that executes on the server
 *
 * Similar to React's useReducer, but the reducer function runs on the server side.
 * This allows complex state transitions with validation, side effects, and database
 * operations to happen server-side while maintaining reactive UI updates.
 */

/**
 * Server reducer interface - Represents a reducer executing on the server
 */
export interface ServerReducer<TState, TAction> {
  // Current state
  state: TState;

  // Dispatch an action to the server
  dispatch(action: TAction): void;

  // Async dispatch with Promise interface (for await)
  dispatchAsync(action: TAction): Promise<TState>;

  // Status flags
  readonly dispatching: boolean;
  readonly error?: Error;

  // Metadata
  lastDispatchedAt?: Date;
  lastActionType?: string;
}

/**
 * Server reducer implementation
 */
export class ServerReducerImpl<TState, TAction> implements ServerReducer<TState, TAction> {
  state: TState;
  dispatching: boolean = false;
  error?: Error;
  lastDispatchedAt?: Date;
  lastActionType?: string;

  private _pendingPromise?: Promise<TState>;
  private _pendingResolve?: (value: TState) => void;
  private _pendingReject?: (error: Error) => void;

  constructor(
    private reducerId: string,
    private componentId: string,
    private signalR: any,
    private context: any,
    initialState: TState
  ) {
    this.state = initialState;
  }

  /**
   * Dispatch an action to the server (fire-and-forget)
   */
  dispatch(action: TAction): void {
    this.dispatching = true;
    this.error = undefined;
    this.lastDispatchedAt = new Date();

    // Extract action type for debugging (if action has a 'type' field)
    if (action && typeof action === 'object' && 'type' in action) {
      this.lastActionType = String((action as any).type);
    }

    // Trigger re-render to show "dispatching" state immediately
    this._triggerRerender();

    // Invoke server reducer via SignalR
    this.signalR.invoke('DispatchServerReducer', this.componentId, this.reducerId, action)
      .catch((err: Error) => {
        console.error(`[Minimact] Failed to dispatch action to reducer ${this.reducerId}:`, err);
        this.dispatching = false;
        this.error = err;
        this._triggerRerender();
      });
  }

  /**
   * Dispatch an action to the server and wait for the result
   */
  dispatchAsync(action: TAction): Promise<TState> {
    this.dispatching = true;
    this.error = undefined;
    this.lastDispatchedAt = new Date();

    // Extract action type for debugging
    if (action && typeof action === 'object' && 'type' in action) {
      this.lastActionType = String((action as any).type);
    }

    // Create promise for this dispatch
    this._pendingPromise = new Promise<TState>((resolve, reject) => {
      this._pendingResolve = resolve;
      this._pendingReject = reject;
    });

    // Trigger re-render to show "dispatching" state immediately
    this._triggerRerender();

    // Invoke server reducer via SignalR
    this.signalR.invoke('DispatchServerReducer', this.componentId, this.reducerId, action)
      .catch((err: Error) => {
        console.error(`[Minimact] Failed to dispatch action to reducer ${this.reducerId}:`, err);
        this.dispatching = false;
        this.error = err;
        this._pendingReject?.(err);
        this._triggerRerender();
      });

    return this._pendingPromise;
  }

  /**
   * Update reducer state from server
   * Called by Minimact when server sends reducer state updates via SignalR
   */
  _updateFromServer(newState: TState, error?: string): void {
    const previousState = this.state;

    this.state = newState;
    this.dispatching = false;

    if (error) {
      this.error = new Error(error);
      this._pendingReject?.(this.error);
    } else {
      this.error = undefined;
      this._pendingResolve?.(newState);
    }

    // Clear pending promise handlers
    this._pendingPromise = undefined;
    this._pendingResolve = undefined;
    this._pendingReject = undefined;

    // Trigger re-render when state changes
    if (previousState !== newState) {
      this._triggerRerender();
    }
  }

  /**
   * Trigger component re-render
   * Uses hint queue to check for predicted patches
   */
  private _triggerRerender(): void {
    if (!this.context || !this.context.hintQueue) {
      return;
    }

    const stateChanges: Record<string, any> = {
      [this.reducerId]: {
        state: this.state,
        dispatching: this.dispatching,
        error: this.error?.message
      }
    };

    const hint = this.context.hintQueue.matchHint(this.context.componentId, stateChanges);

    if (hint) {
      // Cache hit! Apply predicted patches
      console.log(`[Minimact] 🟢 Reducer state change predicted! Applying ${hint.patches.length} patches`);
      this.context.domPatcher.applyPatches(this.context.element, hint.patches);
    } else {
      // Cache miss - server will send patches
      console.log(`[Minimact] 🔴 Reducer state change not predicted`);
    }
  }
}
