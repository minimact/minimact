/**
 * Minimact Integration Layer for DOM Query
 *
 * SQL for the DOM - without React dependencies
 */

import { DomQueryBuilder } from './query-builder';
import type { DomElementState } from '@minimact/punch';

/**
 * Component context for server sync (matches minimact-punch integration pattern)
 */
interface ComponentContext {
  componentId: string;
  signalR: SignalRManager;
}

interface SignalRManager {
  updateQueryResults(componentId: string, queryKey: string, results: any[]): Promise<void>;
}

// Global context (set by Minimact runtime)
let currentContext: ComponentContext | null = null;

export function setQueryContext(context: ComponentContext): void {
  currentContext = context;
}

export function clearQueryContext(): void {
  currentContext = null;
}

/**
 * Helper to wrap a query builder with server sync
 */
function wrapQueryWithSync<T>(query: DomQueryBuilder<T>): DomQueryBuilder<T> {
  // Override execute() to sync results to server
  const originalExecute = query.execute.bind(query);
  (query as any).execute = function(): T[] {
    const results = originalExecute();

    // Sync to server (like useDomElementState does)
    if (currentContext && (query as any).selector) {
      const queryKey = `query_${(query as any).selector}`;

      // Extract snapshots from DomElementState results
      const snapshots = results.map((item: any) => ({
        attributes: item.attributes || {},
        classList: item.classList || [],
        isIntersecting: item.isIntersecting ?? false,
        intersectionRatio: item.intersectionRatio ?? 0,
        childrenCount: item.childrenCount ?? 0,
        exists: item.exists ?? true,
        state: item.state ? {
          hover: item.state.hover ?? false,
          focus: item.state.focus ?? false,
          active: item.state.active ?? false,
          disabled: item.state.disabled ?? false
        } : undefined,
        history: item.history ? {
          changeCount: item.history.changeCount ?? 0,
          changesPerSecond: item.history.changesPerSecond ?? 0
        } : undefined
      }));

      currentContext.signalR.updateQueryResults(
        currentContext.componentId,
        queryKey,
        snapshots
      ).catch(err => {
        console.error('[minimact-query] Failed to sync query results to server:', err);
      });
    }

    return results;
  };

  return query;
}

/**
 * useDomQuery - Reactive query builder for the DOM
 *
 * Returns a fresh query builder that can be chained with fluent API.
 * Each call to .execute() returns current results.
 *
 * @example
 * ```typescript
 * const query = useDomQuery()
 *   .from('.card')
 *   .where(card => card.state.hover && card.isIntersecting)
 *   .orderBy(card => card.history.changeCount, 'DESC')
 *   .limit(10);
 *
 * const results = query.select(card => ({
 *   id: card.attributes.id,
 *   title: card.textContent
 * }));
 * ```
 */
export function useDomQuery<T = DomElementState>(): DomQueryBuilder<T> {
  return wrapQueryWithSync(new DomQueryBuilder<T>());
}

/**
 * useDomQueryStatic - Non-reactive version that only runs once
 *
 * Same as useDomQuery() - returns fresh query builder.
 *
 * @example
 * ```typescript
 * const query = useDomQueryStatic()
 *   .from('.card')
 *   .where(card => card.childrenCount > 5);
 * ```
 */
export function useDomQueryStatic<T = DomElementState>(): DomQueryBuilder<T> {
  return wrapQueryWithSync(new DomQueryBuilder<T>());
}

/**
 * useDomQueryThrottled - Reactive with throttling
 *
 * Returns query builder. Throttling can be implemented at the call site
 * by the consumer if needed.
 *
 * @example
 * ```typescript
 * const query = useDomQueryThrottled(250)
 *   .from('.card');
 * ```
 */
export function useDomQueryThrottled<T = DomElementState>(throttleMs: number = 100): DomQueryBuilder<T> {
  // Note: Throttling can be implemented by wrapping query.execute() calls
  // This is simpler than managing observers and timers internally
  return wrapQueryWithSync(new DomQueryBuilder<T>());
}

/**
 * useDomQueryDebounced - Reactive with debouncing
 *
 * Returns query builder. Debouncing can be implemented at the call site
 * by the consumer if needed.
 *
 * @example
 * ```typescript
 * const query = useDomQueryDebounced(500)
 *   .from('.card');
 * ```
 */
export function useDomQueryDebounced<T = DomElementState>(debounceMs: number = 250): DomQueryBuilder<T> {
  // Note: Debouncing can be implemented by wrapping query.execute() calls
  // This is simpler than managing observers and timers internally
  return wrapQueryWithSync(new DomQueryBuilder<T>());
}
