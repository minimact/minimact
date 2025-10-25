/**
 * Minimact Integration Layer for DOM Query
 *
 * SQL for the DOM - without React dependencies
 */
import { DomQueryBuilder } from './query-builder';
import type { DomElementState } from 'minimact-punch';
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
export declare function setQueryContext(context: ComponentContext): void;
export declare function clearQueryContext(): void;
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
export declare function useDomQuery<T = DomElementState>(): DomQueryBuilder<T>;
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
export declare function useDomQueryStatic<T = DomElementState>(): DomQueryBuilder<T>;
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
export declare function useDomQueryThrottled<T = DomElementState>(throttleMs?: number): DomQueryBuilder<T>;
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
export declare function useDomQueryDebounced<T = DomElementState>(debounceMs?: number): DomQueryBuilder<T>;
export {};
//# sourceMappingURL=integration.d.ts.map