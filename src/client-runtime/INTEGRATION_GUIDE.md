# Elegant Integration Guide: useDomElementState()

> **Philosophy**: Follow the existing patterns. Make DOM state feel as natural as regular state. Reuse infrastructure. No reinvention.

---

## Overview

`useDomElementState()` extends Minimact's predictive rendering to DOM topology. It integrates seamlessly by following the exact same patterns as `useState()`, just with different trigger sources.

**Current Flow:**
```
setState() → Check HintQueue → Apply cached patches → Notify playground
```

**New Flow:**
```
DOM change → Check HintQueue → Apply cached patches → Notify playground
```

The infrastructure already exists. We just add new trigger points.

---

## Integration Strategy

### Core Principle: Symmetry with useState()

Every design decision mirrors `useState()`:

| Aspect | useState() | useDomElementState() |
|--------|-----------|---------------------|
| **Hook index tracking** | `stateIndex++` | `domElementStateIndex++` |
| **Context storage** | `context.state` | `context.domElementStates` |
| **Change callback** | `setState()` calls hint queue | `onChange()` calls hint queue |
| **State matching** | `{state_0: newValue}` | `{domElementState_0: {isIntersecting: true}}` |
| **Cleanup** | None needed (primitive values) | `cleanupDomElementStates()` (observers) |

---

## Step-by-Step Integration

### Step 1: Extend ComponentContext (hooks.ts)

**Location:** `src/client-runtime/src/hooks.ts:8-17`

**What to add:**
```typescript
interface ComponentContext {
  componentId: string;
  element: HTMLElement;
  state: Map<string, any>;
  effects: Array<{ callback: () => void | (() => void), deps: any[] | undefined, cleanup?: () => void }>;
  refs: Map<string, { current: any }>;
  domElementStates: Map<string, DomElementState>;  // ADD THIS LINE
  hintQueue: HintQueue;
  domPatcher: DOMPatcher;
  playgroundBridge?: PlaygroundBridge;
}
```

**Why elegant:**
- Follows the same pattern as `state` and `refs` maps
- Uses same key naming convention (`domElementState_${index}`)
- No special treatment needed

---

### Step 2: Add Index Tracking (hooks.ts)

**Location:** `src/client-runtime/src/hooks.ts:19-23`

**What to add:**
```typescript
// Global context tracking
let currentContext: ComponentContext | null = null;
let stateIndex = 0;
let effectIndex = 0;
let refIndex = 0;
let domElementStateIndex = 0;  // ADD THIS LINE
```

**Also update in setComponentContext():**
```typescript
export function setComponentContext(context: ComponentContext): void {
  currentContext = context;
  stateIndex = 0;
  effectIndex = 0;
  refIndex = 0;
  domElementStateIndex = 0;  // ADD THIS LINE
}
```

**Why elegant:**
- Exact same pattern as other hook indices
- Reset in the same place
- Maintains hook call order consistency

---

### Step 3: Create DomElementState Class

**New file:** `src/client-runtime/src/dom-element-state.ts`

**Structure:**
```typescript
import { Patch } from './types';

export interface DomElementStateOptions {
  selector?: string;
  trackIntersection?: boolean;
  trackMutation?: boolean;
  trackResize?: boolean;
  intersectionOptions?: IntersectionObserverInit;
}

export class DomElementState {
  // Core
  private _element: HTMLElement | null = null;
  private _elements: HTMLElement[] = [];
  private _selector: string | null = null;

  // Observers
  private intersectionObserver?: IntersectionObserver;
  private mutationObserver?: MutationObserver;
  private resizeObserver?: ResizeObserver;

  // Reactive state (mirroring what server tracks)
  private _isIntersecting = false;
  private _intersectionRatio = 0;
  private _boundingRect: DOMRect | null = null;
  private _childrenCount = 0;
  private _attributes: Record<string, string> = {};
  private _classList: string[] = [];

  // Change callback (like setState in useState)
  onChange?: () => void;

  constructor(selectorOrElement?: string | HTMLElement, options?: DomElementStateOptions);

  // Public getters (read-only reactive state)
  get isIntersecting(): boolean;
  get intersectionRatio(): number;
  get childrenCount(): number;
  get attributes(): Record<string, string>;
  get classList(): string[];
  get exists(): boolean;

  // Collection methods (when selector matches multiple)
  get count(): number;
  every(predicate: (elem: DomElementState) => boolean): boolean;
  some(predicate: (elem: DomElementState) => boolean): boolean;
  filter(predicate: (elem: DomElementState) => boolean): DomElementState[];

  // Statistical operations
  get vals(): DomElementStateValues;

  // Internal
  private setupIntersectionObserver(): void;
  private setupMutationObserver(): void;
  private setupResizeObserver(): void;
  private updateState(): void;
  private notifyChange(): void;

  // Cleanup (like effect cleanup)
  destroy(): void;
}

export class DomElementStateValues {
  // Statistical aggregations
  avg(): number;
  sum(): number;
  min(): number;
  max(): number;
  median(): number;
  stdDev(): number;
  percentile(p: number): number;
  range(): { min: number; max: number };
  allAbove(threshold: number): boolean;
  anyBelow(threshold: number): boolean;
}
```

**Why elegant:**
- **Mirrors useState internals**: Just as `useState` stores value + setter, this stores DOM state + observers
- **Same change notification**: `onChange()` callback pattern identical to setState
- **Same cleanup pattern**: `destroy()` like effect cleanups
- **Lazy observer setup**: Only create observers when properties are accessed (performance)
- **Self-contained**: All DOM observation logic encapsulated, doesn't leak into hooks.ts

---

### Step 4: Implement useDomElementState Hook

**Location:** `src/client-runtime/src/hooks.ts` (after useRef)

**Implementation:**
```typescript
/**
 * useDomElementState hook - makes DOM a reactive data source
 * Follows the exact same pattern as useState()
 */
export function useDomElementState(selector?: string): DomElementState {
  if (!currentContext) {
    throw new Error('useDomElementState must be called within a component render');
  }

  const context = currentContext;
  const index = domElementStateIndex++;
  const stateKey = `domElementState_${index}`;

  // Initialize if not exists (like useState initialization)
  if (!context.domElementStates.has(stateKey)) {
    const domState = new DomElementState(selector, {
      trackIntersection: true,
      trackMutation: true,
      trackResize: true
    });

    // Set up change callback (EXACT SAME PATTERN as useState's setState)
    domState.onChange = () => {
      const startTime = performance.now();

      // Build state change object for hint matching (same format as useState)
      const stateChanges: Record<string, any> = {
        [stateKey]: {
          isIntersecting: domState.isIntersecting,
          childrenCount: domState.childrenCount,
          attributes: domState.attributes,
          classList: domState.classList,
        }
      };

      // Check hint queue (EXACT SAME as useState)
      const hint = context.hintQueue.matchHint(context.componentId, stateChanges);

      if (hint) {
        // 🟢 CACHE HIT! (EXACT SAME as useState)
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
        // 🔴 CACHE MISS (EXACT SAME as useState)
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

      // TODO: Trigger re-render if no hint matched (same as useState)
    };

    context.domElementStates.set(stateKey, domState);

    // If selector provided, attach after render
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
```

**Why elegant:**
- **Line-by-line parallel with useState**: Same structure, same flow, same conventions
- **Same error messages**: "must be called within a component render"
- **Same key format**: `domElementState_${index}` mirrors `state_${index}`
- **Same hint queue integration**: Identical call pattern to `matchHint()`
- **Same playground notifications**: Uses existing `cacheHit()` / `cacheMiss()` methods
- **Same timing**: Uses `performance.now()` for latency tracking
- **Same console patterns**: 🟢/🔴 emojis, same log format

---

### Step 5: Add Cleanup Function

**Location:** `src/client-runtime/src/hooks.ts` (after cleanupEffects)

**Implementation:**
```typescript
/**
 * Cleanup all DOM element states for a component
 * Mirrors cleanupEffects() pattern
 */
export function cleanupDomElementStates(context: ComponentContext): void {
  for (const domState of context.domElementStates.values()) {
    domState.destroy();
  }
  context.domElementStates.clear();
}
```

**Why elegant:**
- **Mirrors cleanupEffects**: Same naming, same pattern, same purpose
- **Called from same place**: Wherever cleanupEffects is called
- **Same iteration pattern**: Uses `.values()` iterator
- **Prevents memory leaks**: Disconnects all observers properly

---

### Step 6: Export from Index

**Location:** `src/client-runtime/src/index.ts:306`

**Add to exports:**
```typescript
// Core hooks
export { useState, useEffect, useRef, useDomElementState } from './hooks';
export { cleanupDomElementStates } from './hooks';

// Types
export type { DomElementState, DomElementStateOptions, DomElementStateValues } from './dom-element-state';
```

**Why elegant:**
- Groups with other hooks
- Exports cleanup for advanced users
- Exports types for TypeScript users
- Single import point

---

### Step 7: Update HintQueue (No Changes Needed!)

**Location:** `src/client-runtime/src/hint-queue.ts`

**Analysis:**
```typescript
// Current matchHint() implementation:
private stateMatches(predicted: Record<string, any>, actual: Record<string, any>): boolean {
  for (const [key, predictedValue] of Object.entries(predicted)) {
    if (!(key in actual)) return false;

    // This already handles nested objects via JSON.stringify!
    if (JSON.stringify(actual[key]) !== JSON.stringify(predictedValue)) {
      return false;
    }
  }
  return true;
}
```

**Why elegant:**
- **Zero changes needed**: Already supports nested object comparison
- **Works for both**: `{state_0: 5}` and `{domElementState_0: {isIntersecting: true}}`
- **Same matching logic**: Generic state comparison works for all state types
- **Proof of good design**: HintQueue was built generically, pays off now

---

### Step 8: Update Types

**Location:** `src/client-runtime/src/types.ts`

**Add to ComponentMetadata:**
```typescript
export interface ComponentMetadata {
  componentId: string;
  connectionId?: string;
  element: HTMLElement;
  clientState: ComponentState;
  serverState: ComponentState;
  domElementStates?: Map<string, any>;  // ADD THIS (optional for backward compat)
}
```

**Why elegant:**
- Optional field (backward compatible)
- Matches naming convention
- Documented in metadata
- Type-safe

---

## Testing the Integration

### Test 1: Basic Intersection Observer

```typescript
const section = useDomElementState();

return (
  <div ref={section}>
    {section.isIntersecting && <p>I'm visible!</p>}
  </div>
);
```

**Expected behavior:**
1. Server predicts intersection change
2. Sends hint with patches via SignalR
3. Client caches patches in HintQueue
4. User scrolls element into view
5. IntersectionObserver fires
6. `onChange()` called → checks hint queue
7. 🟢 CACHE HIT → patches applied instantly
8. PlaygroundBridge shows green notification

### Test 2: Children Count Mutation

```typescript
const container = useDomElementState();

return (
  <div ref={container}>
    {container.childrenCount > 3 && <button>Collapse</button>}
    <ChildComponents />
  </div>
);
```

**Expected behavior:**
1. Server predicts children count change
2. Child component added
3. MutationObserver fires
4. 🟢 CACHE HIT → button appears instantly

### Test 3: Collection Statistics

```typescript
const prices = useDomElementState('.price');

return (
  <div>
    <div className="price" data-value="29.99">$29.99</div>
    <div className="price" data-value="45.00">$45.00</div>

    {prices.vals.avg() > 30 && <span>Premium Range</span>}
  </div>
);
```

**Expected behavior:**
1. Server predicts avg() threshold cross
2. Price added/removed
3. Statistical recomputation triggers
4. 🟢 CACHE HIT → badge appears instantly

---

## Why This Integration Is Elegant

### 1. **Follows Existing Patterns**
- Same hook structure as `useState`, `useEffect`, `useRef`
- Same context storage strategy
- Same index tracking mechanism
- Same cleanup pattern

### 2. **Reuses Infrastructure**
- HintQueue works without modifications
- DOMPatcher works without modifications
- PlaygroundBridge works without modifications
- SignalR flow unchanged

### 3. **Symmetrical Design**
```typescript
// Regular state
const [count, setCount] = useState(0);
setCount(1); → Check HintQueue → Apply patches

// DOM state
const box = useDomElementState();
box.onChange(); → Check HintQueue → Apply patches
```

Same flow, different trigger source.

### 4. **Type Safety**
- Full TypeScript support
- IntelliSense for all properties
- Type inference works
- Same as built-in hooks

### 5. **Performance**
- Lazy observer creation
- Automatic cleanup
- Debounced updates
- Minimal overhead

### 6. **Developer Experience**
- Familiar API (React-like)
- Consistent error messages
- Same debugging tools
- Same console output format

### 7. **Backward Compatible**
- No breaking changes
- Existing code unaffected
- Optional feature
- Progressive enhancement

---

## Implementation Checklist

- [ ] Step 1: Extend ComponentContext with `domElementStates` map
- [ ] Step 2: Add `domElementStateIndex` tracking
- [ ] Step 3: Create `dom-element-state.ts` with DomElementState class
- [ ] Step 4: Implement `useDomElementState()` hook in hooks.ts
- [ ] Step 5: Add `cleanupDomElementStates()` function
- [ ] Step 6: Export from index.ts
- [ ] Step 7: Verify HintQueue compatibility (no changes needed)
- [ ] Step 8: Update types.ts
- [ ] Step 9: Write unit tests
- [ ] Step 10: Update documentation

**Estimated time:** 2-3 days for core implementation + 1 day for tests + 1 day for docs = **4-5 days total**

---

## Next Steps After Client Runtime

Once client runtime is complete, extend to server-side:

1. **C# DomElementStateHook class** (mirrors client DomElementState)
2. **SignalR hub integration** (NotifyDomStateChange method)
3. **Prediction generation** (predict intersection/mutation changes)
4. **Babel transformation** (TSX → C# compilation)

But those follow the same elegant integration pattern - mirror what exists, reuse infrastructure.

---

## Conclusion

The integration is elegant because:
- **It doesn't fight the system** - works with existing patterns
- **It doesn't reinvent** - reuses HintQueue, DOMPatcher, PlaygroundBridge
- **It's symmetrical** - DOM state feels identical to regular state
- **It's minimal** - ~500 lines of new code, zero breaking changes

The cactus doesn't just store water. It stores patterns. 🌵
