// ============================================================
// DomQueryBuilder - The Core Query Engine
// ============================================================
export class DomQueryBuilder {
    constructor() {
        this.elements = [];
        this.whereConditions = [];
        this.orderByFns = [];
        this.offsetCount = 0;
        this.joins = [];
    }
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
    from(selector) {
        this.selector = selector;
        return this;
    }
    /**
     * Query from specific DomElementState instances
     */
    fromElements(elements) {
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
    where(predicate) {
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
    whereEquals(path, value) {
        return this.where(item => this.getNestedValue(item, path) === value);
    }
    /**
     * Shorthand: filter by property greater than
     */
    whereGreaterThan(path, value) {
        return this.where(item => this.getNestedValue(item, path) > value);
    }
    /**
     * Shorthand: filter by property less than
     */
    whereLessThan(path, value) {
        return this.where(item => this.getNestedValue(item, path) < value);
    }
    /**
     * Shorthand: filter by value in array
     */
    whereIn(path, values) {
        return this.where(item => values.includes(this.getNestedValue(item, path)));
    }
    /**
     * Shorthand: filter by value between range
     */
    whereBetween(path, min, max) {
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
    join(other, predicate) {
        this.joins.push({ query: other, predicate, type: 'INNER' });
        return this;
    }
    /**
     * Left join with another query
     */
    leftJoin(other, predicate) {
        this.joins.push({ query: other, predicate, type: 'LEFT' });
        return this;
    }
    /**
     * Right join with another query
     */
    rightJoin(other, predicate) {
        this.joins.push({ query: other, predicate, type: 'RIGHT' });
        return this;
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
    groupBy(keyFn) {
        this.groupByFn = keyFn;
        return this;
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
    having(predicate) {
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
    orderBy(keyFn, direction = 'ASC') {
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
    limit(count, offset = 0) {
        this.limitCount = count;
        this.offsetCount = offset;
        return this;
    }
    /**
     * Skip N results (for pagination)
     */
    offset(count) {
        this.offsetCount = count;
        return this;
    }
    // ============================================================
    // EXECUTE - Run the query
    // ============================================================
    /**
     * Execute the query and return results
     */
    execute() {
        // Step 1: Get base elements
        let results = this.getBaseElements();
        // Step 2: Apply JOINs
        results = this.applyJoins(results);
        // Step 3: Apply WHERE conditions
        results = this.applyWhere(results);
        // Step 4: Apply GROUP BY
        if (this.groupByFn) {
            results = this.applyGroupBy(results);
            // Step 5: Apply HAVING
            if (this.havingCondition) {
                results = results.filter(this.havingCondition);
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
    select(selector) {
        return this.execute().map(selector);
    }
    /**
     * Select all (returns raw results)
     */
    selectAll() {
        return this.execute();
    }
    // ============================================================
    // AGGREGATE FUNCTIONS
    // ============================================================
    /**
     * Count total results
     */
    count() {
        return this.execute().length;
    }
    /**
     * Sum a numeric property
     */
    sum(selector) {
        return this.execute().reduce((sum, item) => sum + selector(item), 0);
    }
    /**
     * Average of a numeric property
     */
    avg(selector) {
        const results = this.execute();
        if (results.length === 0)
            return 0;
        return this.sum(selector) / results.length;
    }
    /**
     * Minimum value
     */
    min(selector) {
        const results = this.execute();
        if (results.length === 0)
            return 0;
        return Math.min(...results.map(selector));
    }
    /**
     * Maximum value
     */
    max(selector) {
        const results = this.execute();
        if (results.length === 0)
            return 0;
        return Math.max(...results.map(selector));
    }
    /**
     * Standard deviation
     */
    stddev(selector) {
        const results = this.execute();
        if (results.length === 0)
            return 0;
        const avg = this.avg(selector);
        const squareDiffs = results.map(item => Math.pow(selector(item) - avg, 2));
        const avgSquareDiff = squareDiffs.reduce((sum, val) => sum + val, 0) / results.length;
        return Math.sqrt(avgSquareDiff);
    }
    /**
     * First result (or null)
     */
    first() {
        const results = this.execute();
        return results.length > 0 ? results[0] : null;
    }
    /**
     * Last result (or null)
     */
    last() {
        const results = this.execute();
        return results.length > 0 ? results[results.length - 1] : null;
    }
    // ============================================================
    // UTILITY FUNCTIONS
    // ============================================================
    /**
     * Check if any results match
     */
    any() {
        return this.execute().length > 0;
    }
    /**
     * Check if all items match a condition
     */
    all(predicate) {
        return this.execute().every(predicate);
    }
    /**
     * Find first item matching condition
     */
    find(predicate) {
        return this.execute().find(predicate) ?? null;
    }
    // ============================================================
    // PRIVATE HELPERS
    // ============================================================
    getBaseElements() {
        if (this.elements.length > 0) {
            return [...this.elements];
        }
        if (this.selector) {
            // In browser: query DOM
            if (typeof document !== 'undefined') {
                // Dynamic import for minimact-punch
                // This will be resolved at runtime when used in a bundled app
                const nodeList = document.querySelectorAll(this.selector);
                return Array.from(nodeList);
            }
        }
        return [];
    }
    applyJoins(elements) {
        if (this.joins.length === 0)
            return elements;
        let results = elements;
        for (const join of this.joins) {
            const rightElements = join.query.execute();
            const joined = [];
            if (join.type === 'INNER') {
                for (const left of results) {
                    for (const right of rightElements) {
                        if (join.predicate(left, right)) {
                            joined.push({ ...left, joined: right });
                        }
                    }
                }
            }
            else if (join.type === 'LEFT') {
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
            }
            else if (join.type === 'RIGHT') {
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
    applyWhere(elements) {
        let results = elements;
        for (const condition of this.whereConditions) {
            results = results.filter(condition);
        }
        return results;
    }
    applyGroupBy(elements) {
        if (!this.groupByFn)
            return elements;
        const groups = new Map();
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
    applyOrderBy(elements) {
        if (this.orderByFns.length === 0)
            return elements;
        return [...elements].sort((a, b) => {
            for (const { fn, direction } of this.orderByFns) {
                const aVal = fn(a);
                const bVal = fn(b);
                let comparison = 0;
                if (aVal < bVal)
                    comparison = -1;
                if (aVal > bVal)
                    comparison = 1;
                if (direction === 'DESC')
                    comparison *= -1;
                if (comparison !== 0)
                    return comparison;
            }
            return 0;
        });
    }
    applyLimitOffset(elements) {
        const start = this.offsetCount;
        const end = this.limitCount !== undefined ? start + this.limitCount : undefined;
        return elements.slice(start, end);
    }
    getNestedValue(obj, path) {
        const parts = path.split('.');
        let current = obj;
        for (const part of parts) {
            if (current === null || current === undefined)
                return undefined;
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
    distinct(keyFn) {
        const originalExecute = this.execute.bind(this);
        // Override execute to add distinct logic
        this._executeOverride = () => {
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
                if (seen.has(keyStr))
                    return false;
                seen.add(keyStr);
                return true;
            });
        };
        return this;
    }
    /**
     * UNION - Combine results from two queries (no duplicates)
     */
    union(other) {
        const newQuery = new DomQueryBuilder();
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
    intersect(other) {
        const newQuery = new DomQueryBuilder();
        const selfResults = this.execute();
        const otherResults = new Set(other.execute());
        const intersection = selfResults.filter(item => otherResults.has(item));
        newQuery.fromElements(intersection);
        return newQuery;
    }
    /**
     * EXCEPT - Get elements in this query but not in other query
     */
    except(other) {
        const newQuery = new DomQueryBuilder();
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
export function domQuery() {
    return new DomQueryBuilder();
}
