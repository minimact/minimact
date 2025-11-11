# useEffect Architecture in Minimact

## Overview

Minimact implements `useEffect` with a **dual-execution model**: effects run on both client and server, but with different purposes and behaviors.

## Client-Side Execution (client-runtime)

The client-runtime's `useEffect` implementation (`src/client-runtime/src/hooks.ts`) handles all effect execution with proper dependency tracking.

### Dependency Tracking Behavior

#### 1. **Empty Dependency Array `[]`** - Run Once on Mount

```typescript
useEffect(() => {
  console.log('Component mounted!');
  // Runs only once when component first renders
}, []); // Empty array = mount only
```

**Client Behavior:**
- Effect runs on first render only
- Never runs again, even if component re-renders
- Cleanup (if returned) runs when component unmounts

**Implementation:**
```typescript
if (!context.effects[index]) {
  // First run - execute immediately
  queueMicrotask(() => {
    const cleanup = callback();
    if (typeof cleanup === 'function') {
      context.effects[index].cleanup = cleanup;
    }
  });
} else {
  // Subsequent runs - deps is [], so depsChanged is always false
  // Effect never runs again
}
```

#### 2. **Specific Dependencies `[state1, state2]`** - Run on Dependency Changes

```typescript
const [count, setCount] = useState(0);
const [name, setName] = useState('Alice');

useEffect(() => {
  console.log(`Count changed to: ${count}`);
  // Runs when 'count' changes, but NOT when 'name' changes
}, [count]); // Only watches 'count'
```

**Client Behavior:**
- Effect runs on first render
- Runs again whenever ANY dependency value changes
- Cleanup (if exists) runs before re-running effect
- Uses shallow comparison (`!==`) to detect changes

**Implementation:**
```typescript
const depsChanged = !deps || !effect.deps ||
  deps.length !== effect.deps.length ||
  deps.some((dep, i) => dep !== effect.deps![i]); // Shallow compare

if (depsChanged) {
  // Run cleanup from previous effect
  if (effect.cleanup) {
    effect.cleanup();
  }

  // Update stored deps
  effect.deps = deps;

  // Run new effect
  queueMicrotask(() => {
    const cleanup = callback();
    if (typeof cleanup === 'function') {
      effect.cleanup = cleanup;
    }
  });
}
```

#### 3. **No Dependencies (undefined)** - Run on Every Render

```typescript
useEffect(() => {
  console.log('Component rendered!');
  // Runs after EVERY render
}); // No second argument = run every time
```

**Client Behavior:**
- Effect runs after every render
- Cleanup (if exists) runs before each re-run
- Most expensive option - use sparingly

**Implementation:**
```typescript
const depsChanged = !deps || !effect.deps ||
  deps.length !== effect.deps.length ||
  deps.some((dep, i) => dep !== effect.deps![i]);

// When deps is undefined:
// !deps evaluates to true
// depsChanged is always true
// Effect runs every time
```

### Effect Execution Timing

All effects are executed via `queueMicrotask()`, which means:
- Effects run **after** the render completes
- Effects run **before** the browser paints
- Effects run in the order they were declared

```typescript
queueMicrotask(() => {
  const cleanup = callback();
  if (typeof cleanup === 'function') {
    context.effects[index].cleanup = cleanup;
  }
});
```

### Cleanup Functions

Effects can return a cleanup function that runs:
1. Before the effect re-runs (when deps change)
2. When the component unmounts

```typescript
useEffect(() => {
  const timer = setInterval(() => {
    console.log('Tick');
  }, 1000);

  // Cleanup function
  return () => {
    clearInterval(timer);
    console.log('Timer cleaned up');
  };
}, []); // Cleanup runs when component unmounts
```

## Server-Side Execution (C# MinimactComponent)

The server generates C# effect methods with attributes that indicate when they should execute:

### Babel Plugin Transpilation

```tsx
// TSX Input
useEffect(() => {
  console.log('Active example:', activeExample);
}, [activeExample]);
```

```csharp
// C# Output
[OnStateChanged("activeExample")]
private void Effect_0()
{
    Console.WriteLine($"Active example: {activeExample}");
}
```

### Server-Side Attributes

#### `[OnStateChanged("stateKey")]` - Specific Dependencies

Generated when effect has specific state dependencies.

```csharp
[OnStateChanged("activeExample")]
private void Effect_0()
{
    if (new MObject(activeExample))
    {
        Console.WriteLine($"Opened example: {activeExample}");
    }
}
```

**Purpose:**
- **Server-side logging/debugging** - Track when state changes
- **Prediction hint generation** - Server knows this effect depends on `activeExample`
- **Template preparation** - Pre-compute patches for state changes

**NOT executed automatically** - Server-side effects are primarily for documentation and hint generation. The client-runtime handles actual effect execution.

#### `[OnMounted]` - Empty Dependencies

Generated when effect has empty dependency array `[]`.

```csharp
[OnMounted]
private void Effect_1()
{
    SetState(nameof(viewCount), viewCount + 1);
    Console.WriteLine("Index page mounted");
}
```

**Purpose:**
- Indicates this effect should run once on mount
- Server can use this for initial data fetching
- Helps with server-side rendering optimizations

#### No Attribute - No Dependencies

Generated when effect has no dependency array.

```csharp
private void Effect_3()
{
    timerRef = DateTimeOffset.Now.ToUnixTimeMilliseconds();
}
```

**Purpose:**
- Runs on every render
- Used for side effects that need to track all state changes
- Often used with refs

## Complete Example

### TSX Code

```tsx
import { useState, useEffect, useRef } from '@minimact/core';

export function Timer() {
  const [count, setCount] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<number>(0);

  // Effect 1: Mount only - log when component first renders
  useEffect(() => {
    console.log('Timer component mounted');
  }, []);

  // Effect 2: Watch isRunning - start/stop timer
  useEffect(() => {
    if (isRunning) {
      console.log('Starting timer');
      intervalRef.current = setInterval(() => {
        setCount(c => c + 1);
      }, 1000);
    } else {
      console.log('Stopping timer');
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    // Cleanup: clear interval when isRunning changes or unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning]);

  // Effect 3: Every render - update timestamp ref
  useEffect(() => {
    intervalRef.current = Date.now();
  });

  return (
    <div>
      <h1>Count: {count}</h1>
      <button onClick={() => setIsRunning(!isRunning)}>
        {isRunning ? 'Stop' : 'Start'}
      </button>
    </div>
  );
}
```

### Generated C# Code

```csharp
[Component]
public partial class Timer : MinimactComponent
{
    [State]
    private int count = 0;

    [State]
    private bool isRunning = false;

    [Ref]
    private object intervalRef = 0;

    protected override VNode Render()
    {
        StateManager.SyncMembersToState(this);
        // ... VNode tree ...
    }

    // Effect 1: Empty deps [] → [OnMounted]
    [OnMounted]
    private void Effect_0()
    {
        Console.WriteLine("Timer component mounted");
    }

    // Effect 2: Specific deps [isRunning] → [OnStateChanged]
    [OnStateChanged("isRunning")]
    private void Effect_1()
    {
        if (isRunning)
        {
            Console.WriteLine("Starting timer");
            // Note: setInterval/clearInterval are client-side only
            // Server just logs for debugging
        }
        else
        {
            Console.WriteLine("Stopping timer");
        }
    }

    // Effect 3: No deps → No attribute (runs every render)
    private void Effect_2()
    {
        intervalRef = DateTimeOffset.Now.ToUnixTimeMilliseconds();
    }
}
```

### Client-Runtime Execution Flow

1. **Initial Render:**
   ```
   Component mounts
   ├─ Effect_0 runs (mounted)       ✅ [OnMounted]
   ├─ Effect_1 runs (isRunning = false) ✅ [OnStateChanged("isRunning")]
   └─ Effect_2 runs (every render)   ✅ No attribute
   ```

2. **User clicks "Start" button:**
   ```
   setState(isRunning, true)
   ├─ Template system updates DOM instantly (predictive)
   ├─ Client checks deps:
   │  ├─ Effect_0: deps=[] → no change, skip ❌
   │  ├─ Effect_1: deps=[isRunning] → CHANGED ✅
   │  │  ├─ Run cleanup (clearInterval)
   │  │  └─ Run new effect (setInterval)
   │  └─ Effect_2: no deps → always run ✅
   └─ Sync state to server
   ```

3. **Timer ticks (setCount called):**
   ```
   setState(count, count + 1)
   ├─ Template system updates DOM instantly
   ├─ Client checks deps:
   │  ├─ Effect_0: deps=[] → no change, skip ❌
   │  ├─ Effect_1: deps=[isRunning] → no change, skip ❌
   │  └─ Effect_2: no deps → always run ✅
   └─ Sync state to server
   ```

4. **Component unmounts:**
   ```
   Cleanup phase
   ├─ Effect_0: no cleanup ❌
   ├─ Effect_1: cleanup runs (clearInterval) ✅
   └─ Effect_2: no cleanup ❌
   ```

## Key Principles

### 1. **Client-Side is Source of Truth for Effects**

The client-runtime `useEffect` implementation handles:
- ✅ Dependency tracking and comparison
- ✅ Effect execution timing
- ✅ Cleanup function management
- ✅ All DOM manipulation
- ✅ Browser APIs (timers, fetch, etc.)

### 2. **Server-Side is for Logging & Hints**

The C# effect methods are used for:
- ✅ Server-side logging/debugging
- ✅ Prediction hint generation
- ✅ Template pre-computation
- ✅ Documentation of effect dependencies
- ❌ NOT for executing client-side effects

### 3. **Dependency Arrays Control Execution**

```typescript
// ❌ BAD: Missing deps - runs every render (expensive!)
useEffect(() => {
  document.title = `Count: ${count}`;
});

// ✅ GOOD: Specific deps - runs only when count changes
useEffect(() => {
  document.title = `Count: ${count}`;
}, [count]);

// ✅ GOOD: Empty deps - runs once on mount
useEffect(() => {
  console.log('Mounted!');
}, []);
```

### 4. **Cleanup Functions Prevent Leaks**

```typescript
// ❌ BAD: Timer keeps running after unmount
useEffect(() => {
  setInterval(() => setCount(c => c + 1), 1000);
}, []);

// ✅ GOOD: Cleanup clears timer
useEffect(() => {
  const timer = setInterval(() => setCount(c => c + 1), 1000);
  return () => clearInterval(timer);
}, []);
```

## Common Patterns

### Data Fetching on Mount

```typescript
useEffect(() => {
  async function fetchData() {
    const response = await fetch('/api/data');
    const data = await response.json();
    setData(data);
  }
  fetchData();
}, []); // Empty deps - fetch once on mount
```

### Sync with External System

```typescript
useEffect(() => {
  const subscription = eventEmitter.subscribe((data) => {
    setState(data);
  });

  return () => {
    subscription.unsubscribe();
  };
}, []); // Setup/teardown on mount/unmount
```

### Responding to State Changes

```typescript
useEffect(() => {
  if (userId) {
    loadUserProfile(userId);
  }
}, [userId]); // Re-fetch when userId changes
```

### Every Render Side Effects

```typescript
useEffect(() => {
  // Update analytics on every render
  analytics.trackRender(componentId);
}); // No deps - runs every time
```

## Performance Considerations

1. **Use specific dependencies** - Avoid running effects unnecessarily
2. **Use empty deps `[]` for mount-only** - One-time setup
3. **Avoid no-deps effects** - They run on every render (expensive)
4. **Always provide cleanup** - Prevent memory leaks
5. **Keep effects focused** - One effect per concern

## Summary

| Deps | Client Behavior | Server Attribute | Use Case |
|------|----------------|------------------|----------|
| `[]` | Once on mount | `[OnMounted]` | Initial setup, data fetching |
| `[state]` | When state changes | `[OnStateChanged("state")]` | Sync with external systems |
| `undefined` | Every render | None | Refs, analytics (use sparingly) |

The client-runtime handles all effect execution with proper dependency tracking, while the server-side attributes are used for logging, debugging, and hint generation.
