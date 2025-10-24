import type { DomElementState } from 'minimact-punch';
/** Infer the type of a grouped result */
type GroupedResult<T, TKey> = {
    key: TKey;
    items: T[];
    count: number;
};
/** Order direction */
type OrderDirection = 'ASC' | 'DESC';
export declare class DomQueryBuilder<T = DomElementState> {
    private selector?;
    private elements;
    private whereConditions;
    private orderByFns;
    private limitCount?;
    private offsetCount;
    private groupByFn?;
    private havingCondition?;
    private joins;
    /**
     * Specify which elements to query
     *
     * @example
     * ```typescript
     * query.from('.card')
     * query.from('#app')
     * query.from('[data-type="widget"]')
     * ```
     */
    from(selector: string): this;
    /**
     * Query from specific DomElementState instances
     */
    fromElements(elements: T[]): this;
    /**
     * Filter elements by condition
     *
     * @example
     * ```typescript
     * query.where(card => card.state.hover)
     * query.where(card => card.childrenCount > 5)
     * query.where(card => card.lifecycle.lifecycleState === 'visible')
     * ```
     */
    where(predicate: (item: T) => boolean): this;
    /**
     * Shorthand: filter by property equality
     *
     * @example
     * ```typescript
     * query.whereEquals('lifecycle.lifecycleState', 'visible')
     * ```
     */
    whereEquals(path: string, value: any): this;
    /**
     * Shorthand: filter by property greater than
     */
    whereGreaterThan(path: string, value: number): this;
    /**
     * Shorthand: filter by property less than
     */
    whereLessThan(path: string, value: number): this;
    /**
     * Shorthand: filter by value in array
     */
    whereIn(path: string, values: any[]): this;
    /**
     * Shorthand: filter by value between range
     */
    whereBetween(path: string, min: number, max: number): this;
    /**
     * Inner join with another query
     *
     * @example
     * ```typescript
     * query
     *   .from('.parent')
     *   .join(
     *     useDomQuery().from('.child'),
     *     (parent, child) => parent.element.contains(child.element)
     *   )
     * ```
     */
    join<TOther>(other: DomQueryBuilder<TOther>, predicate: (left: T, right: TOther) => boolean): DomQueryBuilder<T & {
        joined: TOther;
    }>;
    /**
     * Left join with another query
     */
    leftJoin<TOther>(other: DomQueryBuilder<TOther>, predicate: (left: T, right: TOther) => boolean): DomQueryBuilder<T & {
        joined: TOther | null;
    }>;
    /**
     * Right join with another query
     */
    rightJoin<TOther>(other: DomQueryBuilder<TOther>, predicate: (left: T, right: TOther) => boolean): DomQueryBuilder<T & {
        joined: TOther;
    }>;
    /**
     * Group elements by a key function
     *
     * @example
     * ```typescript
     * query.groupBy(card => card.lifecycle.lifecycleState)
     * query.groupBy(card => card.attributes.category)
     * ```
     */
    groupBy<TKey>(keyFn: (item: T) => TKey): DomQueryBuilder<GroupedResult<T, TKey>>;
    /**
     * Filter groups after grouping (like SQL HAVING)
     *
     * @example
     * ```typescript
     * query
     *   .groupBy(card => card.attributes.category)
     *   .having(group => group.count > 10)
     * ```
     */
    having(predicate: (group: GroupedResult<T, any>) => boolean): this;
    /**
     * Sort elements by a key function
     *
     * @example
     * ```typescript
     * query.orderBy(card => card.history.changeCount, 'DESC')
     * query.orderBy(card => card.childrenCount, 'ASC')
     * ```
     */
    orderBy(keyFn: (item: T) => any, direction?: OrderDirection): this;
    /**
     * Limit number of results
     *
     * @example
     * ```typescript
     * query.limit(10)
     * query.limit(10, 5) // Skip 5, take 10
     * ```
     */
    limit(count: number, offset?: number): this;
    /**
     * Skip N results (for pagination)
     */
    offset(count: number): this;
    /**
     * Execute the query and return results
     */
    execute(): T[];
    /**
     * Project results to a new shape
     * This is called in JSX for data transformation
     *
     * @example
     * ```typescript
     * {cards.select(card => ({
     *   id: card.attributes.id,
     *   title: card.attributes.title,
     *   count: card.childrenCount
     * })).map(row => <div key={row.id}>{row.title}</div>)}
     * ```
     */
    select<TResult>(selector: (item: T) => TResult): TResult[];
    /**
     * Select all (returns raw results)
     */
    selectAll(): T[];
    /**
     * Count total results
     */
    count(): number;
    /**
     * Sum a numeric property
     */
    sum(selector: (item: T) => number): number;
    /**
     * Average of a numeric property
     */
    avg(selector: (item: T) => number): number;
    /**
     * Minimum value
     */
    min(selector: (item: T) => number): number;
    /**
     * Maximum value
     */
    max(selector: (item: T) => number): number;
    /**
     * Standard deviation
     */
    stddev(selector: (item: T) => number): number;
    /**
     * First result (or null)
     */
    first(): T | null;
    /**
     * Last result (or null)
     */
    last(): T | null;
    /**
     * Check if any results match
     */
    any(): boolean;
    /**
     * Check if all items match a condition
     */
    all(predicate: (item: T) => boolean): boolean;
    /**
     * Find first item matching condition
     */
    find(predicate: (item: T) => boolean): T | null;
    private getBaseElements;
    private applyJoins;
    private applyWhere;
    private applyGroupBy;
    private applyOrderBy;
    private applyLimitOffset;
    private getNestedValue;
    /**
     * DISTINCT - Get unique elements based on a key
     *
     * @example
     * ```typescript
     * query.distinct(item => item.attributes['data-category'])
     * ```
     */
    distinct(keyFn?: (item: T) => any): this;
    /**
     * UNION - Combine results from two queries (no duplicates)
     */
    union(other: DomQueryBuilder<T>): DomQueryBuilder<T>;
    /**
     * INTERSECT - Get elements that appear in both queries
     */
    intersect(other: DomQueryBuilder<T>): DomQueryBuilder<T>;
    /**
     * EXCEPT - Get elements in this query but not in other query
     */
    except(other: DomQueryBuilder<T>): DomQueryBuilder<T>;
}
/**
 * Create a new DOM query builder
 *
 * NOTE: In React components, use useDomQuery() hook instead for reactivity
 *
 * @example
 * ```typescript
 * const query = domQuery()
 *   .from('.card')
 *   .where(card => card.state.hover)
 *   .orderBy(card => card.childrenCount, 'DESC');
 * ```
 */
export declare function domQuery<T = DomElementState>(): DomQueryBuilder<T>;
export {};
//# sourceMappingURL=query-builder.d.ts.map