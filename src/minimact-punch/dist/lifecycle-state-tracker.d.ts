/**
 * LifecycleStateTracker - Finite State Machine for DOM elements
 *
 * Transforms elements into state machines with:
 * - Declarative states with valid transitions
 * - Styles bound to each state (CSS-in-JS)
 * - Templates bound to each state (React elements)
 * - Lifecycle hooks (onEnter, onExit, onTransition)
 * - Auto-transitions with durations
 * - Transition history tracking
 *
 * Part of minimact-punch Lifecycle Features - Part 4: The Theatrical Engine
 *
 * @example
 * ```typescript
 * const modal = new LifecycleStateTracker({
 *   states: ['hidden', 'entering', 'visible', 'exiting'],
 *   defaultState: 'hidden',
 *   styles: {
 *     hidden: { opacity: 0, pointerEvents: 'none' },
 *     entering: { transition: 'all 0.3s', opacity: 1 },
 *     visible: { opacity: 1 },
 *     exiting: { transition: 'all 0.2s', opacity: 0 }
 *   },
 *   transitions: {
 *     hidden: ['entering'],
 *     entering: ['visible', 'exiting'],
 *     visible: ['exiting'],
 *     exiting: ['hidden']
 *   },
 *   durations: {
 *     entering: 300,  // Auto-transition to 'visible' after 300ms
 *     visible: 3000   // Auto-transition to 'exiting' after 3s
 *   }
 * });
 *
 * modal.transitionTo('entering');
 * // → Applies styles.entering
 * // → After 300ms, auto-transitions to 'visible'
 * // → After 3s, auto-transitions to 'exiting'
 * ```
 */
export type CSSProperties = {
    [key: string]: string | number | undefined;
};
export interface LifecycleStateConfig<TState extends string = string> {
    states: TState[];
    defaultState: TState;
    styles?: Partial<Record<TState, CSSProperties>>;
    templates?: Partial<Record<TState, any>>;
    transitions?: Partial<Record<TState, TState[]>>;
    onEnter?: (state: TState, previousState?: TState) => void;
    onExit?: (state: TState, nextState?: TState) => void;
    onTransition?: (from: TState, to: TState) => void;
    durations?: Partial<Record<TState, number>>;
    easings?: Partial<Record<TState, string>>;
}
export interface TransitionHistoryEntry<TState extends string = string> {
    from: TState;
    to: TState;
    timestamp: number;
    durationInState: number;
}
/**
 * LifecycleStateTracker - The core state machine implementation
 */
export declare class LifecycleStateTracker<TState extends string = string> {
    private currentState;
    private previousState?;
    private config;
    private stateStartTime;
    private autoTransitionTimer?;
    private transitionHistory;
    private maxHistorySize;
    private onChange?;
    private onServerSync?;
    private reachableStates?;
    constructor(config: LifecycleStateConfig<TState>, onChange?: () => void, onServerSync?: (newState: TState) => void);
    /**
     * Transition to a new state
     * Returns true if transition was successful, false if invalid
     */
    transitionTo(newState: TState): boolean;
    /**
     * Check if transition to a state is valid
     */
    canTransitionTo(newState: TState): boolean;
    /**
     * Get current lifecycle state
     */
    get lifecycleState(): TState;
    /**
     * Get previous lifecycle state
     */
    get prevLifecycleState(): TState | undefined;
    /**
     * Get all available states
     */
    get availableStates(): TState[];
    /**
     * Get states that are valid transitions from current state
     */
    get nextStates(): TState[];
    /**
     * Get current styles for this state
     */
    get style(): CSSProperties;
    /**
     * Get current template for this state
     */
    get template(): any;
    /**
     * Get style for a specific state (without transitioning)
     */
    getStyleFor(state: TState): CSSProperties;
    /**
     * Get template for a specific state (without transitioning)
     */
    getTemplateFor(state: TState): any;
    /**
     * Get time spent in current state (milliseconds)
     */
    get timeInState(): number;
    /**
     * Get configured duration for current state (if any)
     */
    get stateDuration(): number | undefined;
    /**
     * Get progress through current state (0-1)
     * Returns undefined if no duration configured
     */
    get stateProgress(): number | undefined;
    /**
     * Get full transition history
     */
    get history(): ReadonlyArray<TransitionHistoryEntry<TState>>;
    /**
     * Get recent transition history (last N entries)
     */
    getRecentHistory(count: number): TransitionHistoryEntry<TState>[];
    /**
     * Check if a transition has occurred before
     */
    hasTransitioned(from: TState, to: TState): boolean;
    /**
     * Count how many times a transition has occurred
     */
    countTransitions(from: TState, to: TState): number;
    /**
     * Get average time spent in a state (across all history)
     */
    getAverageTimeInState(state: TState): number;
    /**
     * Predict most likely next state based on history
     * Returns null if no history or no valid transitions
     */
    predictNextState(): {
        state: TState;
        confidence: number;
    } | null;
    private scheduleAutoTransition;
    private clearAutoTransition;
    private validateConfig;
    /**
     * Find all states reachable from defaultState
     */
    private findReachableStates;
    /**
     * Check if state machine has any transition loops
     */
    hasTransitionLoops(): boolean;
    private notifyChange;
    /**
     * Cleanup - clear timers and reset state
     */
    destroy(): void;
}
//# sourceMappingURL=lifecycle-state-tracker.d.ts.map