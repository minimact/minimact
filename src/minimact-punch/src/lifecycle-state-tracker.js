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
/**
 * LifecycleStateTracker - The core state machine implementation
 */
export class LifecycleStateTracker {
    constructor(config, onChange, onServerSync) {
        // History
        this.transitionHistory = [];
        this.maxHistorySize = 100;
        this.config = config;
        this.onChange = onChange;
        this.onServerSync = onServerSync;
        this.currentState = config.defaultState;
        this.stateStartTime = Date.now();
        // Validate configuration
        this.validateConfig();
    }
    // ============================================================
    // PUBLIC API - State Transitions
    // ============================================================
    /**
     * Transition to a new state
     * Returns true if transition was successful, false if invalid
     */
    transitionTo(newState) {
        // Validate transition is allowed
        if (!this.canTransitionTo(newState)) {
            console.warn(`[LifecycleStateTracker] Invalid transition: ${this.currentState} → ${newState}`);
            return false;
        }
        const oldState = this.currentState;
        const durationInState = Date.now() - this.stateStartTime;
        // Call onExit hook
        this.config.onExit?.(oldState, newState);
        // Clear any pending auto-transition
        this.clearAutoTransition();
        // Update state
        this.previousState = oldState;
        this.currentState = newState;
        this.stateStartTime = Date.now();
        // Record history
        this.transitionHistory.push({
            from: oldState,
            to: newState,
            timestamp: Date.now(),
            durationInState
        });
        // Trim history if too large
        if (this.transitionHistory.length > this.maxHistorySize) {
            this.transitionHistory.shift();
        }
        // Call onEnter hook
        this.config.onEnter?.(newState, oldState);
        // Call onTransition hook
        this.config.onTransition?.(oldState, newState);
        // Set up auto-transition if configured
        const duration = this.config.durations?.[newState];
        if (duration !== undefined) {
            this.scheduleAutoTransition(duration);
        }
        // Sync to server (if callback provided)
        if (this.onServerSync) {
            this.onServerSync(newState);
        }
        // Notify change
        this.notifyChange();
        return true;
    }
    /**
     * Check if transition to a state is valid
     */
    canTransitionTo(newState) {
        // Validate state exists
        if (!this.config.states.includes(newState)) {
            return false;
        }
        // No transition rules = all transitions allowed
        if (!this.config.transitions) {
            return true;
        }
        const allowedStates = this.config.transitions[this.currentState];
        // No rules for current state = no transitions allowed
        if (!allowedStates) {
            return false;
        }
        return allowedStates.includes(newState);
    }
    // ============================================================
    // PUBLIC API - State Access
    // ============================================================
    /**
     * Get current lifecycle state
     */
    get lifecycleState() {
        return this.currentState;
    }
    /**
     * Get previous lifecycle state
     */
    get prevLifecycleState() {
        return this.previousState;
    }
    /**
     * Get all available states
     */
    get availableStates() {
        return [...this.config.states];
    }
    /**
     * Get states that are valid transitions from current state
     */
    get nextStates() {
        if (!this.config.transitions) {
            return this.config.states.filter(s => s !== this.currentState);
        }
        return this.config.transitions[this.currentState] || [];
    }
    // ============================================================
    // PUBLIC API - Style & Template Access
    // ============================================================
    /**
     * Get current styles for this state
     */
    get style() {
        return this.config.styles?.[this.currentState] || {};
    }
    /**
     * Get current template for this state
     */
    get template() {
        return this.config.templates?.[this.currentState] ?? null;
    }
    /**
     * Get style for a specific state (without transitioning)
     */
    getStyleFor(state) {
        return this.config.styles?.[state] || {};
    }
    /**
     * Get template for a specific state (without transitioning)
     */
    getTemplateFor(state) {
        return this.config.templates?.[state] ?? null;
    }
    // ============================================================
    // PUBLIC API - Timing
    // ============================================================
    /**
     * Get time spent in current state (milliseconds)
     */
    get timeInState() {
        return Date.now() - this.stateStartTime;
    }
    /**
     * Get configured duration for current state (if any)
     */
    get stateDuration() {
        return this.config.durations?.[this.currentState];
    }
    /**
     * Get progress through current state (0-1)
     * Returns undefined if no duration configured
     */
    get stateProgress() {
        const duration = this.stateDuration;
        if (duration === undefined)
            return undefined;
        return Math.min(this.timeInState / duration, 1);
    }
    // ============================================================
    // PUBLIC API - History
    // ============================================================
    /**
     * Get full transition history
     */
    get history() {
        return this.transitionHistory;
    }
    /**
     * Get recent transition history (last N entries)
     */
    getRecentHistory(count) {
        return this.transitionHistory.slice(-count);
    }
    /**
     * Check if a transition has occurred before
     */
    hasTransitioned(from, to) {
        return this.transitionHistory.some(entry => entry.from === from && entry.to === to);
    }
    /**
     * Count how many times a transition has occurred
     */
    countTransitions(from, to) {
        return this.transitionHistory.filter(entry => entry.from === from && entry.to === to).length;
    }
    /**
     * Get average time spent in a state (across all history)
     */
    getAverageTimeInState(state) {
        const entries = this.transitionHistory.filter(entry => entry.from === state);
        if (entries.length === 0)
            return 0;
        const totalTime = entries.reduce((sum, entry) => sum + entry.durationInState, 0);
        return totalTime / entries.length;
    }
    // ============================================================
    // PUBLIC API - Predictions
    // ============================================================
    /**
     * Predict most likely next state based on history
     * Returns null if no history or no valid transitions
     */
    predictNextState() {
        const nextStates = this.nextStates;
        if (nextStates.length === 0)
            return null;
        // If only one option, high confidence
        if (nextStates.length === 1) {
            return {
                state: nextStates[0],
                confidence: 0.95
            };
        }
        // Calculate probability based on historical transitions
        const currentStateTransitions = this.transitionHistory.filter(entry => entry.from === this.currentState);
        if (currentStateTransitions.length === 0) {
            // No history, equal probability
            return {
                state: nextStates[0],
                confidence: 1 / nextStates.length
            };
        }
        // Count transitions to each next state
        const transitionCounts = new Map();
        for (const nextState of nextStates) {
            const count = currentStateTransitions.filter(entry => entry.to === nextState).length;
            transitionCounts.set(nextState, count);
        }
        // Find most common transition
        let maxCount = 0;
        let mostLikelyState = nextStates[0];
        for (const [state, count] of transitionCounts) {
            if (count > maxCount) {
                maxCount = count;
                mostLikelyState = state;
            }
        }
        const confidence = maxCount / currentStateTransitions.length;
        return {
            state: mostLikelyState,
            confidence
        };
    }
    // ============================================================
    // PRIVATE - Auto-Transition
    // ============================================================
    scheduleAutoTransition(duration) {
        this.autoTransitionTimer = window.setTimeout(() => {
            const nextStates = this.nextStates;
            // If only one valid next state, auto-transition to it
            if (nextStates.length === 1) {
                this.transitionTo(nextStates[0]);
            }
            else if (nextStates.length > 1) {
                console.warn(`[LifecycleStateTracker] Auto-transition from '${this.currentState}' has ${nextStates.length} options. ` +
                    `Specify exactly one transition target or manually call transitionTo().`);
            }
        }, duration);
    }
    clearAutoTransition() {
        if (this.autoTransitionTimer !== undefined) {
            clearTimeout(this.autoTransitionTimer);
            this.autoTransitionTimer = undefined;
        }
    }
    // ============================================================
    // PRIVATE - Validation
    // ============================================================
    validateConfig() {
        // 1. Ensure defaultState is in states
        if (!this.config.states.includes(this.config.defaultState)) {
            throw new Error(`[LifecycleStateTracker] defaultState "${this.config.defaultState}" not in states array`);
        }
        // 2. Ensure states array is not empty
        if (this.config.states.length === 0) {
            throw new Error(`[LifecycleStateTracker] states array cannot be empty`);
        }
        // 3. Check for duplicate states
        const stateSet = new Set(this.config.states);
        if (stateSet.size !== this.config.states.length) {
            console.warn(`[LifecycleStateTracker] Duplicate states detected in states array`);
        }
        // 4. Validate transition rules reference valid states
        if (this.config.transitions) {
            for (const [from, toStates] of Object.entries(this.config.transitions)) {
                if (!this.config.states.includes(from)) {
                    console.warn(`[LifecycleStateTracker] Transition rule for unknown state: ${from}`);
                }
                for (const to of toStates) {
                    if (!this.config.states.includes(to)) {
                        console.warn(`[LifecycleStateTracker] Transition ${from} → ${to} references unknown state: ${to}`);
                    }
                }
            }
            // 5. Warn about unreachable states
            const reachable = this.findReachableStates();
            const unreachable = this.config.states.filter(state => !reachable.has(state));
            if (unreachable.length > 0) {
                console.warn(`[LifecycleStateTracker] Unreachable states detected: ${unreachable.join(', ')}`);
            }
            this.reachableStates = reachable;
        }
    }
    /**
     * Find all states reachable from defaultState
     */
    findReachableStates() {
        if (!this.config.transitions) {
            return new Set(this.config.states);
        }
        const reachable = new Set();
        const queue = [this.config.defaultState];
        while (queue.length > 0) {
            const state = queue.shift();
            if (reachable.has(state))
                continue;
            reachable.add(state);
            const nextStates = this.config.transitions[state] || [];
            queue.push(...nextStates);
        }
        return reachable;
    }
    /**
     * Check if state machine has any transition loops
     */
    hasTransitionLoops() {
        if (!this.config.transitions)
            return false;
        const visited = new Set();
        const recursionStack = new Set();
        const dfs = (state) => {
            visited.add(state);
            recursionStack.add(state);
            const nextStates = this.config.transitions[state] || [];
            for (const nextState of nextStates) {
                if (!visited.has(nextState)) {
                    if (dfs(nextState))
                        return true;
                }
                else if (recursionStack.has(nextState)) {
                    return true; // Loop detected
                }
            }
            recursionStack.delete(state);
            return false;
        };
        for (const state of this.config.states) {
            if (!visited.has(state)) {
                if (dfs(state))
                    return true;
            }
        }
        return false;
    }
    // ============================================================
    // PRIVATE - Change Notification
    // ============================================================
    notifyChange() {
        if (this.onChange) {
            this.onChange();
        }
    }
    // ============================================================
    // PUBLIC API - Cleanup
    // ============================================================
    /**
     * Cleanup - clear timers and reset state
     */
    destroy() {
        this.clearAutoTransition();
        this.transitionHistory = [];
        this.onChange = undefined;
    }
}
