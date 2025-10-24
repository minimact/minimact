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
export interface HistoryChange {
    timestamp: number;
    property: string;
    oldValue: any;
    newValue: any;
}
export interface HistorySnapshot {
    timestamp: number;
    state: Record<string, any>;
}
export declare class StateHistoryTracker {
    private changeLog;
    private snapshots;
    private stats;
    private maxHistorySize;
    private snapshotInterval;
    private snapshotTimer?;
    private onChange?;
    constructor(onChange?: () => void, options?: {
        maxHistorySize?: number;
        snapshotInterval?: number;
    });
    /**
     * Record a state change
     */
    recordChange(property: string, oldValue: any, newValue: any): void;
    /**
     * Record a DOM mutation
     */
    recordMutation(): void;
    /**
     * Record a render
     */
    recordRender(): void;
    /**
     * Create periodic snapshots
     */
    private scheduleSnapshot;
    private getCurrentState;
    get changeCount(): number;
    get mutationCount(): number;
    get renderCount(): number;
    get firstRendered(): Date;
    get lastChanged(): Date;
    get ageInSeconds(): number;
    get timeSinceLastChange(): number;
    get changesPerSecond(): number;
    get changesPerMinute(): number;
    get hasStabilized(): boolean;
    get isOscillating(): boolean;
    get trend(): 'increasing' | 'decreasing' | 'stable' | 'volatile';
    get volatility(): number;
    updatedInLast(ms: number): boolean;
    changedMoreThan(n: number): boolean;
    wasStableFor(ms: number): boolean;
    get changes(): ReadonlyArray<HistoryChange>;
    get previousState(): Record<string, any> | null;
    stateAt(timestamp: number): Record<string, any> | null;
    get likelyToChangeNext(): number;
    get estimatedNextChange(): Date | null;
    /**
     * Cleanup all resources
     */
    destroy(): void;
}
//# sourceMappingURL=state-history-tracker.d.ts.map