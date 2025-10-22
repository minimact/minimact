# Understanding the Microtask Queue

## What is a Microtask?

A **microtask** is a short function that is executed after the currently executing script finishes, but **before** the browser does anything else (like rendering or handling other events).

Think of it as a "high priority callback" that runs immediately after the current code, but still asynchronously.

## JavaScript's Event Loop

JavaScript is single-threaded, meaning it can only do one thing at a time. The **event loop** is the mechanism that manages when different pieces of code run.

### The Full Picture

```
┌───────────────────────────────────────────────────┐
│                 Call Stack                        │
│  (Currently executing synchronous code)           │
│                                                   │
│  function handleClick() {                        │
│    console.log('A');                             │
│    Promise.resolve().then(() => console.log('B'));│
│    console.log('C');                             │
│  }                                               │
└───────────────────┬───────────────────────────────┘
                    │ Finishes
                    ▼
┌───────────────────────────────────────────────────┐
│           Microtask Queue                         │
│  (High priority - runs before anything else)      │
│                                                   │
│  [() => console.log('B')]  ← Promise callback    │
│  [() => process()]         ← queueMicrotask       │
│  [MutationObserver cb]     ← DOM mutations        │
└───────────────────┬───────────────────────────────┘
                    │ All microtasks complete
                    ▼
┌───────────────────────────────────────────────────┐
│              Render / Paint                       │
│  (Browser updates the screen)                     │
└───────────────────┬───────────────────────────────┘
                    │
                    ▼
┌───────────────────────────────────────────────────┐
│           Task Queue (Macrotasks)                 │
│  (Lower priority - runs one at a time)            │
│                                                   │
│  [setTimeout callback]                            │
│  [setInterval callback]                           │
│  [I/O callback]                                   │
│  [User interaction event]                         │
└───────────────────────────────────────────────────┘
```

## The Event Loop Cycle

The event loop follows this sequence:

```
1. Execute current task from call stack (run to completion)
   ↓
2. Execute ALL microtasks (until queue is empty)
   ↓
3. Render (browser paints if needed)
   ↓
4. Get next macrotask
   ↓
5. Back to step 1
```

**Key Rule:** Microtasks run to completion before anything else happens.

## What Creates Microtasks?

### 1. Promises

Every `.then()`, `.catch()`, `.finally()` callback:

```javascript
console.log('1');

Promise.resolve().then(() => {
  console.log('2');
});

console.log('3');

// Output: 1, 3, 2
```

**Why?**
- Line 1: Sync, prints immediately
- Promise callback: Queued as microtask
- Line 3: Sync, prints immediately
- Call stack empty → microtask runs → prints 2

### 2. queueMicrotask()

Direct API to queue a microtask:

```javascript
console.log('1');

queueMicrotask(() => {
  console.log('2');
});

console.log('3');

// Output: 1, 3, 2
```

**This is what Preact uses!**

### 3. MutationObserver

Observes DOM changes, callbacks run as microtasks:

```javascript
const observer = new MutationObserver(() => {
  console.log('DOM changed');
});

observer.observe(document.body, { childList: true });

console.log('1');
document.body.appendChild(document.createElement('div'));
console.log('2');

// Output: 1, 2, "DOM changed"
```

### 4. async/await

Under the hood, `await` uses promises (microtasks):

```javascript
async function example() {
  console.log('1');
  await Promise.resolve();
  console.log('3');  // Runs as microtask
}

console.log('0');
example();
console.log('2');

// Output: 0, 1, 2, 3
```

## Microtasks vs Macrotasks

### Macrotasks (Tasks)

Created by:
- `setTimeout()` / `setInterval()`
- I/O operations
- UI events (click, scroll, etc.)
- `setImmediate()` (Node.js)

```javascript
console.log('1');

setTimeout(() => {
  console.log('2');
}, 0);

console.log('3');

// Output: 1, 3, 2
```

But there's a delay! Even with `setTimeout(..., 0)`.

### Key Differences

| Feature | Microtasks | Macrotasks |
|---------|-----------|-----------|
| **Priority** | High - run immediately after current code | Low - run one per loop iteration |
| **When** | Before next task, before render | After microtasks, after render |
| **Batch** | All microtasks run together | One task per loop |
| **Examples** | Promise, queueMicrotask | setTimeout, events |
| **Rendering** | Blocks render until done | Render can happen between tasks |

## Example: The Difference

```javascript
console.log('Script start');

setTimeout(() => {
  console.log('setTimeout');
}, 0);

Promise.resolve().then(() => {
  console.log('Promise 1');
}).then(() => {
  console.log('Promise 2');
});

queueMicrotask(() => {
  console.log('Microtask');
});

console.log('Script end');
```

**Output:**
```
Script start
Script end
Promise 1
Microtask
Promise 2
setTimeout
```

**Step by step:**

1. **Synchronous phase:**
   - "Script start"
   - setTimeout → queued as **macrotask**
   - Promise.then → queued as **microtask**
   - queueMicrotask → queued as **microtask**
   - "Script end"

2. **Call stack empty → Microtask phase:**
   - "Promise 1" (creates another microtask)
   - "Microtask"
   - "Promise 2" (from chained .then)

3. **All microtasks done → Render (if needed)**

4. **Next macrotask:**
   - "setTimeout"

## Nested Microtasks

Microtasks can queue more microtasks:

```javascript
console.log('Start');

queueMicrotask(() => {
  console.log('Micro 1');

  queueMicrotask(() => {
    console.log('Micro 2');

    queueMicrotask(() => {
      console.log('Micro 3');
    });
  });
});

console.log('End');

// Output: Start, End, Micro 1, Micro 2, Micro 3
```

**All microtasks run before moving on!** The event loop keeps processing the microtask queue until it's empty.

## The Infinite Microtask Problem

⚠️ **Warning:** Microtasks can block the browser!

```javascript
function scheduleForever() {
  queueMicrotask(() => {
    console.log('Running...');
    scheduleForever();  // Queues another microtask
  });
}

scheduleForever();
// Browser freezes! Can never render or handle events.
```

Because microtasks run to completion, this creates an infinite loop that never yields control back to the browser.

**Macrotasks don't have this problem:**

```javascript
function scheduleForever() {
  setTimeout(() => {
    console.log('Running...');
    scheduleForever();
  }, 0);
}

scheduleForever();
// Browser still responsive! Renders between each setTimeout.
```

## Why Microtasks for Batching?

Preact uses microtasks for batching updates. Here's why:

### Scenario: Multiple setState calls

```javascript
handleClick() {
  this.setState({ count: 1 });
  this.setState({ count: 2 });
  this.setState({ count: 3 });
}
```

### With Microtasks (Preact's approach):

```
1. setState(1) → enqueue component, schedule microtask
2. setState(2) → enqueue component (microtask already scheduled)
3. setState(3) → enqueue component (microtask already scheduled)
4. Click handler finishes
5. Microtask runs → renders once with count: 3
6. Browser paints with final state
```

**User sees:** One paint with count: 3 ✅

### With Macrotasks (setTimeout):

```
1. setState(1) → enqueue component, schedule setTimeout
2. setState(2) → enqueue component
3. setState(3) → enqueue component
4. Click handler finishes
5. Browser paints with old state (count: 0) ❌
6. setTimeout runs → renders with count: 3
7. Browser paints again with new state
```

**User sees:** Flicker from 0 → 3 ❌

### With Synchronous Updates:

```
1. setState(1) → renders immediately → DOM update
2. setState(2) → renders immediately → DOM update
3. setState(3) → renders immediately → DOM update
4. Browser paints 3 times
```

**Performance:** 3x slower ❌

## Browser Rendering and Microtasks

The browser only renders **between tasks**, not during microtask execution:

```javascript
// Example 1: Microtask (no intermediate render)
div.textContent = 'Loading...';
Promise.resolve().then(() => {
  div.textContent = 'Done!';
});
// User never sees "Loading..." (microtask runs before render)
```

```javascript
// Example 2: Macrotask (intermediate render)
div.textContent = 'Loading...';
setTimeout(() => {
  div.textContent = 'Done!';
}, 0);
// User sees "Loading..." briefly, then "Done!"
```

This is **exactly** what makes microtasks perfect for batching:
- All updates happen before the user sees anything
- Single paint with final state
- No flicker

## Visual Timeline

```
Time ────────────────────────────────────────────────────►

┌─────────────┐
│ Click Event │ (Macrotask starts)
└──────┬──────┘
       │
       ├─ setState(1) ─ Mark dirty, schedule microtask
       ├─ setState(2) ─ Mark dirty (microtask already scheduled)
       ├─ setState(3) ─ Mark dirty (microtask already scheduled)
       │
       └─ Handler ends (Call stack empty)
              │
              ├─ Microtask Queue Processes:
              │    └─ process() renders component once
              │
              └─ Render Phase:
                   └─ Browser paints DOM

┌─────────────┐
│  User sees  │
│   update    │
└─────────────┘
```

## How Preact Uses It

From Preact's source (`src/component.js:218`):

```javascript
(prevDebounce || queueMicrotask)(process);
```

When the first component calls `setState()`:
1. Marks itself dirty
2. Adds itself to `rerenderQueue`
3. Calls `queueMicrotask(process)`
4. Returns immediately

When the second, third, etc. components call `setState()`:
1. Marks themselves dirty
2. Add themselves to `rerenderQueue`
3. **Don't** schedule another microtask (one is already scheduled)
4. Return immediately

When the current code finishes:
1. Microtask queue processes
2. `process()` function runs
3. Renders all dirty components
4. Browser paints once

## Browser Support

`queueMicrotask()` is modern (2019), but has a polyfill:

```javascript
if (typeof queueMicrotask !== 'function') {
  queueMicrotask = function(callback) {
    Promise.resolve().then(callback);
  };
}
```

Promises are universally supported, so this works everywhere.

## Testing Microtask Behavior

You can test this yourself:

```javascript
console.log('1: Sync start');

setTimeout(() => console.log('5: Macrotask'), 0);

queueMicrotask(() => console.log('3: Microtask'));

Promise.resolve().then(() => console.log('4: Promise'));

console.log('2: Sync end');

// Guaranteed order:
// 1: Sync start
// 2: Sync end
// 3: Microtask
// 4: Promise
// 5: Macrotask
```

## Key Takeaways

1. **Microtasks** = high priority async callbacks that run before the browser does anything else
2. **Run after** current synchronous code completes
3. **Run before** browser rendering
4. **Run before** macrotasks (setTimeout, events)
5. **All microtasks** in the queue run together (not one at a time like macrotasks)
6. Created by: `Promise`, `queueMicrotask()`, `MutationObserver`, `async/await`
7. **Perfect for batching** because they run before paint but after sync code
8. **Can block browser** if you create infinite microtasks

## Why It Matters for Preact

Preact's entire batching system relies on microtasks:

- Multiple state updates → Single microtask → Single render → Single paint
- Fast performance
- No flicker
- Predictable async behavior
- All automatic, no developer intervention needed

Without microtasks, Preact would either:
- Render synchronously (slow, blocks UI)
- Use setTimeout (causes flicker)
- Require manual batching (bad DX)

Microtasks are the secret sauce that makes reactive UIs fast and smooth.
