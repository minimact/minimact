/**
 * Statistical operations on DOM element collections
 *
 * Provides avg, sum, median, stdDev, and other aggregations
 * by extracting numeric values from elements.
 *
 * @example
 * ```typescript
 * const prices = new DomElementState('.price');
 * prices.vals.avg(); // 29.99
 * prices.vals.sum(); // 149.95
 * prices.vals.median(); // 25.00
 * ```
 */
class DomElementStateValues {
    constructor(elements) {
        this.elements = elements;
    }
    /**
     * Extract numeric values from elements
     * Priority: data-value attribute > textContent parsing
     */
    extractNumericValues() {
        return this.elements.map(state => {
            const element = state.element;
            if (!element)
                return 0;
            // Try data-value attribute first
            const dataValue = element.getAttribute('data-value');
            if (dataValue !== null) {
                const parsed = parseFloat(dataValue);
                return isNaN(parsed) ? 0 : parsed;
            }
            // Fall back to parsing textContent
            const text = element.textContent || '';
            const cleaned = text.replace(/[^0-9.-]/g, '');
            const parsed = parseFloat(cleaned);
            return isNaN(parsed) ? 0 : parsed;
        });
    }
    /**
     * Average of all values
     */
    avg() {
        const values = this.extractNumericValues();
        if (values.length === 0)
            return 0;
        return values.reduce((a, b) => a + b, 0) / values.length;
    }
    /**
     * Sum of all values
     */
    sum() {
        return this.extractNumericValues().reduce((a, b) => a + b, 0);
    }
    /**
     * Minimum value
     */
    min() {
        const values = this.extractNumericValues();
        if (values.length === 0)
            return 0;
        return Math.min(...values);
    }
    /**
     * Maximum value
     */
    max() {
        const values = this.extractNumericValues();
        if (values.length === 0)
            return 0;
        return Math.max(...values);
    }
    /**
     * Median value (middle value when sorted)
     */
    median() {
        const values = this.extractNumericValues();
        if (values.length === 0)
            return 0;
        const sorted = [...values].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        if (sorted.length % 2 === 0) {
            // Even number of values - average the two middle values
            return (sorted[mid - 1] + sorted[mid]) / 2;
        }
        else {
            // Odd number of values - return middle value
            return sorted[mid];
        }
    }
    /**
     * Standard deviation
     */
    stdDev() {
        const values = this.extractNumericValues();
        if (values.length === 0)
            return 0;
        const avg = this.avg();
        const squareDiffs = values.map(v => Math.pow(v - avg, 2));
        const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / values.length;
        return Math.sqrt(avgSquareDiff);
    }
    /**
     * Range (min and max)
     */
    range() {
        return {
            min: this.min(),
            max: this.max()
        };
    }
    /**
     * Percentile (e.g., percentile(95) for 95th percentile)
     */
    percentile(p) {
        const values = this.extractNumericValues();
        if (values.length === 0)
            return 0;
        const sorted = [...values].sort((a, b) => a - b);
        const index = (p / 100) * (sorted.length - 1);
        const lower = Math.floor(index);
        const upper = Math.ceil(index);
        const weight = index - lower;
        if (lower === upper) {
            return sorted[lower];
        }
        return sorted[lower] * (1 - weight) + sorted[upper] * weight;
    }
    /**
     * Check if all values are above a threshold
     */
    allAbove(threshold) {
        return this.extractNumericValues().every(v => v > threshold);
    }
    /**
     * Check if any value is below a threshold
     */
    anyBelow(threshold) {
        return this.extractNumericValues().some(v => v < threshold);
    }
    /**
     * Count values above a threshold
     */
    countAbove(threshold) {
        return this.extractNumericValues().filter(v => v > threshold).length;
    }
    /**
     * Count values below a threshold
     */
    countBelow(threshold) {
        return this.extractNumericValues().filter(v => v < threshold).length;
    }
    /**
     * Count values in a range (inclusive)
     */
    countInRange(min, max) {
        return this.extractNumericValues().filter(v => v >= min && v <= max).length;
    }
    /**
     * Get all values as array
     */
    toArray() {
        return this.extractNumericValues();
    }
}

/**
 * Pseudo-State Tracker
 *
 * Makes CSS pseudo-selectors (:hover, :active, :focus, :disabled) reactive JavaScript values.
 * Eliminates manual event handler tracking for pseudo-states.
 *
 * Features:
 * - Hover state (mouseenter/mouseleave)
 * - Active state (mousedown/mouseup)
 * - Focus state (focus/blur)
 * - Disabled state (attribute-based)
 * - Checked state (attribute-based)
 * - Invalid state (attribute-based)
 */
class PseudoStateTracker {
    constructor(element, onChange) {
        this.states = {
            hover: false,
            active: false,
            focus: false,
            disabled: false,
            checked: false,
            invalid: false,
        };
        this.listeners = [];
        this.element = element;
        this.onChange = onChange;
        this.setupListeners();
    }
    /**
     * Setup all event listeners and observers
     */
    setupListeners() {
        // Hover state
        this.addListener('mouseenter', () => {
            this.states.hover = true;
            this.notifyChange();
        });
        this.addListener('mouseleave', () => {
            this.states.hover = false;
            this.notifyChange();
        });
        // Active state
        this.addListener('mousedown', () => {
            this.states.active = true;
            this.notifyChange();
        });
        this.addListener('mouseup', () => {
            this.states.active = false;
            this.notifyChange();
        });
        // Also clear active on mouseleave (in case mouseup happens outside)
        this.addListener('mouseleave', () => {
            if (this.states.active) {
                this.states.active = false;
                this.notifyChange();
            }
        });
        // Focus state
        this.addListener('focus', () => {
            this.states.focus = true;
            this.notifyChange();
        });
        this.addListener('blur', () => {
            this.states.focus = false;
            this.notifyChange();
        });
        // Attribute-based states (use MutationObserver)
        this.mutationObserver = new MutationObserver(() => {
            this.updateAttributeStates();
        });
        this.mutationObserver.observe(this.element, {
            attributes: true,
            attributeFilter: ['disabled', 'aria-disabled', 'aria-checked', 'aria-invalid']
        });
        // Initialize attribute states
        this.updateAttributeStates();
    }
    /**
     * Add event listener and track for cleanup
     */
    addListener(event, handler, options) {
        this.element.addEventListener(event, handler, options);
        this.listeners.push({ event, handler, options });
    }
    /**
     * Update attribute-based states
     */
    updateAttributeStates() {
        const prevDisabled = this.states.disabled;
        const prevChecked = this.states.checked;
        const prevInvalid = this.states.invalid;
        // Disabled state
        this.states.disabled =
            this.element.hasAttribute('disabled') ||
                this.element.getAttribute('aria-disabled') === 'true';
        // Checked state (for inputs)
        if (this.element instanceof HTMLInputElement) {
            this.states.checked = this.element.checked;
        }
        else {
            this.states.checked = this.element.getAttribute('aria-checked') === 'true';
        }
        // Invalid state (for inputs)
        if (this.element instanceof HTMLInputElement || this.element instanceof HTMLTextAreaElement) {
            this.states.invalid = !this.element.validity.valid;
        }
        else {
            this.states.invalid = this.element.getAttribute('aria-invalid') === 'true';
        }
        // Only notify if something actually changed
        if (prevDisabled !== this.states.disabled ||
            prevChecked !== this.states.checked ||
            prevInvalid !== this.states.invalid) {
            this.notifyChange();
        }
    }
    /**
     * Notify change callback
     */
    notifyChange() {
        if (this.onChange) {
            this.onChange();
        }
    }
    // Getters for pseudo-states
    get hover() {
        return this.states.hover;
    }
    get active() {
        return this.states.active;
    }
    get focus() {
        return this.states.focus;
    }
    get disabled() {
        return this.states.disabled;
    }
    get checked() {
        return this.states.checked;
    }
    get invalid() {
        return this.states.invalid;
    }
    /**
     * Get all states as object
     */
    getAll() {
        return { ...this.states };
    }
    /**
     * Cleanup - remove all listeners and observers
     */
    destroy() {
        // Remove all event listeners
        for (const { event, handler, options } of this.listeners) {
            this.element.removeEventListener(event, handler, options);
        }
        this.listeners = [];
        // Disconnect mutation observer
        if (this.mutationObserver) {
            this.mutationObserver.disconnect();
            this.mutationObserver = undefined;
        }
    }
}

/**
 * ThemeStateTracker - Tracks theme preferences and breakpoint state
 *
 * Makes media queries and theme detection reactive first-class values.
 *
 * Part of minimact-punch Advanced Features - Feature 2
 */
class ThemeStateTracker {
    constructor(onChange) {
        this.breakpointQueries = new Map();
        this.state = {
            isDark: false,
            isLight: true,
            highContrast: false,
            reducedMotion: false,
        };
        this.breakpoints = {
            sm: false, // 640px
            md: false, // 768px
            lg: false, // 1024px
            xl: false, // 1280px
            '2xl': false // 1536px
        };
        this.pendingUpdate = false;
        this.onChange = onChange;
        this.setupMediaQueries();
    }
    setupMediaQueries() {
        // Dark mode
        this.darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
        this.state.isDark = this.darkModeQuery.matches;
        this.state.isLight = !this.state.isDark;
        this.darkModeQuery.addEventListener('change', (e) => {
            this.state.isDark = e.matches;
            this.state.isLight = !e.matches;
            this.scheduleUpdate();
        });
        // High contrast
        this.highContrastQuery = window.matchMedia('(prefers-contrast: high)');
        this.state.highContrast = this.highContrastQuery.matches;
        this.highContrastQuery.addEventListener('change', (e) => {
            this.state.highContrast = e.matches;
            this.scheduleUpdate();
        });
        // Reduced motion
        this.reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        this.state.reducedMotion = this.reducedMotionQuery.matches;
        this.reducedMotionQuery.addEventListener('change', (e) => {
            this.state.reducedMotion = e.matches;
            this.scheduleUpdate();
        });
        // Breakpoints (Tailwind-compatible)
        const breakpointSizes = {
            sm: '640px',
            md: '768px',
            lg: '1024px',
            xl: '1280px',
            '2xl': '1536px'
        };
        for (const [name, size] of Object.entries(breakpointSizes)) {
            const query = window.matchMedia(`(min-width: ${size})`);
            this.breakpointQueries.set(name, query);
            this.breakpoints[name] = query.matches;
            query.addEventListener('change', (e) => {
                this.breakpoints[name] = e.matches;
                this.scheduleUpdate();
            });
        }
    }
    /**
     * Schedule update with debouncing (using requestAnimationFrame)
     */
    scheduleUpdate() {
        if (this.pendingUpdate)
            return;
        this.pendingUpdate = true;
        requestAnimationFrame(() => {
            this.notifyChange();
            this.pendingUpdate = false;
        });
    }
    notifyChange() {
        if (this.onChange) {
            this.onChange();
        }
    }
    // Theme state getters
    get isDark() { return this.state.isDark; }
    get isLight() { return this.state.isLight; }
    get highContrast() { return this.state.highContrast; }
    get reducedMotion() { return this.state.reducedMotion; }
    // Breakpoint getters
    get sm() { return this.breakpoints.sm; }
    get md() { return this.breakpoints.md; }
    get lg() { return this.breakpoints.lg; }
    get xl() { return this.breakpoints.xl; }
    get '2xl'() { return this.breakpoints['2xl']; }
    /**
     * Check if current viewport is between two breakpoints
     * @param min Minimum breakpoint (inclusive)
     * @param max Maximum breakpoint (exclusive)
     */
    between(min, max) {
        return this.breakpoints[min] && !this.breakpoints[max];
    }
    /**
     * Cleanup all listeners
     */
    destroy() {
        // Remove all event listeners
        // Note: MediaQueryList doesn't provide a way to enumerate listeners,
        // but they'll be garbage collected when the tracker is destroyed
    }
}
/**
 * BreakpointState - Convenience wrapper for breakpoint queries
 */
class BreakpointState {
    constructor(tracker) {
        this.tracker = tracker;
    }
    get sm() { return this.tracker.sm; }
    get md() { return this.tracker.md; }
    get lg() { return this.tracker.lg; }
    get xl() { return this.tracker.xl; }
    get '2xl'() { return this.tracker['2xl']; }
    /**
     * Check if current viewport is between two breakpoints
     * @param min Minimum breakpoint (inclusive)
     * @param max Maximum breakpoint (exclusive)
     */
    between(min, max) {
        return this.tracker.between(min, max);
    }
}

/**
 * StateHistoryTracker - Temporal awareness for DOM elements
 *
 * Tracks state changes over time, providing:
 * - Change frequency analysis (changes per second/minute)
 * - Stability detection (has stabilized, is oscillating)
 * - Trend analysis (increasing, decreasing, stable, volatile)
 * - Historical queries (updated recently, changed more than N times)
 * - Predictions (likely to change next, estimated next change time)
 *
 * Part of minimact-punch Temporal Features - Part 3
 */
class StateHistoryTracker {
    constructor(onChange, options = {}) {
        this.changeLog = [];
        this.snapshots = [];
        this.stats = {
            changeCount: 0,
            mutationCount: 0,
            renderCount: 0,
            firstRendered: Date.now(),
            lastChanged: Date.now(),
        };
        this.onChange = onChange;
        this.maxHistorySize = options.maxHistorySize ?? 1000;
        this.snapshotInterval = options.snapshotInterval ?? 5000; // 5 seconds
        this.scheduleSnapshot();
    }
    /**
     * Record a state change
     */
    recordChange(property, oldValue, newValue) {
        const change = {
            timestamp: Date.now(),
            property,
            oldValue,
            newValue
        };
        this.changeLog.push(change);
        this.stats.changeCount++;
        this.stats.lastChanged = Date.now();
        // Trim history if too large
        if (this.changeLog.length > this.maxHistorySize) {
            this.changeLog.shift();
        }
        if (this.onChange) {
            this.onChange();
        }
    }
    /**
     * Record a DOM mutation
     */
    recordMutation() {
        this.stats.mutationCount++;
        this.stats.lastChanged = Date.now();
    }
    /**
     * Record a render
     */
    recordRender() {
        this.stats.renderCount++;
    }
    /**
     * Create periodic snapshots
     */
    scheduleSnapshot() {
        this.snapshotTimer = window.setInterval(() => {
            this.snapshots.push({
                timestamp: Date.now(),
                state: this.getCurrentState()
            });
            // Keep only last 100 snapshots
            if (this.snapshots.length > 100) {
                this.snapshots.shift();
            }
        }, this.snapshotInterval);
    }
    getCurrentState() {
        // Build current state from change log
        const state = {};
        for (const change of this.changeLog) {
            state[change.property] = change.newValue;
        }
        return state;
    }
    // ========================================
    // Public API: Basic Stats
    // ========================================
    get changeCount() {
        return this.stats.changeCount;
    }
    get mutationCount() {
        return this.stats.mutationCount;
    }
    get renderCount() {
        return this.stats.renderCount;
    }
    get firstRendered() {
        return new Date(this.stats.firstRendered);
    }
    get lastChanged() {
        return new Date(this.stats.lastChanged);
    }
    get ageInSeconds() {
        return (Date.now() - this.stats.firstRendered) / 1000;
    }
    get timeSinceLastChange() {
        return Date.now() - this.stats.lastChanged;
    }
    // ========================================
    // Public API: Change Patterns
    // ========================================
    get changesPerSecond() {
        const age = this.ageInSeconds;
        return age > 0 ? this.stats.changeCount / age : 0;
    }
    get changesPerMinute() {
        return this.changesPerSecond * 60;
    }
    get hasStabilized() {
        const stabilizationWindow = 2000; // 2 seconds with no changes
        return this.timeSinceLastChange > stabilizationWindow;
    }
    get isOscillating() {
        // Check for rapid back-and-forth changes
        const recentChanges = this.changeLog.slice(-10);
        if (recentChanges.length < 4)
            return false;
        let oscillations = 0;
        for (let i = 2; i < recentChanges.length; i++) {
            const prev = recentChanges[i - 2];
            const curr = recentChanges[i];
            if (prev.property === curr.property &&
                prev.newValue === curr.oldValue &&
                curr.newValue === prev.oldValue) {
                oscillations++;
            }
        }
        return oscillations > 2;
    }
    // ========================================
    // Public API: Trend Analysis
    // ========================================
    get trend() {
        if (this.volatility > 0.7)
            return 'volatile';
        const recentChanges = this.changeLog.slice(-20);
        if (recentChanges.length < 5)
            return 'stable';
        // Analyze numeric trends
        const numericChanges = recentChanges.filter(c => typeof c.newValue === 'number' && typeof c.oldValue === 'number');
        if (numericChanges.length < 3)
            return 'stable';
        const increases = numericChanges.filter(c => c.newValue > c.oldValue).length;
        const decreases = numericChanges.filter(c => c.newValue < c.oldValue).length;
        if (increases > decreases * 2)
            return 'increasing';
        if (decreases > increases * 2)
            return 'decreasing';
        return 'stable';
    }
    get volatility() {
        // Calculate volatility based on change frequency
        const windowSize = 10000; // 10 seconds
        const now = Date.now();
        const recentChanges = this.changeLog.filter(c => now - c.timestamp < windowSize);
        if (recentChanges.length === 0)
            return 0;
        // Normalize: 0 changes = 0, 100+ changes = 1
        const volatilityScore = Math.min(recentChanges.length / 100, 1);
        // Factor in oscillation
        if (this.isOscillating) {
            return Math.min(volatilityScore * 1.5, 1);
        }
        return volatilityScore;
    }
    // ========================================
    // Public API: History Queries
    // ========================================
    updatedInLast(ms) {
        return this.timeSinceLastChange < ms;
    }
    changedMoreThan(n) {
        return this.stats.changeCount > n;
    }
    wasStableFor(ms) {
        return this.timeSinceLastChange > ms;
    }
    // ========================================
    // Public API: Change Log & Snapshots
    // ========================================
    get changes() {
        return this.changeLog;
    }
    get previousState() {
        if (this.snapshots.length < 2)
            return null;
        return this.snapshots[this.snapshots.length - 2].state;
    }
    stateAt(timestamp) {
        if (this.snapshots.length === 0)
            return null;
        // Find closest snapshot
        const snapshot = this.snapshots.reduce((closest, snap) => {
            const closestDiff = Math.abs(closest.timestamp - timestamp);
            const snapDiff = Math.abs(snap.timestamp - timestamp);
            return snapDiff < closestDiff ? snap : closest;
        }, this.snapshots[0]);
        return snapshot?.state || null;
    }
    // ========================================
    // Public API: Predictions
    // ========================================
    get likelyToChangeNext() {
        // Predict probability of next change based on recent frequency
        const recentWindow = 30000; // 30 seconds
        const now = Date.now();
        const recentChanges = this.changeLog.filter(c => now - c.timestamp < recentWindow);
        if (recentChanges.length === 0)
            return 0;
        // More recent changes = higher probability
        // Normalize: 0 changes = 0%, 10+ changes = 90%
        const probability = Math.min(recentChanges.length / 10 * 0.9, 0.9);
        return probability;
    }
    get estimatedNextChange() {
        if (this.stats.changeCount < 3)
            return null;
        // Calculate average time between changes
        const intervals = [];
        for (let i = 1; i < this.changeLog.length; i++) {
            intervals.push(this.changeLog[i].timestamp - this.changeLog[i - 1].timestamp);
        }
        if (intervals.length === 0)
            return null;
        const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        return new Date(this.stats.lastChanged + avgInterval);
    }
    /**
     * Cleanup all resources
     */
    destroy() {
        if (this.snapshotTimer !== undefined) {
            clearInterval(this.snapshotTimer);
        }
        this.changeLog = [];
        this.snapshots = [];
        this.onChange = undefined;
    }
}

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
class LifecycleStateTracker {
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

/**
 * Global registry for tracking DomElementState instances
 *
 * This enables minimact-query to query DOM elements that have been
 * wrapped with DomElementState tracking.
 */
// WeakMap for element -> state lookup (garbage collection friendly)
const elementToStateMap = new WeakMap();
// Set for tracking all active states (allows iteration)
const activeStates = new Set();
// Map for selector-based caching
const selectorCache = new Map();
let cacheInvalidated = false;
/**
 * Register a DomElementState instance with the global registry
 * Called when a DomElementState attaches to an element
 */
function registerDomElementState(element, state) {
    elementToStateMap.set(element, state);
    activeStates.add(state);
    invalidateSelectorCache();
}
/**
 * Unregister a DomElementState instance from the global registry
 * Called when a DomElementState is destroyed or element is detached
 */
function unregisterDomElementState(element, state) {
    elementToStateMap.delete(element);
    activeStates.delete(state);
    invalidateSelectorCache();
}
/**
 * Get the DomElementState for a given element
 * Returns null if element is not tracked
 */
function getDomElementState(element) {
    return elementToStateMap.get(element) ?? null;
}
/**
 * Query all DomElementState instances matching a CSS selector
 * This is the core integration point for minimact-query
 */
function queryDomElementStates(selector) {
    // Check cache first
    if (!cacheInvalidated && selectorCache.has(selector)) {
        return Array.from(selectorCache.get(selector));
    }
    // Query DOM and map to DomElementState instances
    const elements = document.querySelectorAll(selector);
    const states = [];
    for (const element of Array.from(elements)) {
        const state = elementToStateMap.get(element);
        if (state) {
            states.push(state);
        }
    }
    // Cache the result
    selectorCache.set(selector, new Set(states));
    cacheInvalidated = false;
    return states;
}
/**
 * Get all active DomElementState instances
 * Useful for debugging and analytics
 */
function getAllDomElementStates() {
    return Array.from(activeStates);
}
/**
 * Get count of tracked elements
 */
function getTrackedElementCount() {
    return activeStates.size;
}
/**
 * Clear all registrations (useful for testing)
 */
function clearRegistry() {
    // Note: WeakMap doesn't have a clear() method
    // We can only clear the Set and cache
    activeStates.clear();
    selectorCache.clear();
    cacheInvalidated = true;
}
/**
 * Invalidate selector cache
 * Called when registry changes (add/remove elements)
 */
function invalidateSelectorCache() {
    selectorCache.clear();
    cacheInvalidated = true;
}
/**
 * Debug information about the registry
 */
function getRegistryDebugInfo() {
    return {
        activeStatesCount: activeStates.size,
        cachedSelectors: Array.from(selectorCache.keys())
    };
}

/**
 * DomElementState - Makes the DOM itself a reactive data source
 *
 * Tracks DOM changes (intersection, mutations, resize) and provides
 * a reactive API for accessing DOM topology in your components.
 *
 * @example
 * ```typescript
 * const box = new DomElementState(element);
 * console.log(box.childrenCount); // 3
 * console.log(box.isIntersecting); // true
 * ```
 */
class DomElementState {
    constructor(selectorOrElement, options = {}) {
        // Core properties
        this._element = null;
        this._elements = [];
        this._selector = null;
        // Reactive state
        this._isIntersecting = false;
        this._intersectionRatio = 0;
        this._boundingRect = null;
        this._childrenCount = 0;
        this._grandChildrenCount = 0;
        this._attributes = {};
        this._classList = [];
        this._exists = false;
        this.updatePending = false;
        // Merge options with defaults
        this.options = {
            selector: options.selector ?? null,
            trackIntersection: options.trackIntersection ?? true,
            trackMutation: options.trackMutation ?? true,
            trackResize: options.trackResize ?? true,
            trackHover: options.trackHover ?? true,
            trackFocus: options.trackFocus ?? false,
            intersectionOptions: options.intersectionOptions || {},
            debounceMs: options.debounceMs ?? 16, // ~60fps
            lifecycle: options.lifecycle, // Pass through lifecycle config if provided
            lifecycleServerSync: options.lifecycleServerSync // Pass through server sync callback
        };
        // Initialize based on input
        if (typeof selectorOrElement === 'string') {
            this._selector = selectorOrElement;
            this.attachSelector(selectorOrElement);
        }
        else if (selectorOrElement instanceof HTMLElement) {
            this.attachElement(selectorOrElement);
        }
    }
    // ============================================================
    // PUBLIC API - Reactive Properties
    // ============================================================
    /** The DOM element (singular mode) */
    get element() {
        return this._element;
    }
    /** All matching elements (collection mode) */
    get elements() {
        return this._elements;
    }
    /** Whether element is in viewport */
    get isIntersecting() {
        return this._isIntersecting;
    }
    /** Percentage of element visible (0-1) */
    get intersectionRatio() {
        return this._intersectionRatio;
    }
    /** Element position and size */
    get boundingRect() {
        return this._boundingRect;
    }
    /** Direct children count */
    get childrenCount() {
        return this._childrenCount;
    }
    /** Total descendants count */
    get grandChildrenCount() {
        return this._grandChildrenCount;
    }
    /** All element attributes */
    get attributes() {
        return { ...this._attributes };
    }
    /** Element classes as array */
    get classList() {
        return [...this._classList];
    }
    /** Whether element exists in DOM */
    get exists() {
        return this._exists;
    }
    // Collection properties
    /** Number of elements matching selector */
    get count() {
        return this._elements.length;
    }
    // ============================================================
    // COLLECTION METHODS
    // ============================================================
    /**
     * Test if all elements match a condition
     */
    every(predicate) {
        return this._elements.every(el => {
            const state = new DomElementState(el, this.options);
            return predicate(state);
        });
    }
    /**
     * Test if any element matches a condition
     */
    some(predicate) {
        return this._elements.some(el => {
            const state = new DomElementState(el, this.options);
            return predicate(state);
        });
    }
    /**
     * Filter elements by condition
     */
    filter(predicate) {
        return this._elements
            .filter(el => {
            const state = new DomElementState(el, this.options);
            return predicate(state);
        })
            .map(el => new DomElementState(el, this.options));
    }
    /**
     * Transform each element
     */
    map(fn) {
        return this._elements.map(el => {
            const state = new DomElementState(el, this.options);
            return fn(state);
        });
    }
    // ============================================================
    // STATISTICAL OPERATIONS
    // ============================================================
    /**
     * Access statistical methods for collections
     */
    get vals() {
        return new DomElementStateValues(this._elements.map(el => new DomElementState(el, this.options)));
    }
    // ============================================================
    // ATTACHMENT METHODS
    // ============================================================
    /**
     * Attach to a single element
     */
    attachElement(element) {
        this.cleanup();
        this._element = element;
        this._elements = [element];
        this._selector = null;
        this._exists = true;
        // Register with global registry for minimact-query integration
        registerDomElementState(element, this);
        this.updateState();
        this.setupObservers();
    }
    /**
     * Attach to elements matching selector
     */
    attachSelector(selector) {
        this.cleanup();
        this._selector = selector;
        const elements = Array.from(document.querySelectorAll(selector));
        this._elements = elements;
        this._element = elements[0] || null;
        this._exists = elements.length > 0;
        // Register all elements with global registry for minimact-query integration
        for (const element of elements) {
            registerDomElementState(element, this);
        }
        if (this._element) {
            this.updateState();
            this.setupObservers();
        }
    }
    /**
     * Attach to multiple specific elements
     */
    attachElements(elements) {
        this.cleanup();
        this._elements = elements;
        this._element = elements[0] || null;
        this._selector = null;
        this._exists = elements.length > 0;
        // Register all elements with global registry for minimact-query integration
        for (const element of elements) {
            registerDomElementState(element, this);
        }
        if (this._element) {
            this.updateState();
            this.setupObservers();
        }
    }
    // ============================================================
    // OBSERVER SETUP
    // ============================================================
    setupObservers() {
        if (!this._element)
            return;
        if (this.options.trackIntersection) {
            this.setupIntersectionObserver();
        }
        if (this.options.trackMutation) {
            this.setupMutationObserver();
        }
        if (this.options.trackResize) {
            this.setupResizeObserver();
        }
    }
    setupIntersectionObserver() {
        if (!this._element || this.intersectionObserver)
            return;
        this.intersectionObserver = new IntersectionObserver((entries) => {
            for (const entry of entries) {
                // Store old values for history
                const oldIsIntersecting = this._isIntersecting;
                const oldIntersectionRatio = this._intersectionRatio;
                this._isIntersecting = entry.isIntersecting;
                this._intersectionRatio = entry.intersectionRatio;
                this._boundingRect = entry.boundingClientRect;
                // Record changes in history
                if (this.historyTracker) {
                    if (oldIsIntersecting !== this._isIntersecting) {
                        this.historyTracker.recordChange('isIntersecting', oldIsIntersecting, this._isIntersecting);
                    }
                    if (oldIntersectionRatio !== this._intersectionRatio) {
                        this.historyTracker.recordChange('intersectionRatio', oldIntersectionRatio, this._intersectionRatio);
                    }
                }
                this.scheduleUpdate();
            }
        }, this.options.intersectionOptions);
        this.intersectionObserver.observe(this._element);
    }
    setupMutationObserver() {
        if (!this._element || this.mutationObserver)
            return;
        this.mutationObserver = new MutationObserver(() => {
            this.updateState();
            this.scheduleUpdate();
        });
        this.mutationObserver.observe(this._element, {
            childList: true,
            attributes: true,
            attributeOldValue: false,
            characterData: false,
            subtree: true
        });
    }
    setupResizeObserver() {
        if (!this._element || this.resizeObserver)
            return;
        this.resizeObserver = new ResizeObserver(() => {
            this._boundingRect = this._element.getBoundingClientRect();
            this.scheduleUpdate();
        });
        this.resizeObserver.observe(this._element);
    }
    // ============================================================
    // STATE UPDATE
    // ============================================================
    updateState() {
        if (!this._element)
            return;
        // Store old values for history tracking
        const oldChildrenCount = this._childrenCount;
        const oldGrandChildrenCount = this._grandChildrenCount;
        const oldAttributes = { ...this._attributes };
        const oldClassList = [...this._classList];
        // Update children counts
        this._childrenCount = this._element.children.length;
        this._grandChildrenCount = this._element.querySelectorAll('*').length;
        // Update attributes
        const attrs = {};
        for (let i = 0; i < this._element.attributes.length; i++) {
            const attr = this._element.attributes[i];
            attrs[attr.name] = attr.value;
        }
        this._attributes = attrs;
        // Update classList
        this._classList = Array.from(this._element.classList);
        // Update bounding rect
        this._boundingRect = this._element.getBoundingClientRect();
        // Record changes in history tracker
        if (this.historyTracker) {
            if (oldChildrenCount !== this._childrenCount) {
                this.historyTracker.recordChange('childrenCount', oldChildrenCount, this._childrenCount);
            }
            if (oldGrandChildrenCount !== this._grandChildrenCount) {
                this.historyTracker.recordChange('grandChildrenCount', oldGrandChildrenCount, this._grandChildrenCount);
            }
            if (JSON.stringify(oldAttributes) !== JSON.stringify(this._attributes)) {
                this.historyTracker.recordChange('attributes', oldAttributes, this._attributes);
            }
            if (JSON.stringify(oldClassList) !== JSON.stringify(this._classList)) {
                this.historyTracker.recordChange('classList', oldClassList, this._classList);
            }
            // Record mutation
            this.historyTracker.recordMutation();
        }
    }
    scheduleUpdate() {
        if (this.updatePending)
            return;
        this.updatePending = true;
        requestAnimationFrame(() => {
            this.notifyChange();
            this.updatePending = false;
        });
    }
    notifyChange() {
        if (this.onChange) {
            const snapshot = {
                isIntersecting: this._isIntersecting,
                intersectionRatio: this._intersectionRatio,
                childrenCount: this._childrenCount,
                grandChildrenCount: this._grandChildrenCount,
                attributes: this.attributes,
                classList: this.classList,
                boundingRect: this._boundingRect,
                exists: this._exists,
                count: this._elements.length
            };
            this.onChange(snapshot);
        }
    }
    // ============================================================
    // LIFECYCLE
    // ============================================================
    /**
     * Set callback for state changes
     */
    setOnChange(callback) {
        this.onChange = callback;
    }
    /**
     * Clean up all observers and resources
     */
    cleanup() {
        // Unregister all tracked elements from global registry
        for (const element of this._elements) {
            unregisterDomElementState(element, this);
        }
        this.intersectionObserver?.disconnect();
        this.mutationObserver?.disconnect();
        this.resizeObserver?.disconnect();
        this.intersectionObserver = undefined;
        this.mutationObserver = undefined;
        this.resizeObserver = undefined;
    }
    /**
     * Get pseudo-state tracker (lazy initialization)
     *
     * @example
     * ```typescript
     * const box = new DomElementState(element);
     * console.log(box.state.hover); // true/false
     * console.log(box.state.focus); // true/false
     * ```
     */
    get state() {
        if (!this.pseudoStateTracker && this._element) {
            this.pseudoStateTracker = new PseudoStateTracker(this._element, () => {
                this.notifyChange();
            });
        }
        if (!this.pseudoStateTracker) {
            throw new Error('[minimact-punch] Cannot access state - element not attached');
        }
        return this.pseudoStateTracker;
    }
    /**
     * Get theme state (dark mode, high contrast, reduced motion)
     *
     * @example
     * ```typescript
     * const app = new DomElementState(rootElement);
     * console.log(app.theme.isDark); // true/false
     * console.log(app.theme.reducedMotion); // true/false
     * ```
     */
    get theme() {
        if (!this.themeStateTracker) {
            this.themeStateTracker = new ThemeStateTracker(() => {
                this.notifyChange();
            });
        }
        return this.themeStateTracker;
    }
    /**
     * Get breakpoint state (sm, md, lg, xl, 2xl)
     *
     * @example
     * ```typescript
     * const app = new DomElementState(rootElement);
     * console.log(app.breakpoint.md); // true/false
     * console.log(app.breakpoint.between('md', 'lg')); // true/false
     * ```
     */
    get breakpoint() {
        return new BreakpointState(this.theme);
    }
    /**
     * Get history tracker (temporal awareness)
     *
     * Provides access to:
     * - Change count, frequency analysis (changes per second/minute)
     * - Stability detection (hasStabilized, isOscillating)
     * - Trend analysis (increasing, decreasing, stable, volatile)
     * - Historical queries (updatedInLast, changedMoreThan, wasStableFor)
     * - Predictions (likelyToChangeNext, estimatedNextChange)
     *
     * @example
     * ```typescript
     * const widget = new DomElementState(element);
     * console.log(widget.history.changesPerSecond); // 0.37
     * console.log(widget.history.hasStabilized); // true
     * console.log(widget.history.trend); // 'increasing'
     * ```
     */
    get history() {
        if (!this.historyTracker) {
            this.historyTracker = new StateHistoryTracker(() => {
                this.notifyChange();
            });
        }
        return this.historyTracker;
    }
    /**
     * Get lifecycle state machine (theatrical engine)
     *
     * Transforms the element into a finite state machine with:
     * - Declarative states with valid transitions
     * - Styles bound to each state
     * - Templates bound to each state
     * - Lifecycle hooks (onEnter, onExit, onTransition)
     * - Auto-transitions with durations
     * - Transition history tracking
     *
     * @example
     * ```typescript
     * const modal = new DomElementState(element, {
     *   lifecycle: {
     *     states: ['hidden', 'visible'],
     *     defaultState: 'hidden',
     *     styles: {
     *       hidden: { opacity: 0 },
     *       visible: { opacity: 1 }
     *     }
     *   }
     * });
     *
     * console.log(modal.lifecycle.lifecycleState); // 'hidden'
     * modal.lifecycle.transitionTo('visible');
     * console.log(modal.lifecycle.style); // { opacity: 1 }
     * ```
     */
    get lifecycle() {
        if (!this.lifecycleTracker) {
            const lifecycleConfig = this.options.lifecycle;
            if (!lifecycleConfig) {
                throw new Error('[minimact-punch] Cannot access lifecycle - no lifecycle config provided in options');
            }
            this.lifecycleTracker = new LifecycleStateTracker(lifecycleConfig, () => {
                this.notifyChange();
            }, this.options.lifecycleServerSync // Server sync callback (Minimact integration)
            );
        }
        return this.lifecycleTracker;
    }
    /**
     * Destroy the state object
     */
    destroy() {
        this.cleanup();
        this.pseudoStateTracker?.destroy();
        this.pseudoStateTracker = undefined;
        this.themeStateTracker?.destroy();
        this.themeStateTracker = undefined;
        this.historyTracker?.destroy();
        this.historyTracker = undefined;
        this.lifecycleTracker?.destroy();
        this.lifecycleTracker = undefined;
        this.onChange = undefined;
        this._element = null;
        this._elements = [];
    }
}

/**
 * Hook for using DOM element state in components
 *
 * This is a simplified standalone version. In full Minimact integration,
 * this would connect to the component context and trigger re-renders.
 *
 * @param selectorOrElement - CSS selector or HTMLElement
 * @param options - Configuration options
 * @returns DomElementState instance
 *
 * @example
 * ```typescript
 * const box = useDomElementState();
 * // Attach to element via ref
 * <div ref={el => box.attachElement(el)}>
 *   {box.childrenCount > 3 && <CollapseButton />}
 * </div>
 * ```
 *
 * @example
 * ```typescript
 * const prices = useDomElementState('.price');
 * {prices.vals.avg() > 50 && <PremiumBadge />}
 * ```
 */
function useDomElementState$1(selectorOrElement, options) {
    // For standalone usage, just create and return the state
    // In full Minimact integration, this would:
    // 1. Store state in component context
    // 2. Set up onChange callback to trigger re-render
    // 3. Clean up on unmount
    // 4. Send state changes to server via SignalR
    return new DomElementState(selectorOrElement, options);
}

/**
 * Minimact Integration Layer for DOM Element State
 *
 * This file provides the integration between DomElementState (standalone)
 * and Minimact's component context, HintQueue, and prediction system.
 *
 * Follows MES (Minimact Extension Standards) requirements:
 * - ✅ Component context integration (MES 1.1.1)
 * - ✅ Index-based tracking (MES 1.1.2)
 * - ✅ State storage in context (MES 1.1.3)
 * - ✅ HintQueue integration (MES 2.1.1)
 * - ✅ PlaygroundBridge integration (MES 2.1.2)
 * - ✅ Cleanup pattern (MES 1.2.1)
 */
// ============================================================
// GLOBAL CONTEXT TRACKING (MES 1.1.1)
// ============================================================
let currentContext = null;
let domElementStateIndex = 0;
/**
 * Set the current component context
 * Called by Minimact before each render
 *
 * @internal
 */
function setComponentContext(context) {
    currentContext = context;
    domElementStateIndex = 0;
    // Setup confidence worker prediction callback (only once)
    if (context.confidenceWorker && !context.confidenceWorker.isReady()) {
        context.confidenceWorker.setOnPredictionRequest((request) => {
            handleWorkerPrediction(context, request);
        });
    }
}
/**
 * Clear the current component context
 * Called by Minimact after each render
 *
 * @internal
 */
function clearComponentContext() {
    currentContext = null;
}
/**
 * Get current context (for advanced usage)
 *
 * @internal
 */
function getCurrentContext() {
    return currentContext;
}
/**
 * Handle prediction request from confidence worker
 * Worker says: "I predict hover/intersection/focus will occur in X ms"
 *
 * @internal
 */
function handleWorkerPrediction(context, request) {
    console.log(`[minimact-punch] 🔮 Worker prediction: ${request.elementId} ` +
        `(${(request.confidence * 100).toFixed(0)}% confident, ${request.leadTime.toFixed(0)}ms lead time)`);
    // Build predicted state object
    // The stateKey needs to match what useDomElementState uses
    const stateKey = request.elementId.split('_').pop(); // Extract "domElementState_0" from "counter-1_domElementState_0"
    const predictedState = {
        [stateKey]: request.observation
    };
    // Request prediction from server via SignalR
    // Server will render with predicted state and send patches via QueueHint
    context.signalR
        .invoke('RequestPrediction', context.componentId, predictedState)
        .then(() => {
        console.log(`[minimact-punch] ✅ Requested prediction from server for ${request.elementId}`);
    })
        .catch((err) => {
        console.error(`[minimact-punch] ❌ Failed to request prediction:`, err);
    });
}
// ============================================================
// HOOK IMPLEMENTATION (MES 1.1)
// ============================================================
/**
 * useDomElementState hook - Integrated with Minimact
 *
 * Makes the DOM a first-class reactive data source with predictive rendering.
 *
 * **MES Compliance:**
 * - ✅ Component context integration (MES 1.1.1)
 * - ✅ Index-based tracking (MES 1.1.2)
 * - ✅ State storage in context (MES 1.1.3)
 * - ✅ HintQueue integration (MES 2.1.1)
 * - ✅ PlaygroundBridge notifications (MES 2.1.2)
 *
 * @param selector - Optional CSS selector for collection mode
 * @param options - Configuration options
 * @returns DomElementState instance
 *
 * @example
 * ```tsx
 * // Singular element
 * const box = useDomElementState();
 *
 * <div ref={el => box.attachElement(el)}>
 *   {box.childrenCount > 3 && <CollapseButton />}
 *   {box.isIntersecting && <LazyContent />}
 * </div>
 * ```
 *
 * @example
 * ```tsx
 * // Collection with statistics
 * const prices = useDomElementState('.price');
 *
 * {prices.vals.avg() > 50 && <PremiumBadge />}
 * {prices.count > 10 && <Pagination />}
 * ```
 */
function useDomElementState(selector, options) {
    // MES 1.1.1: Guard - Must be called within component render
    if (!currentContext) {
        throw new Error('[minimact-punch] useDomElementState must be called within a component render. ' +
            'Make sure you are calling this hook inside a Minimact component function.');
    }
    const context = currentContext;
    // MES 1.1.2: Index-based tracking
    const index = domElementStateIndex++;
    const stateKey = `domElementState_${index}`;
    // MES 1.1.3: Initialize storage if needed
    if (!context.domElementStates) {
        context.domElementStates = new Map();
    }
    // Get or create state instance
    if (!context.domElementStates.has(stateKey)) {
        // Create new DomElementState instance
        const domState = new DomElementState(selector, {
            trackIntersection: options?.trackIntersection ?? true,
            trackMutation: options?.trackMutation ?? true,
            trackResize: options?.trackResize ?? true,
            intersectionOptions: options?.intersectionOptions,
            debounceMs: options?.debounceMs ?? 16
        });
        // MES 2.1: Set up change callback (Predictive Rendering Integration)
        domState.setOnChange((snapshot) => {
            const startTime = performance.now();
            // Build state change object for hint matching
            // Format matches what HintQueue expects
            const stateChanges = {
                [stateKey]: {
                    isIntersecting: snapshot.isIntersecting,
                    intersectionRatio: snapshot.intersectionRatio,
                    childrenCount: snapshot.childrenCount,
                    grandChildrenCount: snapshot.grandChildrenCount,
                    attributes: snapshot.attributes,
                    classList: snapshot.classList,
                    exists: snapshot.exists,
                    count: snapshot.count
                }
            };
            // MES 2.1.1: Check HintQueue for predicted patches
            const hint = context.hintQueue.matchHint(context.componentId, stateChanges);
            if (hint) {
                // 🟢 CACHE HIT! Apply predicted patches instantly
                const latency = performance.now() - startTime;
                console.log(`[minimact-punch] 🟢 DOM CACHE HIT! Hint '${hint.hintId}' matched - ` +
                    `applying ${hint.patches.length} patches in ${latency.toFixed(2)}ms`);
                // Apply patches to DOM
                context.domPatcher.applyPatches(context.element, hint.patches);
                // MES 2.1.2: Notify playground of cache hit
                if (context.playgroundBridge) {
                    context.playgroundBridge.cacheHit({
                        componentId: context.componentId,
                        hintId: hint.hintId,
                        latency,
                        confidence: hint.confidence,
                        patchCount: hint.patches.length
                    });
                }
            }
            else {
                // 🔴 CACHE MISS - No prediction available
                const latency = performance.now() - startTime;
                console.log(`[minimact-punch] 🔴 DOM CACHE MISS - No prediction for DOM change:`, stateChanges);
                // MES 2.1.2: Notify playground of cache miss
                if (context.playgroundBridge) {
                    context.playgroundBridge.cacheMiss({
                        componentId: context.componentId,
                        methodName: `domChange(${stateKey})`,
                        latency,
                        patchCount: 0
                    });
                }
            }
            // Sync DOM state to server to prevent stale data
            context.signalR.updateDomElementState(context.componentId, stateKey, {
                isIntersecting: snapshot.isIntersecting,
                intersectionRatio: snapshot.intersectionRatio,
                childrenCount: snapshot.childrenCount,
                grandChildrenCount: snapshot.grandChildrenCount,
                attributes: snapshot.attributes,
                classList: snapshot.classList,
                exists: snapshot.exists,
                count: snapshot.count
            }).catch(err => {
                console.error('[minimact-punch] Failed to sync DOM state to server:', err);
            });
        });
        // Store in context
        context.domElementStates.set(stateKey, domState);
        // Wrap attachElement to register with confidence worker
        const originalAttachElement = domState.attachElement.bind(domState);
        domState.attachElement = (element) => {
            originalAttachElement(element);
            // Register with confidence worker (if available)
            if (context.confidenceWorker?.isReady()) {
                const elementId = `${context.componentId}_${stateKey}`;
                context.confidenceWorker.registerElement(context.componentId, elementId, element, {
                    hover: options?.trackHover ?? true,
                    intersection: options?.trackIntersection ?? true,
                    focus: options?.trackFocus ?? false,
                });
            }
        };
        // If selector provided, attach after render
        if (selector) {
            queueMicrotask(() => {
                const elements = Array.from(context.element.querySelectorAll(selector));
                if (elements.length > 0) {
                    domState.attachElements(elements);
                }
            });
        }
    }
    return context.domElementStates.get(stateKey);
}
// ============================================================
// CLEANUP (MES 1.2.1)
// ============================================================
/**
 * Cleanup all DOM element states for a component
 *
 * Called when component unmounts to prevent memory leaks.
 *
 * **MES Compliance:**
 * - ✅ Cleanup implementation (MES 1.2.1)
 * - ✅ Memory leak prevention (MES 1.2.2)
 *
 * @param context - Component context
 *
 * @example
 * ```typescript
 * // Called automatically by Minimact on unmount
 * cleanupDomElementStates(context);
 * ```
 */
function cleanupDomElementStates(context) {
    if (!context.domElementStates)
        return;
    // Disconnect all observers and clear resources
    for (const domState of context.domElementStates.values()) {
        domState.destroy();
    }
    context.domElementStates.clear();
}

/**
 * Types for the Confidence Engine Web Worker
 *
 * The confidence engine runs in a Web Worker to analyze user behavior
 * and predict future DOM observations before they occur.
 */
/**
 * Circular buffer for efficient event history storage
 */
const DEFAULT_CONFIG = {
    minConfidence: 0.7,
    hoverHighConfidence: 0.85,
    intersectionHighConfidence: 0.90,
    focusHighConfidence: 0.95,
    hoverLeadTimeMin: 50,
    hoverLeadTimeMax: 300,
    intersectionLeadTimeMax: 300,
    maxTrajectoryAngle: 30,
    minMouseVelocity: 0.1,
    maxPredictionsPerElement: 2,
    predictionWindowMs: 200,
    mouseHistorySize: 20,
    scrollHistorySize: 10,
    debugLogging: false,
};

/**
 * Confidence Worker Manager
 *
 * Main thread manager for the Confidence Engine Web Worker.
 * Handles worker lifecycle, forwards browser events, and receives prediction requests.
 *
 * This is an OPTIONAL extension to minimact-punch - if the worker fails to load,
 * useDomElementState will still work (just without predictive hints).
 */
/**
 * Manages the Confidence Engine Web Worker
 */
class ConfidenceWorkerManager {
    constructor(config = {}) {
        this.worker = null;
        this.workerReady = false;
        this.eventListeners = new Map();
        this.observedElements = new Set(); // Track registered elements
        this.config = {
            workerPath: config.workerPath || '/workers/confidence-engine.worker.js',
            config: { ...DEFAULT_CONFIG, ...config.config },
            debugLogging: config.debugLogging || false,
        };
        this.onPredictionRequest = config.onPredictionRequest;
    }
    /**
     * Initialize and start the worker
     */
    async start() {
        try {
            // Check for Worker support
            if (typeof Worker === 'undefined') {
                this.log('Web Workers not supported in this browser');
                return false;
            }
            // Create worker
            this.worker = new Worker(this.config.workerPath, { type: 'module' });
            // Setup message handler
            this.worker.onmessage = (event) => {
                this.handleWorkerMessage(event.data);
            };
            // Setup error handler
            this.worker.onerror = (error) => {
                console.error('[ConfidenceWorker] Worker error:', error);
                this.workerReady = false;
            };
            // Attach browser event listeners
            this.attachEventListeners();
            this.workerReady = true;
            this.log('Worker started successfully');
            return true;
        }
        catch (error) {
            console.error('[ConfidenceWorker] Failed to start worker:', error);
            return false;
        }
    }
    /**
     * Stop the worker and cleanup
     */
    stop() {
        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
            this.workerReady = false;
        }
        this.detachEventListeners();
        this.observedElements.clear();
        this.log('Worker stopped');
    }
    /**
     * Register an element for observation
     */
    registerElement(componentId, elementId, element, observables) {
        if (!this.workerReady || !this.worker) {
            return;
        }
        // Get element bounds
        const bounds = this.getElementBounds(element);
        // Send to worker
        this.postMessage({
            type: 'registerElement',
            componentId,
            elementId,
            bounds,
            observables,
        });
        this.observedElements.add(elementId);
        this.log('Registered element', { elementId, observables });
    }
    /**
     * Update element bounds (when element moves/resizes)
     */
    updateBounds(elementId, element) {
        if (!this.workerReady || !this.worker || !this.observedElements.has(elementId)) {
            return;
        }
        const bounds = this.getElementBounds(element);
        this.postMessage({
            type: 'updateBounds',
            elementId,
            bounds,
        });
    }
    /**
     * Unregister an element
     */
    unregisterElement(elementId) {
        if (!this.workerReady || !this.worker) {
            return;
        }
        this.postMessage({
            type: 'unregisterElement',
            elementId,
        });
        this.observedElements.delete(elementId);
        this.log('Unregistered element', { elementId });
    }
    /**
     * Set prediction request callback
     */
    setOnPredictionRequest(callback) {
        this.onPredictionRequest = callback;
    }
    /**
     * Check if worker is ready
     */
    isReady() {
        return this.workerReady;
    }
    /**
     * Handle messages from worker
     */
    handleWorkerMessage(message) {
        switch (message.type) {
            case 'requestPrediction':
                this.handlePredictionRequest(message);
                break;
            case 'debug':
                if (this.config.debugLogging) {
                    console.log(message.message, message.data || '');
                }
                break;
            default:
                console.warn('[ConfidenceWorker] Unknown message from worker:', message);
        }
    }
    /**
     * Handle prediction request from worker
     */
    handlePredictionRequest(request) {
        this.log('Prediction request', {
            elementId: request.elementId,
            confidence: `${(request.confidence * 100).toFixed(0)}%`,
            leadTime: `${request.leadTime.toFixed(0)}ms`,
            reason: request.reason,
        });
        if (this.onPredictionRequest) {
            this.onPredictionRequest({
                componentId: request.componentId,
                elementId: request.elementId,
                observation: request.observation,
                confidence: request.confidence,
                leadTime: request.leadTime,
            });
        }
    }
    /**
     * Attach browser event listeners
     */
    attachEventListeners() {
        // Mouse move (throttled)
        let lastMouseMove = 0;
        const mouseMoveHandler = (event) => {
            const mouseEvent = event;
            const now = performance.now();
            if (now - lastMouseMove < 16)
                return; // ~60fps throttle
            lastMouseMove = now;
            this.postMessage({
                type: 'mousemove',
                x: mouseEvent.clientX,
                y: mouseEvent.clientY,
                timestamp: now,
            });
        };
        window.addEventListener('mousemove', mouseMoveHandler, { passive: true });
        this.eventListeners.set('mousemove', mouseMoveHandler);
        // Scroll (throttled)
        let lastScroll = 0;
        const scrollHandler = () => {
            const now = performance.now();
            if (now - lastScroll < 16)
                return; // ~60fps throttle
            lastScroll = now;
            this.postMessage({
                type: 'scroll',
                scrollX: window.scrollX,
                scrollY: window.scrollY,
                viewportWidth: window.innerWidth,
                viewportHeight: window.innerHeight,
                timestamp: now,
            });
        };
        window.addEventListener('scroll', scrollHandler, { passive: true });
        this.eventListeners.set('scroll', scrollHandler);
        // Focus
        const focusHandler = (event) => {
            const target = event.target;
            if (!target.id)
                return; // Only track elements with IDs
            this.postMessage({
                type: 'focus',
                elementId: target.id,
                timestamp: performance.now(),
            });
        };
        window.addEventListener('focus', focusHandler, { capture: true, passive: true });
        this.eventListeners.set('focus', focusHandler);
        // Keydown (Tab key)
        const keydownHandler = (event) => {
            const keyEvent = event;
            if (keyEvent.key === 'Tab') {
                this.postMessage({
                    type: 'keydown',
                    key: keyEvent.key,
                    timestamp: performance.now(),
                });
            }
        };
        window.addEventListener('keydown', keydownHandler, { passive: true });
        this.eventListeners.set('keydown', keydownHandler);
        this.log('Event listeners attached');
    }
    /**
     * Detach browser event listeners
     */
    detachEventListeners() {
        for (const [eventType, handler] of this.eventListeners) {
            if (eventType === 'focus') {
                window.removeEventListener('focus', handler, { capture: true });
            }
            else {
                window.removeEventListener(eventType, handler);
            }
        }
        this.eventListeners.clear();
        this.log('Event listeners detached');
    }
    /**
     * Post message to worker
     */
    postMessage(message) {
        if (!this.worker || !this.workerReady) {
            return;
        }
        try {
            this.worker.postMessage(message);
        }
        catch (error) {
            console.error('[ConfidenceWorker] Failed to post message:', error);
        }
    }
    /**
     * Get element bounds relative to viewport
     */
    getElementBounds(element) {
        const rect = element.getBoundingClientRect();
        return {
            top: rect.top + window.scrollY,
            left: rect.left + window.scrollX,
            width: rect.width,
            height: rect.height,
            bottom: rect.bottom + window.scrollY,
            right: rect.right + window.scrollX,
        };
    }
    /**
     * Debug logging
     */
    log(message, data) {
        if (this.config.debugLogging) {
            console.log(`[ConfidenceWorkerManager] ${message}`, data || '');
        }
    }
}

/**
 * Minimact Punch 🌵 + 🍹
 *
 * DOM observation and reactivity addon for Minimact.
 * Makes the DOM itself a first-class reactive data source.
 *
 * **Dual-Mode Package:**
 * - **Standalone Mode**: Use `DomElementState` class directly (no Minimact required)
 * - **Integrated Mode**: Use `useDomElementState` hook (requires Minimact)
 *
 * @packageDocumentation
 */
// ============================================================
// STANDALONE MODE (No Minimact required)
// ============================================================
/**
 * Core classes - work without Minimact
 * Use these for vanilla JS/TS projects or testing
 */
// ============================================================
// VERSION & METADATA
// ============================================================
const VERSION = '0.1.0';
const MES_CERTIFICATION = 'Silver'; // Minimact Extension Standards
/**
 * Package metadata for debugging
 */
const PACKAGE_INFO = {
    name: 'minimact-punch',
    version: VERSION,
    certification: MES_CERTIFICATION,
    modes: ['standalone', 'integrated'],
    features: [
        'IntersectionObserver integration',
        'MutationObserver integration',
        'ResizeObserver integration',
        'Statistical aggregations',
        'HintQueue predictive rendering',
        'PlaygroundBridge visualization',
        'Confidence Worker (intent-based predictions)',
        'Pseudo-state reactivity (hover, focus, active, disabled)',
        'Theme & breakpoint reactivity (dark mode, responsive layouts)',
        'Temporal features (history tracking, change patterns, trend analysis)',
        'Lifecycle state machines (finite state machines with styles, templates, transitions)'
    ]
};

export { BreakpointState, ConfidenceWorkerManager, DomElementState, DomElementStateValues, LifecycleStateTracker, MES_CERTIFICATION, PACKAGE_INFO, PseudoStateTracker, StateHistoryTracker, ThemeStateTracker, VERSION, cleanupDomElementStates, clearComponentContext, clearRegistry, useDomElementState$1 as createDomElementState, getAllDomElementStates, getCurrentContext, getDomElementState, getRegistryDebugInfo, getTrackedElementCount, queryDomElementStates, registerDomElementState, setComponentContext, unregisterDomElementState, useDomElementState };
