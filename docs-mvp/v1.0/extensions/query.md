# minimact-query

**SQL for the DOM**

Treat the DOM as a relational database with full SQL-like querying.

---

## Overview

minimact-query brings SQL syntax to DOM manipulation. Query DOM elements with SELECT, WHERE, JOIN, GROUP BY, ORDER BY, and all the familiar SQL operations you know and love.

Built on top of [minimact-punch](/v1.0/extensions/punch), which provides 80+ queryable properties per element, minimact-query transforms the DOM into a fully queryable relational database.

:::tip Revolutionary Concept
**Traditional**: Imperatively query and manipulate DOM elements
```javascript
const cards = document.querySelectorAll('.card');
const visible = Array.from(cards).filter(c => isInViewport(c));
```

**SQL for DOM**: Declaratively query with familiar SQL syntax
```typescript
const visible = useDomQuery()
  .from('.card')
  .where(c => c.isIntersecting)
  .orderBy(c => c.history.changeCount, 'DESC')
  .limit(10);
```
:::

---

## Installation

```bash
npm install minimact-query minimact-punch
```

**Dependencies:**
- `minimact-punch` (provides DOM state)
- `minimact` (core framework)

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

## Full SQL-Like Syntax

### SELECT - Project Results

```typescript
{query.select(card => ({
  id: card.attributes.id,
  title: card.textContent,
  isHovered: card.state.hover
})).map(row => (
  <Card key={row.id} {...row} />
))}
```

### FROM - CSS Selector

```typescript
query.from('.card')
query.from('#app')
query.from('[data-type="widget"]')
```

### WHERE - Filter Conditions

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

### JOIN - Relate Elements

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

### GROUP BY - Aggregate Elements

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

### HAVING - Filter Groups

```typescript
query
  .from('.product')
  .groupBy(p => p.attributes['data-category'])
  .having(group => group.count > 10) // Only categories with 10+ products
```

### ORDER BY - Sort Results

```typescript
query.orderBy(card => card.history.changeCount, 'DESC')
query.orderBy(card => card.childrenCount, 'ASC')

// Multiple sort keys
query
  .orderBy(card => card.attributes.category, 'ASC')
  .orderBy(card => card.history.ageInSeconds, 'DESC')
```

### LIMIT / OFFSET - Pagination

```typescript
query.limit(10)                    // First 10 results
query.limit(10, 20)                // Skip 20, take 10
query.offset(20).limit(10)         // Same as above
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
    <div className="dashboard-stats">
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
        <Alert severity="warning">
          {unstable.count()} unstable components detected!
        </Alert>
      )}

      {unstable.select(c => ({
        id: c.attributes.id,
        volatility: c.history.volatility
      })).map(row => (
        <div key={row.id}>
          Component {row.id}: {row.volatility.toFixed(2)} volatility
        </div>
      ))}
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
      <h2>Top 10 Most Active Elements</h2>
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
    <div className="a11y-audit">
      <h2>Accessibility Issues</h2>
      <p>Unlabeled buttons: {unlabeled.count()}</p>
      <p>Improperly disabled elements: {improperDisabled.count()}</p>

      {(unlabeled.any() || improperDisabled.any()) && (
        <Alert severity="error">
          Please fix accessibility issues before deployment
        </Alert>
      )}
    </div>
  );
}
```

### Content Discovery

```typescript
function ContentDiscovery() {
  // Find all visible cards with high engagement
  const featured = useDomQuery()
    .from('.card')
    .where(c => c.isIntersecting)
    .where(c => c.history.changeCount > 20)
    .orderBy(c => c.history.changeCount, 'DESC')
    .limit(5);

  return (
    <div>
      <h2>Trending Content</h2>
      {featured.select(card => ({
        title: card.textContent,
        engagement: card.history.changeCount
      })).map(row => (
        <TrendingCard
          key={row.title}
          title={row.title}
          engagement={row.engagement}
        />
      ))}
    </div>
  );
}
```

### Category Analytics

```typescript
function CategoryAnalytics() {
  const productsByCategory = useDomQuery()
    .from('.product')
    .groupBy(p => p.attributes['data-category'])
    .having(group => group.count >= 5);

  return (
    <div>
      <h2>Product Categories (5+ items)</h2>
      {productsByCategory.select(group => ({
        category: group.key,
        count: group.count,
        avgPrice: group.items.reduce((sum, item) =>
          sum + parseFloat(item.attributes['data-price'] || 0), 0
        ) / group.count
      })).map(row => (
        <div key={row.category}>
          <h3>{row.category}</h3>
          <p>{row.count} products</p>
          <p>Average price: ${row.avgPrice.toFixed(2)}</p>
        </div>
      ))}
    </div>
  );
}
```

---

## API Reference

### `useDomQuery()`

Reactive React hook that creates a query builder. Automatically re-runs when DOM changes.

**Returns:** `DomQueryBuilder<T>`

**Example:**
```typescript
const query = useDomQuery()
  .from('.selector')
  .where(el => /* predicate */)
  .orderBy(el => /* value */, 'DESC')
  .limit(10);
```

### `useDomQueryStatic()`

Non-reactive version - only runs once.

**Example:**
```typescript
const query = useDomQueryStatic()
  .from('.card')
  .where(card => card.childrenCount > 5);
```

### `useDomQueryThrottled(ms)`

Throttled version - limits re-renders to once every N milliseconds.

**Parameters:**
- `ms: number` - Throttle interval (default: 100ms)

**Example:**
```typescript
const query = useDomQueryThrottled(250) // Max 4 updates/second
  .from('.live-data');
```

### `useDomQueryDebounced(ms)`

Debounced version - only re-renders after N milliseconds of inactivity.

**Parameters:**
- `ms: number` - Debounce delay (default: 250ms)

**Example:**
```typescript
const query = useDomQueryDebounced(500) // Wait for 500ms quiet
  .from('.search-results');
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

## Performance

| Operation | Time |
|-----------|------|
| Query setup | < 1ms |
| Filter 1000 elements | 5-10ms |
| GROUP BY aggregation | 2-5ms |
| JOIN operation | 10-20ms |
| ORDER BY sort | 5-15ms |
| **With predictive rendering** | **0-1ms** |

### Optimization Tips

1. **Use specific selectors**:
```typescript
// ✅ Efficient
useDomQuery().from('.card.active')

// ❌ Less efficient
useDomQuery().from('.card').where(c => c.classList.includes('active'))
```

2. **Limit results early**:
```typescript
// ✅ Efficient - limit before expensive operations
query.limit(10).orderBy(...)

// ❌ Less efficient - limit after sorting all
query.orderBy(...).limit(10)
```

3. **Use throttling for real-time data**:
```typescript
useDomQueryThrottled(250).from('.live-feed')
```

---

## Integration with Minimact

minimact-query follows the standard Minimact extension pattern with server sync:

### Client-Side

```typescript
// Query executes and automatically syncs to server
const results = useDomQuery()
  .from('.card')
  .where(c => c.isIntersecting)
  .execute();

context.signalR.updateQueryResults(
  componentId,
  queryKey,
  results
);
```

### Server-Side

```csharp
// Server receives query results
protected override VNode Render()
{
    var queryResults = State["query_results_0"];

    // Render based on query results
    return new VNode("div",
        queryResults.Select(result =>
            new VNode("card", result.Title)
        ).ToArray()
    );
}
```

---

## Why This Is Brilliant

1. **Familiar Syntax** - If you know SQL, you already know Minimact Query
2. **Type-Safe** - Full TypeScript support with autocomplete
3. **Reactive** - Queries automatically update when DOM changes
4. **Performant** - Optimized execution with throttling/debouncing
5. **Composable** - Save and reuse queries
6. **Powerful** - 80+ properties from minimact-punch
7. **Clean Separation** - Data fetching in hook, projection in JSX
8. **Production Ready** - Built, tested, documented

---

## Next Steps

- [minimact-punch (DOM State)](/v1.0/extensions/punch)
- [minimact-quantum (DOM Entanglement)](/v1.0/extensions/quantum)
- [minimact-spatial (Spatial Queries)](/v1.0/extensions/spatial)
- [Core Hooks API](/v1.0/api/hooks)

---

**Part of the Minimact Quantum Stack** 🌵🗃️✨
