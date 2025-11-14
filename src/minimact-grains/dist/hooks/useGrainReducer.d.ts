/**
 * Reducer function type
 */
export type Reducer<TState, TAction> = (state: TState, action: TAction) => TState;
/**
 * Dispatch function type
 */
export type Dispatch<TAction> = (action: TAction) => void;
/**
 * useGrainReducer Hook
 *
 * Reducer-based state management for grains.
 * Built on top of useState, but with reducer pattern.
 *
 * This ensures that grain state is:
 * 1. Deterministic (reducer-based)
 * 2. Trackable (in registry)
 * 3. Serializable (can be saved/loaded)
 * 4. Debuggable (can inspect via registry)
 *
 * @param reducer - Reducer function (state, action) => newState
 * @param initialState - Initial state value
 * @returns [state, dispatch] tuple
 *
 * @example
 * ```tsx
 * type State = { count: number };
 * type Action = { type: 'increment' } | { type: 'decrement' };
 *
 * function counterReducer(state: State, action: Action): State {
 *   switch (action.type) {
 *     case 'increment': return { count: state.count + 1 };
 *     case 'decrement': return { count: state.count - 1 };
 *     default: return state;
 *   }
 * }
 *
 * function CounterGrain({ grainId }) {
 *   useGrain(grainId);
 *   const [state, dispatch] = useGrainReducer(counterReducer, { count: 0 });
 *
 *   return (
 *     <div>
 *       <p>Count: {state.count}</p>
 *       <button onClick={() => dispatch({ type: 'increment' })}>+</button>
 *     </div>
 *   );
 * }
 * ```
 */
export declare function useGrainReducer<TState, TAction>(reducer: Reducer<TState, TAction>, initialState: TState, reducerName?: string): [TState, Dispatch<TAction>];
//# sourceMappingURL=useGrainReducer.d.ts.map