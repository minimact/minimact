import type { DomElementState } from 'minimact-punch';

/**
 * Minimact Query - Fluent SQL-like API for querying DOM state
 *
 * Treat the DOM as a relational database with full type safety.
 *
 * @example
 * ```typescript
 * const cards = useDomQuery()
 *   .from('.card')
 *   .where(card => card.state.hover && card.isIntersecting)
 *   .orderBy(card => card.history.changeCount, 'DESC')
 *   .limit(10);
 *
 * // In JSX - SELECT projection
 * {cards.select(card => ({
 *   id: card.attributes.id,
 *   children: card.childrenCount
 * })).map(row => <div key={row.id}>{row.children} items</div>)}
 * ```
 */

// ============================================================
// Type Utilities
// ============================================================

/** Infer the return type of a select function */
type SelectResult<T, TSelect extends (item: T) => any> = ReturnType<TSelect>;

/** Infer the type of a grouped result */
type GroupedResult<T, TKey> = {
  key: TKey;
  items: T[];
  count: number;
};

/** Order direction */
type OrderDirection = 'ASC' | 'DESC';

/** Aggregate function type */
type AggregateFunction = 'COUNT' | 'SUM' | 'AVG' | 'MIN' | 'MAX' | 'STDDEV';

// ============================================================
// DomQueryBuilder - The Core Query Engine
// ============================================================

export class DomQueryBuilder<T = DomElementState> {
  private selector?: string;
  private elements: T[] = [];
  private whereConditions: Array<(item: T) => boolean> = [];
  private orderByFns: Array<{ fn: (item: T) => any; direction: OrderDirection }> = [];
  private limitCount?: number;
  private offsetCount: number = 0;
  private groupByFn?: (item: T) => any;
  private havingCondition?: (group: GroupedResult<T, any>) => boolean;
  private joins: Array<{
    query: DomQueryBuilder<any>;
    predicate: (left: T, right: any) => boolean;
    type: 'INNER' | 'LEFT' | 'RIGHT';
  }> = [];

  // ============================================================
  // FROM - Specify the CSS selector
  // ============================================================

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
  from(selector: string): this {
    this.selector = selector;
    return this;
  }

  /**
   * Query from specific DomElementState instances
   */
  fromElements(elements: T[]): this {
    this.elements = elements;
    return this;
  }

  // ============================================================
  // WHERE - Filter conditions
  // ============================================================

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
  where(predicate: (item: T) => boolean): this {
    this.whereConditions.push(predicate);
    return this;
  }

  /**
   * Shorthand: filter by property equality
   *
   * @example
   * ```typescript
   * query.whereEquals('lifecycle.lifecycleState', 'visible')
   * ```
   */
  whereEquals(path: string, value: any): this {
    return this.where(item => this.getNestedValue(item, path) === value);
  }

  /**
   * Shorthand: filter by property greater than
   */
  whereGreaterThan(path: string, value: number): this {
    return this.where(item => this.getNestedValue(item, path) > value);
  }

  /**
   * Shorthand: filter by property less than
   */
  whereLessThan(path: string, value: number): this {
    return this.where(item => this.getNestedValue(item, path) < value);
  }

  /**
   * Shorthand: filter by value in array
   */
  whereIn(path: string, values: any[]): this {
    return this.where(item => values.includes(this.getNestedValue(item, path)));
  }

  /**
   * Shorthand: filter by value between range
   */
  whereBetween(path: string, min: number, max: number): this {
    return this.where(item => {
      const val = this.getNestedValue(item, path);
      return val >= min && val <= max;
    });
  }

  // ============================================================
  // JOIN - Combine multiple queries
  // ============================================================

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
  join<TOther>(
    other: DomQueryBuilder<TOther>,
    predicate: (left: T, right: TOther) => boolean
  ): DomQueryBuilder<T & { joined: TOther }> {
    this.joins.push({ query: other, predicate, type: 'INNER' });
    return this as any;
  }

  /**
   * Left join with another query
   */
  leftJoin<TOther>(
    other: DomQueryBuilder<TOther>,
    predicate: (left: T, right: TOther) => boolean
  ): DomQueryBuilder<T & { joined: TOther | null }> {
    this.joins.push({ query: other, predicate, type: 'LEFT' });
    return this as any;
  }

  /**
   * Right join with another query
   */
  rightJoin<TOther>(
    other: DomQueryBuilder<TOther>,
    predicate: (left: T, right: TOther) => boolean
  ): DomQueryBuilder<T & { joined: TOther }> {
    this.joins.push({ query: other, predicate, type: 'RIGHT' });
    return this as any;
  }

  // ============================================================
  // GROUP BY - Group elements
  // ============================================================

  /**
   * Group elements by a key function
   *
   * @example
   * ```typescript
   * query.groupBy(card => card.lifecycle.lifecycleState)
   * query.groupBy(card => card.attributes.category)
   * ```
   */
  groupBy<TKey>(keyFn: (item: T) => TKey): DomQueryBuilder<GroupedResult<T, TKey>> {
    this.groupByFn = keyFn;
    return this as any;
  }

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
  having(predicate: (group: GroupedResult<T, any>) => boolean): this {
    this.havingCondition = predicate;
    return this;
  }

  // ============================================================
  // ORDER BY - Sort elements
  // ============================================================

  /**
   * Sort elements by a key function
   *
   * @example
   * ```typescript
   * query.orderBy(card => card.history.changeCount, 'DESC')
   * query.orderBy(card => card.childrenCount, 'ASC')
   * ```
   */
  orderBy(keyFn: (item: T) => any, direction: OrderDirection = 'ASC'): this {
    this.orderByFns.push({ fn: keyFn, direction });
    return this;
  }

  // ============================================================
  // LIMIT / OFFSET - Pagination
  // ============================================================

  /**
   * Limit number of results
   *
   * @example
   * ```typescript
   * query.limit(10)
   * query.limit(10, 5) // Skip 5, take 10
   * ```
   */
  limit(count: number, offset: number = 0): this {
    this.limitCount = count;
    this.offsetCount = offset;
    return this;
  }

  /**
   * Skip N results (for pagination)
   */
  offset(count: number): this {
    this.offsetCount = count;
    return this;
  }

  // ============================================================
  // EXECUTE - Run the query
  // ============================================================

  /**
   * Execute the query and return results
   */
  execute(): T[] {
    // Step 1: Get base elements
    let results = this.getBaseElements();

    // Step 2: Apply JOINs
    results = this.applyJoins(results);

    // Step 3: Apply WHERE conditions
    results = this.applyWhere(results);

    // Step 4: Apply GROUP BY
    if (this.groupByFn) {
      results = this.applyGroupBy(results) as any;

      // Step 5: Apply HAVING
      if (this.havingCondition) {
        results = results.filter(this.havingCondition as any);
      }
    }

    // Step 6: Apply ORDER BY
    results = this.applyOrderBy(results);

    // Step 7: Apply LIMIT/OFFSET
    results = this.applyLimitOffset(results);

    return results;
  }

  // ============================================================
  // SELECT - Project results (called in JSX)
  // ============================================================

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
  select<TResult>(selector: (item: T) => TResult): TResult[] {
    return this.execute().map(selector);
  }

  /**
   * Select all (returns raw results)
   */
  selectAll(): T[] {
    return this.execute();
  }

  // ============================================================
  // AGGREGATE FUNCTIONS
  // ============================================================

  /**
   * Count total results
   */
  count(): number {
    return this.execute().length;
  }

  /**
   * Sum a numeric property
   */
  sum(selector: (item: T) => number): number {
    return this.execute().reduce((sum, item) => sum + selector(item), 0);
  }

  /**
   * Average of a numeric property
   */
  avg(selector: (item: T) => number): number {
    const results = this.execute();
    if (results.length === 0) return 0;
    return this.sum(selector) / results.length;
  }

  /**
   * Minimum value
   */
  min(selector: (item: T) => number): number {
    const results = this.execute();
    if (results.length === 0) return 0;
    return Math.min(...results.map(selector));
  }

  /**
   * Maximum value
   */
  max(selector: (item: T) => number): number {
    const results = this.execute();
    if (results.length === 0) return 0;
    return Math.max(...results.map(selector));
  }

  /**
   * Standard deviation
   */
  stddev(selector: (item: T) => number): number {
    const results = this.execute();
    if (results.length === 0) return 0;

    const avg = this.avg(selector);
    const squareDiffs = results.map(item => Math.pow(selector(item) - avg, 2));
    const avgSquareDiff = squareDiffs.reduce((sum, val) => sum + val, 0) / results.length;
    return Math.sqrt(avgSquareDiff);
  }

  /**
   * First result (or null)
   */
  first(): T | null {
    const results = this.execute();
    return results.length > 0 ? results[0] : null;
  }

  /**
   * Last result (or null)
   */
  last(): T | null {
    const results = this.execute();
    return results.length > 0 ? results[results.length - 1] : null;
  }

  // ============================================================
  // UTILITY FUNCTIONS
  // ============================================================

  /**
   * Check if any results match
   */
  any(): boolean {
    return this.execute().length > 0;
  }

  /**
   * Check if all items match a condition
   */
  all(predicate: (item: T) => boolean): boolean {
    return this.execute().every(predicate);
  }

  /**
   * Find first item matching condition
   */
  find(predicate: (item: T) => boolean): T | null {
    return this.execute().find(predicate) ?? null;
  }

  // ============================================================
  // PRIVATE HELPERS
  // ============================================================

  private getBaseElements(): T[] {
    if (this.elements.length > 0) {
      return [...this.elements];
    }

    if (this.selector) {
      // In browser: query DOM
      if (typeof document !== 'undefined') {
        // Dynamic import for minimact-punch
        // This will be resolved at runtime when used in a bundled app
        const nodeList = document.querySelectorAll(this.selector);
        return Array.from(nodeList) as T[];
      }
    }

    return [];
  }

  private applyJoins(elements: T[]): T[] {
    if (this.joins.length === 0) return elements;

    let results: any[] = elements;

    for (const join of this.joins) {
      const rightElements = join.query.execute();
      const joined: any[] = [];

      if (join.type === 'INNER') {
        for (const left of results) {
          for (const right of rightElements) {
            if (join.predicate(left, right)) {
              joined.push({ ...left, joined: right });
            }
          }
        }
      } else if (join.type === 'LEFT') {
        for (const left of results) {
          let hasMatch = false;
          for (const right of rightElements) {
            if (join.predicate(left, right)) {
              joined.push({ ...left, joined: right });
              hasMatch = true;
            }
          }
          if (!hasMatch) {
            joined.push({ ...left, joined: null });
          }
        }
      } else if (join.type === 'RIGHT') {
        for (const right of rightElements) {
          for (const left of results) {
            if (join.predicate(left, right)) {
              joined.push({ ...left, joined: right });
            }
          }
        }
      }

      results = joined;
    }

    return results;
  }

  private applyWhere(elements: T[]): T[] {
    let results = elements;

    for (const condition of this.whereConditions) {
      results = results.filter(condition);
    }

    return results;
  }

  private applyGroupBy(elements: T[]): GroupedResult<T, any>[] {
    if (!this.groupByFn) return elements as any;

    const groups = new Map<any, T[]>();

    for (const element of elements) {
      const key = this.groupByFn(element);
      const existing = groups.get(key) || [];
      existing.push(element);
      groups.set(key, existing);
    }

    return Array.from(groups.entries()).map(([key, items]) => ({
      key,
      items,
      count: items.length
    }));
  }

  private applyOrderBy(elements: T[]): T[] {
    if (this.orderByFns.length === 0) return elements;

    return [...elements].sort((a, b) => {
      for (const { fn, direction } of this.orderByFns) {
        const aVal = fn(a);
        const bVal = fn(b);

        let comparison = 0;
        if (aVal < bVal) comparison = -1;
        if (aVal > bVal) comparison = 1;

        if (direction === 'DESC') comparison *= -1;

        if (comparison !== 0) return comparison;
      }
      return 0;
    });
  }

  private applyLimitOffset(elements: T[]): T[] {
    const start = this.offsetCount;
    const end = this.limitCount !== undefined ? start + this.limitCount : undefined;
    return elements.slice(start, end);
  }

  private getNestedValue(obj: any, path: string): any {
    const parts = path.split('.');
    let current = obj;
    for (const part of parts) {
      if (current === null || current === undefined) return undefined;
      current = current[part];
    }
    return current;
  }

  // ============================================================
  // SET OPERATIONS
  // ============================================================

  /**
   * DISTINCT - Get unique elements based on a key
   *
   * @example
   * ```typescript
   * query.distinct(item => item.attributes['data-category'])
   * ```
   */
  distinct(keyFn?: (item: T) => any): this {
    const originalExecute = this.execute.bind(this);

    // Override execute to add distinct logic
    (this as any)._executeOverride = () => {
      const results = originalExecute();

      if (!keyFn) {
        // Distinct by reference
        return Array.from(new Set(results));
      }

      // Distinct by key
      const seen = new Set();
      return results.filter(item => {
        const key = keyFn(item);
        const keyStr = JSON.stringify(key);
        if (seen.has(keyStr)) return false;
        seen.add(keyStr);
        return true;
      });
    };

    return this;
  }

  /**
   * UNION - Combine results from two queries (no duplicates)
   */
  union(other: DomQueryBuilder<T>): DomQueryBuilder<T> {
    const newQuery = new DomQueryBuilder<T>();
    const selfResults = this.execute();
    const otherResults = other.execute();

    // Combine and dedupe
    const combined = [...selfResults, ...otherResults];
    const unique = Array.from(new Set(combined));

    newQuery.fromElements(unique);
    return newQuery;
  }

  /**
   * INTERSECT - Get elements that appear in both queries
   */
  intersect(other: DomQueryBuilder<T>): DomQueryBuilder<T> {
    const newQuery = new DomQueryBuilder<T>();
    const selfResults = this.execute();
    const otherResults = new Set(other.execute());

    const intersection = selfResults.filter(item => otherResults.has(item));

    newQuery.fromElements(intersection);
    return newQuery;
  }

  /**
   * EXCEPT - Get elements in this query but not in other query
   */
  except(other: DomQueryBuilder<T>): DomQueryBuilder<T> {
    const newQuery = new DomQueryBuilder<T>();
    const selfResults = this.execute();
    const otherResults = new Set(other.execute());

    const difference = selfResults.filter(item => !otherResults.has(item));

    newQuery.fromElements(difference);
    return newQuery;
  }
}

// ============================================================
// FACTORY FUNCTION
// ============================================================

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
export function domQuery<T = DomElementState>(): DomQueryBuilder<T> {
  return new DomQueryBuilder<T>();
}
