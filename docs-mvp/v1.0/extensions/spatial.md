# minimact-spatial

**Spatial Computing for the Web**

Query the viewport as a 2D database. Turn spatial regions into reactive data sources.

---

## Overview

minimact-spatial transforms the browser viewport into a queryable 2D spatial database. Instead of tracking individual elements, track **spatial regions** of the viewport and query what's inside them.

:::tip Revolutionary Concept
**Traditional**: Track individual elements
```javascript
const element = document.querySelector('#sidebar');
const rect = element.getBoundingClientRect();
```

**Spatial Computing**: Track spatial regions as reactive data sources
```typescript
const sidebar = useArea('#sidebar');
console.log(sidebar.elementsCount);    // 5
console.log(sidebar.coverage);         // 0.85 (85% covered)
console.log(sidebar.isEmpty);          // false
```
:::

---

## Installation

```bash
npm install minimact-spatial
```

---

## Quick Start

```typescript
import { useArea } from '@minimact/spatial';

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

## Defining Areas

### 1. By Selector

```typescript
useArea('#sidebar')
useArea('.card')
```

### 2. By Keywords

```typescript
useArea('viewport')  // Current viewport
useArea('window')    // Same as viewport
useArea('document')  // Entire document
```

### 3. By Bounds

```typescript
useArea({
  top: 0,
  left: 0,
  width: 250,
  height: '100vh'
})
```

### 4. By Element

```typescript
const el = document.querySelector('#box');
useArea(el)
```

---

## Configuration Options

```typescript
useArea(definition, {
  elementFilter?: (el: Element) => boolean,  // Filter tracked elements
  minElementSize?: number,                   // Ignore small elements (px²)
  trackScroll?: boolean,                     // Update on scroll (default: true)
  trackResize?: boolean,                     // Update on resize (default: true)
  trackMutations?: boolean,                  // Update on DOM changes
  throttle?: number,                         // Throttle updates (ms)
  debugLogging?: boolean                     // Enable debug logs
})
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

### State Flags

```typescript
area.isEmpty    // No elements in area
area.isFull     // High coverage (> 80%)
area.isSparse   // Low density (< 5 elements per 1000px²)
```

---

## Spatial Methods

### Intersection & Overlap

```typescript
area.intersects(otherArea)         // boolean - do they overlap?
area.intersectionRatio(otherArea)  // 0.0-1.0 - how much overlap
area.intersectionArea(otherArea)   // px² - overlap area
area.contains(element)             // boolean - element fully inside?
area.overlaps(element)             // boolean - element partially inside?
```

### Distance Calculations

```typescript
area.distance(otherArea)           // pixels (edge-to-edge)
area.centerDistance(otherArea)     // pixels (center-to-center)
```

### Element Queries

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

---

## Real-World Examples

### Example 1: Collision Detection

```typescript
function DragAndDrop() {
  const dropZone = useArea('#drop-zone');
  const draggedItem = useArea('#dragged-item');

  const isOverDropZone = dropZone.intersects(draggedItem);

  return (
    <div>
      <div
        id="drop-zone"
        className={isOverDropZone ? 'highlight' : ''}
        style={{
          background: isOverDropZone ? '#90EE90' : '#f0f0f0'
        }}
      >
        Drop Here
      </div>
      <div id="dragged-item" draggable>
        Drag Me
      </div>
      {isOverDropZone && (
        <p>Ready to drop!</p>
      )}
    </div>
  );
}
```

### Example 2: Viewport Sections

```typescript
function LazyLoader() {
  const aboveFold = useArea({ top: 0, height: '100vh' });
  const belowFold = useArea({ top: '100vh', height: '100vh' });

  return (
    <div>
      <div className="analytics">
        <p>Immediately visible: {aboveFold.elementsCount} elements</p>
        <p>Coming into view: {belowFold.elementsPartiallyCount} elements</p>
      </div>

      {aboveFold.coverage < 0.5 && (
        <div className="warning">
          ⚠️ Low content above fold! Add more engaging content.
        </div>
      )}

      {aboveFold.isSparse && (
        <div className="suggestion">
          💡 Consider adding more elements to fill the space
        </div>
      )}
    </div>
  );
}
```

### Example 3: Heat Map Grid

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
            border: area === hottest ? '3px solid red' : '1px solid #ccc'
          }}
        >
          <span className="coverage">
            {(area.coverage * 100).toFixed(0)}%
          </span>
          <span className="elements">
            {area.elementsCount} elements
          </span>
        </div>
      ))}
      <div className="hottest-indicator">
        Hottest region: Cell {grid.indexOf(hottest) + 1}
      </div>
    </div>
  );
}
```

### Example 4: Scroll Progress

```typescript
function ScrollProgress() {
  const article = useArea('#article');
  const viewport = useArea('viewport');

  const scrollProgress = article.intersectionRatio(viewport);

  return (
    <div className="scroll-indicator">
      <div className="progress-bar">
        <div
          className="progress-fill"
          style={{ width: `${scrollProgress * 100}%` }}
        />
      </div>
      <span className="progress-text">
        {(scrollProgress * 100).toFixed(0)}% read
      </span>

      {scrollProgress >= 1.0 && (
        <div className="completion-badge">
          🎉 Article complete!
        </div>
      )}
    </div>
  );
}
```

### Example 5: Dynamic Layout Analysis

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
        <li>
          Header: {header.elementsCount} elements, {(header.coverage * 100).toFixed(0)}% coverage
          {header.isFull && <span className="badge">Full</span>}
        </li>
        <li>
          Sidebar: {sidebar.elementsCount} elements, {sidebar.elementDensity.toFixed(1)} density
          {sidebar.isSparse && <span className="badge warning">Sparse</span>}
        </li>
        <li>
          Main: {main.elementsCount} elements
          {main.isEmpty && <span className="badge error">EMPTY</span>}
        </li>
        <li>
          Footer: {footer.elementsCount} elements
          {footer.isFull ? (
            <span className="badge warning">Crowded</span>
          ) : (
            <span className="badge success">Spacious</span>
          )}
        </li>
      </ul>

      <div className="recommendations">
        {header.coverage < 0.3 && (
          <p>💡 Header has low coverage - consider adding logo or navigation</p>
        )}
        {main.isEmpty && (
          <p>⚠️ Main content area is empty!</p>
        )}
        {sidebar.isSparse && (
          <p>💡 Sidebar could use more widgets or navigation items</p>
        )}
      </div>
    </div>
  );
}
```

### Example 6: Responsive Regions

```typescript
function ResponsiveContent() {
  const contentArea = useArea('#content');

  // Adapt based on spatial properties
  const mode = contentArea.width < 600 ? 'compact'
             : contentArea.width < 1200 ? 'normal'
             : 'spacious';

  return (
    <div id="content" className={mode}>
      <h2>Content (Mode: {mode})</h2>

      {contentArea.isSparse && (
        <div className="suggestion">
          Lots of space available! Consider expanding content.
        </div>
      )}

      {contentArea.isFull && (
        <div className="warning">
          Content is dense here. Consider pagination or collapsing.
        </div>
      )}

      {mode === 'compact' && (
        <MobileNavigation />
      )}

      {mode === 'spacious' && (
        <ExpandedGallery />
      )}
    </div>
  );
}
```

### Example 7: Canvas Quadrants

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

  const bottomLeft = useArea({
    top: canvas.bounds.top + canvas.height / 2,
    left: canvas.bounds.left,
    width: canvas.width / 2,
    height: canvas.height / 2
  });

  const bottomRight = useArea({
    top: canvas.bounds.top + canvas.height / 2,
    left: canvas.bounds.left + canvas.width / 2,
    width: canvas.width / 2,
    height: canvas.height / 2
  });

  return (
    <div className="quadrant-analysis">
      <h3>Canvas Quadrant Analysis</h3>
      <div className="quadrants">
        <div>Top-left: {topLeft.elementsCount} shapes</div>
        <div>Top-right: {topRight.elementsCount} shapes</div>
        <div>Bottom-left: {bottomLeft.elementsCount} shapes</div>
        <div>Bottom-right: {bottomRight.elementsCount} shapes</div>
      </div>

      {topRight.elementsCount > topLeft.elementsCount * 2 && (
        <div className="insight">
          📊 User is focused on the right side!
        </div>
      )}

      {bottomLeft.isEmpty && bottomRight.isEmpty && (
        <div className="insight">
          📊 Bottom half is empty - consider showing suggestions
        </div>
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

### Optimization

**Highly optimized with:**
- RequestAnimationFrame batching
- Throttled updates (configurable)
- Memoized calculations
- Efficient spatial algorithms

**Optimization Tips:**

```typescript
// Use throttling for real-time tracking
useArea('#container', { throttle: 100 })

// Disable unnecessary tracking
useArea('#static', {
  trackScroll: false,
  trackResize: false
})

// Filter elements to reduce processing
useArea('viewport', {
  elementFilter: (el) => el.classList.contains('tracked'),
  minElementSize: 100  // Ignore tiny elements
})
```

---

## Integration with Minimact

minimact-spatial follows the standard Minimact extension pattern:

### Client-Side

```typescript
// Area state is reactive
const header = useArea({ top: 0, height: 80 });

// Automatically syncs to server
context.signalR.updateSpatialState(
  componentId,
  areaKey,
  {
    elementsCount: header.elementsCount,
    coverage: header.coverage,
    isEmpty: header.isEmpty
  }
);
```

### Server-Side

```csharp
// Server receives spatial state
protected override VNode Render()
{
    var headerState = State["spatial_area_0"];

    // Render based on spatial properties
    return new VNode("div",
        headerState.IsFull
            ? new VNode("button", "Collapse Header")
            : new VNode("span", "Header has space")
    );
}
```

---

## Philosophy

> **"The viewport isn't just a window. It's a queryable 2D database."**

You're not building layouts. **You're architecting spatial topologies.** 📐

Traditional frameworks treat the viewport as a static container. minimact-spatial treats it as a **dynamic, queryable spatial database** where regions have properties, relationships, and behaviors.

---

## Browser Support

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

**Uses standard APIs:**
- `getBoundingClientRect()`
- `IntersectionObserver` (optional, for viewport tracking)
- `ResizeObserver` (optional, for resize tracking)

---

## Next Steps

- [minimact-punch (DOM State)](/v1.0/extensions/punch)
- [minimact-query (SQL for DOM)](/v1.0/extensions/query)
- [minimact-quantum (DOM Entanglement)](/v1.0/extensions/quantum)
- [Core Hooks API](/v1.0/api/hooks)

---

**Part of the Minimact Quantum Stack** 🌵📐✨
