# useDomElementState() Implementation Plan

## Executive Summary

This document outlines the comprehensive plan to implement `useDomElementState()` - a revolutionary hook that makes the DOM itself a first-class reactive data source in Minimact. This feature extends the predictive rendering pipeline to support DOM-topology-driven predictions, enabling developers to write declarative JSX that responds to DOM structure, visibility, mutations, and statistical aggregations.

## Vision Statement

**Traditional React:** "UI is a function of state"
**Minimact with useDomElementState:** "UI is a function of state AND the DOM structure itself"

The DOM isn't just output anymore - it's input AND output simultaneously, creating a reflexive loop that enables unprecedented expressiveness and predictive capabilities.

---

## Core Concepts

### 1. Singular Reactivity
```jsx
const box = useDomElementState();

<div ref={box}>
  {box.childrenCount > 2 && <CollapseButton />}
  {box.isIntersecting && <LazyContent />}
  {box.attributes["data-state"] === "error" && <ErrorBoundary />}
</div>
```

### 2. Collective Reactivity
```jsx
const headers = useDomElementState('.grid-header');

{headers.count > 5 && <CompactView />}
{headers.every(h => h.isIntersecting) && <StickyNav />}
{headers.some(h => h.attributes['data-sorted']) && <ClearSort />}
```

### 3. Statistical Reactivity
```jsx
const prices = useDomElementState('.price');

{prices.vals.avg() > 50 && <PremiumBadge />}
{prices.vals.sum() > 200 && <BulkDiscountBanner />}
{prices.vals.median() < 20 && <BudgetFriendlyBadge />}
```

---

## Architecture Overview

### The Reflexive Loop

```
State ⇄ DOM ⇄ Predictive Engine
  ↓      ↓           ↓
 JSX  → Patches → Cache
```

### Data Flow

```
1. Developer writes JSX with useDomElementState()
         ↓
2. TSX → C# compilation (tracks DOM element references)
         ↓
3. Server renders HTML with tracking attributes
         ↓
4. Client runtime sets up observers (Intersection, Mutation, Resize)
         ↓
5. Rust engine predicts DOM-driven state changes
         ↓
6. Pre-sends patches to client (cached in HintQueue)
         ↓
7. DOM changes (scroll, mutation, children added)
         ↓
8. Client checks cache → hit → 0ms patch application
         ↓
9. PlaygroundBridge shows 🟢 cache hit notification
```

---

## Implementation Phases

## Phase 1: Client-Side Runtime Foundation

### 1.1. Create DomElementState Class

**File:** `src/client-runtime/src/dom-element-state.ts`

```typescript
export interface DomElementStateOptions {
  selector?: string;
  trackIntersection?: boolean;
  trackMutation?: boolean;
  trackResize?: boolean;
  intersectionOptions?: IntersectionObserverInit;
}

export class DomElementState {
  // Core properties
  private _element: HTMLElement | null = null;
  private _elements: HTMLElement[] = [];
  private _selector: string | null = null;

  // Observers
  private intersectionObserver?: IntersectionObserver;
  private mutationObserver?: MutationObserver;
  private resizeObserver?: ResizeObserver;

  // Reactive state
  private _isIntersecting = false;
  private _intersectionRatio = 0;
  private _boundingRect: DOMRect | null = null;
  private _childrenCount = 0;
  private _attributes: Record<string, string> = {};
  private _classList: string[] = [];

  // Callbacks for reactivity
  private onChange?: () => void;

  constructor(selectorOrElement?: string | HTMLElement, options?: DomElementStateOptions) {
    // Initialize based on selector or element
    // Set up observers
  }

  // Public reactive properties
  get element(): HTMLElement | null { return this._element; }
  get elements(): HTMLElement[] { return this._elements; }
  get isIntersecting(): boolean { return this._isIntersecting; }
  get intersectionRatio(): number { return this._intersectionRatio; }
  get boundingRect(): DOMRect | null { return this._boundingRect; }
  get childrenCount(): number { return this._childrenCount; }
  get grandChildrenCount(): number { /* calculate */ }
  get attributes(): Record<string, string> { return this._attributes; }
  get classList(): string[] { return this._classList; }
  get exists(): boolean { return this._element !== null; }

  // Collection properties (when selector matches multiple)
  get count(): number { return this._elements.length; }

  // Collection methods
  every(predicate: (elem: DomElementState) => boolean): boolean { /* ... */ }
  some(predicate: (elem: DomElementState) => boolean): boolean { /* ... */ }
  filter(predicate: (elem: DomElementState) => boolean): DomElementState[] { /* ... */ }
  map<T>(fn: (elem: DomElementState) => T): T[] { /* ... */ }

  // Statistical operations
  get vals(): DomElementStateValues { /* ... */ }

  // Internal methods
  private setupIntersectionObserver() { /* ... */ }
  private setupMutationObserver() { /* ... */ }
  private setupResizeObserver() { /* ... */ }
  private updateState() { /* ... */ }
  private notifyChange() { if (this.onChange) this.onChange(); }

  // Cleanup
  destroy() {
    this.intersectionObserver?.disconnect();
    this.mutationObserver?.disconnect();
    this.resizeObserver?.disconnect();
  }
}

export class DomElementStateValues {
  private elements: DomElementState[];

  constructor(elements: DomElementState[]) {
    this.elements = elements;
  }

  private extractNumericValues(): number[] {
    // Extract from data-value attributes or textContent
    return this.elements.map(e => {
      const dataValue = e.attributes['data-value'];
      if (dataValue) return parseFloat(dataValue);
      const text = e.element?.textContent?.replace(/[^0-9.-]/g, '');
      return text ? parseFloat(text) : 0;
    });
  }

  avg(): number {
    const values = this.extractNumericValues();
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  sum(): number {
    return this.extractNumericValues().reduce((a, b) => a + b, 0);
  }

  min(): number {
    return Math.min(...this.extractNumericValues());
  }

  max(): number {
    return Math.max(...this.extractNumericValues());
  }

  median(): number {
    const sorted = this.extractNumericValues().sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  stdDev(): number {
    const values = this.extractNumericValues();
    const avg = this.avg();
    const squareDiffs = values.map(v => Math.pow(v - avg, 2));
    const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / values.length;
    return Math.sqrt(avgSquareDiff);
  }

  range(): { min: number; max: number } {
    return { min: this.min(), max: this.max() };
  }

  percentile(p: number): number {
    const sorted = this.extractNumericValues().sort((a, b) => a - b);
    const index = (p / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;
    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
  }

  allAbove(threshold: number): boolean {
    return this.extractNumericValues().every(v => v > threshold);
  }

  anyBelow(threshold: number): boolean {
    return this.extractNumericValues().some(v => v < threshold);
  }
}
```

### 1.2. Integrate with Component Context

**File:** `src/client-runtime/src/hooks.ts`

Add to ComponentContext:
```typescript
interface ComponentContext {
  componentId: string;
  element: HTMLElement;
  state: Map<string, any>;
  effects: Array<{ callback: () => void | (() => void), deps: any[] | undefined, cleanup?: () => void }>;
  refs: Map<string, { current: any }>;
  domElementStates: Map<string, DomElementState>; // NEW
  hintQueue: HintQueue;
  domPatcher: DOMPatcher;
  playgroundBridge?: PlaygroundBridge;
}
```

Implement the hook:
```typescript
let domElementStateIndex = 0;

export function useDomElementState(selector?: string): DomElementState {
  if (!currentContext) {
    throw new Error('useDomElementState must be called within a component render');
  }

  const context = currentContext;
  const index = domElementStateIndex++;
  const stateKey = `domElementState_${index}`;

  // Initialize if not exists
  if (!context.domElementStates.has(stateKey)) {
    const domState = new DomElementState(selector, {
      trackIntersection: true,
      trackMutation: true,
      trackResize: true
    });

    // Set up change callback to trigger re-render and check predictions
    domState.onChange = () => {
      const startTime = performance.now();

      // Build state change object for hint matching
      const stateChanges: Record<string, any> = {
        [stateKey]: {
          isIntersecting: domState.isIntersecting,
          childrenCount: domState.childrenCount,
          attributes: domState.attributes,
          classList: domState.classList,
        }
      };

      // Check hint queue for DOM-driven predictions
      const hint = context.hintQueue.matchHint(context.componentId, stateChanges);

      if (hint) {
        // 🟢 CACHE HIT! Apply DOM-predicted patches
        const latency = performance.now() - startTime;
        console.log(`[Minimact] 🟢 DOM CACHE HIT! Hint '${hint.hintId}' matched - applying ${hint.patches.length} patches in ${latency.toFixed(2)}ms`);

        context.domPatcher.applyPatches(context.element, hint.patches);

        if (context.playgroundBridge) {
          context.playgroundBridge.cacheHit({
            componentId: context.componentId,
            hintId: hint.hintId,
            latency,
            confidence: hint.confidence,
            patchCount: hint.patches.length
          });
        }
      } else {
        // 🔴 CACHE MISS - No DOM prediction
        const latency = performance.now() - startTime;
        console.log(`[Minimact] 🔴 DOM CACHE MISS - No prediction for DOM change:`, stateChanges);

        if (context.playgroundBridge) {
          context.playgroundBridge.cacheMiss({
            componentId: context.componentId,
            methodName: `domChange(${stateKey})`,
            latency,
            patchCount: 0
          });
        }
      }

      // TODO: Trigger re-render
    };

    context.domElementStates.set(stateKey, domState);

    // If selector provided, query and attach after render
    if (selector) {
      queueMicrotask(() => {
        const elements = Array.from(context.element.querySelectorAll(selector)) as HTMLElement[];
        if (elements.length > 0) {
          domState.attachElements(elements);
        }
      });
    }
  }

  return context.domElementStates.get(stateKey)!;
}

export function cleanupDomElementStates(context: ComponentContext): void {
  for (const domState of context.domElementStates.values()) {
    domState.destroy();
  }
  context.domElementStates.clear();
}
```

---

## Phase 2: Server-Side C# Integration

### 2.1. Create DomElementStateHook Base Class

**File:** `src/Minimact.AspNetCore/Core/Hooks/DomElementStateHook.cs`

```csharp
namespace Minimact.AspNetCore.Core.Hooks;

public class DomElementStateHook
{
    public string StateKey { get; set; }
    public string? Selector { get; set; }
    public bool TrackIntersection { get; set; } = true;
    public bool TrackMutation { get; set; } = true;
    public bool TrackResize { get; set; } = true;

    // Tracked state (from last known client state)
    public bool IsIntersecting { get; set; }
    public double IntersectionRatio { get; set; }
    public int ChildrenCount { get; set; }
    public Dictionary<string, string> Attributes { get; set; } = new();
    public List<string> ClassList { get; set; } = new();

    // For collections
    public int Count { get; set; }
    public List<DomElementStateHook> Elements { get; set; } = new();
}

public static class DomElementStateExtensions
{
    public static DomElementStateHook UseDomElementState(
        this MinimactComponent component,
        string? selector = null)
    {
        var stateKey = $"domElementState_{component.DomElementStateIndex++}";

        var hook = new DomElementStateHook
        {
            StateKey = stateKey,
            Selector = selector
        };

        component.DomElementStates[stateKey] = hook;

        return hook;
    }
}
```

### 2.2. Update MinimactComponent Base Class

**File:** `src/Minimact.AspNetCore/Core/MiniactComponent.cs`

```csharp
public abstract class MinimactComponent
{
    // ... existing properties

    // NEW: DOM element state tracking
    internal int DomElementStateIndex { get; set; } = 0;
    internal Dictionary<string, DomElementStateHook> DomElementStates { get; set; } = new();

    // ... existing methods

    /// <summary>
    /// Called when client reports DOM state change
    /// </summary>
    public virtual Task OnDomStateChangedAsync(string stateKey, object stateData)
    {
        if (DomElementStates.TryGetValue(stateKey, out var hook))
        {
            // Update hook state from client
            UpdateDomElementStateFromClient(hook, stateData);

            // Trigger re-render with new DOM state
            TriggerRender();
        }

        return Task.CompletedTask;
    }

    private void UpdateDomElementStateFromClient(DomElementStateHook hook, object stateData)
    {
        // Parse client state and update hook
        // This allows server to know current DOM state
        var json = JsonSerializer.Serialize(stateData);
        var clientState = JsonSerializer.Deserialize<Dictionary<string, object>>(json);

        if (clientState.TryGetValue("isIntersecting", out var intersecting))
            hook.IsIntersecting = Convert.ToBoolean(intersecting);

        if (clientState.TryGetValue("childrenCount", out var count))
            hook.ChildrenCount = Convert.ToInt32(count);

        // ... update other properties
    }
}
```

### 2.3. SignalR Hub Integration

**File:** `src/Minimact.AspNetCore/Hubs/MinimactHub.cs`

```csharp
public class MinimactHub : Hub
{
    // ... existing methods

    /// <summary>
    /// Client notifies server of DOM state change
    /// </summary>
    public async Task NotifyDomStateChange(string componentId, string stateKey, object stateData)
    {
        var component = _componentRegistry.GetComponent(componentId);
        if (component != null)
        {
            await component.OnDomStateChangedAsync(stateKey, stateData);
        }
    }
}
```

---

## Phase 3: Predictive Engine Integration

### 3.1. DOM-Driven Prediction Generation

**File:** `playground/backend/Services/PlaygroundService.cs`

Extend `GeneratePredictions()`:

```csharp
private List<PredictionInfo> GeneratePredictions(PlaygroundSession session)
{
    var predictions = new List<PredictionInfo>();

    // ... existing state-based predictions

    // NEW: DOM-based predictions
    predictions.AddRange(GenerateDomPredictions(session));

    return predictions;
}

private List<PredictionInfo> GenerateDomPredictions(PlaygroundSession session)
{
    var predictions = new List<PredictionInfo>();
    var component = session.Component;

    foreach (var (stateKey, hook) in component.DomElementStates)
    {
        // Predict intersection changes
        if (hook.TrackIntersection && !hook.IsIntersecting)
        {
            // Predict: element will come into view
            var predictedState = CloneComponentState(component);
            hook.IsIntersecting = true;

            var patches = ComputePatchesForDomChange(session, stateKey, hook);

            predictions.Add(new PredictionInfo
            {
                StateKey = stateKey,
                PredictedValue = new { isIntersecting = true },
                Confidence = 0.7f, // Medium confidence for intersection
                Patches = patches
            });
        }

        // Predict children count changes
        if (hook.TrackMutation)
        {
            // Predict: one more child will be added
            var predictedState = CloneComponentState(component);
            hook.ChildrenCount = hook.ChildrenCount + 1;

            var patches = ComputePatchesForDomChange(session, stateKey, hook);

            predictions.Add(new PredictionInfo
            {
                StateKey = stateKey,
                PredictedValue = new { childrenCount = hook.ChildrenCount + 1 },
                Confidence = 0.6f,
                Patches = patches
            });
        }
    }

    return predictions;
}

private object[] ComputePatchesForDomChange(
    PlaygroundSession session,
    string stateKey,
    DomElementStateHook hook)
{
    // Similar to ComputePatchesForStateChange
    // Render component with predicted DOM state
    // Diff against current state
    // Return patches

    try
    {
        var currentHtml = session.CurrentHtml;
        var predictedHtml = RenderComponentWithDomState(session.Component, stateKey, hook);

        // Use Rust reconciler
        var patchesJson = _reconciler.ComputePatches(currentHtml, predictedHtml);
        var patches = JsonSerializer.Deserialize<object[]>(patchesJson);

        return patches ?? Array.Empty<object>();
    }
    catch (Exception ex)
    {
        _logger.LogWarning(ex, "Failed to compute DOM patches for {StateKey}", stateKey);
        return Array.Empty<object>();
    }
}
```

### 3.2. HintQueue Integration

**File:** `src/client-runtime/src/hint-queue.ts`

Update `matchHint()` to support DOM state:

```typescript
matchHint(componentId: string, stateChanges: Record<string, any>): QueuedHint | null {
  // Check both regular state changes and DOM state changes
  for (const [key, hint] of this.hints.entries()) {
    if (!key.startsWith(`${componentId}:`)) continue;

    // Match against predicted state (works for both useState and useDomElementState)
    const matches = this.stateChangesMatch(hint.predictedState, stateChanges);

    if (matches) {
      // Remove from queue (consumed)
      this.hints.delete(key);
      return hint;
    }
  }

  return null;
}

private stateChangesMatch(
  predicted: Record<string, any>,
  actual: Record<string, any>
): boolean {
  // Deep comparison supporting nested DOM state objects
  for (const [key, predictedValue] of Object.entries(predicted)) {
    const actualValue = actual[key];

    if (typeof predictedValue === 'object' && typeof actualValue === 'object') {
      // DOM state comparison
      if (predictedValue.isIntersecting !== undefined &&
          predictedValue.isIntersecting !== actualValue.isIntersecting) {
        return false;
      }

      if (predictedValue.childrenCount !== undefined &&
          predictedValue.childrenCount !== actualValue.childrenCount) {
        return false;
      }

      // ... other DOM property comparisons
    } else {
      // Regular state comparison
      if (predictedValue !== actualValue) {
        return false;
      }
    }
  }

  return true;
}
```

---

## Phase 4: Babel/TypeScript Transformation

### 4.1. TSX → C# Compilation for useDomElementState

**File:** `babel-plugin/src/transform-hooks.ts` (future)

```typescript
// Transform:
const box = useDomElementState();

// To C#:
var box = this.UseDomElementState();

// Transform with selector:
const headers = useDomElementState('.grid-header');

// To C#:
var headers = this.UseDomElementState(".grid-header");

// JSX usage stays reactive:
{box.childrenCount > 2 && <CollapseButton />}

// Compiles to conditional C# render:
if (box.ChildrenCount > 2)
{
    builder.OpenComponent<CollapseButton>();
    builder.CloseComponent();
}
```

### 4.2. Type Inference

Generate TypeScript definitions from C# hooks:

```typescript
// Generated from DomElementStateHook.cs
interface DomElementState {
  isIntersecting: boolean;
  intersectionRatio: number;
  childrenCount: number;
  grandChildrenCount: number;
  attributes: Record<string, string>;
  classList: string[];
  exists: boolean;

  // Collection
  count: number;
  every(predicate: (elem: DomElementState) => boolean): boolean;
  some(predicate: (elem: DomElementState) => boolean): boolean;
  filter(predicate: (elem: DomElementState) => boolean): DomElementState[];

  // Statistics
  vals: DomElementStateValues;
}
```

---

## Phase 5: Playground Demonstration

### 5.1. Example Components for Playground

**File:** `playground/frontend/src/templates/dom-element-state-examples.tsx`

```typescript
// Example 1: Intersection-driven lazy loading
export const LazyLoadExample = `
import { useDomElementState } from 'minimact';

export function Gallery() {
  const section = useDomElementState();

  return (
    <div ref={section}>
      <h2>Image Gallery</h2>
      {section.isIntersecting && (
        <div>
          <img src="photo1.jpg" />
          <img src="photo2.jpg" />
          <img src="photo3.jpg" />
        </div>
      )}
      {!section.isIntersecting && <p>Scroll down to load images...</p>}
    </div>
  );
}
`;

// Example 2: Children count driven UI
export const ChildrenCountExample = `
import { useDomElementState } from 'minimact';

export function Dashboard() {
  const widgets = useDomElementState();

  return (
    <div ref={widgets}>
      <Widget title="Sales" />
      <Widget title="Revenue" />
      <Widget title="Users" />

      {widgets.childrenCount > 5 && (
        <button>Collapse Widgets</button>
      )}

      <p>Active widgets: {widgets.childrenCount}</p>
    </div>
  );
}
`;

// Example 3: Collection statistics
export const StatisticsExample = `
import { useDomElementState } from 'minimact';

export function PriceList() {
  const prices = useDomElementState('.price');

  return (
    <div>
      <div className="price" data-value="29.99">$29.99</div>
      <div className="price" data-value="45.00">$45.00</div>
      <div className="price" data-value="15.50">$15.50</div>

      <div className="stats">
        <p>Average: ${prices.vals.avg()}</p>
        <p>Total: ${prices.vals.sum()}</p>

        {prices.vals.avg() > 50 && (
          <span className="badge">Premium Range</span>
        )}

        {prices.vals.sum() > 200 && (
          <div className="banner">Bulk Discount Available!</div>
        )}
      </div>
    </div>
  );
}
`;

// Example 4: Collection queries
export const CollectionExample = `
import { useDomElementState } from 'minimact';

export function TaskList() {
  const tasks = useDomElementState('.task');

  return (
    <div>
      <div className="task" data-status="done">Task 1</div>
      <div className="task" data-status="pending">Task 2</div>
      <div className="task" data-status="done">Task 3</div>

      <div className="summary">
        <p>Total tasks: {tasks.count}</p>

        {tasks.every(t => t.attributes['data-status'] === 'done') && (
          <div className="success">All tasks complete! 🎉</div>
        )}

        {tasks.some(t => t.attributes['data-status'] === 'pending') && (
          <div className="warning">You have pending tasks</div>
        )}
      </div>
    </div>
  );
}
`;
```

### 5.2. Playground Visualization Enhancements

**File:** `playground/frontend/src/components/DomStateVisualizer.tsx`

```typescript
import { useEffect, useState } from 'react';

interface DomStateVisualizerProps {
  elementSelector: string;
}

export function DomStateVisualizer({ elementSelector }: DomStateVisualizerProps) {
  const [domState, setDomState] = useState({
    count: 0,
    intersecting: 0,
    childrenCount: 0,
    avgValue: 0
  });

  useEffect(() => {
    // Listen for DOM state updates from iframe
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'minimact:dom-state-update') {
        setDomState(event.data.data);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return (
    <div className="dom-state-visualizer">
      <h3>Live DOM State</h3>
      <div className="stats">
        <div className="stat">
          <label>Elements:</label>
          <span>{domState.count}</span>
        </div>
        <div className="stat">
          <label>Intersecting:</label>
          <span>{domState.intersecting}</span>
        </div>
        <div className="stat">
          <label>Children:</label>
          <span>{domState.childrenCount}</span>
        </div>
        <div className="stat">
          <label>Avg Value:</label>
          <span>${domState.avgValue.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}
```

### 5.3. Update PredictionOverlay

**File:** `playground/frontend/src/components/PredictionOverlay.tsx`

Add DOM-specific messaging:

```typescript
// Enhance to show DOM-driven cache hits
if (interaction.cacheHit && interaction.hintId?.includes('intersection')) {
  return (
    <div className="prediction-overlay success">
      <div className="icon">🟢</div>
      <div className="message">
        <strong>DOM Intersection Predicted!</strong>
        <span>Element visibility cached - rendered in {interaction.elapsedMs}ms</span>
        <span className="confidence">{(interaction.predictionConfidence * 100).toFixed(0)}% confidence</span>
      </div>
    </div>
  );
}

if (interaction.cacheHit && interaction.hintId?.includes('children')) {
  return (
    <div className="prediction-overlay success">
      <div className="icon">🟢</div>
      <div className="message">
        <strong>DOM Mutation Predicted!</strong>
        <span>Children count change cached - rendered in {interaction.elapsedMs}ms</span>
      </div>
    </div>
  );
}
```

---

## Phase 6: Documentation & Examples

### 6.1. API Documentation

**File:** `docs/api/useDomElementState.md`

```markdown
# useDomElementState()

Make the DOM itself a first-class reactive data source.

## Signature

```typescript
function useDomElementState(selector?: string): DomElementState
```

## Usage

### Singular Element

```typescript
const box = useDomElementState();

<div ref={box}>
  {box.isIntersecting && <LazyContent />}
  {box.childrenCount > 3 && <CollapseButton />}
</div>
```

### Collection

```typescript
const items = useDomElementState('.item');

{items.count > 10 && <Pagination />}
{items.some(i => i.isIntersecting) && <VisibleIndicator />}
```

### Statistical Aggregations

```typescript
const prices = useDomElementState('.price');

{prices.vals.avg() > 50 && <PremiumBadge />}
{prices.vals.sum() > 200 && <BulkDiscount />}
```

## Properties

- `isIntersecting: boolean` - Whether element is in viewport
- `intersectionRatio: number` - Percentage of element visible (0-1)
- `childrenCount: number` - Direct children count
- `grandChildrenCount: number` - Total descendants count
- `attributes: Record<string, string>` - All element attributes
- `classList: string[]` - Element classes
- `boundingRect: DOMRect` - Element position and size
- `exists: boolean` - Whether element is in DOM

## Collection Methods

- `count: number` - Number of elements matching selector
- `every(predicate)` - Test if all elements match condition
- `some(predicate)` - Test if any element matches condition
- `filter(predicate)` - Get subset matching condition
- `map(fn)` - Transform each element

## Statistical Methods

- `vals.avg()` - Average of numeric values
- `vals.sum()` - Sum of numeric values
- `vals.min()` - Minimum value
- `vals.max()` - Maximum value
- `vals.median()` - Median value
- `vals.stdDev()` - Standard deviation
- `vals.percentile(n)` - Nth percentile
- `vals.range()` - Min/max range
```

### 6.2. Tutorial Guide

**File:** `docs/tutorials/dom-driven-reactivity.md`

Cover:
1. Why DOM as state matters
2. Migration from useRef/useEffect patterns
3. Performance benefits of predictions
4. Real-world use cases
5. Best practices

### 6.3. README Updates

**File:** `README.md`

Add section showcasing `useDomElementState()`:

```markdown
### 🌐 DOM-Driven Reactivity

The DOM isn't just output - it's first-class reactive state:

```typescript
const section = useDomElementState();

<div ref={section}>
  {section.isIntersecting && <LazyContent />}
  {section.childrenCount > 5 && <CollapseButton />}
</div>
```

**Collections and statistics:**

```typescript
const prices = useDomElementState('.price');

{prices.vals.avg() > 50 && <PremiumBadge />}
{prices.count > 10 && <Pagination />}
```

React made state declarative.
Minimact makes **the DOM** declarative.
```

---

## Phase 7: Testing Strategy

### 7.1. Unit Tests

**File:** `src/client-runtime/tests/dom-element-state.test.ts`

```typescript
describe('DomElementState', () => {
  it('should track intersection changes', () => { /* ... */ });
  it('should track children count mutations', () => { /* ... */ });
  it('should compute statistical aggregations', () => { /* ... */ });
  it('should match predicted patches on DOM change', () => { /* ... */ });
});
```

### 7.2. Integration Tests

**File:** `playground/backend.tests/DomPredictionTests.cs`

```csharp
[Fact]
public async Task Should_Predict_Intersection_Change()
{
    // Arrange: Component with useDomElementState tracking intersection
    // Act: Generate predictions
    // Assert: Intersection prediction exists with patches
}

[Fact]
public async Task Should_Predict_Children_Count_Change()
{
    // Arrange: Component with useDomElementState tracking mutations
    // Act: Generate predictions
    // Assert: ChildrenCount prediction exists
}
```

### 7.3. E2E Tests

**File:** `tests/e2e/dom-element-state.spec.ts`

```typescript
test('lazy loading triggers on scroll into view', async ({ page }) => {
  await page.goto('/examples/lazy-load');

  // Verify prediction was sent
  const predictions = await page.evaluate(() => window.__minimact.predictions);
  expect(predictions).toContainEqual(expect.objectContaining({
    stateKey: expect.stringContaining('domElementState'),
    predictedValue: { isIntersecting: true }
  }));

  // Scroll element into view
  await page.evaluate(() => {
    document.querySelector('.lazy-section').scrollIntoView();
  });

  // Verify cache hit overlay appears
  const overlay = page.locator('.prediction-overlay.success');
  await expect(overlay).toContainText('DOM Intersection Predicted');
});
```

---

## Phase 8: Performance Optimization

### 8.1. Observer Throttling

Implement debouncing for high-frequency DOM changes:

```typescript
class DomElementState {
  private updateDebounceMs = 16; // ~60fps
  private pendingUpdate = false;

  private scheduleUpdate() {
    if (this.pendingUpdate) return;

    this.pendingUpdate = true;
    requestAnimationFrame(() => {
      this.updateState();
      this.notifyChange();
      this.pendingUpdate = false;
    });
  }
}
```

### 8.2. Selective Observer Setup

Only create observers when properties are accessed:

```typescript
class DomElementState {
  private _trackingIntersection = false;

  get isIntersecting(): boolean {
    if (!this._trackingIntersection) {
      this.setupIntersectionObserver();
      this._trackingIntersection = true;
    }
    return this._isIntersecting;
  }
}
```

### 8.3. Prediction Confidence Tuning

Adjust confidence scores based on DOM change type:

```csharp
// High confidence for deterministic changes
if (predictingChildrenIncrement) confidence = 0.85f;

// Medium confidence for intersection (user scroll is less predictable)
if (predictingIntersection) confidence = 0.7f;

// Lower confidence for complex mutations
if (predictingClassListChange) confidence = 0.6f;
```

---

## Phase 9: Migration Path

### 9.1. From useRef + useEffect

**Before:**
```typescript
const boxRef = useRef<HTMLDivElement>(null);
const [childCount, setChildCount] = useState(0);

useEffect(() => {
  const observer = new MutationObserver(() => {
    setChildCount(boxRef.current?.children.length || 0);
  });

  if (boxRef.current) {
    observer.observe(boxRef.current, { childList: true });
  }

  return () => observer.disconnect();
}, []);

<div ref={boxRef}>
  {childCount > 3 && <CollapseButton />}
</div>
```

**After:**
```typescript
const box = useDomElementState();

<div ref={box}>
  {box.childrenCount > 3 && <CollapseButton />}
</div>
```

### 9.2. From IntersectionObserver

**Before:**
```typescript
const [isVisible, setIsVisible] = useState(false);
const ref = useRef(null);

useEffect(() => {
  const observer = new IntersectionObserver(([entry]) => {
    setIsVisible(entry.isIntersecting);
  });

  if (ref.current) observer.observe(ref.current);
  return () => observer.disconnect();
}, []);

{isVisible && <Content />}
```

**After:**
```typescript
const section = useDomElementState();

<div ref={section}>
  {section.isIntersecting && <Content />}
</div>
```

---

## Phase 10: Advanced Features (Future)

### 10.1. Custom Predicates

```typescript
const box = useDomElementState({
  customPredicate: (element) => {
    // Custom logic for when to trigger re-render
    return element.scrollTop > 100;
  }
});
```

### 10.2. Cross-Element Queries

```typescript
const header = useDomElementState('#header');
const footer = useDomElementState('#footer');

// Predict based on relationship
usePredictHint('sticky-nav', {
  trigger: header.isIntersecting && !footer.isIntersecting
});
```

### 10.3. Time-Series Analytics

```typescript
const metrics = useDomElementState('.metric');

// Track changes over time
{metrics.vals.avg() > metrics.vals.avgLast5s() && <TrendingUp />}
```

---

## Success Metrics

### Performance Goals
- Cache hit rate for DOM predictions: **>70%**
- Latency for DOM-driven updates: **<5ms** (cache hit)
- Observer overhead: **<1% CPU** (idle)
- Memory footprint per tracked element: **<1KB**

### Developer Experience Goals
- Reduce DOM observation code by **80%**
- Eliminate manual observer setup: **100%** (abstracted away)
- IntelliSense coverage: **100%** (full TypeScript types)

### Adoption Metrics
- Playground examples using `useDomElementState`: **>5 demos**
- Documentation pages: **>3 guides**
- Test coverage: **>90%**

---

## Timeline Estimate

### Phase 1-2: Client + Server Foundation (2 weeks)
- DomElementState class implementation
- Hook integration in component context
- C# base classes and SignalR hub

### Phase 3: Predictive Engine (1 week)
- DOM-driven prediction generation
- HintQueue integration
- Cache hit/miss logic

### Phase 4: TypeScript/Babel (1 week)
- TSX → C# transformation
- Type inference and generation

### Phase 5: Playground Demo (1 week)
- Example components
- Visualization enhancements
- PredictionOverlay updates

### Phase 6-7: Documentation + Testing (1 week)
- API docs
- Tutorial guides
- Unit/integration/E2E tests

### Phase 8-9: Optimization + Migration (1 week)
- Performance tuning
- Migration guides
- Best practices

**Total: ~7 weeks for full implementation**

---

## Risks & Mitigation

### Risk 1: Observer Performance Overhead
**Mitigation:** Throttle updates, lazy observer creation, disconnect when not in viewport

### Risk 2: Prediction Accuracy for DOM Changes
**Mitigation:** Start with high-confidence predictions (intersection, children count), tune based on real usage

### Risk 3: Complex State Synchronization
**Mitigation:** Clear client→server notification protocol, state reconciliation on mismatch

### Risk 4: Memory Leaks from Observers
**Mitigation:** Strict cleanup on component unmount, automated testing for leaks

---

## Conclusion

`useDomElementState()` represents a paradigm shift in how UI frameworks treat the DOM. By making DOM structure, visibility, and statistics first-class reactive values, Minimact enables:

1. **Simpler code** - Eliminate manual observer wiring
2. **Faster interactions** - Predictive DOM-driven patches cached client-side
3. **More expressive UI logic** - Statistical aggregations in JSX
4. **Better developer experience** - Declarative instead of imperative

This implementation plan provides a comprehensive roadmap from client runtime to server-side C# integration, predictive engine enhancement, and playground demonstrations.

**The cactus doesn't just store water. It senses the desert. It knows when rain is coming. It responds to the topology of the sand.** 🌵⚡

Minimact with `useDomElementState()` is the framework that **observes itself**.
