/**
 * ThemeStateTracker - Tracks theme preferences and breakpoint state
 *
 * Makes media queries and theme detection reactive first-class values.
 *
 * Part of minimact-punch Advanced Features - Feature 2
 */
export class ThemeStateTracker {
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
export class BreakpointState {
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
