# Preact Internals - Microtask Queue and Batching

## Overview

One of Preact's key performance optimizations is **batching updates** using JavaScript's microtask queue. This prevents unnecessary re-renders when multiple state changes happen in quick succession.

## The Problem Without Batching

Consider this code:

```javascript
handleClick() {
  this.setState({ count: 1 });  // Would trigger render
  this.setState({ count: 2 });  // Would trigger render
  this.setState({ count: 3 });  // Would trigger render
  // Component would render 3 times!
}
```

Without batching, each `setState` would immediately trigger a re-render, causing:
- 3 render calls
- 3 DOM updates
- Wasted computation (first 2 renders are discarded)
- Poor performance

## Preact's Solution: Microtask Batching

Preact batches all state updates that happen in the same synchronous execution context into a **single render**.

### How It Works

From `src/component.js`, lines 187-255:

```javascript
// Global state
let rerenderQueue = [];        // Components needing re-render
let rerenderCount = 0;         // Number of active render processes
let prevDebounce = undefined;  // Previous debounce function

function enqueueRender(c) {
  if (
    (!(c._bits & COMPONENT_DIRTY) &&    // Component not already queued
      (c._bits |= COMPONENT_DIRTY) &&    // Mark as dirty
      rerenderQueue.push(c) &&           // Add to queue
      !rerenderCount++) ||                // Increment count (was 0?)
    prevDebounce != options.debounceRendering  // Debounce changed
  ) {
    prevDebounce = options.debounceRendering;
    (prevDebounce || queueMicrotask)(process);  // Schedule process()
  }
}
```

**Key Logic Breakdown:**

```javascript
!(c._bits & COMPONENT_DIRTY)  // Not already dirty?
  && (c._bits |= COMPONENT_DIRTY)  // Mark as dirty (returns true)
  && rerenderQueue.push(c)  // Add to queue (returns new length > 0)
  && !rerenderCount++  // Increment, check if was 0 (returns true only first time)
```

This clever boolean chain ensures:
1. If component already dirty → do nothing (already in queue)
2. Mark component as dirty
3. Add to queue
4. If this is the **first** component queued (rerenderCount was 0) → schedule microtask
5. Subsequent components just get added to queue without scheduling another microtask

## JavaScript Event Loop and Microtasks

To understand this, we need to understand the event loop:

```
┌─────────────────────────────────────────┐
│         Call Stack (Sync Code)          │
│   ┌─────────────────────────────────┐   │
│   │ handleClick()                   │   │
│   │  └─ setState() x 3              │   │
│   │     └─ enqueueRender() x 3     │   │
│   └─────────────────────────────────┘   │
└──────────────┬──────────────────────────┘
               │ Stack empties
               ▼
┌─────────────────────────────────────────┐
│         Microtask Queue                  │
│   ┌─────────────────────────────────┐   │
│   │ process() - queued once         │   │
│   └─────────────────────────────────┘   │
└──────────────┬──────────────────────────┘
               │ All microtasks run
               ▼
┌─────────────────────────────────────────┐
│         Task Queue (macrotasks)          │
│   (setTimeout, setInterval, etc.)        │
└─────────────────────────────────────────┘
```

### Event Loop Phases

1. **Execute current task** (script, event handler, etc.)
2. **Execute all microtasks** (until queue empty)
3. **Render** (browser paint)
4. **Next macrotask** (setTimeout, etc.)

**Key Point:** Microtasks run **before** the browser paints, but **after** the current synchronous code finishes.

## Example: Multiple setState Calls

```javascript
class Counter extends Component {
  state = { count: 0 };

  handleClick = () => {
    console.log('1. Start click handler');

    this.setState({ count: 1 });
    console.log('2. After setState(1), count:', this.state.count);

    this.setState({ count: 2 });
    console.log('3. After setState(2), count:', this.state.count);

    this.setState({ count: 3 });
    console.log('4. After setState(3), count:', this.state.count);

    console.log('5. End click handler');
  };

  componentDidUpdate() {
    console.log('6. componentDidUpdate, count:', this.state.count);
  }

  render() {
    console.log('7. Render, count:', this.state.count);
    return <div>{this.state.count}</div>;
  }
}
```

**Output:**
```
1. Start click handler
2. After setState(1), count: 0
3. After setState(2), count: 0
4. After setState(3), count: 0
5. End click handler
7. Render, count: 3
6. componentDidUpdate, count: 3
```

**What Happened:**

1. **Sync Phase** (Call Stack):
   - Click handler runs
   - `setState(1)` → enqueueRender → **schedules microtask** (first time)
   - `setState(2)` → enqueueRender → just adds to queue
   - `setState(3)` → enqueueRender → just adds to queue
   - Handler completes, state still shows 0 (not updated yet)

2. **Microtask Phase**:
   - `process()` runs
   - Component re-renders once with final state (count: 3)
   - `componentDidUpdate` called

3. **Browser Paint**:
   - DOM updated with count: 3

## The process() Function

From `src/component.js`, lines 229-255:

```javascript
function process() {
  let c,
    l = 1;

  // Keep rerenderCount non-zero to prevent scheduling another process()
  // while this one is running
  while (rerenderQueue.length) {
    // Sort queue by depth if multiple components queued
    if (rerenderQueue.length > l) {
      rerenderQueue.sort(depthSort);
    }

    c = rerenderQueue.shift();  // Get next component
    l = rerenderQueue.length;   // Track length for sorting check

    if (c._bits & COMPONENT_DIRTY) {
      renderComponent(c);  // Re-render the component
    }
  }

  // Queue empty, reset counter to allow new microtasks to be scheduled
  rerenderCount = 0;
}
```

### Why the While Loop?

Components can add **more components** to the queue during rendering:

```javascript
class Parent extends Component {
  render() {
    // During Parent render, Child might call setState
    return <Child />;
  }
}

class Child extends Component {
  componentDidMount() {
    this.setState({ foo: 'bar' });  // Adds to queue during process()
  }
  render() {
    return <div>{this.state.foo}</div>;
  }
}
```

The `while` loop keeps processing until the queue is empty.

### Depth Sorting

From line 242-244:

```javascript
if (rerenderQueue.length > l) {
  rerenderQueue.sort(depthSort);
}

const depthSort = (a, b) => a._vnode._depth - b._vnode._depth;
```

**Why sort by depth?**

```
Parent (depth 0)
  └─ Child (depth 1)
      └─ GrandChild (depth 2)
```

If both Parent and Child need re-render, Parent must render first:

```
Wrong order:
  1. Child renders with old props
  2. Parent renders, passes new props to Child
  3. Child renders again with new props
  ❌ Child rendered twice!

Right order (by depth):
  1. Parent renders, passes new props to Child
  2. Child renders once with new props
  ✓ Child rendered once!
```

**Optimization:** Only sort if new components were added during processing (`rerenderQueue.length > l`).

## State Merging in setState

From `src/component.js`, lines 34-61:

```javascript
BaseComponent.prototype.setState = function(update, callback) {
  let s;

  // Reuse existing _nextState or clone current state
  if (this._nextState != null && this._nextState != this.state) {
    s = this._nextState;
  } else {
    s = this._nextState = assign({}, this.state);
  }

  // Handle function updater
  if (typeof update == 'function') {
    update = update(assign({}, s), this.props);
  }

  // Merge update into _nextState
  if (update) {
    assign(s, update);
  } else {
    return;  // No update, bail out
  }

  // Enqueue render if component is mounted
  if (this._vnode) {
    if (callback) {
      this._stateCallbacks.push(callback);
    }
    enqueueRender(this);
  }
};
```

**How Multiple setStates Merge:**

```javascript
// Initial: state = { count: 0, text: 'Hello' }

this.setState({ count: 1 });
// _nextState = { count: 1, text: 'Hello' }

this.setState({ count: 2 });
// _nextState = { count: 2, text: 'Hello' } (overwrites count)

this.setState({ text: 'World' });
// _nextState = { count: 2, text: 'World' } (merges text)

// After render: state = { count: 2, text: 'World' }
```

All updates merge into `_nextState`, which becomes `state` during render.

## Function Updates

```javascript
this.setState(prevState => ({ count: prevState.count + 1 }));
this.setState(prevState => ({ count: prevState.count + 1 }));
this.setState(prevState => ({ count: prevState.count + 1 }));
// Result: count increments by 3
```

**Important:** Function receives `_nextState`, not `this.state`:

```javascript
if (typeof update == 'function') {
  update = update(assign({}, s), this.props);  // s is _nextState
}
```

This ensures sequential updates see previous updates:

```javascript
// Initial: count = 0

setState(s => ({ count: s.count + 1 }));  // s.count = 0, sets to 1
setState(s => ({ count: s.count + 1 }));  // s.count = 1, sets to 2
setState(s => ({ count: s.count + 1 }));  // s.count = 2, sets to 3
// Final: count = 3 ✓
```

## The rerenderCount Semaphore

The `rerenderCount` variable acts as a **semaphore** to prevent scheduling multiple `process()` calls:

```javascript
let rerenderCount = 0;

// First setState
enqueueRender(c1);
// rerenderCount: 0 → 1, schedules process()

// Second setState (while process() hasn't run yet)
enqueueRender(c2);
// rerenderCount: 1 → 2, doesn't schedule (already scheduled)

// process() runs
process() {
  // renders c1
  // renders c2
  rerenderCount = 0;  // Reset at end
}
```

This prevents:
```
❌ Multiple microtasks doing the same work
✓ Single microtask processes all queued components
```

## Custom Debouncing

Preact allows custom debounce via `options.debounceRendering`:

```javascript
import { options } from 'preact';

// Use setTimeout instead of microtask
options.debounceRendering = fn => setTimeout(fn, 0);

// Use requestAnimationFrame
options.debounceRendering = requestAnimationFrame;

// Use custom scheduler
options.debounceRendering = myScheduler.schedule;
```

From `enqueueRender` (line 217-218):

```javascript
prevDebounce = options.debounceRendering;
(prevDebounce || queueMicrotask)(process);
```

If `options.debounceRendering` is set, use it. Otherwise, use `queueMicrotask`.

**When the debounce changes** (line 215):
```javascript
prevDebounce != options.debounceRendering
```

A new `process()` is scheduled even if one is already queued. This allows switching schedulers mid-execution.

## Microtask vs setTimeout

### queueMicrotask (default)

```javascript
console.log('1');
queueMicrotask(() => console.log('2'));
console.log('3');
// Output: 1, 3, 2
```

**Timing:** Runs **before** next task, **before** paint

### setTimeout (alternative)

```javascript
console.log('1');
setTimeout(() => console.log('2'), 0);
console.log('3');
// Output: 1, 3, 2 (but with delay)
```

**Timing:** Runs as next **macrotask**, after current task and microtasks

**Why microtask is better:**
```
User clicks button
  └─ setState x 3 (sync)
      └─ Microtask scheduled
          └─ Stack empties
              └─ Microtask runs (single render)
                  └─ Browser paints (user sees update)

vs.

User clicks button
  └─ setState x 3 (sync)
      └─ setTimeout scheduled
          └─ Stack empties
              └─ Browser paints (old state) ❌
                  └─ setTimeout runs (single render)
                      └─ Browser paints again (new state)
```

Microtasks update **before** first paint, preventing visual flicker.

## Edge Cases

### 1. Infinite Loop Prevention

Components can't queue indefinitely:

```javascript
class BadComponent extends Component {
  componentDidUpdate() {
    this.setState({ count: this.state.count + 1 });  // Infinite loop!
  }
}
```

Protection is in the render loop (for function components, `src/diff/index.js:256-265`):

```javascript
let count = 0;
do {
  c._bits &= ~COMPONENT_DIRTY;
  tmp = c.render(c.props, c.state, c.context);
  c.state = c._nextState;
} while (c._bits & COMPONENT_DIRTY && ++count < 25);
```

After 25 renders in one process cycle, it stops.

### 2. Unmounted Components

```javascript
BaseComponent.prototype.setState = function(update, callback) {
  // ...
  if (this._vnode) {  // Only queue if mounted
    if (callback) {
      this._stateCallbacks.push(callback);
    }
    enqueueRender(this);
  }
};
```

If component unmounts before microtask runs, `_vnode` is null, so `enqueueRender` isn't called.

### 3. Nested setState in render

```javascript
render() {
  if (this.state.count < 5) {
    this.setState({ count: this.state.count + 1 });
  }
  return <div>{this.state.count}</div>;
}
```

The `do-while` loop handles this (up to 25 times).

## Performance Impact

### Without Batching

```
setState() → render → diff → DOM update (1ms)
setState() → render → diff → DOM update (1ms)
setState() → render → diff → DOM update (1ms)
Total: 3ms + 3 paints
```

### With Batching

```
setState() → enqueue
setState() → enqueue
setState() → enqueue
  (all sync, ~0.001ms each)

Microtask → process → render → diff → DOM update (1ms)
Total: 1ms + 1 paint
```

**Savings:** 3x faster, 2 fewer paints

## Summary

**Microtask Queue System:**
1. `setState()` marks component dirty and adds to `rerenderQueue`
2. First dirty component schedules `process()` as microtask
3. Subsequent dirty components just add to queue (don't schedule again)
4. When call stack empties, microtask runs
5. `process()` renders all queued components (sorted by depth)
6. Components can add more components during render (while loop handles it)
7. After queue empty, `rerenderCount` resets

**Key Benefits:**
- Multiple state updates → single render
- Runs before browser paint (no flicker)
- Preserves order with depth sorting
- Prevents redundant scheduling with `rerenderCount` semaphore
- Allows custom schedulers via `options.debounceRendering`

**Why It Matters:**
- Massive performance improvement for frequent state changes
- Predictable, asynchronous update behavior
- Prevents wasted renders
- Batches updates automatically without developer intervention

This is one of the most important optimizations in Preact, making it feel fast and responsive even with many state updates.
