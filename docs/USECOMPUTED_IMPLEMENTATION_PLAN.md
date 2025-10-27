# useComputed Implementation Plan

## Overview

Implement `useComputed` hook to replace the hallucinated `useClientState` hook. This hook enables client-side computation using browser-only APIs and libraries (lodash, moment, crypto, etc.) with results synced to the server for rendering.

---

## Goals

1. ✅ **Replace `useClientState`** with a conceptually sound alternative
2. ✅ **Enable browser-only computations** (lodash, moment, geolocation, crypto)
3. ✅ **Sync computed values to server** for server-side rendering
4. ✅ **Support memoization** to avoid redundant computations
5. ✅ **Integrate with existing infrastructure** (SignalR, UpdateClientComputedState)

---

## API Design

### Basic Usage

```tsx
import { useComputed } from 'minimact';

const sortedUsers = useComputed('sortedUsers', () => {
  return _.sortBy(users, 'name');
}, [users]);
```

### With Memoization and Expiry

```tsx
// Without memoization (recomputes every time deps change)
const result1 = useComputed('result', () => {
  return compute(data);
}, [data]);

// With memoization (caches until deps change)
const result2 = useComputed('result', () => {
  return compute(data);
}, [data], {
  memoize: true
});

// With memoization + expiry (cache expires after 5 seconds)
const result3 = useComputed('result', () => {
  return compute(data);
}, [data], {
  memoize: true,
  expiry: 5000  // Cache for 5 seconds, then recompute
});

// With debouncing (wait 300ms before syncing to server)
const result4 = useComputed('result', () => {
  return compute(data);
}, [data], {
  debounce: 300
});
```

### Signature

```typescript
function useComputed<T>(
  key: string,
  computeFn: () => T,
  deps?: any[],
  options?: UseComputedOptions
): T

interface UseComputedOptions {
  memoize?: boolean;      // Enable memoization (default: false)
  expiry?: number;        // Cache expiry in ms (e.g., 5000 = 5 seconds)
  debounce?: number;      // Debounce sync to server (ms)
  throttle?: number;      // Throttle sync to server (ms)
  initialValue?: T;       // Initial value before first computation
}
```

---

## Implementation Steps

### Phase 1: Client-Side Hook (TypeScript)

**File:** `src/client-runtime/src/useComputed.ts`

#### 1.1 Basic Hook Structure

```typescript
import { useState, useEffect, useRef } from './hooks';
import { SignalRManager } from './signalr-manager';

export interface UseComputedOptions<T = any> {
  memoize?: boolean;      // Enable memoization (default: false)
  expiry?: number;        // Cache expiry in ms
  debounce?: number;      // Debounce sync to server (ms)
  throttle?: number;      // Throttle sync to server (ms)
  initialValue?: T;       // Initial value
}

interface ComputedCache<T> {
  value: T;
  timestamp: number;
  deps: any[];
}

let currentContext: ComponentContext | null = null;
let computedIndex = 0;

export function setComputedContext(context: ComponentContext): void {
  currentContext = context;
  computedIndex = 0;
}

export function useComputed<T>(
  key: string,
  computeFn: () => T,
  deps: any[] = [],
  options: UseComputedOptions<T> = {}
): T {
  if (!currentContext) {
    throw new Error('useComputed must be called within a component render');
  }

  const {
    memoize = false,
    expiry,
    debounce,
    throttle,
    initialValue
  } = options;

  const context = currentContext;
  const index = computedIndex++;
  const computedKey = `computed_${index}_${key}`;

  // Store computed value in state
  const [value, setValue] = useState<T>(
    initialValue !== undefined ? initialValue : null as T
  );

  // Cache for memoization
  const cache = useRef<ComputedCache<T> | null>(null);

  useEffect(() => {
    // Check if we should use cached value
    if (memoize && cache.current) {
      // Check deps
      const depsChanged = deps.length !== cache.current.deps.length ||
        deps.some((dep, i) => !Object.is(dep, cache.current!.deps[i]));

      if (!depsChanged) {
        // Check expiry
        if (expiry) {
          const age = Date.now() - cache.current.timestamp;
          if (age < expiry) {
            // Cache is still valid, use cached value
            return;
          }
          // Cache expired, continue to recompute
        } else {
          // No expiry, use cached value indefinitely
          return;
        }
      }
    }

    // Compute new value
    const computed = computeFn();

    // Update cache if memoization enabled
    if (memoize) {
      cache.current = {
        value: computed,
        timestamp: Date.now(),
        deps: [...deps]
      };
    }

    // Update local state
    setValue(computed);

    // Sync to server
    const syncToServer = () => {
      context.signalR.invoke('UpdateClientComputedState', {
        componentId: context.componentId,
        values: { [key]: computed }
      }).catch(err => {
        console.error(`[Minimact] Failed to sync computed state '${key}':`, err);
      });
    };

    // Apply debounce/throttle if specified
    if (debounce) {
      const timer = setTimeout(syncToServer, debounce);
      return () => clearTimeout(timer);
    } else if (throttle) {
      // Implement throttle logic
      // TODO: Add throttle implementation
      syncToServer();
    } else {
      syncToServer();
    }
  }, deps);

  return value;
}
```

#### 1.2 Integration with ComponentContext

**File:** `src/client-runtime/src/hooks.ts`

Add to ComponentContext interface:
```typescript
interface ComponentContext {
  // ... existing fields
  computedValues?: Map<string, any>; // For useComputed integration
}
```

Update setComponentContext:
```typescript
export function setComponentContext(context: ComponentContext): void {
  currentContext = context;
  stateIndex = 0;
  effectIndex = 0;
  refIndex = 0;
  serverTaskIndex = 0;

  // Reset computed index
  setComputedContext(context);
}
```

#### 1.3 Export from index.ts

**File:** `src/client-runtime/src/index.ts`

```typescript
export { useComputed } from './useComputed';
export type { UseComputedOptions } from './useComputed';
```

---

### Phase 2: Server-Side Support (C#)

**Already exists!** The server-side infrastructure is already in place:

#### 2.1 MinimactHub.cs (Already Implemented)

```csharp
public async Task UpdateClientComputedState(string componentId, Dictionary<string, object> computedValues)
{
    var component = _registry.GetComponent(componentId);
    if (component == null)
    {
        await Clients.Caller.SendAsync("Error", $"Component {componentId} not found");
        return;
    }

    try
    {
        // Update the component's ClientState dictionary
        component.UpdateClientState(computedValues);

        // Trigger a re-render with the new client-computed values
        component.TriggerRender();
    }
    catch (Exception ex)
    {
        await Clients.Caller.SendAsync("Error", $"Error updating client-computed state: {ex.Message}");
    }
}
```

#### 2.2 MinimactComponent.cs (Already Implemented)

```csharp
protected T GetClientState<T>(string key, T defaultValue = default!)
{
    return ClientState.TryGetValue(key, out var value)
        ? (T)value
        : defaultValue;
}

public void UpdateClientState(Dictionary<string, object> updates)
{
    foreach (var kvp in updates)
    {
        ClientState[kvp.Key] = kvp.Value;
    }
}
```

✅ **No server-side changes needed!**

---

### Phase 3: Memoization Enhancements

#### 3.1 Add useMemo Hook (Optional)

If you want a separate `useMemo` hook for simpler cases:

**File:** `src/client-runtime/src/hooks.ts`

```typescript
export function useMemo<T>(
  factory: () => T,
  deps: any[] | undefined
): T {
  const ref = useRef<{ deps: any[] | undefined, value: T } | null>(null);

  // Check if deps changed
  const depsChanged = !ref.current ||
    !deps ||
    !ref.current.deps ||
    deps.length !== ref.current.deps.length ||
    deps.some((dep, i) => !Object.is(dep, ref.current!.deps![i]));

  if (depsChanged) {
    ref.current = {
      deps,
      value: factory()
    };
  }

  return ref.current.value;
}
```

Then `useComputed` can leverage `useMemo` internally:

```typescript
export function useComputed<T>(
  key: string,
  computeFn: () => T,
  deps: any[] = [],
  options: UseComputedOptions<T> = {}
): T {
  // ... existing setup

  // Use useMemo for memoization
  const computed = useMemo(() => {
    return computeFn();
  }, options.memoize ? deps : undefined);

  useEffect(() => {
    // Sync to server
    // ... existing sync logic
  }, [computed]);

  return computed;
}
```

#### 3.2 Debounce/Throttle Utilities

**File:** `src/client-runtime/src/utils/timing.ts`

```typescript
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: number | undefined;

  return function(...args: Parameters<T>) {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let lastCall = 0;

  return function(...args: Parameters<T>) {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      fn(...args);
    }
  };
}
```

Use in `useComputed`:
```typescript
import { debounce, throttle } from './utils/timing';

// In useComputed
const syncToServer = () => {
  context.signalR.invoke('UpdateClientComputedState', {
    componentId: context.componentId,
    values: { [key]: computed }
  });
};

const debouncedSync = debounce ? debounce(syncToServer, debounce) : syncToServer;
const throttledSync = throttle ? throttle(debouncedSync, throttle) : debouncedSync;

useEffect(() => {
  throttledSync();
}, [computed]);
```

---

### Phase 4: Documentation

#### 4.1 API Reference

**File:** `docs-mvp/v1.0/api/hooks.md`

Add section:

```markdown
### useComputed

Compute values on the client using browser-only APIs or external libraries, then sync to the server for rendering.

**Signature:**
```tsx
function useComputed<T>(
  key: string,
  computeFn: () => T,
  deps?: any[],
  options?: UseComputedOptions<T>
): T

interface UseComputedOptions<T> {
  memoize?: boolean;      // Auto-memoize (default: true)
  debounce?: number;      // Debounce sync (ms)
  throttle?: number;      // Throttle sync (ms)
  initialValue?: T;       // Initial value
}
```

**Parameters:**
- `key` - Unique identifier for server-side access
- `computeFn` - Function that computes the value (runs on client)
- `deps` - Dependency array (like useEffect)
- `options` - Configuration options

**Returns:** The computed value

**Example - External Library (Lodash):**
```tsx
import _ from 'lodash';
import { useComputed } from 'minimact';

function UserList({ users }) {
  const sortedUsers = useComputed('sortedUsers', () => {
    return _.sortBy(users, 'name');
  }, [users]);

  return (
    <ul>
      {sortedUsers.map(user => (
        <li key={user.id}>{user.name}</li>
      ))}
    </ul>
  );
}
```

**Example - Browser API (Geolocation):**
```tsx
function LocationTracker() {
  const location = useComputed('userLocation', () => {
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition((pos) => {
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        });
      });
    });
  }, []);

  return <div>Location: {location?.lat}, {location?.lng}</div>;
}
```

**Example - With Memoization:**
```tsx
const expensiveResult = useComputed('result', () => {
  console.log('Computing...'); // Only logs when deps change
  return heavyCalculation(data);
}, [data], {
  memoize: true  // default
});
```

**Example - With Debouncing:**
```tsx
const searchResults = useComputed('searchResults', () => {
  return performSearch(query);
}, [query], {
  debounce: 300  // Wait 300ms before syncing to server
});
```

**Server-Side Access:**
```csharp
public class UserListComponent : MinimactComponent
{
    protected override VNode Render()
    {
        // Access client-computed value
        var sortedUsers = GetClientState<List<User>>("sortedUsers", new List<User>());

        return new VElement("ul", null,
            sortedUsers.Select(u => new VElement("li", null, new VText(u.Name)))
        );
    }
}
```

**When to Use:**
- External libraries only available in browser (lodash, moment)
- Browser APIs (geolocation, crypto, localStorage)
- Heavy computations better done on client
- Values that need server-side rendering

**When NOT to Use:**
- Server-side computations (use C# directly)
- State that doesn't need to be rendered (use useState)
- Ephemeral UI state (just use local variables)
```

#### 4.2 Examples Guide

**File:** `docs-mvp/v1.0/examples/use-computed.md`

Create comprehensive examples document.

#### 4.3 Migration Guide

**File:** `docs-mvp/v1.0/guide/migration/use-client-state-to-use-computed.md`

Guide for migrating from old `useClientState` documentation.

---

### Phase 5: Testing

#### 5.1 Unit Tests

**File:** `src/client-runtime/tests/useComputed.test.ts`

```typescript
import { describe, it, expect, vi } from 'vitest';
import { useComputed } from '../src/useComputed';

describe('useComputed', () => {
  it('should compute value on mount', () => {
    const computeFn = vi.fn(() => 42);
    const result = useComputed('test', computeFn, []);
    expect(result).toBe(42);
    expect(computeFn).toHaveBeenCalledTimes(1);
  });

  it('should memoize based on deps', () => {
    const computeFn = vi.fn(() => 42);
    const result1 = useComputed('test', computeFn, [1]);
    const result2 = useComputed('test', computeFn, [1]); // Same deps
    expect(computeFn).toHaveBeenCalledTimes(1); // Only called once
  });

  it('should recompute when deps change', () => {
    const computeFn = vi.fn((x) => x * 2);
    const result1 = useComputed('test', () => computeFn(5), [5]);
    const result2 = useComputed('test', () => computeFn(10), [10]);
    expect(computeFn).toHaveBeenCalledTimes(2);
  });

  it('should sync to server', async () => {
    const mockSignalR = {
      invoke: vi.fn().mockResolvedValue(undefined)
    };

    // Test sync call
    // ... setup context with mock SignalR

    useComputed('test', () => 42, []);

    expect(mockSignalR.invoke).toHaveBeenCalledWith(
      'UpdateClientComputedState',
      expect.objectContaining({
        values: { test: 42 }
      })
    );
  });

  it('should debounce sync', async () => {
    vi.useFakeTimers();
    const mockSignalR = { invoke: vi.fn() };

    useComputed('test', () => 42, [], { debounce: 300 });

    expect(mockSignalR.invoke).not.toHaveBeenCalled();

    vi.advanceTimersByTime(300);

    expect(mockSignalR.invoke).toHaveBeenCalled();
    vi.useRealTimers();
  });
});
```

#### 5.2 Integration Tests

**File:** `tests/integration/useComputed.test.tsx`

Test full client-server round-trip.

---

### Phase 6: Examples

#### 6.1 Lodash Example

**File:** `examples/components/SortedUserList.tsx`

```tsx
import _ from 'lodash';
import { useComputed } from 'minimact';

export function SortedUserList({ users, sortBy }) {
  const sortedUsers = useComputed('sortedUsers', () => {
    return _.sortBy(users, sortBy);
  }, [users, sortBy]);

  return (
    <ul>
      {sortedUsers.map(user => (
        <li key={user.id}>{user.name}</li>
      ))}
    </ul>
  );
}
```

#### 6.2 Geolocation Example

**File:** `examples/components/LocationTracker.tsx`

```tsx
import { useComputed } from 'minimact';

export function LocationTracker() {
  const location = useComputed('location', async () => {
    const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject);
    });
    return {
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      accuracy: pos.coords.accuracy
    };
  }, []);

  if (!location) {
    return <div>Loading location...</div>;
  }

  return (
    <div>
      <p>Latitude: {location.lat}</p>
      <p>Longitude: {location.lng}</p>
      <p>Accuracy: {location.accuracy}m</p>
    </div>
  );
}
```

#### 6.3 Moment.js Example

**File:** `examples/components/FormattedDate.tsx`

```tsx
import moment from 'moment';
import { useComputed } from 'minimact';

export function FormattedDate({ date, format = 'LLLL' }) {
  const formatted = useComputed('formattedDate', () => {
    return moment(date).format(format);
  }, [date, format]);

  return <span>{formatted}</span>;
}
```

---

## Implementation Checklist

### Client-Side
- [ ] Create `src/client-runtime/src/useComputed.ts`
- [ ] Add `computedValues` to ComponentContext
- [ ] Export from `src/client-runtime/src/index.ts`
- [ ] Implement memoization logic
- [ ] Implement debounce/throttle utilities
- [ ] Add TypeScript types
- [ ] Write unit tests

### Server-Side
- [ ] ✅ Verify `UpdateClientComputedState` exists in MinimactHub.cs
- [ ] ✅ Verify `GetClientState<T>` exists in MinimactComponent.cs
- [ ] ✅ Verify `UpdateClientState` exists in MinimactComponent.cs
- [ ] Test round-trip communication

### Documentation
- [ ] Add API reference to `hooks.md`
- [ ] Create examples document
- [ ] Update getting-started guide
- [ ] Create migration guide from `useClientState`
- [ ] Remove all `useClientState` references
- [ ] Update `features_complete.md`

### Testing
- [ ] Unit tests for memoization
- [ ] Unit tests for debounce/throttle
- [ ] Integration tests for client-server sync
- [ ] Example apps using lodash
- [ ] Example apps using browser APIs

### Examples
- [ ] Lodash sorting example
- [ ] Geolocation example
- [ ] Moment.js formatting example
- [ ] Crypto hashing example
- [ ] localStorage integration example

---

## Timeline Estimate

**Phase 1 (Client Hook):** 2-3 hours
- Basic hook structure
- Integration with ComponentContext
- Exports

**Phase 2 (Server Support):** 0 hours (already done!)

**Phase 3 (Memoization):** 2-3 hours
- useMemo implementation
- Debounce/throttle utilities
- Testing memoization logic

**Phase 4 (Documentation):** 3-4 hours
- API reference
- Examples document
- Migration guide
- Remove old references

**Phase 5 (Testing):** 3-4 hours
- Unit tests
- Integration tests
- Edge case testing

**Phase 6 (Examples):** 2-3 hours
- Multiple example components
- Different use cases

**Total Estimate:** 12-17 hours

---

## Success Criteria

1. ✅ `useComputed` hook works with browser-only libraries (lodash, moment)
2. ✅ Computed values sync to server via `UpdateClientComputedState`
3. ✅ Server can access values via `GetClientState<T>(key)`
4. ✅ Memoization prevents redundant computations
5. ✅ Debounce/throttle work correctly
6. ✅ All tests pass
7. ✅ Documentation is comprehensive
8. ✅ Examples demonstrate real use cases
9. ✅ All `useClientState` references removed
10. ✅ Zero breaking changes to existing code

---

## Migration Path

### For Documentation

1. Find all `useClientState` references
2. Replace with `useComputed`
3. Update examples to show actual use cases
4. Remove confusing examples (e.g., `{isHovered && <Tooltip />}`)

### For Users (Future)

If `useClientState` was ever documented publicly:

```tsx
// Old (doesn't work)
const [query, setQuery] = useClientState('');

// New (works correctly)
const searchResults = useComputed('searchResults', () => {
  return performSearch(query);
}, [query]);
```

---

## Future Enhancements

### Phase 7 (Optional): Advanced Features

1. **Computed State Invalidation**
   ```tsx
   const { value, invalidate } = useComputed('data', fetchData, []);
   // Later: invalidate() to force recomputation
   ```

2. **Async Computed Values**
   ```tsx
   const data = useComputed('data', async () => {
     return await fetch('/api/data').then(r => r.json());
   }, [], { async: true });
   ```

3. **Computed Value Dependencies**
   ```tsx
   const a = useComputed('a', () => computeA(), []);
   const b = useComputed('b', () => computeB(a), [a]); // Depends on 'a'
   ```

4. **Server-Side Computation Fallback**
   ```tsx
   useComputed('value', () => {
     if (typeof window === 'undefined') {
       throw new Error('Client-only');
     }
     return clientComputation();
   }, [], {
     serverFallback: () => serverComputation()
   });
   ```

---

## Questions to Resolve

1. **Should async computations be supported?**
   - Pro: Enables fetch, geolocation, etc.
   - Con: Adds complexity (loading states, error handling)
   - Decision: Support via Promise return type

2. **Should there be a separate `useMemo` hook?**
   - Pro: Matches React API, simpler for pure memoization
   - Con: More API surface
   - Decision: Yes, implement both

3. **Should debounce/throttle be built-in or separate utilities?**
   - Decision: Built into `useComputed` options for convenience

4. **Should computations run on every render or only when deps change?**
   - Decision: Only when deps change (standard React behavior)

---

## Breaking Changes

**None!** This is a new feature that replaces a non-existent one.

---

## Rollout Plan

1. **Week 1:** Implement core hook + basic tests
2. **Week 2:** Add memoization + debounce/throttle
3. **Week 3:** Write documentation + examples
4. **Week 4:** Integration testing + polish
5. **Week 5:** Remove all `useClientState` references
6. **Week 6:** Public release

---

## Open Questions

1. Should `useComputed` values be cached server-side across requests?
2. Should there be a max cache size to prevent memory leaks?
3. Should computed values expire after a certain time?
4. How should errors in `computeFn` be handled?

---

**Ready to implement!** 🚀
