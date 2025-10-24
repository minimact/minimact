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

export class StateHistoryTracker {
  private changeLog: HistoryChange[] = [];
  private snapshots: HistorySnapshot[] = [];

  private stats = {
    changeCount: 0,
    mutationCount: 0,
    renderCount: 0,
    firstRendered: Date.now(),
    lastChanged: Date.now(),
  };

  private maxHistorySize: number;
  private snapshotInterval: number;
  private snapshotTimer?: number;

  private onChange?: () => void;

  constructor(
    onChange?: () => void,
    options: {
      maxHistorySize?: number;
      snapshotInterval?: number;
    } = {}
  ) {
    this.onChange = onChange;
    this.maxHistorySize = options.maxHistorySize ?? 1000;
    this.snapshotInterval = options.snapshotInterval ?? 5000; // 5 seconds

    this.scheduleSnapshot();
  }

  /**
   * Record a state change
   */
  recordChange(property: string, oldValue: any, newValue: any) {
    const change: HistoryChange = {
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
  private scheduleSnapshot() {
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

  private getCurrentState(): Record<string, any> {
    // Build current state from change log
    const state: Record<string, any> = {};
    for (const change of this.changeLog) {
      state[change.property] = change.newValue;
    }
    return state;
  }

  // ========================================
  // Public API: Basic Stats
  // ========================================

  get changeCount(): number {
    return this.stats.changeCount;
  }

  get mutationCount(): number {
    return this.stats.mutationCount;
  }

  get renderCount(): number {
    return this.stats.renderCount;
  }

  get firstRendered(): Date {
    return new Date(this.stats.firstRendered);
  }

  get lastChanged(): Date {
    return new Date(this.stats.lastChanged);
  }

  get ageInSeconds(): number {
    return (Date.now() - this.stats.firstRendered) / 1000;
  }

  get timeSinceLastChange(): number {
    return Date.now() - this.stats.lastChanged;
  }

  // ========================================
  // Public API: Change Patterns
  // ========================================

  get changesPerSecond(): number {
    const age = this.ageInSeconds;
    return age > 0 ? this.stats.changeCount / age : 0;
  }

  get changesPerMinute(): number {
    return this.changesPerSecond * 60;
  }

  get hasStabilized(): boolean {
    const stabilizationWindow = 2000; // 2 seconds with no changes
    return this.timeSinceLastChange > stabilizationWindow;
  }

  get isOscillating(): boolean {
    // Check for rapid back-and-forth changes
    const recentChanges = this.changeLog.slice(-10);
    if (recentChanges.length < 4) return false;

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

  get trend(): 'increasing' | 'decreasing' | 'stable' | 'volatile' {
    if (this.volatility > 0.7) return 'volatile';

    const recentChanges = this.changeLog.slice(-20);
    if (recentChanges.length < 5) return 'stable';

    // Analyze numeric trends
    const numericChanges = recentChanges.filter(c =>
      typeof c.newValue === 'number' && typeof c.oldValue === 'number'
    );

    if (numericChanges.length < 3) return 'stable';

    const increases = numericChanges.filter(c => c.newValue > c.oldValue).length;
    const decreases = numericChanges.filter(c => c.newValue < c.oldValue).length;

    if (increases > decreases * 2) return 'increasing';
    if (decreases > increases * 2) return 'decreasing';
    return 'stable';
  }

  get volatility(): number {
    // Calculate volatility based on change frequency
    const windowSize = 10000; // 10 seconds
    const now = Date.now();

    const recentChanges = this.changeLog.filter(c =>
      now - c.timestamp < windowSize
    );

    if (recentChanges.length === 0) return 0;

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

  updatedInLast(ms: number): boolean {
    return this.timeSinceLastChange < ms;
  }

  changedMoreThan(n: number): boolean {
    return this.stats.changeCount > n;
  }

  wasStableFor(ms: number): boolean {
    return this.timeSinceLastChange > ms;
  }

  // ========================================
  // Public API: Change Log & Snapshots
  // ========================================

  get changes(): ReadonlyArray<HistoryChange> {
    return this.changeLog;
  }

  get previousState(): Record<string, any> | null {
    if (this.snapshots.length < 2) return null;
    return this.snapshots[this.snapshots.length - 2].state;
  }

  stateAt(timestamp: number): Record<string, any> | null {
    if (this.snapshots.length === 0) return null;

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

  get likelyToChangeNext(): number {
    // Predict probability of next change based on recent frequency
    const recentWindow = 30000; // 30 seconds
    const now = Date.now();

    const recentChanges = this.changeLog.filter(c =>
      now - c.timestamp < recentWindow
    );

    if (recentChanges.length === 0) return 0;

    // More recent changes = higher probability
    // Normalize: 0 changes = 0%, 10+ changes = 90%
    const probability = Math.min(recentChanges.length / 10 * 0.9, 0.9);

    return probability;
  }

  get estimatedNextChange(): Date | null {
    if (this.stats.changeCount < 3) return null;

    // Calculate average time between changes
    const intervals: number[] = [];
    for (let i = 1; i < this.changeLog.length; i++) {
      intervals.push(this.changeLog[i].timestamp - this.changeLog[i - 1].timestamp);
    }

    if (intervals.length === 0) return null;

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
