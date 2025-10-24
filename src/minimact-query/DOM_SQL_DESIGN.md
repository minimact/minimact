# DOM SQL - SQL Query Interface for the DOM

## Vision

Treat the DOM as a **relational database** with full SQL query support.

Every element is a **row**. Every property/tracker is a **column**. CSS selectors are **table names**.

---

## Example Queries

```typescript
// Simple SELECT
const cards = useDomQuery(`
  SELECT * FROM .card
  WHERE state.hover = true
`);

// Multiple conditions
const activeModals = useDomQuery(`
  SELECT * FROM .modal
  WHERE lifecycle.lifecycleState = 'visible'
    AND isIntersecting = true
    AND history.changeCount > 5
`);

// Aggregations
const stats = useDomQuery(`
  SELECT
    COUNT(*) as total,
    AVG(childrenCount) as avgChildren,
    SUM(grandChildrenCount) as totalDescendants
  FROM .widget
`);

// GROUP BY
const stateDistribution = useDomQuery(`
  SELECT
    lifecycle.lifecycleState as state,
    COUNT(*) as count
  FROM .modal
  GROUP BY lifecycle.lifecycleState
`);

// ORDER BY + LIMIT
const newest = useDomQuery(`
  SELECT * FROM .notification
  ORDER BY history.firstRendered DESC
  LIMIT 10
`);

// Complex WHERE conditions
const complex = useDomQuery(`
  SELECT * FROM .item
  WHERE (state.hover = true OR state.focus = true)
    AND theme.isDark = true
    AND history.hasStabilized = true
    AND childrenCount BETWEEN 5 AND 10
`);

// HAVING (filter after aggregation)
const popular = useDomQuery(`
  SELECT
    attributes.category as category,
    COUNT(*) as count
  FROM .product
  GROUP BY attributes.category
  HAVING count > 10
`);

// JOIN (parent-child relationships)
const joined = useDomQuery(`
  SELECT parent.*, child.childrenCount
  FROM .parent
  JOIN .child ON parent = child.parentElement
  WHERE parent.theme.isDark = true
`);

// Subqueries
const subquery = useDomQuery(`
  SELECT * FROM .widget
  WHERE childrenCount > (
    SELECT AVG(childrenCount) FROM .widget
  )
`);
```

---

## Schema Design

### Tables
- **Table name** = CSS selector (`.card`, `#app`, `[data-type="foo"]`)
- **Rows** = Matching DOM elements

### Columns (80+ available)

#### Base Properties
- `isIntersecting` (boolean)
- `intersectionRatio` (number 0-1)
- `childrenCount` (number)
- `grandChildrenCount` (number)
- `attributes` (object)
- `classList` (array)
- `exists` (boolean)
- `count` (number)
- `boundingRect` (object with x, y, width, height, top, left, right, bottom)

#### Pseudo-State (state.*)
- `state.hover` (boolean)
- `state.active` (boolean)
- `state.focus` (boolean)
- `state.disabled` (boolean)
- `state.checked` (boolean)
- `state.invalid` (boolean)

#### Theme (theme.*)
- `theme.isDark` (boolean)
- `theme.isLight` (boolean)
- `theme.highContrast` (boolean)
- `theme.reducedMotion` (boolean)

#### Breakpoints (breakpoint.*)
- `breakpoint.sm` (boolean)
- `breakpoint.md` (boolean)
- `breakpoint.lg` (boolean)
- `breakpoint.xl` (boolean)
- `breakpoint.2xl` (boolean)

#### History (history.*)
- `history.changeCount` (number)
- `history.mutationCount` (number)
- `history.renderCount` (number)
- `history.firstRendered` (timestamp)
- `history.lastChanged` (timestamp)
- `history.ageInSeconds` (number)
- `history.timeSinceLastChange` (number)
- `history.changesPerSecond` (number)
- `history.changesPerMinute` (number)
- `history.hasStabilized` (boolean)
- `history.isOscillating` (boolean)
- `history.trend` (string: 'increasing' | 'decreasing' | 'stable' | 'volatile')
- `history.volatility` (number 0-1)
- `history.likelyToChangeNext` (number 0-1)
- `history.estimatedNextChange` (timestamp)

#### Lifecycle (lifecycle.*)
- `lifecycle.lifecycleState` (string)
- `lifecycle.prevLifecycleState` (string)
- `lifecycle.timeInState` (number)
- `lifecycle.stateProgress` (number 0-1)
- `lifecycle.stateDuration` (number)

---

## SQL Syntax Support

### SELECT Clause
```sql
SELECT *                          -- All properties
SELECT element                    -- Just the element reference
SELECT childrenCount, state.hover -- Specific columns
SELECT COUNT(*) as total          -- Aggregation
SELECT AVG(childrenCount)         -- Average
```

### FROM Clause
```sql
FROM .card                        -- Class selector
FROM #app                         -- ID selector
FROM [data-type="foo"]           -- Attribute selector
FROM div.card                     -- Tag + class
```

### WHERE Clause
```sql
WHERE state.hover = true
WHERE childrenCount > 5
WHERE childrenCount BETWEEN 5 AND 10
WHERE lifecycle.lifecycleState IN ('visible', 'entering')
WHERE attributes.category = 'electronics'
WHERE classList CONTAINS 'active'
WHERE state.hover = true OR state.focus = true
WHERE (a = 1 AND b = 2) OR c = 3
```

**Operators:**
- `=`, `!=`, `<>` (not equal)
- `<`, `>`, `<=`, `>=`
- `BETWEEN x AND y`
- `IN (a, b, c)`
- `CONTAINS` (for arrays/objects)
- `AND`, `OR`, `NOT`
- Parentheses for grouping

### GROUP BY Clause
```sql
GROUP BY lifecycle.lifecycleState
GROUP BY attributes.category
GROUP BY theme.isDark
```

### HAVING Clause
```sql
HAVING COUNT(*) > 10
HAVING AVG(childrenCount) > 5
```

### ORDER BY Clause
```sql
ORDER BY history.firstRendered DESC
ORDER BY childrenCount ASC
ORDER BY history.ageInSeconds DESC, childrenCount ASC
```

### LIMIT Clause
```sql
LIMIT 10
LIMIT 5, 10  -- Offset, limit (skip 5, take 10)
```

### JOIN Clause (Advanced)
```sql
FROM .parent
JOIN .child ON parent = child.parentElement
LEFT JOIN .sibling ON parent = sibling.parentElement
```

**Join types:**
- `INNER JOIN` - Only matching elements
- `LEFT JOIN` - All left elements, matching right or null
- `RIGHT JOIN` - All right elements, matching left or null

### Aggregate Functions
- `COUNT(*)` - Count rows
- `COUNT(column)` - Count non-null values
- `AVG(column)` - Average
- `SUM(column)` - Sum
- `MIN(column)` - Minimum
- `MAX(column)` - Maximum
- `STDDEV(column)` - Standard deviation (already have this in vals!)

---

## Architecture

### Phase 1: Parser
```typescript
interface DomSqlQuery {
  select: SelectClause;
  from: FromClause;
  where?: WhereClause;
  groupBy?: GroupByClause;
  having?: HavingClause;
  orderBy?: OrderByClause;
  limit?: LimitClause;
  joins?: JoinClause[];
}

interface SelectClause {
  columns: ColumnExpression[];
}

interface ColumnExpression {
  type: 'property' | 'aggregate' | 'wildcard';
  name?: string;
  path?: string[];  // ['state', 'hover']
  aggregate?: 'COUNT' | 'AVG' | 'SUM' | 'MIN' | 'MAX' | 'STDDEV';
  alias?: string;
}

interface FromClause {
  selector: string;  // CSS selector
}

interface WhereClause {
  conditions: Condition[];
}

interface Condition {
  type: 'comparison' | 'logical' | 'group';
  left?: PropertyPath;
  operator?: '=' | '!=' | '<' | '>' | '<=' | '>=' | 'BETWEEN' | 'IN' | 'CONTAINS';
  right?: any;
  logical?: 'AND' | 'OR' | 'NOT';
  children?: Condition[];
}
```

### Phase 2: Executor
```typescript
class DomSqlExecutor {
  execute(query: DomSqlQuery): DomSqlResult {
    // 1. FROM: Get elements matching selector
    const elements = this.getElements(query.from);

    // 2. JOIN: Combine with joined elements
    const joined = this.applyJoins(elements, query.joins);

    // 3. WHERE: Filter rows
    const filtered = this.applyWhere(joined, query.where);

    // 4. GROUP BY: Group rows
    const grouped = this.applyGroupBy(filtered, query.groupBy);

    // 5. HAVING: Filter groups
    const having = this.applyHaving(grouped, query.having);

    // 6. SELECT: Project columns
    const projected = this.applySelect(having, query.select);

    // 7. ORDER BY: Sort rows
    const sorted = this.applyOrderBy(projected, query.orderBy);

    // 8. LIMIT: Paginate
    const limited = this.applyLimit(sorted, query.limit);

    return limited;
  }

  private getElements(from: FromClause): DomElementState[] {
    return Array.from(document.querySelectorAll(from.selector))
      .map(el => new DomElementState(el as HTMLElement));
  }

  private applyWhere(elements: any[], where?: WhereClause): any[] {
    if (!where) return elements;
    return elements.filter(el => this.evaluateCondition(el, where.conditions));
  }

  private evaluateCondition(element: any, conditions: Condition[]): boolean {
    // Recursive evaluation with AND/OR/NOT support
  }

  private applyGroupBy(elements: any[], groupBy?: GroupByClause): any[] {
    if (!groupBy) return elements;
    // Group elements by property path
  }

  private applySelect(elements: any[], select: SelectClause): any[] {
    // Project columns, apply aggregates
  }
}
```

### Phase 3: React Hook
```typescript
function useDomQuery<T = any>(sql: string): T[] {
  const [results, setResults] = useState<T[]>([]);

  useEffect(() => {
    // Parse SQL
    const query = parseDomSql(sql);

    // Execute query
    const executor = new DomSqlExecutor();
    const result = executor.execute(query);

    setResults(result);

    // Set up reactivity (re-run on DOM changes)
    const observer = new MutationObserver(() => {
      const newResult = executor.execute(query);
      setResults(newResult);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true
    });

    return () => observer.disconnect();
  }, [sql]);

  return results;
}
```

---

## Parser Implementation Strategy

### Option 1: Hand-Written Recursive Descent Parser
**Pros:**
- Full control
- No dependencies
- Lightweight
- Fast

**Cons:**
- More code to write
- Manual error handling

### Option 2: PEG Parser (Peggy/Nearley)
**Pros:**
- Declarative grammar
- Better error messages
- Easier to extend

**Cons:**
- Build step dependency
- Larger bundle

### Recommendation: Start with Option 1
We can write a simple recursive descent parser for SQL. SQL grammar is well-defined and not too complex for basic queries.

---

## Example Usage Scenarios

### 1. Real-time Dashboard
```typescript
const DashboardStats = () => {
  const stats = useDomQuery(`
    SELECT
      lifecycle.lifecycleState as state,
      COUNT(*) as count
    FROM .widget
    GROUP BY lifecycle.lifecycleState
  `);

  return (
    <div>
      {stats.map(row => (
        <div key={row.state}>
          {row.state}: {row.count} widgets
        </div>
      ))}
    </div>
  );
};
```

### 2. Performance Monitoring
```typescript
const PerformanceMonitor = () => {
  const unstable = useDomQuery(`
    SELECT * FROM .component
    WHERE history.changesPerSecond > 10
      OR history.isOscillating = true
    ORDER BY history.volatility DESC
  `);

  return (
    <div>
      {unstable.length > 0 && (
        <Alert>Found {unstable.length} unstable components!</Alert>
      )}
    </div>
  );
};
```

### 3. Accessibility Audit
```typescript
const AccessibilityAudit = () => {
  const issues = useDomQuery(`
    SELECT * FROM button
    WHERE state.disabled = true
      AND attributes.ariaDisabled IS NULL
  `);

  return <AccessibilityReport issues={issues} />;
};
```

### 4. Responsive Layout Analysis
```typescript
const LayoutAnalysis = () => {
  const breakpointStats = useDomQuery(`
    SELECT
      CASE
        WHEN breakpoint.sm THEN 'sm'
        WHEN breakpoint.md THEN 'md'
        WHEN breakpoint.lg THEN 'lg'
      END as breakpoint,
      COUNT(*) as visibleElements
    FROM .card
    WHERE isIntersecting = true
    GROUP BY breakpoint
  `);

  return <BreakpointChart data={breakpointStats} />;
};
```

---

## Server-Side Support

The same query engine works on the server using C# LINQ!

```csharp
public class DomSqlExecutor
{
    public List<object> Execute(string sql)
    {
        var query = ParseDomSql(sql);

        // Use LINQ to execute query
        var elements = GetElements(query.From);

        var result = elements
            .Where(el => EvaluateWhere(el, query.Where))
            .GroupBy(el => GetPropertyValue(el, query.GroupBy))
            .Select(el => ProjectColumns(el, query.Select))
            .OrderBy(el => GetPropertyValue(el, query.OrderBy))
            .Take(query.Limit);

        return result.ToList();
    }
}
```

---

## Future Enhancements

### 1. CASE Statements
```sql
SELECT
  CASE
    WHEN childrenCount > 10 THEN 'large'
    WHEN childrenCount > 5 THEN 'medium'
    ELSE 'small'
  END as size
FROM .card
```

### 2. Window Functions
```sql
SELECT
  *,
  ROW_NUMBER() OVER (ORDER BY history.firstRendered) as rowNum,
  RANK() OVER (PARTITION BY lifecycle.lifecycleState ORDER BY childrenCount DESC) as rank
FROM .widget
```

### 3. CTEs (Common Table Expressions)
```sql
WITH active_cards AS (
  SELECT * FROM .card WHERE state.hover = true
)
SELECT * FROM active_cards
WHERE childrenCount > 5
```

### 4. UNION/INTERSECT/EXCEPT
```sql
SELECT * FROM .card WHERE state.hover = true
UNION
SELECT * FROM .button WHERE state.focus = true
```

### 5. Transactions (Batch Updates)
```sql
UPDATE .card
SET classList = classList.concat('active')
WHERE state.hover = true
```

---

## Performance Considerations

### Indexing
- Cache element lookups by selector
- Index frequently queried properties
- Use WeakMap for element → DomElementState mapping

### Query Optimization
- Push down WHERE conditions (filter early)
- Minimize property access (lazy getters)
- Batch DOM queries (single querySelectorAll)

### Reactivity
- Only re-run query when relevant elements change
- Use MutationObserver with filters
- Debounce query execution

---

## Summary

**DOM SQL** transforms the DOM into a **queryable relational database** with:
- ✅ Full SQL syntax (SELECT, WHERE, JOIN, GROUP BY, ORDER BY, LIMIT)
- ✅ 80+ queryable columns across all trackers
- ✅ Aggregate functions (COUNT, AVG, SUM, MIN, MAX)
- ✅ Reactive queries (auto-updates on DOM changes)
- ✅ Server-side parity (C# LINQ)
- ✅ Type-safe results
- ✅ Framework-agnostic

**This is insane. And I love it.**

---

## Next Steps

1. ✅ Design document (this file)
2. Implement SQL parser
3. Implement query executor
4. Create useDomQuery hook
5. Add server-side support
6. Write tests
7. Documentation and examples
8. Performance optimization
9. Advanced features (CASE, window functions, CTEs)
