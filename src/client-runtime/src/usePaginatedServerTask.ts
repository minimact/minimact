/**
 * usePaginatedServerTask - Pagination built on useServerTask
 *
 * Extends the existing useServerTask infrastructure to add pagination capabilities.
 * Reuses transpilers, FFI bridge, and task runtime for zero additional complexity.
 */

import { useServerTask } from './hooks';
import { useState, useEffect, useRef } from './hooks';
import { ServerTaskOptions } from './server-task';

/**
 * Pagination parameters passed to the fetch function
 */
export interface PaginationParams<TFilter = any> {
  page: number;
  pageSize: number;
  filters: TFilter;
}

/**
 * Options for configuring a paginated server task
 */
export interface PaginatedServerTaskOptions<T, TFilter = any> {
  /** Number of items per page (default: 20) */
  pageSize?: number;

  /** Function to get total count (for calculating total pages) */
  getTotalCount: (filters: TFilter) => Promise<number>;

  /** Enable automatic prefetching of next page (default: false) */
  prefetchNext?: boolean;

  /** Enable automatic prefetching of previous page (default: false) */
  prefetchPrev?: boolean;

  /** Dependencies that trigger re-fetch when changed */
  dependencies?: any[];

  /** Runtime selection: 'csharp' or 'rust' (inherited from useServerTask) */
  runtime?: 'csharp' | 'rust';

  /** Enable parallel execution (for Rust runtime with Rayon) */
  parallel?: boolean;
}

/**
 * Paginated server task result
 */
export interface PaginatedServerTask<T> {
  // Data
  items: T[];
  total: number;
  totalPages: number;

  // State
  page: number;
  pageSize: number;
  pending: boolean;
  error?: string;

  // Navigation
  hasNext: boolean;
  hasPrev: boolean;
  next: () => void;
  prev: () => void;
  goto: (page: number) => void;
  refresh: () => void;

  // Advanced: Access to underlying tasks
  _fetchTask: any;
  _countTask: any;
}

/**
 * usePaginatedServerTask Hook
 *
 * Wraps useServerTask to provide pagination with intelligent prefetching.
 *
 * @example
 * const users = usePaginatedServerTask(
 *   async ({ page, pageSize, filters }) => {
 *     return await db.users
 *       .where(u => filters.role ? u.role === filters.role : true)
 *       .skip((page - 1) * pageSize)
 *       .take(pageSize)
 *       .toList();
 *   },
 *   {
 *     pageSize: 20,
 *     getTotalCount: async (filters) => {
 *       return await db.users
 *         .where(u => filters.role ? u.role === filters.role : true)
 *         .count();
 *     },
 *     prefetchNext: true,
 *     dependencies: [filters]
 *   }
 * );
 */
export function usePaginatedServerTask<T, TFilter = any>(
  fetchFn: (params: PaginationParams<TFilter>) => Promise<T[]>,
  options: PaginatedServerTaskOptions<T, TFilter>
): PaginatedServerTask<T> {
  const pageSize = options.pageSize || 20;

  // State
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Prefetch cache
  const prefetchCache = useRef<Map<number, T[]>>(new Map());

  // Last args (for retry)
  const lastArgs = useRef<any[]>([]);

  // Build current filters from dependencies
  const filters = buildFilters(options.dependencies);

  // ✅ Reuse useServerTask for fetch logic!
  // Note: The actual function is passed via Babel transpilation
  // At runtime, we just get a task instance and call .start(args)
  const fetchTask = useServerTask<T[]>(
    undefined, // Function extracted by Babel plugin
    {
      runtime: options.runtime,
      parallel: options.parallel
    } as ServerTaskOptions
  );

  // ✅ Reuse useServerTask for count query!
  const countTask = useServerTask<number>(
    undefined, // Function extracted by Babel plugin
    { runtime: options.runtime } as ServerTaskOptions
  );

  /**
   * Fetch a specific page
   */
  const fetchPage = async (targetPage: number, fromCache = true) => {
    // Check prefetch cache
    if (fromCache && prefetchCache.current.has(targetPage)) {
      const cached = prefetchCache.current.get(targetPage)!;
      setItems(cached);
      setPage(targetPage);
      prefetchCache.current.delete(targetPage);

      console.log(`[usePaginatedServerTask] 🟢 Cache hit for page ${targetPage}`);

      // Trigger next prefetch
      if (options.prefetchNext && targetPage < totalPages) {
        prefetchInBackground(targetPage + 1);
      }

      if (options.prefetchPrev && targetPage > 1) {
        prefetchInBackground(targetPage - 1);
      }

      return;
    }

    // Fetch from server via useServerTask
    const args = {
      page: targetPage,
      pageSize,
      filters
    };

    lastArgs.current = [args];

    fetchTask.start(args);

    // Wait for completion (using promise)
    try {
      const result = await fetchTask.promise;

      setItems(result as T[]);
      setPage(targetPage);
      setError(null);

      console.log(`[usePaginatedServerTask] 🔴 Fetched page ${targetPage} from server`);

      // Prefetch adjacent pages if configured
      if (options.prefetchNext && targetPage < totalPages) {
        prefetchInBackground(targetPage + 1);
      }

      if (options.prefetchPrev && targetPage > 1) {
        prefetchInBackground(targetPage - 1);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch page');
      console.error(`[usePaginatedServerTask] Error fetching page ${targetPage}:`, err);
    }
  };

  /**
   * Prefetch in background (non-blocking)
   */
  const prefetchInBackground = async (targetPage: number) => {
    if (prefetchCache.current.has(targetPage)) {
      return; // Already cached
    }

    const args = {
      page: targetPage,
      pageSize,
      filters
    };

    // Create a separate task instance for prefetching
    // Note: This will be optimized later to reuse task instances
    fetchTask.start(args);

    try {
      const result = await fetchTask.promise;
      prefetchCache.current.set(targetPage, result as T[]);
      console.log(`[usePaginatedServerTask] ⚡ Prefetched page ${targetPage}`);
    } catch (err) {
      console.error(`[usePaginatedServerTask] Prefetch failed for page ${targetPage}:`, err);
      // Silently fail - prefetch is optional
    }
  };

  /**
   * Get total count on mount and when filters change
   */
  useEffect(() => {
    countTask.start(filters);

    countTask.promise.then((count) => {
      setTotal(count as number);
    }).catch((err) => {
      console.error('[usePaginatedServerTask] Failed to get total count:', err);
    });
  }, [JSON.stringify(filters)]);

  /**
   * Initial fetch
   */
  useEffect(() => {
    fetchPage(1, false);
  }, []);

  /**
   * Re-fetch when dependencies change
   */
  useEffect(() => {
    if (options.dependencies && options.dependencies.length > 0) {
      prefetchCache.current.clear();
      fetchPage(1, false);
    }
  }, [JSON.stringify(filters)]);

  // Computed properties
  const totalPages = Math.ceil(total / pageSize);
  const hasNext = page < totalPages;
  const hasPrev = page > 1;

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
    error: error || fetchTask.error?.message,

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

/**
 * Helper: Build filters object from dependencies array
 */
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
  }, {} as Record<string, any>);
}
