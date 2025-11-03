# minimact-punch

**DOM as Reactive Data Source**

Make the DOM itself a first-class reactive data source with 80+ queryable properties.

---

## Overview

minimact-punch extends Minimact with `useDomElementState()` - a hook that transforms the DOM from a simple view layer into a comprehensive, reactive state system.

Traditional frameworks can only react to their own state. minimact-punch lets you react to:

- ✅ Element visibility (IntersectionObserver)
- ✅ DOM mutations (children added/removed)
- ✅ Element size changes (ResizeObserver)
- ✅ Element attributes and classes
- ✅ Statistical aggregations (avg, sum, median)
- ✅ Pseudo-states (hover, focus, active)
- ✅ User preferences (theme, reduced motion)
- ✅ Performance metrics (change tracking, volatility)

And it's **predictively rendered** - patches are pre-computed and cached for instant updates.

---

## Installation

```bash
npm install minimact-punch
```

**Peer dependency:** Requires `minimact ^0.1.0` (installed separately)

---

## Quick Start

### Integrated with Minimact (Recommended)

```tsx
import { useDomElementState } from '@minimact/punch';

export function Gallery() {
  const section = useDomElementState();

  return (
    <div ref={el => section.attachElement(el)}>
      <h2>Image Gallery</h2>

      {/* Lazy load when scrolled into view */}
      {section.isIntersecting && (
        <div>
          <img src="photo1.jpg" />
          <img src="photo2.jpg" />
        </div>
      )}

      {/* Collapse button when too many children */}
      {section.childrenCount > 5 && <CollapseButton />}
    </div>
  );
}
```

### Standalone Mode (No Minimact)

```typescript
import { DomElementState } from '@minimact/punch';

const box = new DomElementState(document.querySelector('.box'));

box.setOnChange((snapshot) => {
  console.log('Children count:', snapshot.childrenCount);
  console.log('Is intersecting:', snapshot.isIntersecting);
});
```

---

## Core Features

### Reactive DOM Properties

Access any DOM property reactively:

```tsx
const box = useDomElementState();

// Viewport
{box.isIntersecting}           // Element in viewport?
{box.intersectionRatio}         // 0-1: how much is visible

// DOM Structure
{box.childrenCount}             // Direct children
{box.grandChildrenCount}        // All descendants
{box.exists}                    // Element in DOM?

// Attributes & Classes
{box.attributes['data-id']}     // Any attribute
{box.classList.includes('active')} // Classes

// Size & Position
{box.boundingRect.width}        // Element dimensions
{box.boundingRect.top}          // Position
```

### Collection Queries

Query multiple elements at once:

```tsx
const items = useDomElementState('.item');

{items.count}                          // Number of elements
{items.some(i => i.isIntersecting)}    // Any visible?
{items.every(i => i.exists)}           // All exist?
{items.filter(i => i.childrenCount > 5)} // Filter
```

### Statistical Aggregations

Perform calculations across collections:

```tsx
const prices = useDomElementState('.price');

{prices.vals.avg()}            // Average: 29.99
{prices.vals.sum()}            // Sum: 149.95
{prices.vals.median()}         // Median: 25.00
{prices.vals.stdDev()}         // Standard deviation
{prices.vals.percentile(95)}   // 95th percentile

{/* Conditional rendering based on statistics */}
{prices.vals.avg() > 50 && <PremiumBadge />}
{prices.vals.sum() > 200 && <BulkDiscount />}
```

### Predictive Rendering

When integrated with Minimact, DOM changes are **predictively rendered**:

1. **Server predicts** likely DOM states (e.g., element will scroll into view)
2. **Patches pre-computed** and sent to client
3. **Client caches patches** in HintQueue
4. **DOM changes** (user scrolls)
5. **🟢 Cache hit** - patches applied instantly (0-1ms, no network!)

---

## API Reference

### `useDomElementState(selector?, options?)`

Creates a reactive DOM element state.

**Parameters:**

- `selector` (optional): CSS selector for collection mode
- `options` (optional): Configuration object
  - `trackIntersection`: Track viewport intersection (default: `true`)
  - `trackMutation`: Track DOM mutations (default: `true`)
  - `trackResize`: Track element resizing (default: `true`)
  - `intersectionOptions`: IntersectionObserver options
  - `debounceMs`: Update debounce time (default: `16` = ~60fps)

**Returns:** `DomElementState` instance

**Example:**
```tsx
const box = useDomElementState('#box', {
  trackIntersection: true,
  trackMutation: true,
  debounceMs: 16
});
```

---

### DomElementState Properties

#### Singular Properties (Single Element)

```typescript
element: HTMLElement              // The HTML element
isIntersecting: boolean           // In viewport?
intersectionRatio: number         // 0-1: visibility ratio
childrenCount: number             // Direct children
grandChildrenCount: number        // All descendants
attributes: Record<string, string> // All attributes
classList: string[]               // All classes
boundingRect: DOMRect             // Position and size
exists: boolean                   // Element in DOM?
textContent: string               // Text content
```

#### Collection Properties (Multiple Elements)

```typescript
elements: HTMLElement[]           // Array of elements
count: number                     // Number of elements
```

#### Extended Properties (80+ Total)

```typescript
// Pseudo-states
state.hover: boolean              // Mouse over
state.focus: boolean              // Has focus
state.active: boolean             // Being activated
state.disabled: boolean           // Disabled state

// Theme & Preferences
theme.isDark: boolean             // Dark mode?
theme.reducedMotion: boolean      // Prefers reduced motion?
breakpoint.xs: boolean            // < 480px
breakpoint.sm: boolean            // < 768px
breakpoint.md: boolean            // < 1024px
breakpoint.lg: boolean            // < 1440px

// History & Performance
history.changeCount: number       // Total changes
history.changesPerSecond: number  // Change rate
history.hasStabilized: boolean    // Stable for 2s?
history.volatility: number        // 0-1: stability score
history.ageInSeconds: number      // Time since creation

// Lifecycle
lifecycle.lifecycleState: string  // 'mounting' | 'visible' | 'hidden'
lifecycle.timeInState: number     // MS in current state
lifecycle.hasEverBeenVisible: boolean
```

---

### DomElementState Methods

#### Collection Methods

```typescript
every(predicate: (item) => boolean): boolean
some(predicate: (item) => boolean): boolean
filter(predicate: (item) => boolean): DomElementState[]
map<T>(fn: (item) => T): T[]
```

#### Statistical Methods

```typescript
vals.avg(): number                // Average
vals.sum(): number                // Sum
vals.min(): number                // Minimum
vals.max(): number                // Maximum
vals.median(): number             // Median
vals.stdDev(): number             // Standard deviation
vals.percentile(n: number): number // Nth percentile
vals.range(): {min: number, max: number}
vals.allAbove(threshold: number): boolean
vals.anyBelow(threshold: number): boolean
```

#### Lifecycle Methods

```typescript
attachElement(element: HTMLElement): void
attachSelector(selector: string): void
attachElements(elements: HTMLElement[]): void
setOnChange(callback: (snapshot) => void): void
destroy(): void                    // Clean up observers
```

---

## Real-World Examples

### Example 1: Lazy Loading

```tsx
function ImageGallery() {
  const section = useDomElementState();

  return (
    <section ref={el => section.attachElement(el)}>
      <h2>Photo Gallery</h2>

      {section.isIntersecting ? (
        <div className="images">
          <img src="photo1.jpg" alt="Photo 1" />
          <img src="photo2.jpg" alt="Photo 2" />
          <img src="photo3.jpg" alt="Photo 3" />
        </div>
      ) : (
        <p>Scroll down to load images...</p>
      )}
    </section>
  );
}
```

### Example 2: Conditional UI Based on Children

```tsx
function Dashboard() {
  const container = useDomElementState();

  return (
    <div ref={el => container.attachElement(el)} className="dashboard">
      <Widget title="Sales" />
      <Widget title="Users" />
      <Widget title="Revenue" />
      <Widget title="Conversions" />

      {/* Show collapse button when too many widgets */}
      {container.childrenCount > 5 && (
        <button className="collapse-btn">
          Collapse Widgets
        </button>
      )}

      {/* Show grid/list toggle based on child count */}
      {container.childrenCount > 3 && (
        <div className="view-toggle">
          <button>Grid View</button>
          <button>List View</button>
        </div>
      )}
    </div>
  );
}
```

### Example 3: Collection Statistics

```tsx
function PricingCalculator() {
  const prices = useDomElementState('.price');

  return (
    <div className="pricing">
      <div className="price" data-value="29.99">
        <h3>Basic</h3>
        <p>$29.99/mo</p>
      </div>
      <div className="price" data-value="45.00">
        <h3>Pro</h3>
        <p>$45.00/mo</p>
      </div>
      <div className="price" data-value="15.50">
        <h3>Starter</h3>
        <p>$15.50/mo</p>
      </div>

      <div className="summary">
        <p>Average: ${prices.vals.avg().toFixed(2)}</p>
        <p>Total: ${prices.vals.sum().toFixed(2)}</p>
        <p>Range: ${prices.vals.min()} - ${prices.vals.max()}</p>

        {prices.vals.avg() > 30 && (
          <span className="badge premium">Premium Range</span>
        )}

        {prices.vals.sum() > 100 && (
          <div className="alert">
            🎉 Volume Discount Available!
          </div>
        )}
      </div>
    </div>
  );
}
```

### Example 4: Collection Queries

```tsx
function TaskList() {
  const tasks = useDomElementState('.task');

  return (
    <div className="task-list">
      <div className="task" data-status="done">
        <input type="checkbox" checked />
        <span>Complete documentation</span>
      </div>
      <div className="task" data-status="pending">
        <input type="checkbox" />
        <span>Write tests</span>
      </div>
      <div className="task" data-status="done">
        <input type="checkbox" checked />
        <span>Deploy to production</span>
      </div>

      {/* All tasks complete celebration */}
      {tasks.every(t => t.attributes['data-status'] === 'done') && (
        <div className="celebration">
          All tasks complete! 🎉
        </div>
      )}

      {/* Pending task warning */}
      {tasks.some(t => t.attributes['data-status'] === 'pending') && (
        <div className="warning">
          ⚠️ You have {tasks.filter(t => t.attributes['data-status'] === 'pending').length} pending tasks
        </div>
      )}

      {/* Progress indicator */}
      <div className="progress">
        {tasks.filter(t => t.attributes['data-status'] === 'done').length} / {tasks.count} complete
      </div>
    </div>
  );
}
```

### Example 5: Infinite Scroll

```tsx
function ArticleList() {
  const sentinel = useDomElementState();
  const [articles, setArticles] = useState([]);
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (sentinel.isIntersecting) {
      // Load more articles when sentinel is visible
      fetch(`/api/articles?page=${page}`)
        .then(res => res.json())
        .then(newArticles => {
          setArticles([...articles, ...newArticles]);
          setPage(page + 1);
        });
    }
  }, [sentinel.isIntersecting]);

  return (
    <div className="article-list">
      {articles.map(article => (
        <Article key={article.id} {...article} />
      ))}

      {/* Sentinel element to trigger loading */}
      <div ref={el => sentinel.attachElement(el)} className="sentinel">
        {sentinel.isIntersecting && <Spinner />}
      </div>
    </div>
  );
}
```

---

## Performance

| Operation | Time |
|-----------|------|
| Property access | < 0.1ms |
| Statistical calculation (100 elements) | 1-2ms |
| Observer setup | < 1ms |
| Change detection | < 1ms |
| **With predictive rendering (cache hit)** | **0-1ms** |

### Optimization Tips

1. **Use debouncing** for high-frequency updates:
```tsx
useDomElementState('.item', { debounceMs: 100 })
```

2. **Disable unused observers**:
```tsx
useDomElementState('.item', {
  trackIntersection: true,
  trackMutation: false,
  trackResize: false
})
```

3. **Use selector mode** for collections:
```tsx
// ✅ Efficient - single observer
useDomElementState('.item')

// ❌ Less efficient - multiple observers
items.map(item => useDomElementState(item))
```

---

## Browser Support

- ✅ Chrome 90+ (IntersectionObserver, MutationObserver, ResizeObserver)
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

**Polyfills for older browsers:**

```html
<script src="https://polyfill.io/v3/polyfill.min.js?features=IntersectionObserver,ResizeObserver"></script>
```

---

## Integration with Minimact

minimact-punch follows the standard Minimact extension pattern:

### Client-Side

```typescript
// Hook evaluates DOM state
const box = useDomElementState('#box');

// Automatically syncs to server
context.signalR.updateDomElementState(
  componentId,
  stateKey,
  {
    isIntersecting: box.isIntersecting,
    childrenCount: box.childrenCount,
    // ... other properties
  }
);
```

### Server-Side

```csharp
// Server receives DOM state
protected override VNode Render()
{
    var domState = State["domElementState_0"];

    // Render based on DOM state
    return new VNode("div",
        domState.IsIntersecting
            ? new VNode("img", new { src = "photo.jpg" })
            : new VNode("p", "Scroll to load...")
    );
}
```

---

## MES Certification

minimact-punch has achieved **MES Silver** certification:

- ✅ Component context integration
- ✅ Index tracking for multiple instances
- ✅ Automatic cleanup on unmount
- ✅ HintQueue integration for predictive rendering
- ✅ TypeScript declarations
- ✅ Comprehensive documentation
- ✅ Unit tests with >80% coverage
- ✅ Server sync protocol

---

## Philosophy

> **"The DOM is not just a view layer."**
>
> **"The DOM is a comprehensive, reactive data source."**

Traditional frameworks treat the DOM as output. minimact-punch treats it as **input** - a first-class reactive data source that your components can query, observe, and react to.

---

## Next Steps

- [minimact-query (SQL for DOM)](/v1.0/extensions/query)
- [minimact-quantum (DOM Entanglement)](/v1.0/extensions/quantum)
- [Core Hooks API](/v1.0/api/hooks)
- [Getting Started](/v1.0/guide/getting-started)

---

**Part of the Minimact Quantum Stack** 🌵🥊✨
