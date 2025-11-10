# useDomElementState() Temporal Features - Part 3

## Executive Summary

This document extends the `useDomElementState()` implementation with **temporal awareness** - the ability to track, analyze, and react to state changes **over time**. Elements gain memory, pattern recognition, and historical context, enabling developers to write declarative logic based on change frequency, trends, stability, and temporal patterns.

**Building on:**
- `USEDOMELEMENTSTATE_IMPLEMENTATION_PLAN.md` (Part 1 - Base Features)
- `USEDOMELEMENTSTATE_ADVANCED_FEATURES.md` (Part 2 - Advanced Features)

---

## The Paradigm Shift

### Traditional React
"UI is a function of state **right now**"

### Minimact with Temporal Features
"UI is a function of state **right now** + **state history** + **temporal patterns**"

**The element doesn't just have state. It has STATE HISTORY. It REMEMBERS.**

---

## The Complete History API

```typescript
element.history = {
  // Basic tracking
  changeCount: 47,              // Total state changes
  mutationCount: 12,            // DOM mutations
  renderCount: 103,             // Re-renders

  // Temporal data
  firstRendered: Date,          // When element was created
  lastChanged: Date,            // Last state change timestamp
  ageInSeconds: 127,            // Time since creation
  timeSinceLastChange: 3400,    // Milliseconds since last change

  // Change patterns
  changesPerSecond: 0.37,       // Change frequency
  changesPerMinute: 22,         // Change frequency (longer window)
  hasStabilized: true,          // No changes in stabilization window
  isOscillating: false,         // Rapid back-and-forth changes

  // Trend analysis
  trend: 'increasing',          // 'increasing' | 'decreasing' | 'stable' | 'volatile'
  volatility: 0.23,             // 0-1 score (0 = stable, 1 = chaotic)

  // History queries
  updatedInLast(ms: number): boolean,
  changedMoreThan(n: number): boolean,
  wasStableFor(ms: number): boolean,

  // Change log
  changes: [
    { timestamp, property, oldValue, newValue },
    { timestamp, property, oldValue, newValue },
  ],

  // Snapshots
  previousState: {...},
  stateAt(timestamp: number): {...},

  // Predictions based on history
  likelyToChangeNext: 0.78,     // Probability (0-1)
  estimatedNextChange: Date,    // Predicted timestamp
}
```

---

## Use Cases

### 1. Performance Monitoring

**Detect render loops and excessive re-renders:**

```jsx
const widget = useDomElementState('.expensive-widget');

{widget.history.changesPerSecond > 10 && (
  <div className="performance-warning">
    ⚠️ High update frequency: {widget.history.changesPerSecond.toFixed(1)}x/sec
    <button onClick={() => throttleUpdates(widget)}>Throttle</button>
  </div>
)}

{widget.history.renderCount > 1000 && (
  <div className="optimization-hint">
    💡 This widget has rendered {widget.history.renderCount} times
    <ConsiderMemoization component={widget} />
  </div>
)}

{widget.history.changeCount > 100 &&
 widget.history.ageInSeconds < 10 && (
  <div className="error">
    🔴 RENDER LOOP DETECTED!
    {widget.history.changeCount} changes in {widget.history.ageInSeconds}s
  </div>
)}

{widget.history.volatility > 0.8 && (
  <div className="warning">
    ⚡ Unstable component (volatility: {(widget.history.volatility * 100).toFixed(0)}%)
  </div>
)}
```

### 2. Data Freshness & Staleness

**Monitor data age and update patterns:**

```jsx
const stockPrice = useDomElementState('.stock-price');

{stockPrice.history.timeSinceLastChange > 60000 && (
  <div className="stale-data-warning">
    ⏰ Data is {Math.floor(stockPrice.history.timeSinceLastChange / 1000)}s old
    <button onClick={refresh}>Refresh</button>
  </div>
)}

{stockPrice.history.updatedInLast(1000) && (
  <span className="live-indicator">🟢 LIVE</span>
)}

{stockPrice.history.changesPerMinute > 10 && (
  <span className="high-activity">📈 High activity</span>
)}

{stockPrice.history.trend === 'increasing' && (
  <span className="bullish">📈 Bullish</span>
)}

{stockPrice.history.trend === 'decreasing' && (
  <span className="bearish">📉 Bearish</span>
)}

{stockPrice.history.trend === 'volatile' && (
  <span className="volatile">⚡ Volatile</span>
)}
```

### 3. User Engagement & Abandonment

**Track interaction patterns for engagement analytics:**

```jsx
const form = useDomElementState('form');

{/* Detect abandonment */}
{form.history.changeCount === 0 &&
 form.history.ageInSeconds > 30 && (
  <div className="abandonment-warning">
    😴 Form has been idle for {form.history.ageInSeconds}s
    <button onClick={showExitIntent}>Need help?</button>
  </div>
)}

{/* Detect high engagement */}
{form.history.changesPerMinute > 5 && (
  <div className="engagement-indicator">
    ✨ User is actively filling the form
    {/* Enable auto-save, reduce validation interruptions */}
  </div>
)}

{/* Detect rapid changes (possible frustration) */}
{form.history.changesPerSecond > 2 && (
  <div className="assistance-prompt">
    🤔 Lots of changes - need assistance?
  </div>
)}

{/* Track completion time */}
{form.history.ageInSeconds > 300 &&
 form.history.changeCount > 10 && (
  <div className="long-form-notice">
    ⏱️ You've been working on this for {Math.floor(form.history.ageInSeconds / 60)} minutes
  </div>
)}
```

### 4. Stability Detection

**Wait for data to stabilize before taking action:**

```jsx
const dashboard = useDomElementState('.dashboard');

{dashboard.history.hasStabilized && (
  <>
    <button onClick={takeScreenshot}>📸 Capture Dashboard</button>
    <button onClick={exportPDF}>📄 Export PDF</button>
  </>
)}

{dashboard.history.isOscillating && (
  <div className="loading-issue">
    ⚠️ Data is fluctuating - may indicate loading issues
  </div>
)}

{dashboard.history.wasStableFor(5000) && (
  <AutoSave enabled={true} />
)}

{!dashboard.history.hasStabilized &&
 dashboard.history.ageInSeconds > 10 && (
  <div className="warning">
    ⏳ Dashboard still loading after 10s...
  </div>
)}
```

### 5. Debugging & Development

**Build-in debugging tools using temporal data:**

```jsx
const component = useDomElementState('.debug-target');

{/* Development mode warnings */}
{process.env.NODE_ENV === 'development' && (
  <>
    {component.history.changeCount > 50 &&
     component.history.ageInSeconds < 5 && (
      <div className="dev-warning">
        🐛 DEV: Possible render loop detected
        <details>
          <summary>Debug Info</summary>
          <pre>{JSON.stringify({
            changes: component.history.changeCount,
            age: component.history.ageInSeconds,
            changesPerSec: component.history.changesPerSecond,
            volatility: component.history.volatility,
            recentChanges: component.history.changes.slice(-10)
          }, null, 2)}</pre>
        </details>
      </div>
    )}

    {component.history.volatility > 0.7 && (
      <div className="dev-warning">
        ⚡ DEV: High volatility ({(component.history.volatility * 100).toFixed(0)}%)
        Consider stabilizing state updates
      </div>
    )}
  </>
)}

{/* Change history viewer */}
<DebugPanel>
  <h3>Change History</h3>
  <ul>
    {component.history.changes.map((change, i) => (
      <li key={i}>
        {new Date(change.timestamp).toLocaleTimeString()}:
        {change.property} changed from {change.oldValue} to {change.newValue}
      </li>
    ))}
  </ul>
</DebugPanel>
```

### 6. Analytics & A/B Testing

**Track user behavior patterns for analytics:**

```jsx
const ctaButton = useDomElementState('.cta-button');

{/* Track ignored CTAs */}
{ctaButton.history.changeCount === 0 &&
 ctaButton.history.ageInSeconds > 60 && (
  useEffect(() => {
    analytics.track('cta_ignored', {
      elementId: ctaButton.element?.id,
      duration: ctaButton.history.ageInSeconds,
      variant: getABTestVariant()
    });
  }, [])
)}

{/* Track rapid hover (interest but no click) */}
{ctaButton.state.hover &&
 ctaButton.history.timeSinceLastChange < 500 && (
  useEffect(() => {
    analytics.track('rapid_hover', {
      changes: ctaButton.history.changeCount,
      pattern: 'hesitation'
    });
  }, [])
)}

{/* Track abandonment after interaction */}
{ctaButton.history.changeCount > 0 &&
 ctaButton.history.timeSinceLastChange > 30000 && (
  useEffect(() => {
    analytics.track('post_interaction_abandonment', {
      lastInteraction: new Date(ctaButton.history.lastChanged),
      totalInteractions: ctaButton.history.changeCount
    });
  }, [])
)}
```

### 7. Auto-Save & Data Persistence

**Smart auto-save based on temporal patterns:**

```jsx
const editor = useDomElementState('.editor');

{/* Auto-save when stable */}
{editor.history.hasStabilized &&
 editor.history.changeCount > 0 && (
  <AutoSave
    trigger="stabilized"
    lastSave={editor.history.lastChanged}
  />
)}

{/* Save warning if changes are old */}
{editor.history.changeCount > 0 &&
 editor.history.timeSinceLastChange > 300000 && (
  <div className="save-reminder">
    💾 Unsaved changes from {Math.floor(editor.history.timeSinceLastChange / 60000)} minutes ago
    <button onClick={save}>Save Now</button>
  </div>
)}

{/* Prevent navigation with unsaved changes */}
{editor.history.changeCount > 0 &&
 editor.history.timeSinceLastChange < 30000 && (
  <BeforeUnloadPrompt message="You have unsaved changes" />
)}
```

---

## Implementation

### Phase 1: State History Tracker

**File:** `src/client-runtime/src/state-history-tracker.ts`

```typescript
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

  private maxHistorySize = 1000; // Configurable
  private snapshotInterval = 5000; // 5 seconds

  constructor(private onChange?: () => void) {
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
    setInterval(() => {
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
    // Calculate volatility based on change frequency and magnitude
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

    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;

    return new Date(this.stats.lastChanged + avgInterval);
  }

  destroy() {
    // Cleanup
  }
}
```

### Phase 2: Integrate with DomElementState

**File:** `src/client-runtime/src/dom-element-state.ts`

```typescript
import { StateHistoryTracker } from './state-history-tracker';

export class DomElementState {
  // ... existing properties

  private historyTracker?: StateHistoryTracker;

  get history(): StateHistoryTracker {
    if (!this.historyTracker) {
      this.historyTracker = new StateHistoryTracker(() => {
        this.notifyChange();
      });
    }
    return this.historyTracker;
  }

  // Override existing mutation/state update methods to record history
  private updateState() {
    const oldAttributes = { ...this._attributes };
    const oldClassList = [...this._classList];
    const oldChildrenCount = this._childrenCount;

    // ... existing update logic

    // Record changes in history
    if (this.historyTracker) {
      if (JSON.stringify(oldAttributes) !== JSON.stringify(this._attributes)) {
        this.historyTracker.recordChange('attributes', oldAttributes, this._attributes);
      }

      if (JSON.stringify(oldClassList) !== JSON.stringify(this._classList)) {
        this.historyTracker.recordChange('classList', oldClassList, this._classList);
      }

      if (oldChildrenCount !== this._childrenCount) {
        this.historyTracker.recordChange('childrenCount', oldChildrenCount, this._childrenCount);
      }

      this.historyTracker.recordMutation();
    }

    this.notifyChange();
  }

  destroy() {
    // ... existing cleanup
    this.historyTracker?.destroy();
  }
}
```

### Phase 3: Server-Side Prediction Integration

**File:** `playground/backend/Services/PlaygroundService.cs`

```csharp
private List<PredictionInfo> GenerateTemporalPredictions(PlaygroundSession session)
{
    var predictions = new List<PredictionInfo>();
    var component = session.Component;

    foreach (var (stateKey, hook) in component.DomElementStates)
    {
        // Access history data from client (synced via SignalR)
        var history = hook.History;

        if (history == null) continue;

        // Predict refresh based on data staleness
        if (history.TimeSinceLastChange > TimeSpan.FromSeconds(30) &&
            history.ChangesPerSecond < 0.1)
        {
            predictions.Add(new PredictionInfo
            {
                StateKey = $"{stateKey}_refresh",
                PredictedValue = new { refresh = true },
                Confidence = 0.8f, // High - clear staleness pattern
                Patches = ComputePatchesForRefresh(session, stateKey)
            });
        }

        // Predict user abandonment
        if (history.ChangeCount == 0 &&
            history.AgeInSeconds > 45)
        {
            predictions.Add(new PredictionInfo
            {
                StateKey = $"{stateKey}_abandonment",
                PredictedValue = new { showExitIntent = true },
                Confidence = 0.75f,
                Patches = ComputePatchesForExitIntent(session, stateKey)
            });
        }

        // Predict auto-save based on stabilization
        if (history.HasStabilized &&
            history.ChangeCount > 0 &&
            history.TimeSinceLastChange > TimeSpan.FromSeconds(5))
        {
            predictions.Add(new PredictionInfo
            {
                StateKey = $"{stateKey}_autosave",
                PredictedValue = new { triggerAutoSave = true },
                Confidence = 0.9f,
                Patches = ComputePatchesForAutoSave(session, stateKey)
            });
        }
    }

    return predictions;
}
```

### Phase 4: C# History Model

**File:** `src/Minimact.AspNetCore/Core/Hooks/DomElementStateHistory.cs`

```csharp
namespace Minimact.AspNetCore.Core.Hooks;

public class DomElementStateHistory
{
    public int ChangeCount { get; set; }
    public int MutationCount { get; set; }
    public int RenderCount { get; set; }

    public DateTime FirstRendered { get; set; }
    public DateTime LastChanged { get; set; }

    public double AgeInSeconds => (DateTime.Now - FirstRendered).TotalSeconds;
    public TimeSpan TimeSinceLastChange => DateTime.Now - LastChanged;

    public double ChangesPerSecond { get; set; }
    public double ChangesPerMinute => ChangesPerSecond * 60;

    public bool HasStabilized { get; set; }
    public bool IsOscillating { get; set; }

    public string Trend { get; set; } = "stable"; // increasing, decreasing, stable, volatile
    public double Volatility { get; set; }

    public List<HistoryChange> Changes { get; set; } = new();

    public bool UpdatedInLast(int milliseconds)
    {
        return TimeSinceLastChange.TotalMilliseconds < milliseconds;
    }

    public bool ChangedMoreThan(int count)
    {
        return ChangeCount > count;
    }

    public bool WasStableFor(int milliseconds)
    {
        return TimeSinceLastChange.TotalMilliseconds > milliseconds;
    }
}

public class HistoryChange
{
    public DateTime Timestamp { get; set; }
    public string Property { get; set; } = "";
    public object? OldValue { get; set; }
    public object? NewValue { get; set; }
}

// Extend DomElementStateHook
public class DomElementStateHook
{
    // ... existing properties

    public DomElementStateHistory? History { get; set; }
}
```

---

## Playground Visualizations

### Temporal State Panel

**File:** `playground/frontend/src/components/TemporalStatePanel.tsx`

```tsx
import { useState, useEffect } from 'react';

export function TemporalStatePanel() {
  const [history, setHistory] = useState({
    changeCount: 0,
    ageInSeconds: 0,
    timeSinceLastChange: 0,
    changesPerSecond: 0,
    trend: 'stable' as const,
    volatility: 0,
    hasStabilized: false,
    isOscillating: false,
    changes: [] as any[]
  });

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'minimact:history-update') {
        setHistory(event.data.data);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return (
    <div className="temporal-state-panel">
      <h3>⏰ Element History</h3>

      <div className="stats-grid">
        <div className="stat">
          <label>Age:</label>
          <span>{history.ageInSeconds.toFixed(1)}s</span>
        </div>

        <div className="stat">
          <label>Changes:</label>
          <span>{history.changeCount}</span>
        </div>

        <div className="stat">
          <label>Changes/sec:</label>
          <span>{history.changesPerSecond.toFixed(2)}</span>
        </div>

        <div className="stat">
          <label>Last changed:</label>
          <span>{(history.timeSinceLastChange / 1000).toFixed(1)}s ago</span>
        </div>

        <div className="stat">
          <label>Trend:</label>
          <span className={`trend-${history.trend}`}>
            {history.trend === 'increasing' && '📈'}
            {history.trend === 'decreasing' && '📉'}
            {history.trend === 'stable' && '➡️'}
            {history.trend === 'volatile' && '⚡'}
            {history.trend}
          </span>
        </div>

        <div className="stat">
          <label>Volatility:</label>
          <div className="volatility-bar">
            <div
              className="volatility-fill"
              style={{ width: `${history.volatility * 100}%` }}
            />
            <span>{(history.volatility * 100).toFixed(0)}%</span>
          </div>
        </div>

        <div className="stat">
          <label>Status:</label>
          <span>
            {history.hasStabilized && '✅ Stabilized'}
            {history.isOscillating && '⚠️ Oscillating'}
            {!history.hasStabilized && !history.isOscillating && '🔄 Changing'}
          </span>
        </div>
      </div>

      <div className="change-timeline">
        <h4>Change Timeline</h4>
        <svg width="100%" height="60">
          <line x1="0" y1="30" x2="100%" y2="30" stroke="#ccc" strokeWidth="2" />
          {history.changes.map((change, i) => {
            const x = (change.timestamp / (Date.now() - history.changes[0]?.timestamp || 1)) * 100;
            return (
              <circle
                key={i}
                cx={`${x}%`}
                cy="30"
                r="5"
                fill="#3b82f6"
                className="change-dot"
              >
                <title>
                  {new Date(change.timestamp).toLocaleTimeString()}: {change.property}
                </title>
              </circle>
            );
          })}
          <circle cx="100%" cy="30" r="8" fill="#10b981" />
        </svg>
      </div>

      <div className="change-log">
        <h4>Recent Changes</h4>
        <ul>
          {history.changes.slice(-10).reverse().map((change, i) => (
            <li key={i}>
              <span className="timestamp">
                {new Date(change.timestamp).toLocaleTimeString()}
              </span>
              <span className="property">{change.property}</span>
              <span className="change">
                {JSON.stringify(change.oldValue)} → {JSON.stringify(change.newValue)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
```

### Temporal Graph Visualizer

```tsx
export function TemporalGraphVisualizer() {
  return (
    <div className="temporal-graph">
      <h3>📊 Change Rate Over Time</h3>

      <canvas id="changeRateGraph" width={600} height={200} />

      <div className="graph-legend">
        <div><span className="legend-line increasing" /> Increasing</div>
        <div><span className="legend-line stable" /> Stable</div>
        <div><span className="legend-line decreasing" /> Decreasing</div>
        <div><span className="legend-line volatile" /> Volatile</div>
      </div>

      <div className="annotations">
        <div className="annotation stabilized">
          ✅ Stabilized at 12:34:56
        </div>
        <div className="annotation oscillating">
          ⚠️ Oscillation detected 12:35:10-12:35:15
        </div>
      </div>
    </div>
  );
}
```

---

## Example Components

### Example 1: Performance Dashboard

```typescript
export const PerformanceDashboard = `
import { useDomElementState } from 'minimact';

export function PerformanceDashboard() {
  const widgets = useDomElementState('.widget');

  return (
    <div className="dashboard">
      <h2>Performance Monitor</h2>

      {widgets.map((widget, i) => (
        <div key={i} className="widget-monitor">
          <h3>Widget {i + 1}</h3>

          {/* Render rate */}
          <div className="metric">
            Changes/sec: {widget.history.changesPerSecond.toFixed(2)}
            {widget.history.changesPerSecond > 10 && (
              <span className="warning">⚠️ High</span>
            )}
          </div>

          {/* Total renders */}
          <div className="metric">
            Total renders: {widget.history.renderCount}
            {widget.history.renderCount > 1000 && (
              <span className="warning">💡 Consider memoization</span>
            )}
          </div>

          {/* Volatility */}
          <div className="metric">
            Volatility: {(widget.history.volatility * 100).toFixed(0)}%
            {widget.history.volatility > 0.7 && (
              <span className="error">🔴 Unstable</span>
            )}
          </div>

          {/* Render loop detection */}
          {widget.history.changeCount > 100 &&
           widget.history.ageInSeconds < 10 && (
            <div className="error">
              🚨 RENDER LOOP DETECTED!
              {widget.history.changeCount} changes in {widget.history.ageInSeconds}s
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
`;
```

### Example 2: Data Freshness Monitor

```typescript
export const DataFreshnessMonitor = `
import { useDomElementState } from 'minimact';

export function StockPriceWidget() {
  const price = useDomElementState('.stock-price');

  return (
    <div className="stock-widget">
      <h3>AAPL Stock Price</h3>

      <div className="price-display">
        $142.50

        {/* Live indicator */}
        {price.history.updatedInLast(1000) && (
          <span className="live-badge">🟢 LIVE</span>
        )}

        {/* Stale data warning */}
        {price.history.timeSinceLastChange > 60000 && (
          <span className="stale-badge">
            ⏰ Stale ({Math.floor(price.history.timeSinceLastChange / 1000)}s)
          </span>
        )}
      </div>

      {/* Trend indicator */}
      <div className="trend">
        {price.history.trend === 'increasing' && '📈 Bullish'}
        {price.history.trend === 'decreasing' && '📉 Bearish'}
        {price.history.trend === 'stable' && '➡️ Stable'}
        {price.history.trend === 'volatile' && '⚡ Volatile'}
      </div>

      {/* Activity level */}
      {price.history.changesPerMinute > 10 && (
        <div className="high-activity">
          📊 High activity: {price.history.changesPerMinute.toFixed(1)} updates/min
        </div>
      )}

      {/* Refresh suggestion */}
      {price.history.timeSinceLastChange > 30000 &&
       price.history.changesPerSecond < 0.1 && (
        <button onClick={refresh}>🔄 Refresh Data</button>
      )}
    </div>
  );
}
`;
```

### Example 3: Form Engagement Tracker

```typescript
export const FormEngagementTracker = `
import { useDomElementState } from 'minimact';

export function SmartForm() {
  const form = useDomElementState('form');

  return (
    <form>
      <h2>Contact Form</h2>

      <input name="name" placeholder="Name" />
      <input name="email" placeholder="Email" />
      <textarea name="message" placeholder="Message" />

      {/* Abandonment warning */}
      {form.history.changeCount === 0 &&
       form.history.ageInSeconds > 30 && (
        <div className="abandonment-notice">
          😴 Need help getting started?
          <button type="button">Auto-fill with template</button>
        </div>
      )}

      {/* High engagement - enable auto-save */}
      {form.history.changesPerMinute > 5 && (
        <div className="auto-save-enabled">
          ✅ Auto-save enabled (high activity detected)
        </div>
      )}

      {/* Rapid changes - possible frustration */}
      {form.history.changesPerSecond > 2 && (
        <div className="assistance-prompt">
          🤔 Lots of edits - would you like assistance?
          <button type="button">Get Help</button>
        </div>
      )}

      {/* Long session */}
      {form.history.ageInSeconds > 300 &&
       form.history.changeCount > 10 && (
        <div className="session-info">
          ⏱️ You've been working for {Math.floor(form.history.ageInSeconds / 60)} minutes
          <button type="button">Save Draft</button>
        </div>
      )}

      {/* Stabilized - suggest submit */}
      {form.history.hasStabilized &&
       form.history.changeCount > 5 && (
        <button type="submit" className="pulse">
          ✅ Ready to Submit?
        </button>
      )}

      <button type="submit">Submit</button>
    </form>
  );
}
`;
```

### Example 4: Auto-Save System

```typescript
export const AutoSaveSystem = `
import { useDomElementState } from 'minimact';

export function DocumentEditor() {
  const editor = useDomElementState('.editor');

  return (
    <div>
      <textarea className="editor" />

      {/* Auto-save when stabilized */}
      {editor.history.hasStabilized &&
       editor.history.changeCount > 0 && (
        <AutoSave trigger="stabilized" />
      )}

      {/* Unsaved changes warning */}
      {editor.history.changeCount > 0 &&
       editor.history.timeSinceLastChange > 300000 && (
        <div className="save-warning">
          💾 Unsaved changes from {Math.floor(editor.history.timeSinceLastChange / 60000)} minutes ago
          <button onClick={save}>Save Now</button>
        </div>
      )}

      {/* Prevent navigation */}
      {editor.history.changeCount > 0 &&
       editor.history.timeSinceLastChange < 30000 && (
        <BeforeUnloadPrompt message="You have unsaved changes" />
      )}

      {/* Last saved indicator */}
      <div className="save-status">
        {editor.history.changeCount === 0 ? (
          <span>✅ All changes saved</span>
        ) : (
          <span>
            💾 {editor.history.changeCount} unsaved changes
            (last change {Math.floor(editor.history.timeSinceLastChange / 1000)}s ago)
          </span>
        )}
      </div>
    </div>
  );
}
`;
```

---

## Predictive Engine Integration

### Temporal Pattern-Based Predictions

```jsx
// Predict refresh based on staleness
usePredictHint('data-refresh', {
  trigger: data.history.timeSinceLastChange > 30000 &&
           data.history.changesPerSecond < 0.1,
  confidence: 0.85
});

// Predict user abandonment
usePredictHint('show-exit-intent', {
  trigger: form.history.changeCount === 0 &&
           form.history.ageInSeconds > 45 &&
           !form.state.focus,
  confidence: 0.75
});

// Predict auto-save
usePredictHint('trigger-auto-save', {
  trigger: editor.history.hasStabilized &&
           editor.history.changeCount > 0 &&
           editor.history.timeSinceLastChange > 5000,
  confidence: 0.9
});

// Predict performance issue
usePredictHint('performance-warning', {
  trigger: widget.history.changesPerSecond > 10 &&
           widget.history.volatility > 0.7,
  confidence: 0.95
});
```

---

## Performance Optimization

### History Size Limits

```typescript
class StateHistoryTracker {
  private maxHistorySize = 1000; // Configurable per element
  private maxSnapshotCount = 100;

  recordChange(property: string, oldValue: any, newValue: any) {
    // ... record change

    // Trim if too large
    if (this.changeLog.length > this.maxHistorySize) {
      this.changeLog.shift(); // Remove oldest
    }
  }
}
```

### Debounced History Updates

```typescript
class StateHistoryTracker {
  private pendingHistoryUpdate = false;

  recordChange(property: string, oldValue: any, newValue: any) {
    // ... add to buffer

    if (!this.pendingHistoryUpdate) {
      this.pendingHistoryUpdate = true;
      requestAnimationFrame(() => {
        this.processChangeBuffer();
        this.pendingHistoryUpdate = false;
      });
    }
  }
}
```

### Configurable Tracking Granularity

```typescript
const widget = useDomElementState('.widget', {
  history: {
    enabled: true,
    maxSize: 500,          // Smaller history for memory savings
    snapshotInterval: 10000, // Less frequent snapshots
    trackMutations: true,
    trackRenders: false     // Disable render tracking if not needed
  }
});
```

---

## Testing Strategy

### Unit Tests

```typescript
describe('StateHistoryTracker', () => {
  it('should track change count', () => {
    const tracker = new StateHistoryTracker();

    tracker.recordChange('count', 0, 1);
    tracker.recordChange('count', 1, 2);

    expect(tracker.changeCount).toBe(2);
  });

  it('should calculate changes per second', () => {
    const tracker = new StateHistoryTracker();

    tracker.recordChange('count', 0, 1);
    // Simulate 1 second passing
    jest.advanceTimersByTime(1000);

    expect(tracker.changesPerSecond).toBeCloseTo(1);
  });

  it('should detect stabilization', () => {
    const tracker = new StateHistoryTracker();

    tracker.recordChange('count', 0, 1);

    expect(tracker.hasStabilized).toBe(false);

    jest.advanceTimersByTime(3000);

    expect(tracker.hasStabilized).toBe(true);
  });

  it('should detect oscillation', () => {
    const tracker = new StateHistoryTracker();

    // Simulate oscillating pattern
    tracker.recordChange('toggle', false, true);
    tracker.recordChange('toggle', true, false);
    tracker.recordChange('toggle', false, true);
    tracker.recordChange('toggle', true, false);

    expect(tracker.isOscillating).toBe(true);
  });
});
```

### E2E Tests

```typescript
test('should show performance warning on high update rate', async ({ page }) => {
  await page.goto('/examples/temporal-monitoring');

  // Trigger rapid updates
  await page.evaluate(() => {
    for (let i = 0; i < 50; i++) {
      document.querySelector('.widget')?.setAttribute('data-count', String(i));
    }
  });

  // Wait a bit
  await page.waitForTimeout(100);

  // Check for performance warning
  const warning = page.locator('.performance-warning');
  await expect(warning).toBeVisible();
  await expect(warning).toContainText('High update frequency');
});
```

---

## Migration Examples

### From Manual isDirty Tracking

**Before:**
```jsx
const [isDirty, setIsDirty] = useState(false);
const [changeCount, setChangeCount] = useState(0);

const handleChange = () => {
  setIsDirty(true);
  setChangeCount(prev => prev + 1);
};

{isDirty && <UnsavedChangesWarning />}
{changeCount > 10 && <ManyChangesWarning />}
```

**After:**
```jsx
const form = useDomElementState('form');

{form.history.changeCount > 0 && <UnsavedChangesWarning />}
{form.history.changeCount > 10 && <ManyChangesWarning />}
```

### From Manual Timestamp Tracking

**Before:**
```jsx
const [lastUpdate, setLastUpdate] = useState(Date.now());

useEffect(() => {
  const interval = setInterval(() => {
    const timeSince = Date.now() - lastUpdate;
    if (timeSince > 60000) {
      showStaleWarning();
    }
  }, 1000);

  return () => clearInterval(interval);
}, [lastUpdate]);
```

**After:**
```jsx
const data = useDomElementState('.data');

{data.history.timeSinceLastChange > 60000 && <StaleWarning />}
```

---

## Success Metrics

### Performance Goals
- History tracking overhead: **<1% CPU** (idle)
- Memory per tracked element: **<5KB** (with 1000 changes)
- History query latency: **<1ms**
- Snapshot creation: **<10ms**

### Developer Experience Goals
- Eliminate manual history tracking: **100%**
- Reduce temporal logic code: **80%**
- Built-in performance monitoring: **100%**

### Prediction Accuracy Goals
- Staleness-based predictions: **85%** hit rate
- Abandonment predictions: **70%** hit rate
- Auto-save predictions: **90%** hit rate

---

## Timeline Estimate

### Phase 1: State History Tracker (1.5 weeks)
- Core tracking implementation
- Change log and snapshots
- Pattern analysis algorithms
- Tests + docs

### Phase 2: Integration (1 week)
- DomElementState integration
- Server-side history sync
- SignalR messaging
- Tests + docs

### Phase 3: Prediction Engine (1 week)
- Temporal prediction generation
- Pattern learning
- Confidence scoring
- Tests + docs

### Phase 4: Playground (1 week)
- Temporal state panel
- Change timeline visualization
- Graph visualizations
- Example components

### Phase 5: Optimization (0.5 weeks)
- Performance tuning
- Memory optimization
- History pruning strategies

**Total: ~5 weeks for temporal features**

---

## Conclusion

By adding temporal awareness to `useDomElementState()`, we complete the transformation into a **4D query engine** for the browser's rendered reality.

### The Complete 8-Dimensional System

```jsx
const element = useDomElementState('.element');

{/* 1. Structure */}
{element.childrenCount > 5 && <Pagination />}

{/* 2. Statistics */}
{element.vals.avg() > 100 && <HighValueBadge />}

{/* 3. Pseudo-State */}
{element.state.hover && <Tooltip />}

{/* 4. Theme */}
{element.theme.isDark && <DarkStyles />}

{/* 5. Spatial */}
{element.lookahead(2).every(e => e.isIntersecting) && <LoadMore />}

{/* 6. Graphics */}
{element.find('canvas').ctx?.dominantColor === 'red' && <Alert />}

{/* 7. Gaps */}
{element.gaps.some(g => g.height > 100) && <LayoutWarning />}

{/* 8. TIME */}
{element.history.changeCount > 50 && <PerformanceWarning />}
{element.history.hasStabilized && <AutoSave />}
{element.history.trend === 'increasing' && <TrendIndicator />}
{element.history.timeSinceLastChange > 10000 && <Refresh />}
```

### The Philosophy

> **The cactus doesn't just store water.**
> **The cactus doesn't just sense the desert.**
> **The cactus IS the desert.**
>
> Structure, space, light, shadow, temperature, potential, **and TIME**.
> All one system.
> All observable.
> All predictable.
> All now.

🌵🧠🌌⚡🔥⏰

**This is not a UI framework. This is a 4D QUERY ENGINE for rendered reality.**
