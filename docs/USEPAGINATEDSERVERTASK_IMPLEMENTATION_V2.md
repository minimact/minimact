# usePaginatedServerTask - Practical Implementation Plan v2

**Status**: Ready to implement
**Target**: Leverage existing `useServerTask` infrastructure
**Timeline**: 2-3 weeks (building on proven foundation)

---

## Executive Summary

Instead of building pagination from scratch, we'll **extend the existing `useServerTask` implementation** to add pagination capabilities. This approach:

✅ Reuses 90% of existing code (transpilers, FFI bridge, task runtime)
✅ Maintains consistency with `useServerTask` API
✅ Reduces implementation time from 6 weeks → 2-3 weeks
✅ Proves the architecture's extensibility

**Core Insight**: Pagination is just a specialized server task with state management!

---

## Architecture: Building on useServerTask

### Current Foundation (Already Complete)

```typescript
// ✅ This already works:
const task = useServerTask(async (numbers: number[]) => {
  return numbers.map(x => x * x).reduce((a, b) => a + b, 0);
}, { runtime: 'rust' });

task.start([1, 2, 3, 4, 5]);
// ✅ TypeScript → Rust/C# transpilation: DONE
// ✅ Task lifecycle management: DONE
// ✅ Progress reporting: DONE
// ✅ Error handling: DONE
// ✅ SignalR communication: DONE
```

### New Extension (What We'll Add)

```typescript
// 🆕 This is what we're building:
const users = usePaginatedServerTask(async ({ page, pageSize, filters }) => {
  return await db.users
    .where(u => filters.role ? u.role === filters.role : true)
    .skip((page - 1) * pageSize)
    .take(pageSize)
    .toList();
}, {
  pageSize: 20,
  getTotalCount: async (filters) => {
    return await db.users
      .where(u => filters.role ? u.role === filters.role : true)
      .count();
  },
  prefetchNext: true,
  dependencies: [filters]
});

// 🆕 Extended API:
users.items      // Current page items
users.next()     // Navigate to next page
users.prev()     // Navigate to previous page
users.goto(5)    // Jump to page 5
users.refresh()  // Invalidate cache, re-fetch
```

**Key Decision**: `usePaginatedServerTask` is syntactic sugar over `useServerTask` + client-side state management!

---

## Implementation Strategy

### Phase 1: Wrapper Pattern (Week 1)

**Goal**: Build `usePaginatedServerTask` as a **wrapper** around `useServerTask`

**Implementation**:

```typescript
// src/client-runtime/src/hooks/usePaginatedServerTask.ts

import { useServerTask } from './useServerTask';
import { useState, useEffect, useRef } from 'react';

export interface PaginatedServerTaskOptions<T, TFilter> {
  pageSize?: number;
  getTotalCount: (filters: TFilter) => Promise<number>;
  prefetchNext?: boolean;
  prefetchPrev?: boolean;
  dependencies?: any[];
  runtime?: 'csharp' | 'rust';  // ✅ Inherit from useServerTask!
}

export function usePaginatedServerTask<T, TFilter = any>(
  fetchFn: (params: { page: number; pageSize: number; filters: TFilter }) => Promise<T[]>,
  options: PaginatedServerTaskOptions<T, TFilter>
) {
  const pageSize = options.pageSize || 20;

  // State
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Prefetch cache
  const prefetchCache = useRef<Map<number, T[]>>(new Map());

  // ✅ Reuse useServerTask for fetch logic!
  const fetchTask = useServerTask(
    async (fetchParams: { page: number; pageSize: number; filters: TFilter }) => {
      return await fetchFn(fetchParams);
    },
    { runtime: options.runtime }  // ✅ Inherit runtime choice!
  );

  // ✅ Reuse useServerTask for count query!
  const countTask = useServerTask(
    async (filters: TFilter) => {
      return await options.getTotalCount(filters);
    },
    { runtime: options.runtime }
  );

  // Build current filters from dependencies
  const filters = buildFilters(options.dependencies);

  // Fetch page
  const fetchPage = async (targetPage: number, fromCache = true) => {
    // Check prefetch cache
    if (fromCache && prefetchCache.current.has(targetPage)) {
      const cached = prefetchCache.current.get(targetPage)!;
      setItems(cached);
      setPage(targetPage);
      prefetchCache.current.delete(targetPage);

      // Trigger next prefetch
      if (options.prefetchNext) {
        prefetchInBackground(targetPage + 1);
      }
      return;
    }

    // Fetch from server via useServerTask
    const result = await fetchTask.start({
      page: targetPage,
      pageSize,
      filters
    });

    // ✅ All error handling, progress, etc. comes from useServerTask!
    if (fetchTask.status === 'complete') {
      setItems(result as T[]);
      setPage(targetPage);
      setError(null);

      // Prefetch next if configured
      if (options.prefetchNext && targetPage < totalPages) {
        prefetchInBackground(targetPage + 1);
      }
    } else if (fetchTask.status === 'error') {
      setError(fetchTask.error);
    }
  };

  // Prefetch in background
  const prefetchInBackground = async (targetPage: number) => {
    if (prefetchCache.current.has(targetPage)) return;

    const result = await fetchTask.start({
      page: targetPage,
      pageSize,
      filters
    });

    if (fetchTask.status === 'complete') {
      prefetchCache.current.set(targetPage, result as T[]);
      console.log(`[usePaginatedServerTask] Prefetched page ${targetPage}`);
    }
  };

  // Get total count
  useEffect(() => {
    countTask.start(filters).then(() => {
      if (countTask.status === 'complete') {
        setTotal(countTask.result as number);
      }
    });
  }, [JSON.stringify(filters)]);

  // Initial fetch
  useEffect(() => {
    fetchPage(1);
  }, []);

  // Re-fetch when dependencies change
  useEffect(() => {
    if (options.dependencies && options.dependencies.length > 0) {
      prefetchCache.current.clear();
      fetchPage(1, false);
    }
  }, [JSON.stringify(filters)]);

  // Computed
  const totalPages = Math.ceil(total / pageSize);
  const hasNext = page < totalPages;
  const hasPrev = page > 1;

  // Navigation
  const next = () => hasNext && fetchPage(page + 1);
  const prev = () => hasPrev && fetchPage(page - 1);
  const goto = (targetPage: number) => {
    if (targetPage >= 1 && targetPage <= totalPages) {
      fetchPage(targetPage);
    }
  };
  const refresh = () => {
    prefetchCache.current.clear();
    fetchPage(page, false);
  };

  return {
    // Data
    items,
    total,
    totalPages,

    // State
    page,
    pageSize,
    pending: fetchTask.status === 'running',
    error: error || fetchTask.error,

    // Navigation
    hasNext,
    hasPrev,
    next,
    prev,
    goto,
    refresh,

    // ✅ Expose underlying tasks for advanced use
    _fetchTask: fetchTask,
    _countTask: countTask
  };
}

// Helper: Build filters object from dependencies array
function buildFilters(dependencies?: any[]): any {
  if (!dependencies || dependencies.length === 0) {
    return {};
  }

  // If single object, use as-is
  if (dependencies.length === 1 && typeof dependencies[0] === 'object') {
    return dependencies[0];
  }

  // Otherwise, create indexed object
  return dependencies.reduce((acc, dep, i) => {
    acc[`dep${i}`] = dep;
    return acc;
  }, {});
}
```

**Benefits of Wrapper Approach**:
✅ Reuses ALL existing `useServerTask` infrastructure
✅ Automatic TypeScript → C#/Rust transpilation (already works!)
✅ Progress reporting (already works!)
✅ Error handling (already works!)
✅ Runtime selection (C# or Rust) for FREE!
✅ Only ~150 lines of new code

---

### Phase 2: Babel Plugin Extension (Week 2)

**Goal**: Make Babel recognize `usePaginatedServerTask` and optimize it

**Current Babel Flow** (already working):
```typescript
useServerTask(async (x) => x * 2, { runtime: 'rust' })
// ↓ Babel detects, transpiles, generates Rust
```

**New Babel Flow** (what we'll add):
```typescript
usePaginatedServerTask(async ({ page, pageSize, filters }) => {
  return await db.users.skip(...).take(...).toList();
}, {
  getTotalCount: async (filters) => await db.users.count()
})
// ↓ Babel detects TWO server tasks:
//   1. Fetch task (with page params)
//   2. Count task
// ↓ Generates TWO methods in C#/Rust
```

**Implementation**:

```javascript
// src/babel-plugin-minimact/src/extractors/hooks.cjs

function extractHook(path, component) {
  const hookName = path.node.callee.name;

  switch (hookName) {
    case 'useState':
      extractUseState(path, component);
      break;
    case 'useServerTask':
      extractUseServerTask(path, component);
      break;
    // 🆕 Add this:
    case 'usePaginatedServerTask':
      extractUsePaginatedServerTask(path, component);
      break;
  }
}

// 🆕 New extractor
function extractUsePaginatedServerTask(path, component) {
  const [fetchFn, options] = path.node.arguments;

  // Extract fetch function as a server task
  const fetchTaskInfo = {
    name: 'paginatedFetch',
    asyncFunction: fetchFn,
    parameters: [
      { name: 'page', type: 'number' },
      { name: 'pageSize', type: 'number' },
      { name: 'filters', type: 'object' }
    ],
    runtime: getOptionValue(options, 'runtime') || 'csharp',
    returnType: inferReturnType(fetchFn)
  };

  component.useServerTask.push(fetchTaskInfo);

  // Extract getTotalCount function as a separate server task
  const getTotalCountFn = getOptionValue(options, 'getTotalCount');
  if (getTotalCountFn) {
    const countTaskInfo = {
      name: 'paginatedCount',
      asyncFunction: getTotalCountFn,
      parameters: [
        { name: 'filters', type: 'object' }
      ],
      runtime: getOptionValue(options, 'runtime') || 'csharp',
      returnType: 'number'
    };

    component.useServerTask.push(countTaskInfo);
  }

  // Store pagination metadata
  component.paginatedTasks = component.paginatedTasks || [];
  component.paginatedTasks.push({
    fetchTaskId: fetchTaskInfo.name,
    countTaskId: countTaskInfo.name,
    pageSize: getOptionValue(options, 'pageSize') || 20,
    prefetchNext: getOptionValue(options, 'prefetchNext') || false
  });
}
```

**What This Gives Us**:
✅ `usePaginatedServerTask` generates **TWO** `useServerTask` calls internally
✅ Both get transpiled to C#/Rust automatically
✅ Both inherit runtime selection
✅ Both get FFI bridge, progress reporting, error handling for FREE!

**Generated C# Example**:

```csharp
// Auto-generated from usePaginatedServerTask

[ServerTask("paginatedFetch")]
private async Task<List<User>> PaginatedFetch(int page, int pageSize, object filters)
{
    var filterObj = JsonSerializer.Deserialize<FilterDto>(filters.ToString());

    return await _db.Users
        .Where(u => filterObj.Role != null ? u.Role == filterObj.Role : true)
        .Skip((page - 1) * pageSize)
        .Take(pageSize)
        .ToListAsync();
}

[ServerTask("paginatedCount")]
private async Task<int> PaginatedCount(object filters)
{
    var filterObj = JsonSerializer.Deserialize<FilterDto>(filters.ToString());

    return await _db.Users
        .Where(u => filterObj.Role != null ? u.Role == filterObj.Role : true)
        .CountAsync();
}
```

---

### Phase 3: Prefetch Optimization (Week 3)

**Goal**: Intelligent prefetching with minimal server load

**Strategy 1: Hover-Based Prefetch**

```typescript
// In usePaginatedServerTask return object:
const getPrefetchHandlers = () => ({
  onNextHover: () => {
    if (hasNext && !prefetchCache.current.has(page + 1)) {
      prefetchInBackground(page + 1);
    }
  },
  onPrevHover: () => {
    if (hasPrev && !prefetchCache.current.has(page - 1)) {
      prefetchInBackground(page - 1);
    }
  }
});

// Usage:
<button
  onClick={users.next}
  onMouseEnter={users.getPrefetchHandlers().onNextHover}
>
  Next
</button>
```

**Strategy 2: Idle-Time Prefetch**

```typescript
// In usePaginatedServerTask:
useEffect(() => {
  if ('requestIdleCallback' in window) {
    const id = requestIdleCallback(() => {
      if (hasNext && !prefetchCache.current.has(page + 1)) {
        prefetchInBackground(page + 1);
      }
    });

    return () => cancelIdleCallback(id);
  }
}, [page, hasNext]);
```

**Strategy 3: Predictive Prefetch (Using Minimact Predictor)**

```typescript
// Leverage existing template prediction system!
// If user has pattern: Page 1 → Page 2 → Page 3
// Predictor learns and pre-fetches Page 3 when on Page 2
const predictedNextPages = context.hintQueue.getPredictedPages(page);
predictedNextPages.forEach(p => prefetchInBackground(p));
```

**Cache Management**:

```typescript
// In usePaginatedServerTask:
const MAX_CACHE_SIZE = 10; // Only cache 10 pages
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const addToCache = (page: number, items: T[]) => {
  // Evict oldest if cache full
  if (prefetchCache.current.size >= MAX_CACHE_SIZE) {
    const oldestKey = prefetchCache.current.keys().next().value;
    prefetchCache.current.delete(oldestKey);
  }

  prefetchCache.current.set(page, items);

  // Auto-expire after TTL
  setTimeout(() => {
    prefetchCache.current.delete(page);
  }, CACHE_TTL);
};
```

---

## Implementation Checklist

### Week 1: Core Wrapper
- [ ] Create `src/client-runtime/src/hooks/usePaginatedServerTask.ts`
- [ ] Implement wrapper around `useServerTask`
- [ ] Add state management (page, items, total, etc.)
- [ ] Implement navigation methods (next, prev, goto, refresh)
- [ ] Add basic prefetch cache
- [ ] Test: Simple user list pagination works
- [ ] Test: Navigation works (next/prev/goto)
- [ ] Test: Loading states display correctly
- [ ] Export from `src/client-runtime/src/index.ts`

### Week 2: Babel Integration
- [ ] Add `extractUsePaginatedServerTask` to `hooks.cjs`
- [ ] Detect fetch function, generate server task
- [ ] Detect getTotalCount function, generate server task
- [ ] Store pagination metadata
- [ ] Test: Babel generates correct C# code
- [ ] Test: Both tasks transpile correctly
- [ ] Test: Runtime selection works (C# and Rust)
- [ ] Update component generator to handle pagination metadata

### Week 3: Prefetch & Polish
- [ ] Implement hover-based prefetch
- [ ] Implement idle-time prefetch
- [ ] Add cache size limit (LRU eviction)
- [ ] Add cache TTL (auto-expire)
- [ ] Implement dependency tracking (re-fetch on filter change)
- [ ] Add integration with Minimact predictor (learn navigation patterns)
- [ ] Test: Prefetch hit rate >80%
- [ ] Test: Cache doesn't grow unbounded
- [ ] Test: Dependencies trigger re-fetch
- [ ] Performance benchmark: <5ms for cache hits

### Documentation
- [ ] API reference for `usePaginatedServerTask`
- [ ] Migration guide from traditional pagination
- [ ] Examples (basic, with filters, with Rust runtime)
- [ ] Performance tuning guide
- [ ] Add to main Minimact README

---

## Example Usage

### Basic Pagination

```typescript
import { usePaginatedServerTask } from 'minimact/client-runtime';

function UserList() {
  const users = usePaginatedServerTask(
    async ({ page, pageSize }) => {
      return await db.users
        .orderBy(u => u.name)
        .skip((page - 1) * pageSize)
        .take(pageSize)
        .toList();
    },
    {
      pageSize: 20,
      getTotalCount: async () => await db.users.count(),
      prefetchNext: true
    }
  );

  return (
    <div>
      <h1>Users</h1>

      {users.pending && <p>Loading...</p>}
      {users.error && <p>Error: {users.error}</p>}

      <ul>
        {users.items.map(user => (
          <li key={user.id}>{user.name}</li>
        ))}
      </ul>

      <div>
        <button onClick={users.prev} disabled={!users.hasPrev}>
          Previous
        </button>
        <span>Page {users.page} of {users.totalPages}</span>
        <button onClick={users.next} disabled={!users.hasNext}>
          Next
        </button>
      </div>
    </div>
  );
}
```

### With Filters & Sorting

```typescript
function FilteredUserList() {
  const [filters, setFilters] = useState({ role: '', search: '' });
  const [sortBy, setSortBy] = useState<'name' | 'email'>('name');

  const users = usePaginatedServerTask(
    async ({ page, pageSize, filters: f }) => {
      let query = db.users.asQueryable();

      // Apply filters
      if (f.role) {
        query = query.where(u => u.role === f.role);
      }
      if (f.search) {
        query = query.where(u => u.name.contains(f.search));
      }

      // Apply sorting
      query = f.sortBy === 'name'
        ? query.orderBy(u => u.name)
        : query.orderBy(u => u.email);

      return await query
        .skip((page - 1) * pageSize)
        .take(pageSize)
        .toList();
    },
    {
      pageSize: 20,
      getTotalCount: async (f) => {
        let query = db.users.asQueryable();
        if (f.role) query = query.where(u => u.role === f.role);
        if (f.search) query = query.where(u => u.name.contains(f.search));
        return await query.count();
      },
      dependencies: [{ ...filters, sortBy }], // Re-fetch when these change
      prefetchNext: true
    }
  );

  return (
    <div>
      <div>
        <input
          placeholder="Search..."
          value={filters.search}
          onChange={e => setFilters({ ...filters, search: e.target.value })}
        />
        <select
          value={filters.role}
          onChange={e => setFilters({ ...filters, role: e.target.value })}
        >
          <option value="">All Roles</option>
          <option value="admin">Admin</option>
          <option value="user">User</option>
        </select>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)}>
          <option value="name">Sort by Name</option>
          <option value="email">Sort by Email</option>
        </select>
      </div>

      <p>Found {users.total} users</p>

      <ul>
        {users.items.map(user => (
          <li key={user.id}>{user.name} ({user.role})</li>
        ))}
      </ul>

      <Pagination users={users} />
    </div>
  );
}
```

### With Rust Runtime (High Performance)

```typescript
// For large datasets or complex calculations
const analytics = usePaginatedServerTask(
  async ({ page, pageSize, filters }) => {
    // This runs in RUST for maximum performance!
    return data
      .filter(x => x.value > filters.threshold)
      .map(x => ({
        ...x,
        computed: expensiveComputation(x.value)
      }))
      .slice((page - 1) * pageSize, page * pageSize);
  },
  {
    pageSize: 50,
    runtime: 'rust',  // ✅ Use Rust for CPU-intensive work!
    getTotalCount: async (filters) => {
      return data.filter(x => x.value > filters.threshold).length;
    }
  }
);
```

---

## Performance Targets

| Metric | Target | How We'll Achieve It |
|--------|--------|---------------------|
| **Initial page load** | <100ms | ✅ Already achieved by `useServerTask` |
| **Cache hit navigation** | <5ms | Client-side cache lookup |
| **Cache miss navigation** | <150ms | ✅ Already achieved by `useServerTask` + EF Core |
| **Filter change re-fetch** | <100ms | ✅ Already achieved by `useServerTask` |
| **Prefetch accuracy** | >80% | Hover triggers + idle prefetch + predictor learning |
| **Memory per 100 pages** | <500KB | LRU cache with max 10 pages, TTL eviction |

---

## Why This Approach Wins

### Comparison to Original Plan

| Aspect | Original Plan | **This Plan** |
|--------|--------------|---------------|
| Implementation time | 6 weeks | **2-3 weeks** |
| New code required | ~2000 lines | **~300 lines** |
| Code reuse | 10% | **90%** |
| Runtime selection | C# only | **C# or Rust** |
| Progress reporting | Build from scratch | **FREE (from useServerTask)** |
| Error handling | Build from scratch | **FREE (from useServerTask)** |
| FFI bridge | Build separate | **FREE (from useServerTask)** |
| Risk | High (new system) | **Low (proven system)** |

### Benefits

✅ **90% code reuse** - Wrapper over `useServerTask`
✅ **All useServerTask features** - Progress, errors, cancellation, etc.
✅ **Runtime selection** - C# or Rust execution for FREE!
✅ **Proven architecture** - Build on working foundation
✅ **Fast implementation** - 2-3 weeks vs 6 weeks
✅ **Low risk** - Reusing tested code
✅ **Extensible** - Can add infinite scroll, cursor pagination later

---

## Success Metrics

### Developer Experience
- **Time to add pagination**: <5 minutes
- **Lines of code**: 10-15 (vs 50+ traditional)
- **API complexity**: Simple (reuses `useServerTask` mental model)

### Performance
- **Cache hit latency**: <5ms
- **Cache miss latency**: <150ms
- **Prefetch hit rate**: >80%
- **Memory usage**: <500KB for 10 cached pages

### Adoption
- **Internal usage**: Track how many components use it
- **Cache effectiveness**: Measure hit rate
- **Runtime distribution**: Track C# vs Rust usage

---

## Conclusion

This implementation plan **leverages Minimact's existing strengths**:
- ✅ `useServerTask` infrastructure (complete)
- ✅ TypeScript → C#/Rust transpilation (complete)
- ✅ Tokio runtime (complete)
- ✅ FFI bridge (complete)
- ✅ Template prediction system (for learning patterns)

**Instead of building a new system**, we're **extending a proven one**.

**Timeline**: 2-3 weeks to production-ready
**Risk**: Low (90% reuse)
**Impact**: High (solves major pain point)

**Recommendation**: Start immediately after `useServerTask` C# integration is verified working end-to-end.
