# usePaginatedServerTask - Implementation Plan

**Feature**: Server-side paginated data fetching with automatic state management and prefetching
**Priority**: High - Solves extremely common use case
**Complexity**: Medium-High - Requires coordination across all 4 components
**Estimated Timeline**: 4-6 weeks with 2 developers

---

## Executive Summary

`usePaginatedServerTask` is a **game-changing** hook that eliminates pagination boilerplate while leveraging Minimact's unique server-side execution model. This feature:

- ✅ Reduces 50+ lines of pagination code to 3 lines
- ✅ Runs queries directly on server with EF Core access
- ✅ Prefetches next/previous pages for 0ms navigation
- ✅ Integrates seamlessly with filters/sorting
- ✅ Type-safe TypeScript → C# transformation

**Why This Is Perfect for Minimact:**

Traditional frameworks (React, Next.js) require:
1. API route definition
2. Client-side fetch logic
3. State management boilerplate
4. Manual prefetching
5. Cache invalidation

Minimact can do **all of this automatically** because:
- Server-side function execution already works
- Babel plugin can detect and transform async functions
- Predictor can prefetch based on user behavior
- SignalR provides bidirectional channel

---

## Architecture Overview

### Component Interaction Flow

```
┌─────────────────────────────────────────────────────────┐
│ 1. DEVELOPER WRITES TSX                                 │
│                                                          │
│   const users = usePaginatedServerTask(                 │
│     async ({ page, pageSize }) => {                     │
│       return await db.users.skip(...).take(...).list(); │
│     },                                                   │
│     { pageSize: 20, prefetchNext: true }                │
│   );                                                     │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│ 2. BABEL PLUGIN TRANSFORMS                              │
│                                                          │
│   - Detects usePaginatedServerTask call                 │
│   - Extracts async function                             │
│   - Transforms to C# method                             │
│   - Generates PaginatedTaskAttribute metadata           │
│   - Creates client-side hook stub                       │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│ 3. GENERATED C# CODE                                    │
│                                                          │
│   [PaginatedTask("users", PageSize = 20)]               │
│   private async Task<List<User>> FetchUsers(            │
│     int page, int pageSize)                             │
│   {                                                      │
│     return await _db.Users                              │
│       .Skip((page - 1) * pageSize)                      │
│       .Take(pageSize)                                   │
│       .ToListAsync();                                   │
│   }                                                      │
│                                                          │
│   [PaginatedTaskCount("users")]                         │
│   private async Task<int> GetUsersCount()               │
│   {                                                      │
│     return await _db.Users.CountAsync();                │
│   }                                                      │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│ 4. C# RUNTIME EXECUTION                                 │
│                                                          │
│   PaginatedTaskManager:                                 │
│   - Registers paginated tasks                           │
│   - Tracks current page state                           │
│   - Manages prefetch queue                              │
│   - Caches results                                      │
│   - Handles SignalR calls                               │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│ 5. CLIENT RUNTIME                                       │
│                                                          │
│   usePaginatedServerTask hook:                          │
│   - Initializes with server state                       │
│   - Provides navigation methods (next, prev, goto)      │
│   - Shows pending state during fetch                    │
│   - Applies prefetched data instantly                   │
│   - Triggers background prefetch                        │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│ 6. PREFETCHING FLOW                                     │
│                                                          │
│   User clicks "Next":                                   │
│   ├─ Check prefetch cache                               │
│   ├─ If hit: Apply data instantly (0ms)                 │
│   ├─ If miss: Show spinner, fetch from server           │
│   └─ Background: Prefetch page+1 for next click         │
└─────────────────────────────────────────────────────────┘
```

---

## Component 1: Babel Plugin Changes

### New File: `src/babel-plugin-minimact/src/extractors/paginatedTasks.cjs`

**Purpose**: Detect and transform `usePaginatedServerTask` calls

**Detection Logic**:
```javascript
function extractPaginatedTask(path, component) {
  // Find: usePaginatedServerTask(asyncFn, options)
  if (path.node.callee.name !== 'usePaginatedServerTask') return;

  const [asyncFn, options] = path.node.arguments;

  // Extract async function
  const taskInfo = {
    name: generateTaskName(component.name),  // e.g., "users"
    asyncFunction: asyncFn,
    options: parseOptions(options),
    dependencies: extractDependencies(asyncFn)
  };

  component.paginatedTasks.push(taskInfo);
}
```

**Transformation**:
```javascript
// Input TSX:
const users = usePaginatedServerTask(
  async ({ page, pageSize }) => {
    return await db.users.skip((page - 1) * pageSize).take(pageSize).toList();
  },
  { pageSize: 20, prefetchNext: true }
);

// Output C#:
[PaginatedTask("users", PageSize = 20, PrefetchNext = true)]
private async Task<List<User>> FetchUsers(int page, int pageSize)
{
    return await _db.Users
        .Skip((page - 1) * pageSize)
        .Take(pageSize)
        .ToListAsync();
}

// Client stub (in generated C#):
// Registers task with client runtime on hydration
```

**Challenges**:
1. **Async function transformation**: Convert JS async/await to C# async/await
2. **Closure capture**: Detect and pass component state to C# method
3. **Dependency tracking**: Identify which state variables trigger re-fetch
4. **Type inference**: Determine return type for C# generic `Task<List<T>>`

**Solution Strategies**:

1. **Reuse existing async transformation** from `useEffect`:
   ```javascript
   // Already handles: () => { ... }
   // Need to extend for: async ({ page, pageSize }) => { ... }
   ```

2. **Closure detection** (similar to `usePredictHint`):
   ```javascript
   function extractClosureVariables(asyncFn) {
     const visitor = {
       Identifier(path) {
         // Check if identifier is:
         // - From component state
         // - From component props
         // - External (db, filters, etc.)
       }
     };

     traverse(asyncFn.body, visitor);
     return capturedVars;
   }
   ```

3. **Dependency array** (explicit or inferred):
   ```javascript
   // Explicit:
   usePaginatedServerTask(fn, { dependencies: [filters, sortBy] })

   // Inferred from closure:
   const filters = useState({ role: 'admin' });
   usePaginatedServerTask(fn)  // Auto-detects filters dependency
   ```

---

## Component 2: C# Runtime

### New File: `Minimact.AspNetCore/Core/PaginatedTaskManager.cs`

**Purpose**: Manage paginated task lifecycle and caching

**Core Classes**:

```csharp
public class PaginatedTaskManager
{
    private readonly ConcurrentDictionary<string, PaginatedTaskState> _tasks;
    private readonly ConcurrentDictionary<string, PaginatedTaskCache> _cache;

    /// <summary>
    /// Register a paginated task from component
    /// </summary>
    public void RegisterTask(
        string componentId,
        string taskName,
        PaginatedTaskMetadata metadata)
    {
        var key = $"{componentId}:{taskName}";
        var state = new PaginatedTaskState
        {
            ComponentId = componentId,
            TaskName = taskName,
            CurrentPage = 1,
            PageSize = metadata.PageSize,
            Metadata = metadata
        };

        _tasks[key] = state;
    }

    /// <summary>
    /// Execute paginated task for given page
    /// </summary>
    public async Task<PaginatedResult<T>> ExecuteAsync<T>(
        string componentId,
        string taskName,
        int page,
        Dictionary<string, object> dependencies)
    {
        var key = $"{componentId}:{taskName}";

        // Check cache first
        if (TryGetCached<T>(key, page, out var cached))
        {
            return cached;
        }

        // Execute server function
        var component = _registry.GetComponent(componentId);
        var method = component.GetType()
            .GetMethods()
            .FirstOrDefault(m => m.GetCustomAttribute<PaginatedTaskAttribute>()?.TaskName == taskName);

        if (method == null)
        {
            throw new InvalidOperationException($"Paginated task '{taskName}' not found");
        }

        // Invoke with page and pageSize
        var result = await (Task<List<T>>)method.Invoke(component, new object[] { page, _tasks[key].PageSize });

        // Get total count
        var totalCount = await GetTotalCountAsync(component, taskName);

        var paginatedResult = new PaginatedResult<T>
        {
            Items = result,
            Page = page,
            PageSize = _tasks[key].PageSize,
            Total = totalCount,
            TotalPages = (int)Math.Ceiling((double)totalCount / _tasks[key].PageSize)
        };

        // Cache result
        Cache(key, page, paginatedResult);

        // Trigger prefetch if configured
        if (_tasks[key].Metadata.PrefetchNext)
        {
            _ = PrefetchAsync<T>(componentId, taskName, page + 1, dependencies);
        }

        return paginatedResult;
    }

    /// <summary>
    /// Prefetch page in background
    /// </summary>
    private async Task PrefetchAsync<T>(
        string componentId,
        string taskName,
        int page,
        Dictionary<string, object> dependencies)
    {
        try
        {
            var result = await ExecuteAsync<T>(componentId, taskName, page, dependencies);

            // Send prefetch hint to client
            await _patchSender.SendPrefetchHintAsync(componentId, taskName, page, result);
        }
        catch (Exception ex)
        {
            // Silent failure for prefetch
            Console.WriteLine($"[PaginatedTask] Prefetch failed for {taskName} page {page}: {ex.Message}");
        }
    }
}

[AttributeUsage(AttributeTargets.Method)]
public class PaginatedTaskAttribute : Attribute
{
    public string TaskName { get; }
    public int PageSize { get; set; } = 20;
    public bool PrefetchNext { get; set; }
    public bool PrefetchPrev { get; set; }
    public int PrefetchRadius { get; set; } = 0;

    public PaginatedTaskAttribute(string taskName)
    {
        TaskName = taskName;
    }
}

[AttributeUsage(AttributeTargets.Method)]
public class PaginatedTaskCountAttribute : Attribute
{
    public string TaskName { get; }

    public PaginatedTaskCountAttribute(string taskName)
    {
        TaskName = taskName;
    }
}

public class PaginatedResult<T>
{
    public List<T> Items { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int Total { get; set; }
    public int TotalPages { get; set; }
}

public class PaginatedTaskState
{
    public string ComponentId { get; set; }
    public string TaskName { get; set; }
    public int CurrentPage { get; set; }
    public int PageSize { get; set; }
    public PaginatedTaskMetadata Metadata { get; set; }
    public Dictionary<string, object> Dependencies { get; set; }
}

public class PaginatedTaskCache
{
    private readonly Dictionary<int, object> _pageCache = new();
    private readonly TimeSpan _ttl = TimeSpan.FromMinutes(5);

    public void Set(int page, object data)
    {
        _pageCache[page] = data;

        // Auto-expire after TTL
        _ = Task.Delay(_ttl).ContinueWith(_ => _pageCache.Remove(page));
    }

    public bool TryGet<T>(int page, out T data)
    {
        if (_pageCache.TryGetValue(page, out var obj))
        {
            data = (T)obj;
            return true;
        }

        data = default;
        return false;
    }
}
```

### New SignalR Hub Methods:

```csharp
// MinimactHub.cs additions:

public async Task<PaginatedResult<object>> ExecutePaginatedTask(
    string componentId,
    string taskName,
    int page,
    Dictionary<string, object> dependencies)
{
    var manager = _serviceProvider.GetRequiredService<PaginatedTaskManager>();
    return await manager.ExecuteAsync<object>(componentId, taskName, page, dependencies);
}

public async Task RefreshPaginatedTask(
    string componentId,
    string taskName,
    Dictionary<string, object> dependencies)
{
    // Invalidate cache and re-fetch current page
    var manager = _serviceProvider.GetRequiredService<PaginatedTaskManager>();
    manager.InvalidateCache(componentId, taskName);

    var state = manager.GetState(componentId, taskName);
    var result = await manager.ExecuteAsync<object>(componentId, taskName, state.CurrentPage, dependencies);

    await Clients.Caller.SendAsync("PaginatedTaskRefreshed", componentId, taskName, result);
}
```

---

## Component 3: Client Runtime

### New File: `src/client-runtime/src/hooks/usePaginatedServerTask.ts`

**Purpose**: Client-side hook with navigation and prefetch management

```typescript
import { useState, useEffect, useRef } from './hooks';
import { useComponentContext } from './context';

export interface PaginatedServerTaskOptions<T> {
  pageSize?: number;
  prefetchNext?: boolean;
  prefetchPrev?: boolean;
  prefetchRadius?: number;
  dependencies?: any[];
  getTotalCount?: () => Promise<number>;
}

export interface PaginatedServerTaskResult<T> {
  // Data
  items: T[];
  total: number;
  totalPages: number;

  // Current state
  page: number;
  pageSize: number;
  pending: boolean;
  error: string | null;

  // Navigation
  hasNext: boolean;
  hasPrev: boolean;
  next: () => void;
  prev: () => void;
  goto: (page: number) => void;
  refresh: () => void;
}

export function usePaginatedServerTask<T>(
  taskName: string,  // Generated by Babel
  options: PaginatedServerTaskOptions<T> = {}
): PaginatedServerTaskResult<T> {
  const context = useComponentContext();
  const { componentId, signalR } = context;

  // State
  const [items, setItems] = useState<T[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Prefetch cache
  const prefetchCache = useRef<Map<number, T[]>>(new Map());

  // Computed
  const pageSize = options.pageSize || 20;
  const totalPages = Math.ceil(total / pageSize);
  const hasNext = page < totalPages;
  const hasPrev = page > 1;

  // Fetch page
  const fetchPage = async (targetPage: number, fromCache = true) => {
    // Check prefetch cache first
    if (fromCache && prefetchCache.current.has(targetPage)) {
      const cachedItems = prefetchCache.current.get(targetPage)!;
      setItems(cachedItems);
      setPage(targetPage);

      // Remove from cache
      prefetchCache.current.delete(targetPage);

      // Trigger next prefetch
      if (options.prefetchNext && targetPage < totalPages) {
        prefetchInBackground(targetPage + 1);
      }

      return;
    }

    // Fetch from server
    setPending(true);
    setError(null);

    try {
      const dependencies = buildDependencies(options.dependencies);

      const result = await signalR.executePaginatedTask<T>(
        componentId,
        taskName,
        targetPage,
        dependencies
      );

      setItems(result.items);
      setTotal(result.total);
      setPage(result.page);

      // Prefetch next page if configured
      if (options.prefetchNext && result.page < result.totalPages) {
        prefetchInBackground(result.page + 1);
      }

      // Prefetch previous page if configured
      if (options.prefetchPrev && result.page > 1) {
        prefetchInBackground(result.page - 1);
      }

      // Prefetch radius
      if (options.prefetchRadius) {
        for (let i = 1; i <= options.prefetchRadius; i++) {
          if (result.page + i <= result.totalPages) {
            prefetchInBackground(result.page + i);
          }
          if (result.page - i >= 1) {
            prefetchInBackground(result.page - i);
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setPending(false);
    }
  };

  // Prefetch in background
  const prefetchInBackground = async (targetPage: number) => {
    if (prefetchCache.current.has(targetPage)) {
      return; // Already prefetched
    }

    try {
      const dependencies = buildDependencies(options.dependencies);

      const result = await signalR.executePaginatedTask<T>(
        componentId,
        taskName,
        targetPage,
        dependencies
      );

      // Store in cache
      prefetchCache.current.set(targetPage, result.items);

      console.log(`[usePaginatedServerTask] Prefetched page ${targetPage} (${result.items.length} items)`);
    } catch (err) {
      console.warn(`[usePaginatedServerTask] Prefetch failed for page ${targetPage}:`, err);
    }
  };

  // Build dependencies object
  const buildDependencies = (deps?: any[]): Record<string, any> => {
    if (!deps) return {};

    // Convert array to object with indices as keys
    return deps.reduce((acc, dep, index) => {
      acc[`dep_${index}`] = dep;
      return acc;
    }, {} as Record<string, any>);
  };

  // Navigation methods
  const next = () => {
    if (hasNext) {
      fetchPage(page + 1);
    }
  };

  const prev = () => {
    if (hasPrev) {
      fetchPage(page - 1);
    }
  };

  const goto = (targetPage: number) => {
    if (targetPage >= 1 && targetPage <= totalPages) {
      fetchPage(targetPage);
    }
  };

  const refresh = () => {
    // Clear cache and re-fetch current page
    prefetchCache.current.clear();
    fetchPage(page, false);
  };

  // Initial fetch
  useEffect(() => {
    fetchPage(1);
  }, []);

  // Re-fetch when dependencies change
  useEffect(() => {
    if (options.dependencies && options.dependencies.length > 0) {
      fetchPage(1);
    }
  }, options.dependencies || []);

  return {
    // Data
    items,
    total,
    totalPages,

    // State
    page,
    pageSize,
    pending,
    error,

    // Navigation
    hasNext,
    hasPrev,
    next,
    prev,
    goto,
    refresh
  };
}
```

### SignalR Manager Additions:

```typescript
// signalr-manager.ts additions:

export async executePaginatedTask<T>(
  componentId: string,
  taskName: string,
  page: number,
  dependencies: Record<string, any>
): Promise<PaginatedResult<T>> {
  return await this.connection.invoke(
    'ExecutePaginatedTask',
    componentId,
    taskName,
    page,
    dependencies
  );
}

export interface PaginatedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}
```

---

## Component 4: Type System

### New File: `src/client-runtime/src/types/paginated.ts`

```typescript
export interface PaginatedServerTaskFn<T> {
  (params: PaginatedTaskParams): Promise<T[]>;
}

export interface PaginatedTaskParams {
  page: number;
  pageSize: number;
  [key: string]: any;  // Additional dependencies
}

export interface PaginatedServerTaskOptions<T> {
  pageSize?: number;
  prefetchNext?: boolean;
  prefetchPrev?: boolean;
  prefetchRadius?: number;
  dependencies?: any[];
  getTotalCount?: () => Promise<number>;
}

export interface PaginatedServerTaskResult<T> {
  items: T[];
  total: number;
  totalPages: number;
  page: number;
  pageSize: number;
  pending: boolean;
  error: string | null;
  hasNext: boolean;
  hasPrev: boolean;
  next: () => void;
  prev: () => void;
  goto: (page: number) => void;
  refresh: () => void;
}
```

---

## Implementation Phases

### Phase 1: MVP (2 weeks)
**Goal**: Basic pagination works end-to-end

- [ ] Babel: Detect `usePaginatedServerTask`, extract async function
- [ ] Babel: Transform to C# method with `[PaginatedTask]` attribute
- [ ] C#: `PaginatedTaskManager` with basic execution
- [ ] C#: SignalR hub methods for task execution
- [ ] Client: `usePaginatedServerTask` hook with `next/prev/goto`
- [ ] Client: Loading states and error handling
- [ ] Test: Simple user list pagination

**Success Criteria**:
```typescript
const users = usePaginatedServerTask(
  async ({ page, pageSize }) => await db.users.skip(...).take(...).list(),
  { pageSize: 20 }
);

// Can navigate pages, see loading state, display data
```

### Phase 2: Prefetching (1 week)
**Goal**: Zero-latency page navigation

- [ ] C#: Prefetch background tasks
- [ ] C#: Prefetch cache with TTL
- [ ] Client: Prefetch cache in hook
- [ ] Client: Instant page switch when cached
- [ ] SignalR: Send prefetch hints to client
- [ ] Test: Navigate to page 2 → 0ms wait time

**Success Criteria**:
- First page load: ~100ms (server query)
- Subsequent pages: <5ms (prefetch cache hit)

### Phase 3: Dependencies (1 week)
**Goal**: Re-fetch when filters/sorts change

- [ ] Babel: Detect closure variables in async function
- [ ] Babel: Generate dependency tracking
- [ ] C#: Invalidate cache when dependencies change
- [ ] Client: `useEffect` with dependency array
- [ ] Test: Change filter → auto re-fetch page 1

**Success Criteria**:
```typescript
const [filters, setFilters] = useState({ role: 'admin' });

const users = usePaginatedServerTask(fn, {
  dependencies: [filters]  // Auto re-fetch when filters change
});
```

### Phase 4: Total Count Optimization (1 week)
**Goal**: Efficient total count queries

- [ ] Babel: Detect `getTotalCount` option
- [ ] Babel: Generate separate count method
- [ ] C#: `[PaginatedTaskCount]` attribute
- [ ] C#: Cache count results
- [ ] Client: Display "X of Y total" correctly
- [ ] Test: Count query only runs once, not per page

**Success Criteria**:
- Count query: Once on mount
- Page queries: Skip count, faster execution

### Phase 5: Advanced Features (Optional, 1-2 weeks)
**Goal**: Infinite scroll, cursor pagination

- [ ] `useInfiniteServerTask` for infinite scroll
- [ ] `useCursorPaginatedServerTask` for cursor-based
- [ ] `prefetchRadius` for aggressive prefetching
- [ ] TypeScript type inference improvements
- [ ] Performance benchmarks

---

## Technical Challenges & Solutions

### Challenge 1: Async Function Transformation

**Problem**: Convert TypeScript async/await to C# async/await

**Solution**: Reuse expression transformer, add async detection:
```javascript
function transformAsyncFunction(fn) {
  // Already handles expressions
  // Add: async/await keyword mapping
  // Add: Promise → Task mapping

  return {
    isAsync: true,
    returnType: inferReturnType(fn),  // List<User>
    body: transformedBody
  };
}
```

### Challenge 2: Closure Capture

**Problem**: Async function references component state/props

**Example**:
```typescript
const [filters] = useState({ role: 'admin' });

usePaginatedServerTask(async ({ page, pageSize }) => {
  return await db.users
    .where(u => u.role === filters.role)  // ← Closure!
    .skip(...).take(...).list();
});
```

**Solution**: Pass as method parameters:
```csharp
[PaginatedTask("users")]
private async Task<List<User>> FetchUsers(
  int page,
  int pageSize,
  string filterRole  // ← Passed from client
) {
  return await _db.Users
    .Where(u => u.Role == filterRole)
    .Skip((page - 1) * pageSize)
    .Take(pageSize)
    .ToListAsync();
}
```

### Challenge 3: Type Inference

**Problem**: Determine `T` in `List<T>` from TypeScript

**Solution**: Analyze return statement:
```javascript
// TypeScript:
return await db.users.toList();
//           ^^^^^^^^ → "users" → User entity

// Infer from:
// 1. Database schema (if available)
// 2. TypeScript type annotations
// 3. Return type hint: usePaginatedServerTask<User>(...)
```

### Challenge 4: Cache Invalidation

**Problem**: When to invalidate prefetch cache?

**Solution**: Dependency-based invalidation:
```typescript
useEffect(() => {
  // Dependencies changed → clear cache
  prefetchCache.current.clear();
  fetchPage(1);
}, [filters, sortBy]);
```

### Challenge 5: Prefetch Timing

**Problem**: When to prefetch? Too early wastes resources, too late misses the benefit.

**Solution**: Smart prefetch triggers:
```typescript
// Trigger 1: After user lands on a page (immediate)
fetchPage(1).then(() => prefetchInBackground(2));

// Trigger 2: On mouse hover over "Next" button
<button onMouseEnter={() => prefetchInBackground(page + 1)}>
  Next
</button>

// Trigger 3: Idle time (requestIdleCallback)
useIdleCallback(() => {
  if (hasNext) prefetchInBackground(page + 1);
});
```

---

## Performance Targets

| Metric | Target | Current (Without Feature) |
|--------|--------|---------------------------|
| **Initial page load** | <100ms | ~100ms (baseline) |
| **Next page (prefetched)** | <5ms | N/A |
| **Next page (not prefetched)** | <150ms | ~200ms (fetch + render) |
| **Filter change re-fetch** | <100ms | ~200ms |
| **Memory per 100 cached pages** | <500KB | N/A |
| **Prefetch accuracy** | >80% | N/A |

---

## Testing Strategy

### Unit Tests

1. **Babel Plugin**:
   - Detect `usePaginatedServerTask` correctly
   - Transform async function to C# method
   - Generate attributes with correct options
   - Handle closure variables

2. **C# Runtime**:
   - `PaginatedTaskManager` executes tasks
   - Cache stores and retrieves pages
   - Prefetch runs in background
   - Dependencies trigger re-fetch

3. **Client Runtime**:
   - Hook initializes with correct state
   - Navigation methods work
   - Prefetch cache hits/misses
   - Dependencies trigger re-fetch

### Integration Tests

1. **End-to-End Pagination**:
   - Load page 1 → see 20 items
   - Click "Next" → see items 21-40
   - Click "Prev" → see items 1-20

2. **Prefetch Flow**:
   - Load page 1 → prefetch page 2
   - Click "Next" → instant load (<5ms)
   - Prefetch page 3 in background

3. **Filter Integration**:
   - Change filter → re-fetch page 1
   - Total count updates
   - Cache invalidated

### Performance Tests

1. **Latency Benchmarks**:
   - Measure: Initial load, cache hit, cache miss
   - Compare: With/without prefetch
   - Target: <5ms for cache hits

2. **Memory Benchmarks**:
   - Measure: Cache size with 100 pages
   - Verify: TTL eviction works
   - Target: <500KB for 100 pages

3. **Load Tests**:
   - Simulate: 100 concurrent users
   - Measure: Server CPU, memory, response time
   - Target: No degradation vs baseline

---

## Documentation Required

### User Documentation

1. **Getting Started Guide**:
   ```markdown
   # usePaginatedServerTask - Quick Start

   ## Basic Usage

   const users = usePaginatedServerTask(async ({ page, pageSize }) => {
     return await db.users.skip(...).take(...).list();
   }, { pageSize: 20 });

   ## With Filters

   const [filters] = useState({ role: 'admin' });
   const users = usePaginatedServerTask(..., {
     dependencies: [filters]
   });

   ## Navigation

   <button onClick={users.next}>Next</button>
   <button onClick={users.prev}>Previous</button>
   <span>Page {users.page} of {users.totalPages}</span>
   ```

2. **API Reference**:
   - All options documented
   - Return value properties
   - TypeScript types
   - Examples for each feature

3. **Advanced Patterns**:
   - Custom total count queries
   - Infinite scroll variant
   - Cursor pagination
   - Performance optimization tips

### Developer Documentation

1. **Architecture Overview**:
   - How transformation works
   - Prefetch algorithm
   - Cache invalidation logic

2. **Extension Guide**:
   - Adding new pagination types
   - Custom prefetch strategies
   - Integrating with other hooks

---

## Migration Path

### From Traditional React Pagination

**Before** (50+ lines):
```typescript
const [page, setPage] = useState(1);
const [data, setData] = useState([]);
const [total, setTotal] = useState(0);
const [loading, setLoading] = useState(false);

useEffect(() => {
  setLoading(true);
  fetch(`/api/users?page=${page}`)
    .then(r => r.json())
    .then(d => {
      setData(d.items);
      setTotal(d.total);
    })
    .finally(() => setLoading(false));
}, [page]);

const next = () => setPage(p => p + 1);
const prev = () => setPage(p => Math.max(1, p - 1));
```

**After** (3 lines):
```typescript
const users = usePaginatedServerTask(
  async ({ page, pageSize }) => await db.users.skip(...).take(...).list(),
  { pageSize: 20 }
);
```

**Benefits**:
- 94% less code
- No API route needed
- Automatic prefetching
- Built-in loading states
- Type-safe queries

---

## Success Metrics

### Developer Experience

- **Time to implement pagination**: 2 minutes (vs 30 minutes traditional)
- **Lines of code**: 3 (vs 50+ traditional)
- **Bugs prevented**: No off-by-one errors, no manual state management

### Performance

- **Page navigation latency**: <5ms (vs ~200ms traditional)
- **Network requests**: 50% reduction (prefetching)
- **Perceived performance**: Instant (cache hits)

### Adoption

- **Feature usage**: Track how many components use it
- **Cache hit rate**: Target >80%
- **Prefetch accuracy**: Target >75%

---

## Risks & Mitigation

### Risk 1: Complex Closure Capture

**Risk**: Some closures too complex to transform

**Mitigation**:
- Start with simple closures (direct state access)
- Add complexity incrementally
- Provide escape hatch (manual dependencies)

### Risk 2: Memory Leaks from Caching

**Risk**: Prefetch cache grows unbounded

**Mitigation**:
- Fixed TTL (5 minutes default)
- Max cache size (100 pages)
- LRU eviction policy

### Risk 3: Prefetch Waste

**Risk**: Prefetching pages user never visits

**Mitigation**:
- Track prefetch hit rate
- Adjust strategy based on metrics
- Make prefetch optional

### Risk 4: Type Inference Failures

**Risk**: Can't infer return type from complex queries

**Mitigation**:
- Require explicit type parameter: `usePaginatedServerTask<User>(...)`
- Fallback to `dynamic` in C#
- Compile-time warnings

---

## Future Enhancements

### Phase 6+: Advanced Features

1. **Optimistic Updates**:
   ```typescript
   users.items.push(newUser);  // Instant UI update
   users.refresh();            // Sync with server
   ```

2. **Real-time Updates**:
   ```typescript
   usePaginatedServerTask(..., {
     realtime: true  // SignalR pushes new items
   });
   ```

3. **Virtual Scrolling Integration**:
   ```typescript
   usePaginatedServerTask(..., {
     virtualScroll: true,
     itemHeight: 50
   });
   ```

4. **Search Integration**:
   ```typescript
   const users = usePaginatedServerTask(
     async ({ page, pageSize, search }) => {
       return await db.users
         .where(u => u.name.contains(search))
         .skip(...).take(...).list();
     },
     { search: searchQuery }  // Auto re-fetch on search
   );
   ```

5. **Export/Download**:
   ```typescript
   await users.exportAll('users.csv');  // Download all pages
   ```

---

## Conclusion

`usePaginatedServerTask` represents a **10x improvement** in developer experience for pagination:

- **94% less code** (3 lines vs 50+)
- **10x faster** perceived latency (<5ms vs ~200ms)
- **Zero boilerplate** (no manual state management)
- **Type-safe** (TypeScript → C# inference)
- **Auto-optimized** (built-in prefetching)

This feature perfectly showcases Minimact's **unique value proposition**:
- Server-side execution with client-side DX
- Predictive performance optimizations
- Zero configuration, maximum results

**Recommendation**: Prioritize this feature immediately after fixing critical gaps. It will:
1. **Differentiate Minimact** from all other frameworks
2. **Drive adoption** (solves real pain point)
3. **Prove the architecture** (showcases server-side power)

**Timeline**: 4-6 weeks to full production-ready implementation with 2 developers.
