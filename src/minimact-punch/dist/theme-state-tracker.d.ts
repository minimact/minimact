/**
 * ThemeStateTracker - Tracks theme preferences and breakpoint state
 *
 * Makes media queries and theme detection reactive first-class values.
 *
 * Part of minimact-punch Advanced Features - Feature 2
 */
export declare class ThemeStateTracker {
    private darkModeQuery;
    private highContrastQuery;
    private reducedMotionQuery;
    private breakpointQueries;
    private state;
    private breakpoints;
    private onChange?;
    private pendingUpdate;
    constructor(onChange?: () => void);
    private setupMediaQueries;
    /**
     * Schedule update with debouncing (using requestAnimationFrame)
     */
    private scheduleUpdate;
    private notifyChange;
    get isDark(): boolean;
    get isLight(): boolean;
    get highContrast(): boolean;
    get reducedMotion(): boolean;
    get sm(): boolean;
    get md(): boolean;
    get lg(): boolean;
    get xl(): boolean;
    get '2xl'(): boolean;
    /**
     * Check if current viewport is between two breakpoints
     * @param min Minimum breakpoint (inclusive)
     * @param max Maximum breakpoint (exclusive)
     */
    between(min: string, max: string): boolean;
    /**
     * Cleanup all listeners
     */
    destroy(): void;
}
/**
 * BreakpointState - Convenience wrapper for breakpoint queries
 */
export declare class BreakpointState {
    private tracker;
    constructor(tracker: ThemeStateTracker);
    get sm(): boolean;
    get md(): boolean;
    get lg(): boolean;
    get xl(): boolean;
    get '2xl'(): boolean;
    /**
     * Check if current viewport is between two breakpoints
     * @param min Minimum breakpoint (inclusive)
     * @param max Maximum breakpoint (exclusive)
     */
    between(min: string, max: string): boolean;
}
//# sourceMappingURL=theme-state-tracker.d.ts.map