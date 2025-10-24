# Minimact Query - Examples

**SQL for the DOM** - Comprehensive examples of querying DOM state like a database.

---

## Table of Contents
1. [Basic Queries](#basic-queries)
2. [WHERE Clauses](#where-clauses)
3. [JOIN Operations](#join-operations)
4. [GROUP BY and Aggregation](#group-by-and-aggregation)
5. [ORDER BY and LIMIT](#order-by-and-limit)
6. [Set Operations](#set-operations)
7. [Real-World Examples](#real-world-examples)

---

## Basic Queries

### 1. Simple SELECT

```typescript
import { useDomQuery } from 'minimact-query';

function CardList() {
  const query = useDomQuery().from('.card');

  return (
    <div>
      {query.select(card => ({
        id: card.attributes.id,
        title: card.attributes.title
      })).map(row => (
        <div key={row.id}>{row.title}</div>
      ))}
    </div>
  );
}
```

**SQL Equivalent:**
```sql
SELECT id, title FROM .card
```

---

## WHERE Clauses

### 2. Filter by Single Condition

```typescript
function VisibleCards() {
  const query = useDomQuery()
    .from('.card')
    .where(card => card.isIntersecting);

  return (
    <div>
      {query.select(card => card.attributes.id).map(id => (
        <div key={id}>Card {id} is visible</div>
      ))}
    </div>
  );
}
```

**SQL Equivalent:**
```sql
SELECT id FROM .card WHERE isIntersecting = true
```

### 3. Multiple WHERE Conditions

```typescript
function ActiveHoveredCards() {
  const query = useDomQuery()
    .from('.card')
    .where(card => card.state.hover)
    .where(card => card.lifecycle.lifecycleState === 'active')
    .where(card => card.childrenCount > 3);

  return <CardGrid cards={query.selectAll()} />;
}
```

**SQL Equivalent:**
```sql
SELECT * FROM .card
WHERE state.hover = true
  AND lifecycle.lifecycleState = 'active'
  AND childrenCount > 3
```

### 4. Complex Boolean Logic

```typescript
function ConditionalCards() {
  const query = useDomQuery()
    .from('.card')
    .where(card =>
      (card.state.hover || card.state.focus) &&
      card.theme.isDark &&
      card.history.changeCount > 10
    );

  return <div>{query.count()} active cards</div>;
}
```

**SQL Equivalent:**
```sql
SELECT COUNT(*) FROM .card
WHERE (state.hover = true OR state.focus = true)
  AND theme.isDark = true
  AND history.changeCount > 10
```

### 5. WHERE Shorthands

```typescript
function ShorthandQueries() {
  // whereEquals - property equality
  const visible = useDomQuery()
    .from('.modal')
    .whereEquals('lifecycle.lifecycleState', 'visible');

  // whereGreaterThan - numeric comparison
  const large = useDomQuery()
    .from('.widget')
    .whereGreaterThan('childrenCount', 10);

  // whereBetween - range
  const medium = useDomQuery()
    .from('.box')
    .whereBetween('childrenCount', 5, 10);

  // whereIn - value in array
  const active = useDomQuery()
    .from('.component')
    .whereIn('lifecycle.lifecycleState', ['visible', 'entering', 'active']);

  return <div>...</div>;
}
```

---

## JOIN Operations

### 6. INNER JOIN - Parent-Child Relationship

```typescript
function CardsWithBadges() {
  const query = useDomQuery()
    .from('.card')
    .join(
      useDomQuery().from('.badge'),
      (card, badge) => card.element.contains(badge.element)
    );

  return (
    <div>
      {query.select(card => ({
        cardId: card.attributes.id,
        badgeCount: card.joined.length,
        badges: card.joined.map(b => b.textContent)
      })).map(row => (
        <div key={row.cardId}>
          {row.cardId}: {row.badgeCount} badges
          <ul>
            {row.badges.map((badge, i) => <li key={i}>{badge}</li>)}
          </ul>
        </div>
      ))}
    </div>
  );
}
```

**SQL Equivalent:**
```sql
SELECT
  card.id as cardId,
  COUNT(badge.*) as badgeCount,
  ARRAY_AGG(badge.textContent) as badges
FROM .card
INNER JOIN .badge ON card CONTAINS badge
GROUP BY card.id
```

### 7. LEFT JOIN - Optional Relationships

```typescript
function ProductsWithOptionalReviews() {
  const query = useDomQuery()
    .from('.product')
    .leftJoin(
      useDomQuery().from('.review'),
      (product, review) =>
        product.attributes['data-product-id'] === review.attributes['data-product-id']
    );

  return (
    <div>
      {query.select(product => ({
        name: product.attributes.name,
        reviewCount: product.joined ? product.joined.length : 0,
        hasReviews: product.joined !== null
      })).map(row => (
        <div key={row.name}>
          {row.name} - {row.reviewCount} reviews
          {!row.hasReviews && <span> (No reviews yet)</span>}
        </div>
      ))}
    </div>
  );
}
```

---

## GROUP BY and Aggregation

### 8. GROUP BY with COUNT

```typescript
function LifecycleDistribution() {
  const query = useDomQuery()
    .from('.widget')
    .groupBy(w => w.lifecycle.lifecycleState);

  return (
    <div>
      <h2>Widgets by Lifecycle State</h2>
      {query.select(group => ({
        state: group.key,
        count: group.count
      })).map(row => (
        <div key={row.state}>
          {row.state}: {row.count} widgets
        </div>
      ))}
    </div>
  );
}
```

**SQL Equivalent:**
```sql
SELECT
  lifecycle.lifecycleState as state,
  COUNT(*) as count
FROM .widget
GROUP BY lifecycle.lifecycleState
```

### 9. GROUP BY with Custom Aggregations

```typescript
function CategoryStats() {
  const query = useDomQuery()
    .from('.product')
    .groupBy(p => p.attributes['data-category']);

  return (
    <div>
      {query.select(group => ({
        category: group.key,
        count: group.count,
        avgChildren: group.items.reduce((sum, item) =>
          sum + item.childrenCount, 0) / group.count,
        totalDescendants: group.items.reduce((sum, item) =>
          sum + item.grandChildrenCount, 0)
      })).map(row => (
        <div key={row.category}>
          <h3>{row.category}</h3>
          <p>{row.count} products</p>
          <p>Avg children: {row.avgChildren.toFixed(1)}</p>
          <p>Total descendants: {row.totalDescendants}</p>
        </div>
      ))}
    </div>
  );
}
```

### 10. HAVING - Filter Groups

```typescript
function PopularCategories() {
  const query = useDomQuery()
    .from('.product')
    .groupBy(p => p.attributes['data-category'])
    .having(group => group.count > 10);

  return (
    <div>
      <h2>Popular Categories (10+ products)</h2>
      {query.select(group => ({
        category: group.key,
        count: group.count
      })).map(row => (
        <div key={row.category}>
          {row.category}: {row.count} products
        </div>
      ))}
    </div>
  );
}
```

**SQL Equivalent:**
```sql
SELECT
  category,
  COUNT(*) as count
FROM .product
GROUP BY category
HAVING COUNT(*) > 10
```

---

## ORDER BY and LIMIT

### 11. Simple Sorting

```typescript
function NewestCards() {
  const query = useDomQuery()
    .from('.card')
    .orderBy(card => card.history.firstRendered, 'DESC');

  return (
    <div>
      {query.select(card => ({
        id: card.attributes.id,
        age: card.history.ageInSeconds
      })).map(row => (
        <div key={row.id}>
          Card {row.id} - {row.age}s old
        </div>
      ))}
    </div>
  );
}
```

**SQL Equivalent:**
```sql
SELECT id, ageInSeconds
FROM .card
ORDER BY history.firstRendered DESC
```

### 12. Top N with LIMIT

```typescript
function Top10MostActive() {
  const query = useDomQuery()
    .from('.interactive-element')
    .where(el => el.history.changeCount > 0)
    .orderBy(el => el.history.changeCount, 'DESC')
    .limit(10);

  return (
    <div>
      <h2>Top 10 Most Active Elements</h2>
      {query.select((el, index) => ({
        rank: index + 1,
        id: el.attributes.id,
        changes: el.history.changeCount
      })).map(row => (
        <div key={row.id}>
          #{row.rank}: {row.id} - {row.changes} changes
        </div>
      ))}
    </div>
  );
}
```

### 13. Pagination with OFFSET

```typescript
function PaginatedCards({ page = 0, pageSize = 10 }) {
  const query = useDomQuery()
    .from('.card')
    .orderBy(card => card.attributes.id, 'ASC')
    .limit(pageSize, page * pageSize);

  return (
    <div>
      <h2>Page {page + 1}</h2>
      {query.select(card => card.attributes.id).map(id => (
        <div key={id}>Card {id}</div>
      ))}
    </div>
  );
}
```

**SQL Equivalent:**
```sql
SELECT id FROM .card
ORDER BY id ASC
LIMIT 10 OFFSET 0  -- Page 1
```

---

## Set Operations

### 14. UNION - Combine Multiple Queries

```typescript
function InteractiveElements() {
  const buttons = useDomQuery().from('button');
  const links = useDomQuery().from('a');

  const interactive = buttons.union(links);

  return (
    <div>
      <h2>All Interactive Elements: {interactive.count()}</h2>
      {interactive.select(el => ({
        tag: el.element.tagName,
        id: el.attributes.id
      })).map(row => (
        <div key={row.id}>
          {row.tag}: {row.id}
        </div>
      ))}
    </div>
  );
}
```

**SQL Equivalent:**
```sql
SELECT * FROM button
UNION
SELECT * FROM a
```

### 15. INTERSECT - Find Common Elements

```typescript
function HoveredAndFocused() {
  const hovered = useDomQuery()
    .from('.interactive')
    .where(el => el.state.hover);

  const focused = useDomQuery()
    .from('.interactive')
    .where(el => el.state.focus);

  const both = hovered.intersect(focused);

  return <div>{both.count()} elements both hovered and focused</div>;
}
```

### 16. EXCEPT - Set Difference

```typescript
function NotIntersectingCards() {
  const allCards = useDomQuery().from('.card');

  const intersectingCards = useDomQuery()
    .from('.card')
    .where(card => card.isIntersecting);

  const hiddenCards = allCards.except(intersectingCards);

  return <div>{hiddenCards.count()} hidden cards</div>;
}
```

### 17. DISTINCT - Unique Values

```typescript
function UniqueCategories() {
  const query = useDomQuery()
    .from('.product')
    .distinct(p => p.attributes['data-category']);

  return (
    <div>
      {query.select(p => p.attributes['data-category']).map(category => (
        <div key={category}>{category}</div>
      ))}
    </div>
  );
}
```

---

## Real-World Examples

### 18. Dashboard Analytics

```typescript
function DashboardAnalytics() {
  const metrics = useDomQuery()
    .from('.metric-card')
    .where(card => card.isIntersecting)
    .where(card => card.theme.isDark)
    .join(
      useDomQuery().from('.chart'),
      (card, chart) => card.attributes['data-chart-id'] === chart.attributes.id
    )
    .orderBy(card => card.history.ageInSeconds, 'ASC')
    .limit(5);

  return (
    <div>
      {metrics.select(card => ({
        title: card.querySelector('h3')?.textContent,
        value: card.querySelector('.value')?.textContent,
        hasChart: card.joined.length > 0,
        age: card.history.ageInSeconds
      })).map(row => (
        <MetricCard key={row.title} {...row} />
      ))}
    </div>
  );
}
```

### 19. Performance Monitoring

```typescript
function PerformanceMonitor() {
  const unstableComponents = useDomQuery()
    .from('.component')
    .where(c => c.history.changesPerSecond > 10 || c.history.isOscillating)
    .orderBy(c => c.history.volatility, 'DESC');

  const renderLoops = useDomQuery()
    .from('.component')
    .where(c => c.history.changeCount > 100 && c.history.ageInSeconds < 10);

  return (
    <div>
      <h2>Performance Issues</h2>

      {unstableComponents.any() && (
        <Alert type="warning">
          {unstableComponents.count()} unstable components detected
        </Alert>
      )}

      {renderLoops.any() && (
        <Alert type="error">
          {renderLoops.count()} potential render loops detected
        </Alert>
      )}

      <h3>Most Volatile Components</h3>
      {unstableComponents.select(c => ({
        id: c.attributes.id,
        changes: c.history.changeCount,
        volatility: c.history.volatility,
        changesPerSec: c.history.changesPerSecond
      })).map(row => (
        <div key={row.id}>
          {row.id}: {row.changes} changes, {row.volatility.toFixed(2)} volatility
        </div>
      ))}
    </div>
  );
}
```

### 20. Accessibility Audit

```typescript
function AccessibilityAudit() {
  // Find buttons without aria-label
  const unlabeledButtons = useDomQuery()
    .from('button')
    .where(btn =>
      !btn.attributes['aria-label'] &&
      !btn.textContent?.trim()
    );

  // Find disabled inputs without aria-disabled
  const improperDisabled = useDomQuery()
    .from('input, button')
    .where(el =>
      el.state.disabled &&
      !el.attributes['aria-disabled']
    );

  // Find focusable elements with tabindex < 0
  const unfocusable = useDomQuery()
    .from('[tabindex]')
    .where(el => parseInt(el.attributes.tabindex || '0') < 0);

  return (
    <div>
      <h2>Accessibility Issues</h2>

      <Section title="Unlabeled Buttons" count={unlabeledButtons.count()}>
        {unlabeledButtons.select(btn => ({
          id: btn.attributes.id || 'unknown',
          html: btn.element.outerHTML
        })).map(row => (
          <code key={row.id}>{row.html}</code>
        ))}
      </Section>

      <Section title="Improperly Disabled" count={improperDisabled.count()}>
        {improperDisabled.select(el => el.attributes.id).map(id => (
          <div key={id}>{id}</div>
        ))}
      </Section>
    </div>
  );
}
```

### 21. Responsive Layout Analysis

```typescript
function ResponsiveLayoutAnalysis() {
  const query = useDomQuery()
    .from('.card')
    .where(card => card.isIntersecting);

  const stats = query.select(card => {
    let breakpoint = 'xs';
    if (card.breakpoint['2xl']) breakpoint = '2xl';
    else if (card.breakpoint.xl) breakpoint = 'xl';
    else if (card.breakpoint.lg) breakpoint = 'lg';
    else if (card.breakpoint.md) breakpoint = 'md';
    else if (card.breakpoint.sm) breakpoint = 'sm';

    return { breakpoint };
  });

  // Count by breakpoint
  const distribution = stats.reduce((acc, { breakpoint }) => {
    acc[breakpoint] = (acc[breakpoint] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div>
      <h2>Visible Cards by Breakpoint</h2>
      {Object.entries(distribution).map(([bp, count]) => (
        <div key={bp}>
          {bp}: {count} cards
        </div>
      ))}
    </div>
  );
}
```

### 22. Data Freshness Monitor

```typescript
function DataFreshnessMonitor() {
  const staleData = useDomQuery()
    .from('[data-cached="true"]')
    .where(el => el.history.timeSinceLastChange > 60000); // 1 minute

  const recentlyUpdated = useDomQuery()
    .from('[data-cached="true"]')
    .where(el => el.history.updatedInLast(5000)) // 5 seconds
    .orderBy(el => el.history.lastChanged, 'DESC')
    .limit(10);

  return (
    <div>
      <h2>Data Freshness</h2>

      {staleData.any() && (
        <Alert type="warning">
          {staleData.count()} stale data elements (>1min old)
        </Alert>
      )}

      <h3>Recently Updated</h3>
      {recentlyUpdated.select(el => ({
        id: el.attributes.id,
        timeSinceUpdate: el.history.timeSinceLastChange
      })).map(row => (
        <div key={row.id}>
          {row.id}: updated {row.timeSinceUpdate}ms ago
        </div>
      ))}
    </div>
  );
}
```

### 23. Lifecycle State Machine Visualization

```typescript
function LifecycleVisualizer() {
  const stateDistribution = useDomQuery()
    .from('[data-lifecycle]')
    .groupBy(el => el.lifecycle.lifecycleState);

  const recentTransitions = useDomQuery()
    .from('[data-lifecycle]')
    .where(el => el.lifecycle.timeInState < 1000) // Transitioned recently
    .orderBy(el => el.lifecycle.timeInState, 'ASC')
    .limit(10);

  return (
    <div>
      <h2>Lifecycle State Visualization</h2>

      <h3>State Distribution</h3>
      {stateDistribution.select(group => ({
        state: group.key,
        count: group.count,
        avgTimeInState: group.items.reduce((sum, item) =>
          sum + item.lifecycle.timeInState, 0) / group.count
      })).map(row => (
        <div key={row.state}>
          <strong>{row.state}</strong>: {row.count} elements
          (avg {(row.avgTimeInState / 1000).toFixed(1)}s)
        </div>
      ))}

      <h3>Recent Transitions</h3>
      {recentTransitions.select(el => ({
        id: el.attributes.id,
        currentState: el.lifecycle.lifecycleState,
        previousState: el.lifecycle.prevLifecycleState,
        timeInState: el.lifecycle.timeInState
      })).map(row => (
        <div key={row.id}>
          {row.id}: {row.previousState} → {row.currentState}
          ({row.timeInState}ms ago)
        </div>
      ))}
    </div>
  );
}
```

### 24. Aggregation Statistics Panel

```typescript
function StatisticsPanel() {
  const cards = useDomQuery().from('.card');
  const buttons = useDomQuery().from('button');
  const inputs = useDomQuery().from('input');

  return (
    <div>
      <h2>DOM Statistics</h2>

      <StatRow label="Total Cards" value={cards.count()} />

      <StatRow
        label="Average Card Children"
        value={cards.avg(c => c.childrenCount).toFixed(1)}
      />

      <StatRow
        label="Total Descendants"
        value={cards.sum(c => c.grandChildrenCount)}
      />

      <StatRow
        label="Most Children"
        value={cards.max(c => c.childrenCount)}
      />

      <StatRow
        label="Least Children"
        value={cards.min(c => c.childrenCount)}
      />

      <StatRow
        label="Hovered Buttons"
        value={buttons.where(b => b.state.hover).count()}
      />

      <StatRow
        label="Focused Inputs"
        value={inputs.where(i => i.state.focus).count()}
      />

      <StatRow
        label="Visible Cards"
        value={cards.where(c => c.isIntersecting).count()}
      />
    </div>
  );
}
```

---

## Advanced Patterns

### 25. Subqueries

```typescript
function AboveAverageCards() {
  // Calculate average first
  const avgChildren = useDomQuery()
    .from('.card')
    .avg(c => c.childrenCount);

  // Use in WHERE clause
  const query = useDomQuery()
    .from('.card')
    .where(card => card.childrenCount > avgChildren);

  return (
    <div>
      <p>Average children: {avgChildren.toFixed(1)}</p>
      <p>{query.count()} cards above average</p>
    </div>
  );
}
```

### 26. Reactive Performance Optimization

```typescript
import { useDomQueryThrottled, useDomQueryDebounced } from 'minimact-query';

function PerformanceOptimized() {
  // Throttled - max 10 updates per second
  const liveQuery = useDomQueryThrottled(100)
    .from('.live-data')
    .where(el => el.isIntersecting);

  // Debounced - only updates after 500ms of quiet
  const searchQuery = useDomQueryDebounced(500)
    .from('.search-result')
    .where(el => el.textContent?.includes(searchTerm));

  return <div>...</div>;
}
```

---

## Summary

**Minimact Query** brings SQL-like querying to the DOM with:
- ✅ Full SQL syntax (SELECT, WHERE, JOIN, GROUP BY, ORDER BY, LIMIT)
- ✅ Set operations (UNION, INTERSECT, EXCEPT, DISTINCT)
- ✅ Aggregations (COUNT, SUM, AVG, MIN, MAX, STDDEV)
- ✅ Type-safe fluent API
- ✅ Reactive updates (useDomQuery hook)
- ✅ Performance controls (throttling, debouncing)
- ✅ 80+ queryable properties from minimact-punch

**The DOM is now a relational database.** 🗃️⚡
