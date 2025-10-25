# 📐 minimact-spatial

**Spatial Computing for the Web**

Query the viewport as a 2D database. Turn spatial regions into reactive data sources.

---

## The Concept

Instead of tracking **elements**, track **spatial regions** of the viewport:

```typescript
const header = useArea({ top: 0, height: 80 });
const sidebar = useArea('#sidebar');
const viewport = useArea('viewport');

// Query what's IN the area
console.log(header.elementsCount);           // 5
console.log(header.coverage);                // 0.85 (85% covered)
console.log(header.isEmpty);                 // false

// Reactive rendering
{header.isFull && <CompactMode />}
{sidebar.elementsCount > 10 && <ScrollIndicator />}
{viewport.isSparse && <EmptyStateMessage />}
```

---

## Installation

```bash
npm install minimact-spatial
```

---

## Quick Start

```typescript
import { useArea } from 'minimact-spatial';

function Dashboard() {
  // Define spatial areas
  const header = useArea({ top: 0, height: 80 });
  const main = useArea('#main-content');
  const footer = useArea({ bottom: 0, height: 60 });

  return (
    <div>
      <p>Header has {header.elementsCount} elements</p>
      <p>Main content coverage: {(main.coverage * 100).toFixed(0)}%</p>
      <p>Footer is {footer.isEmpty ? 'empty' : 'filled'}</p>
    </div>
  );
}
```

---

## API

### `useArea(definition, options)`

Create a reactive spatial region.

**Definition types:**
```typescript
// 1. Selector
useArea('#sidebar')
useArea('.card')

// 2. Keywords
useArea('viewport')  // Current viewport
useArea('window')    // Same as viewport
useArea('document')  // Entire document

// 3. Bounds
useArea({
  top: 0,
  left: 0,
  width: 250,
  height: '100vh'
})

// 4. Element
const el = document.querySelector('#box');
useArea(el)
```

**Options:**
```typescript
{
  elementFilter?: (el: Element) => boolean;  // Filter which elements to track
  minElementSize?: number;                   // Ignore small elements (px²)
  trackScroll?: boolean;                     // Update on scroll (default: true)
  trackResize?: boolean;                     // Update on resize (default: true)
  trackMutations?: boolean;                  // Update on DOM changes
  throttle?: number;                         // Throttle updates (ms)
  debugLogging?: boolean;                    // Enable debug logs
}
```

---

## AreaState Properties

### Geometry

```typescript
area.bounds         // { top, left, width, height, right, bottom }
area.width          // Width in pixels
area.height         // Height in pixels
area.area           // Total area (px²)
area.center         // { x, y } center point
```

### Element Queries

```typescript
area.elementsFullyEnclosed      // Element[] - fully inside
area.elementsPartiallyEnclosed  // Element[] - partially overlapping
area.elementsAll                // Element[] - all (fully + partial)
area.elementsCount              // Total count
area.elementsFullyCount         // Fully enclosed count
area.elementsPartiallyCount     // Partially enclosed count
```

### Coverage Analysis

```typescript
area.coverage          // 0.0-1.0 (0% to 100%)
area.totalPixelsCovered  // Pixels covered by elements
area.emptySpace        // Empty pixels
area.emptyRatio        // 0.0-1.0 (empty ratio)
```

### Element Statistics

```typescript
area.elementDensity     // Elements per 1000px²
area.averageElementSize // Average size (px²)
area.largestElement     // Largest element in area
area.smallestElement    // Smallest element in area
```

### Spatial Methods

```typescript
area.intersects(otherArea)         // boolean
area.intersectionRatio(otherArea)  // 0.0-1.0
area.intersectionArea(otherArea)   // px²
area.contains(element)             // boolean
area.overlaps(element)             // boolean
area.distance(otherArea)           // pixels (edge-to-edge)
area.centerDistance(otherArea)     // pixels (center-to-center)
```

### Query Methods

```typescript
area.getElementsByTag('div')
area.getElementsByClass('card')
area.querySelector('.active')
area.querySelectorAll('.item')
```

### Viewport Queries

```typescript
area.isInViewport    // Is area currently visible?
area.visibleRatio    // 0.0-1.0 (how much is visible)
area.visiblePixels   // Visible pixels
```

### State Flags

```typescript
area.isEmpty    // No elements in area
area.isFull     // High coverage (> 80%)
area.isSparse   // Low density (< 5 elements per 1000px²)
```

---

## Examples

### 1. Collision Detection

```typescript
function DragAndDrop() {
  const dropZone = useArea('#drop-zone');
  const draggedItem = useArea('#dragged-item');

  const isOverDropZone = dropZone.intersects(draggedItem);

  return (
    <div>
      <div id="drop-zone" className={isOverDropZone ? 'highlight' : ''}>
        Drop Here
      </div>
      <div id="dragged-item" draggable>
        Drag Me
      </div>
    </div>
  );
}
```

### 2. Viewport Sections

```typescript
function LazyLoader() {
  const aboveFold = useArea({ top: 0, height: '100vh' });
  const belowFold = useArea({ top: '100vh', height: '100vh' });

  console.log('Immediately visible:', aboveFold.elementsCount);
  console.log('Coming into view:', belowFold.elementsPartiallyCount);

  return (
    <div>
      {aboveFold.coverage < 0.5 && (
        <div>Low content above fold! Add more.</div>
      )}
    </div>
  );
}
```

### 3. Heat Map Grid

```typescript
function HeatMap() {
  // Create 4x4 grid
  const grid = Array.from({ length: 16 }, (_, i) => {
    const row = Math.floor(i / 4);
    const col = i % 4;

    return useArea({
      top: `${row * 25}%`,
      left: `${col * 25}%`,
      width: '25%',
      height: '25%'
    });
  });

  // Find hottest region
  const hottest = grid.reduce((max, area) =>
    area.coverage > max.coverage ? area : max
  );

  return (
    <div className="heat-map">
      {grid.map((area, i) => (
        <div
          key={i}
          className="grid-cell"
          style={{
            background: `rgba(255, 0, 0, ${area.coverage})`,
            border: area === hottest ? '3px solid red' : 'none'
          }}
        >
          {(area.coverage * 100).toFixed(0)}%
        </div>
      ))}
    </div>
  );
}
```

### 4. Scroll Progress

```typescript
function ScrollProgress() {
  const article = useArea('#article');
  const viewport = useArea('viewport');

  const scrollProgress = article.intersectionRatio(viewport);

  return (
    <div className="progress-bar">
      <div
        className="progress-fill"
        style={{ width: `${scrollProgress * 100}%` }}
      />
      <span>{(scrollProgress * 100).toFixed(0)}% read</span>
    </div>
  );
}
```

### 5. Dynamic Layout Analysis

```typescript
function LayoutAnalyzer() {
  const header = useArea({ top: 0, height: 80 });
  const sidebar = useArea({ left: 0, width: 250, top: 80, bottom: 60 });
  const main = useArea({
    left: 250,
    right: 0,
    top: 80,
    bottom: 60
  });
  const footer = useArea({ bottom: 0, height: 60 });

  return (
    <div className="analyzer">
      <h3>Layout Analysis</h3>
      <ul>
        <li>Header: {header.elementsCount} elements, {(header.coverage * 100).toFixed(0)}% coverage</li>
        <li>Sidebar: {sidebar.elementsCount} elements, {(sidebar.elementDensity).toFixed(1)} density</li>
        <li>Main: {main.elementsCount} elements, {main.isEmpty ? 'EMPTY' : 'filled'}</li>
        <li>Footer: {footer.isFull ? 'Crowded' : 'Spacious'}</li>
      </ul>
    </div>
  );
}
```

### 6. Responsive Regions

```typescript
function ResponsiveContent() {
  const contentArea = useArea('#content');

  // Adapt based on spatial properties
  const mode = contentArea.width < 600 ? 'compact'
             : contentArea.width < 1200 ? 'normal'
             : 'spacious';

  return (
    <div id="content" className={mode}>
      {contentArea.isSparse && <div>Lots of space available!</div>}
      {contentArea.isFull && <div>Content is dense here.</div>}
    </div>
  );
}
```

### 7. Canvas Quadrants

```typescript
function CanvasAnalyzer() {
  const canvas = useArea('#canvas');

  const topLeft = useArea({
    top: canvas.bounds.top,
    left: canvas.bounds.left,
    width: canvas.width / 2,
    height: canvas.height / 2
  });

  const topRight = useArea({
    top: canvas.bounds.top,
    left: canvas.bounds.left + canvas.width / 2,
    width: canvas.width / 2,
    height: canvas.height / 2
  });

  return (
    <div>
      <p>Top-left quadrant: {topLeft.elementsCount} shapes</p>
      <p>Top-right quadrant: {topRight.elementsCount} shapes</p>
      {topRight.elementsCount > topLeft.elementsCount * 2 && (
        <div>User is focused on the right side!</div>
      )}
    </div>
  );
}
```

---

## Use Cases

- ✅ **Collision detection** - Drag & drop, game physics
- ✅ **Heat mapping** - Where users focus content
- ✅ **Scroll analytics** - Reading progress, engagement
- ✅ **Layout optimization** - Balance content distribution
- ✅ **Viewport analysis** - Above/below fold metrics
- ✅ **Responsive design** - Adapt based on spatial constraints
- ✅ **Game development** - Spatial queries for game objects
- ✅ **Data visualization** - Analyze element distribution
- ✅ **A/B testing** - Compare layout effectiveness
- ✅ **Accessibility** - Ensure balanced content placement

---

## Performance

| Metric | Value |
|--------|-------|
| **Bounds calculation** | < 1ms |
| **Element query (1000 elements)** | 5-10ms |
| **Coverage analysis** | 2-5ms |
| **Updates (throttled)** | 100ms default |
| **Memory per area** | ~2KB |

**Highly optimized with:**
- RequestAnimationFrame batching
- Throttled updates
- Memoized calculations
- Efficient spatial algorithms

---

## Philosophy

> **"The viewport isn't just a window. It's a queryable 2D database."**

You're not building layouts. **You're architecting spatial topologies.** 📐

---

## License

MIT

---

**Part of the Minimact Quantum Stack** 🌵✨📐
