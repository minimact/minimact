import { DomQueryBuilder } from './query-builder';
import type { DomElementState } from 'minimact-punch';
/**
 * useDomQuery - Reactive React hook for querying the DOM
 *
 * Automatically re-runs the query when the DOM changes, providing
 * real-time reactive query results.
 *
 * @example
 * ```typescript
 * function MyComponent() {
 *   const query = useDomQuery()
 *     .from('.card')
 *     .where(card => card.state.hover && card.isIntersecting)
 *     .orderBy(card => card.history.changeCount, 'DESC')
 *     .limit(10);
 *
 *   return (
 *     <div>
 *       {query.select(card => ({
 *         id: card.attributes.id,
 *         title: card.textContent
 *       })).map(row => (
 *         <div key={row.id}>{row.title}</div>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export declare function useDomQuery<T = DomElementState>(): DomQueryBuilder<T>;
/**
 * useDomQueryStatic - Non-reactive version that only runs once
 *
 * Use this when you don't need automatic updates on DOM changes.
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
 * Limits re-renders to once every N milliseconds for performance.
 *
 * @example
 * ```typescript
 * const query = useDomQueryThrottled(250) // Max 4 updates per second
 *   .from('.card');
 * ```
 */
export declare function useDomQueryThrottled<T = DomElementState>(throttleMs?: number): DomQueryBuilder<T>;
/**
 * useDomQueryDebounced - Reactive with debouncing
 *
 * Only re-renders after N milliseconds of inactivity.
 *
 * @example
 * ```typescript
 * const query = useDomQueryDebounced(500) // Wait for 500ms of quiet
 *   .from('.card');
 * ```
 */
export declare function useDomQueryDebounced<T = DomElementState>(debounceMs?: number): DomQueryBuilder<T>;
//# sourceMappingURL=use-dom-query.d.ts.map