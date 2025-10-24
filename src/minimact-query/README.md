# Minimact Query

**SQL for the DOM** - Query the DOM like a relational database.

Treat the DOM as a reactive, queryable data source with full SQL-like syntax. Built on top of [minimact-punch](../minimact-punch), which makes the DOM a comprehensive state system with 80+ queryable properties.

---

## Installation

```bash
npm install minimact-query minimact-punch
```

---

## Quick Start

```typescript
import { useDomQuery } from 'minimact-query';

function MyComponent() {
  // Query the DOM with SQL-like syntax
  const query = useDomQuery()
    .from('.card')
    .where(card => card.isIntersecting && card.state.hover)
    .orderBy(card => card.history.changeCount, 'DESC')
    .limit(10);

  // SELECT projection in JSX
  return (
    <div>
      {query.select(card => ({
        id: card.attributes.id,
        title: card.textContent,
        changes: card.history.changeCount
      })).map(row => (
        <div key={row.id}>
          {row.title} - {row.changes} changes
        </div>
      ))}
    </div>
  );
}
```

---

## Features

### ✅ Full SQL-Like Syntax
- **SELECT** - Project results to any shape
- **FROM** - Query by CSS selector
- **WHERE** - Filter with predicates
- **JOIN** - Relate elements to each other
- **GROUP BY** - Aggregate elements
- **HAVING** - Filter groups
- **ORDER BY** - Sort results
- **LIMIT/OFFSET** - Pagination
- **DISTINCT** - Unique values
- **UNION/INTERSECT/EXCEPT** - Set operations

### ✅ Aggregate Functions
- `COUNT()` - Count results
- `SUM()` - Sum numeric values
- `AVG()` - Average
- `MIN()` / `MAX()` - Min/max values
- `STDDEV()` - Standard deviation

### ✅ Reactive by Default
- Queries automatically re-run when DOM changes
- Built-in throttling and debouncing options
- Optimized for performance

### ✅ Type-Safe
- Full TypeScript support
- Autocomplete for all DOM properties
- Inferred return types

### ✅ 80+ Queryable Properties
Access all minimact-punch properties:
- **Base**: `isIntersecting`, `childrenCount`, `attributes`, `classList`
- **Pseudo-State**: `state.hover`, `state.focus`, `state.active`
- **Theme**: `theme.isDark`, `theme.reducedMotion`, `breakpoint.md`
- **History**: `history.changeCount`, `history.hasStabilized`, `history.trend`
- **Lifecycle**: `lifecycle.lifecycleState`, `lifecycle.timeInState`

---

## API

### `useDomQuery()`

Reactive React hook that creates a query builder. Automatically re-runs when DOM changes.

```typescript
const query = useDomQuery()
  .from('.selector')
  .where(el => /* predicate */)
  .orderBy(el => /* value */, 'DESC')
  .limit(10);
```

### `useDomQueryThrottled(ms)`

Throttled version - limits re-renders to once every N milliseconds.

```typescript
const query = useDomQueryThrottled(250) // Max 4 updates/second
  .from('.live-data');
```

### `useDomQueryDebounced(ms)`

Debounced version - only re-renders after N milliseconds of inactivity.

```typescript
const query = useDomQueryDebounced(500) // Wait for 500ms quiet
  .from('.search-results');
```

### `useDomQueryStatic()`

Non-reactive version - only runs once.

```typescript
const query = useDomQueryStatic()
  .from('.card');
```

---

## Query Methods

### FROM

Specify which elements to query (CSS selector):

```typescript
query.from('.card')
query.from('#app')
query.from('[data-type="widget"]')
query.from('div.active')
```

### WHERE

Filter elements by predicate:

```typescript
// Single condition
query.where(card => card.state.hover)

// Multiple conditions (chained = AND)
query
  .where(card => card.isIntersecting)
  .where(card => card.childrenCount > 5)
  .where(card => card.lifecycle.lifecycleState === 'visible')

// Complex boolean logic
query.where(card =>
  (card.state.hover || card.state.focus) &&
  card.theme.isDark &&
  card.history.changeCount > 10
)
```

**Shorthand methods:**

```typescript
query.whereEquals('lifecycle.lifecycleState', 'visible')
query.whereGreaterThan('childrenCount', 10)
query.whereLessThan('history.changeCount', 5)
query.whereBetween('childrenCount', 5, 10)
query.whereIn('lifecycle.lifecycleState', ['visible', 'entering'])
```

### JOIN

Relate elements to each other:

```typescript
// INNER JOIN - only matching elements
query
  .from('.card')
  .join(
    useDomQuery().from('.badge'),
    (card, badge) => card.element.contains(badge.element)
  )

// LEFT JOIN - all left elements, matching right or null
query
  .from('.product')
  .leftJoin(
    useDomQuery().from('.review'),
    (product, review) =>
      product.attributes['data-id'] === review.attributes['data-product-id']
  )
```

### GROUP BY

Group elements by a key function:

```typescript
query
  .from('.widget')
  .groupBy(w => w.lifecycle.lifecycleState)

// Access grouped results
query.select(group => ({
  state: group.key,
  count: group.count,
  items: group.items
}))
```

### HAVING

Filter groups after grouping:

```typescript
query
  .from('.product')
  .groupBy(p => p.attributes['data-category'])
  .having(group => group.count > 10) // Only categories with 10+ products
```

### ORDER BY

Sort results:

```typescript
query.orderBy(card => card.history.changeCount, 'DESC')
query.orderBy(card => card.childrenCount, 'ASC')

// Multiple sort keys (chain them)
query
  .orderBy(card => card.attributes.category, 'ASC')
  .orderBy(card => card.history.ageInSeconds, 'DESC')
```

### LIMIT / OFFSET

Pagination:

```typescript
query.limit(10)                    // First 10 results
query.limit(10, 20)                // Skip 20, take 10
query.offset(20).limit(10)         // Same as above
```

### SELECT

Project results to a new shape (called in JSX):

```typescript
{query.select(card => ({
  id: card.attributes.id,
  title: card.textContent,
  isHovered: card.state.hover,
  changes: card.history.changeCount
})).map(row => (
  <div key={row.id}>...</div>
))}
```

### Set Operations

```typescript
// UNION - combine results (no duplicates)
const buttons = useDomQuery().from('button');
const links = useDomQuery().from('a');
const interactive = buttons.union(links);

// INTERSECT - elements in both queries
const hovered = useDomQuery().from('.item').where(el => el.state.hover);
const focused = useDomQuery().from('.item').where(el => el.state.focus);
const both = hovered.intersect(focused);

// EXCEPT - elements in first query but not second
const allCards = useDomQuery().from('.card');
const visible = useDomQuery().from('.card').where(c => c.isIntersecting);
const hidden = allCards.except(visible);

// DISTINCT - unique values
query.distinct(item => item.attributes['data-category'])
```

### Aggregate Functions

```typescript
query.count()                          // Total count
query.sum(card => card.childrenCount)  // Sum
query.avg(card => card.childrenCount)  // Average
query.min(card => card.childrenCount)  // Minimum
query.max(card => card.childrenCount)  // Maximum
query.stddev(card => card.childrenCount) // Standard deviation

query.first()                          // First result or null
query.last()                           // Last result or null

query.any()                            // Has any results?
query.all(card => card.isIntersecting) // All match condition?
query.find(card => card.state.hover)   // Find first matching
```

---

## Real-World Examples

### Dashboard Analytics

```typescript
function DashboardStats() {
  const stats = useDomQuery()
    .from('.metric-card')
    .where(card => card.isIntersecting)
    .groupBy(card => card.lifecycle.lifecycleState);

  return (
    <div>
      {stats.select(group => ({
        state: group.key,
        count: group.count
      })).map(row => (
        <div key={row.state}>
          {row.state}: {row.count} cards
        </div>
      ))}
    </div>
  );
}
```

### Performance Monitoring

```typescript
function PerformanceMonitor() {
  const unstable = useDomQuery()
    .from('.component')
    .where(c => c.history.changesPerSecond > 10)
    .orderBy(c => c.history.volatility, 'DESC');

  return (
    <div>
      {unstable.any() && (
        <Alert>
          {unstable.count()} unstable components detected!
        </Alert>
      )}
    </div>
  );
}
```

### Top 10 Most Active Elements

```typescript
function MostActive() {
  const query = useDomQuery()
    .from('.interactive')
    .orderBy(el => el.history.changeCount, 'DESC')
    .limit(10);

  return (
    <div>
      {query.select(el => ({
        id: el.attributes.id,
        changes: el.history.changeCount
      })).map((row, i) => (
        <div key={row.id}>
          #{i + 1}: {row.id} - {row.changes} changes
        </div>
      ))}
    </div>
  );
}
```

### Accessibility Audit

```typescript
function AccessibilityAudit() {
  const unlabeled = useDomQuery()
    .from('button')
    .where(btn =>
      !btn.attributes['aria-label'] &&
      !btn.textContent?.trim()
    );

  const improperDisabled = useDomQuery()
    .from('input, button')
    .where(el =>
      el.state.disabled &&
      !el.attributes['aria-disabled']
    );

  return (
    <div>
      <p>Unlabeled buttons: {unlabeled.count()}</p>
      <p>Improperly disabled: {improperDisabled.count()}</p>
    </div>
  );
}
```

---

## SQL Equivalents

| Minimact Query | SQL Equivalent |
|---|---|
| `useDomQuery().from('.card')` | `SELECT * FROM .card` |
| `.where(c => c.isIntersecting)` | `WHERE isIntersecting = true` |
| `.orderBy(c => c.childrenCount, 'DESC')` | `ORDER BY childrenCount DESC` |
| `.limit(10)` | `LIMIT 10` |
| `.groupBy(c => c.attributes.category)` | `GROUP BY category` |
| `.having(g => g.count > 10)` | `HAVING COUNT(*) > 10` |
| `.count()` | `SELECT COUNT(*)` |
| `.avg(c => c.childrenCount)` | `SELECT AVG(childrenCount)` |
| `.union(other)` | `UNION` |
| `.intersect(other)` | `INTERSECT` |
| `.except(other)` | `EXCEPT` |

---

## Why This is Brilliant

1. **Familiar Syntax** - If you know SQL, you already know Minimact Query
2. **Type-Safe** - Full TypeScript support with autocomplete
3. **Reactive** - Queries automatically update when DOM changes
4. **Performant** - Optimized execution with throttling/debouncing options
5. **Composable** - Save and reuse queries
6. **Powerful** - 80+ properties from minimact-punch
7. **Clean Separation** - Data fetching in hook, projection in JSX
8. **Production Ready** - Built, tested, documented

---

## Documentation

- [**EXAMPLES.md**](./EXAMPLES.md) - 24 comprehensive examples
- [**DOM_SQL_DESIGN.md**](./DOM_SQL_DESIGN.md) - Architecture and design

---

## The Stack

```
minimact (core framework)
  ↓
minimact-punch (DOM as reactive data source)
  ↓
minimact-query (SQL interface for querying)
```

---

## License

MIT

---

**The DOM is now a relational database.** 🗃️⚡

Query it like PostgreSQL. Make it reactive. Make it type-safe.

**Welcome to the future of DOM interaction.**
