/**
 * Minimact Query - SQL for the DOM
 *
 * Treat the DOM as a relational database with full SQL-like querying.
 *
 * @example
 * ```typescript
 * import { useDomQuery } from 'minimact-query';
 *
 * function MyComponent() {
 *   const query = useDomQuery()
 *     .from('.card')
 *     .where(card => card.isIntersecting && card.state.hover)
 *     .orderBy(card => card.history.changeCount, 'DESC')
 *     .limit(10);
 *
 *   return (
 *     <div>
 *       {query.select(card => ({
 *         id: card.attributes.id,
 *         title: card.textContent,
 *         changes: card.history.changeCount
 *       })).map(row => (
 *         <div key={row.id}>
 *           {row.title} - {row.changes} changes
 *         </div>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export { DomQueryBuilder, domQuery } from './query-builder';
export { useDomQuery, useDomQueryStatic, useDomQueryThrottled, useDomQueryDebounced, setQueryContext, clearQueryContext } from './use-dom-query';
export type { DomElementState } from 'minimact-punch';
//# sourceMappingURL=index.d.ts.map