# useDomElementState() Advanced Features - Part 2

## Executive Summary

This document extends the base `useDomElementState()` implementation plan with reality-warping advanced features that transform the DOM into a complete query language for the browser's rendered reality. These features enable querying not just what exists, but what *could* exist, what *state* things are in, what *visual content* contains, and what *spatial relationships* exist between elements.

**Building on:** `USEDOMELEMENTSTATE_IMPLEMENTATION_PLAN.md`

---

## The Complete Vision

### The Unified Query System

```jsx
const grid = useDomElementState('.grid');

{/* Structural queries */}
{grid.childrenCount > 100 && <VirtualScroll />}

{/* Statistical aggregates */}
{grid.children.vals.avg() > 50 && <HighValueNotice />}

{/* Pseudo-state */}
{grid.state.hover && <GridHoverEffects />}

{/* Theme state */}
{grid.theme.isDark && <DarkGridStyles />}

{/* Spatial relationships */}
{grid.children[5].lookahead(3).every(c => c.isIntersecting) &&
  <NextSectionPreload />}

{/* The space between */}
{grid.gaps.some(gap => gap.height > 100) && <GapWarning />}

{/* Canvas content (if grid contains canvas) */}
{grid.find('canvas').ctx.dominantColor === 'blue' && <BlueTheme />}
```

**This is not a UI framework. This is a REALITY ENGINE for the browser.**

---

## Feature 1: Pseudo-State as First-Class Values

### The Problem

CSS pseudo-selectors (`:hover`, `:active`, `:focus`, `:disabled`) are invisible to JavaScript. Developers must manually track these states with event handlers, creating brittle, imperative code.

```jsx
// Old way - manual state tracking
const [isHovered, setIsHovered] = useState(false);

<button
  onMouseEnter={() => setIsHovered(true)}
  onMouseLeave={() => setIsHovered(false)}
>
  {isHovered && <Tooltip />}
</button>
```

### The Solution

Make CSS pseudo-states reactive JavaScript values:

```jsx
const btn = useDomElementState();

<button ref={btn}>
  {btn.state.hover && <Tooltip />}
  {btn.state.active && <PressAnimation />}
  {btn.state.focus && <KeyboardOutline />}
</button>
```

### Implementation

#### Client-Side: PseudoStateTracker

**File:** `src/client-runtime/src/pseudo-state-tracker.ts`

```typescript
export class PseudoStateTracker {
  private element: HTMLElement;
  private states: {
    hover: boolean;
    active: boolean;
    focus: boolean;
    disabled: boolean;
    checked: boolean;
    invalid: boolean;
  } = {
    hover: false,
    active: false,
    focus: false,
    disabled: false,
    checked: false,
    invalid: false,
  };

  private listeners: Array<() => void> = [];
  private onChange?: () => void;

  constructor(element: HTMLElement, onChange?: () => void) {
    this.element = element;
    this.onChange = onChange;
    this.setupListeners();
  }

  private setupListeners() {
    // Hover state
    this.element.addEventListener('mouseenter', () => {
      this.states.hover = true;
      this.notifyChange();
    });

    this.element.addEventListener('mouseleave', () => {
      this.states.hover = false;
      this.notifyChange();
    });

    // Active state
    this.element.addEventListener('mousedown', () => {
      this.states.active = true;
      this.notifyChange();
    });

    this.element.addEventListener('mouseup', () => {
      this.states.active = false;
      this.notifyChange();
    });

    this.element.addEventListener('mouseleave', () => {
      this.states.active = false;
      this.notifyChange();
    });

    // Focus state
    this.element.addEventListener('focus', () => {
      this.states.focus = true;
      this.notifyChange();
    });

    this.element.addEventListener('blur', () => {
      this.states.focus = false;
      this.notifyChange();
    });

    // Attribute-based states (use MutationObserver)
    const observer = new MutationObserver(() => {
      this.updateAttributeStates();
    });

    observer.observe(this.element, {
      attributes: true,
      attributeFilter: ['disabled', 'aria-disabled', 'aria-checked', 'aria-invalid']
    });

    this.updateAttributeStates();
  }

  private updateAttributeStates() {
    this.states.disabled = this.element.hasAttribute('disabled') ||
                          this.element.getAttribute('aria-disabled') === 'true';

    this.states.checked = (this.element as HTMLInputElement).checked ||
                         this.element.getAttribute('aria-checked') === 'true';

    this.states.invalid = (this.element as HTMLInputElement).validity?.valid === false ||
                         this.element.getAttribute('aria-invalid') === 'true';

    this.notifyChange();
  }

  private notifyChange() {
    if (this.onChange) {
      this.onChange();
    }
  }

  get hover() { return this.states.hover; }
  get active() { return this.states.active; }
  get focus() { return this.states.focus; }
  get disabled() { return this.states.disabled; }
  get checked() { return this.states.checked; }
  get invalid() { return this.states.invalid; }

  destroy() {
    // Remove all event listeners
    // Disconnect observers
  }
}
```

#### Update DomElementState

**File:** `src/client-runtime/src/dom-element-state.ts`

```typescript
export class DomElementState {
  // ... existing properties

  private pseudoStateTracker?: PseudoStateTracker;

  get state(): PseudoStateTracker {
    if (!this.pseudoStateTracker && this._element) {
      this.pseudoStateTracker = new PseudoStateTracker(this._element, () => {
        this.notifyChange();
      });
    }
    return this.pseudoStateTracker!;
  }

  destroy() {
    // ... existing cleanup
    this.pseudoStateTracker?.destroy();
  }
}
```

### Prediction Integration

**File:** `playground/backend/Services/PlaygroundService.cs`

```csharp
private List<PredictionInfo> GeneratePseudoStatePredictions(PlaygroundSession session)
{
    var predictions = new List<PredictionInfo>();
    var component = session.Component;

    foreach (var (stateKey, hook) in component.DomElementStates)
    {
        // Predict hover state changes for interactive elements
        if (IsInteractiveElement(hook))
        {
            // Predict: element will be hovered
            var patches = ComputePatchesForPseudoState(session, stateKey, "hover", true);

            predictions.Add(new PredictionInfo
            {
                StateKey = $"{stateKey}_hover",
                PredictedValue = new { state = new { hover = true } },
                Confidence = 0.65f, // Medium - user mouse movement is somewhat predictable
                Patches = patches
            });
        }

        // Predict focus state for form elements
        if (IsFormElement(hook))
        {
            var patches = ComputePatchesForPseudoState(session, stateKey, "focus", true);

            predictions.Add(new PredictionInfo
            {
                StateKey = $"{stateKey}_focus",
                PredictedValue = new { state = new { focus = true } },
                Confidence = 0.7f, // Higher - forms often focused in sequence
                Patches = patches
            });
        }
    }

    return predictions;
}

private bool IsInteractiveElement(DomElementStateHook hook)
{
    return hook.Selector?.Contains("button") == true ||
           hook.Selector?.Contains("a") == true ||
           hook.Attributes.ContainsKey("onclick");
}
```

### Example Usage

```jsx
// Hover-driven dropdown
const menu = useDomElementState('#menu');

<div id="menu" ref={menu}>
  <button>Menu</button>
  {menu.state.hover && (
    <div className="dropdown">
      <MenuItem />
      <MenuItem />
    </div>
  )}
</div>

// Focus-driven help text
const input = useDomElementState('input[name="email"]');

<div>
  <input name="email" ref={input} />
  {input.state.focus && (
    <p className="help-text">Enter a valid email address</p>
  )}
</div>

// Collection pseudo-state queries
const buttons = useDomElementState('button');

{buttons.some(b => b.state.hover) && <GlobalTooltipManager />}
{buttons.every(b => !b.state.disabled) && <AllButtonsActiveIndicator />}
```

---

## Feature 2: Theme & Breakpoint Reactivity

### The Problem

Media queries and theme detection require manual `window.matchMedia()` and `prefers-color-scheme` polling. Tailwind's responsive classes (`sm:`, `md:`, `lg:`) are CSS-only and invisible to JavaScript logic.

### The Solution

Make theme and breakpoint state reactive first-class values:

```jsx
const app = useDomElementState('#root');

{app.theme.isDark && <DarkModeStyles />}
{app.theme.isLight && <LightModeStyles />}
{app.theme.highContrast && <AccessibilityEnhancements />}

{app.breakpoint.sm && <MobileNav />}
{app.breakpoint.lg && <DesktopNav />}
{app.breakpoint.between('md', 'xl') && <TabletLayout />}
```

### Implementation

#### Client-Side: ThemeStateTracker

**File:** `src/client-runtime/src/theme-state-tracker.ts`

```typescript
export class ThemeStateTracker {
  private darkModeQuery: MediaQueryList;
  private highContrastQuery: MediaQueryList;
  private breakpointQueries: Map<string, MediaQueryList> = new Map();

  private state = {
    isDark: false,
    isLight: true,
    highContrast: false,
    reducedMotion: false,
  };

  private breakpoints = {
    sm: false,   // 640px
    md: false,   // 768px
    lg: false,   // 1024px
    xl: false,   // 1280px
    '2xl': false // 1536px
  };

  private onChange?: () => void;

  constructor(onChange?: () => void) {
    this.onChange = onChange;
    this.setupMediaQueries();
  }

  private setupMediaQueries() {
    // Dark mode
    this.darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    this.state.isDark = this.darkModeQuery.matches;
    this.state.isLight = !this.state.isDark;

    this.darkModeQuery.addEventListener('change', (e) => {
      this.state.isDark = e.matches;
      this.state.isLight = !e.matches;
      this.notifyChange();
    });

    // High contrast
    this.highContrastQuery = window.matchMedia('(prefers-contrast: high)');
    this.state.highContrast = this.highContrastQuery.matches;

    this.highContrastQuery.addEventListener('change', (e) => {
      this.state.highContrast = e.matches;
      this.notifyChange();
    });

    // Reduced motion
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.state.reducedMotion = reducedMotionQuery.matches;

    reducedMotionQuery.addEventListener('change', (e) => {
      this.state.reducedMotion = e.matches;
      this.notifyChange();
    });

    // Breakpoints (Tailwind-compatible)
    const breakpointSizes = {
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px'
    };

    for (const [name, size] of Object.entries(breakpointSizes)) {
      const query = window.matchMedia(`(min-width: ${size})`);
      this.breakpointQueries.set(name, query);
      this.breakpoints[name] = query.matches;

      query.addEventListener('change', (e) => {
        this.breakpoints[name] = e.matches;
        this.notifyChange();
      });
    }
  }

  private notifyChange() {
    if (this.onChange) {
      this.onChange();
    }
  }

  get isDark() { return this.state.isDark; }
  get isLight() { return this.state.isLight; }
  get highContrast() { return this.state.highContrast; }
  get reducedMotion() { return this.state.reducedMotion; }

  get sm() { return this.breakpoints.sm; }
  get md() { return this.breakpoints.md; }
  get lg() { return this.breakpoints.lg; }
  get xl() { return this.breakpoints.xl; }
  get '2xl'() { return this.breakpoints['2xl']; }

  between(min: string, max: string): boolean {
    return this.breakpoints[min] && !this.breakpoints[max];
  }

  destroy() {
    // Remove all listeners
  }
}

export class BreakpointState {
  constructor(private tracker: ThemeStateTracker) {}

  get sm() { return this.tracker.sm; }
  get md() { return this.tracker.md; }
  get lg() { return this.tracker.lg; }
  get xl() { return this.tracker.xl; }
  get '2xl'() { return this.tracker['2xl']; }

  between(min: string, max: string): boolean {
    return this.tracker.between(min, max);
  }
}
```

#### Update DomElementState

**File:** `src/client-runtime/src/dom-element-state.ts`

```typescript
export class DomElementState {
  // ... existing properties

  private themeStateTracker?: ThemeStateTracker;

  get theme(): ThemeStateTracker {
    if (!this.themeStateTracker) {
      this.themeStateTracker = new ThemeStateTracker(() => {
        this.notifyChange();
      });
    }
    return this.themeStateTracker;
  }

  get breakpoint(): BreakpointState {
    return new BreakpointState(this.theme);
  }

  destroy() {
    // ... existing cleanup
    this.themeStateTracker?.destroy();
  }
}
```

### Prediction Integration

```csharp
private List<PredictionInfo> GenerateThemePredictions(PlaygroundSession session)
{
    var predictions = new List<PredictionInfo>();

    // Predict dark mode assets will be needed
    predictions.Add(new PredictionInfo
    {
        StateKey = "theme_dark",
        PredictedValue = new { theme = new { isDark = true } },
        Confidence = 0.5f, // User may toggle theme
        Patches = ComputePatchesForThemeChange(session, isDark: true)
    });

    // Predict responsive layout changes based on viewport
    predictions.Add(new PredictionInfo
    {
        StateKey = "breakpoint_md",
        PredictedValue = new { breakpoint = new { md = true } },
        Confidence = 0.3f, // User may resize window
        Patches = ComputePatchesForBreakpointChange(session, "md")
    });

    return predictions;
}
```

### Example Usage

```jsx
// Adaptive UI based on theme
const app = useDomElementState('#root');

{app.theme.isDark && (
  <>
    <link rel="stylesheet" href="/dark-theme.css" />
    <DarkModeIcon />
  </>
)}

{app.theme.reducedMotion && <StaticAnimations />}

// Responsive layouts
{app.breakpoint.sm && <MobileNav />}
{app.breakpoint.between('md', 'lg') && <TabletNav />}
{app.breakpoint.xl && <DesktopNav />}

// Predict based on theme
usePredictHint('dark-assets', {
  trigger: app.theme.isDark
});
```

---

## Feature 3: Spatial Lookahead/Lookbehind

### The Problem

Querying sibling relationships, next/previous elements, or nearby elements requires manual DOM traversal. No declarative way to express "the next 3 elements" or "the previous 2 elements".

### The Solution

REGEX-style lookahead/lookbehind for DOM trees:

```jsx
const items = useDomElementState('.list-item');

{items[0].lookahead(2).every(item => item.classList.includes('completed')) &&
  <BatchCompleteAction />}

{items[5].lookbehind(3).some(item => item.attributes['data-error']) &&
  <RecentErrorsWarning />}
```

### Implementation

#### Client-Side: Spatial Queries

**File:** `src/client-runtime/src/dom-element-state.ts`

```typescript
export class DomElementState {
  // ... existing properties

  /**
   * Get the next N sibling elements
   */
  lookahead(count: number): DomElementState[] {
    const results: DomElementState[] = [];
    let current = this._element?.nextElementSibling as HTMLElement | null;

    while (current && results.length < count) {
      const state = new DomElementState(current);
      results.push(state);
      current = current.nextElementSibling as HTMLElement | null;
    }

    return results;
  }

  /**
   * Get the previous N sibling elements
   */
  lookbehind(count: number): DomElementState[] {
    const results: DomElementState[] = [];
    let current = this._element?.previousElementSibling as HTMLElement | null;

    while (current && results.length < count) {
      const state = new DomElementState(current);
      results.push(state);
      current = current.previousElementSibling as HTMLElement | null;
    }

    return results.reverse(); // Return in forward order
  }

  /**
   * Get next sibling
   */
  get nextSibling(): DomElementState | null {
    const next = this._element?.nextElementSibling as HTMLElement | null;
    return next ? new DomElementState(next) : null;
  }

  /**
   * Get previous sibling
   */
  get previousSibling(): DomElementState | null {
    const prev = this._element?.previousElementSibling as HTMLElement | null;
    return prev ? new DomElementState(prev) : null;
  }

  /**
   * Get parent element
   */
  get parent(): DomElementState | null {
    const parent = this._element?.parentElement;
    return parent ? new DomElementState(parent) : null;
  }

  /**
   * Find closest ancestor matching selector
   */
  closest(selector: string): DomElementState | null {
    const ancestor = this._element?.closest(selector) as HTMLElement | null;
    return ancestor ? new DomElementState(ancestor) : null;
  }

  /**
   * Find descendants matching selector
   */
  find(selector: string): DomElementState[] {
    if (!this._element) return [];

    const elements = Array.from(this._element.querySelectorAll(selector)) as HTMLElement[];
    return elements.map(el => new DomElementState(el));
  }
}
```

### Prediction Integration

```csharp
private List<PredictionInfo> GenerateSpatialPredictions(PlaygroundSession session)
{
    var predictions = new List<PredictionInfo>();

    // Predict based on scroll position + lookahead
    // "Last 3 items are intersecting → predict load more"
    var items = GetDomElementsBySelector(session, ".list-item");
    var lastThree = items.Skip(Math.Max(0, items.Count - 3)).ToList();

    if (lastThree.All(item => item.IsIntersecting))
    {
        predictions.Add(new PredictionInfo
        {
            StateKey = "load_more",
            PredictedValue = new { loadMore = true },
            Confidence = 0.85f, // High - clear scrolling pattern
            Patches = ComputePatchesForLoadMore(session)
        });
    }

    return predictions;
}
```

### Example Usage

```jsx
// Batch operations based on lookahead
const todos = useDomElementState('.todo-item');

{todos[0].lookahead(3).every(t => t.attributes['data-complete'] === 'true') && (
  <button>Complete all 4</button>
)}

// Error context from lookbehind
const formFields = useDomElementState('.form-field');

{formFields[5].lookbehind(2).some(f => f.state.invalid) && (
  <div className="warning">Previous fields have errors</div>
)}

// Sibling-based conditionals
const row = useDomElementState('#current-row');

{row.nextSibling?.isIntersecting && !row.isIntersecting && (
  <InsertRowHint />
)}

// Predict based on spatial patterns
usePredictHint('next-page', {
  trigger: items.slice(-3).every(i => i.isIntersecting)
});
```

---

## Feature 4: Canvas & SVG Content Queries

### The Problem

Canvas pixel data and SVG shape information are locked away in imperative APIs. No way to declaratively query "is this image mostly dark?" or "do these shapes overlap?".

### The Solution

Make visual content queryable reactive state:

```jsx
// Canvas
{canvas.ctx.pixelData.avg() < 128 && <DarkImageDetected />}
{canvas.ctx.dominantColor === '#ff0000' && <RedAlert />}

// SVG
{svg.shapes.circles.length > 5 && <ShapeComplexityWarning />}
{svg.shapes.anyIntersecting() && <OverlapWarning />}
```

### Implementation

#### Client-Side: CanvasStateTracker

**File:** `src/client-runtime/src/canvas-state-tracker.ts`

```typescript
export class CanvasStateTracker {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D | null;
  private cachedData: {
    pixelAvg?: number;
    dominantColor?: string;
    hasTransparency?: boolean;
  } = {};

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.analyzeCanvas();
  }

  private analyzeCanvas() {
    if (!this.ctx) return;

    try {
      const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
      const data = imageData.data;

      // Compute pixel average (brightness)
      let sum = 0;
      let hasAlpha = false;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];

        // Luminance formula
        sum += (0.299 * r + 0.587 * g + 0.114 * b);

        if (a < 255) hasAlpha = true;
      }

      this.cachedData.pixelAvg = sum / (data.length / 4);
      this.cachedData.hasTransparency = hasAlpha;

      // Find dominant color (simplified - use color quantization for production)
      this.cachedData.dominantColor = this.findDominantColor(data);
    } catch (e) {
      // Canvas may be tainted (cross-origin)
      console.warn('Cannot analyze canvas - may be tainted', e);
    }
  }

  private findDominantColor(data: Uint8ClampedArray): string {
    // Simplified: just take average RGB
    let r = 0, g = 0, b = 0;
    const pixelCount = data.length / 4;

    for (let i = 0; i < data.length; i += 4) {
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
    }

    r = Math.round(r / pixelCount);
    g = Math.round(g / pixelCount);
    b = Math.round(b / pixelCount);

    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  get pixelData() {
    return {
      avg: () => this.cachedData.pixelAvg || 0
    };
  }

  get dominantColor(): string {
    return this.cachedData.dominantColor || '#000000';
  }

  get hasTransparency(): boolean {
    return this.cachedData.hasTransparency || false;
  }

  // Re-analyze when canvas changes
  refresh() {
    this.analyzeCanvas();
  }
}
```

#### Client-Side: SVGStateTracker

**File:** `src/client-runtime/src/svg-state-tracker.ts`

```typescript
export class SVGStateTracker {
  private svg: SVGSVGElement;

  constructor(svg: SVGSVGElement) {
    this.svg = svg;
  }

  get shapes() {
    return {
      circles: this.getShapesByType('circle'),
      rects: this.getShapesByType('rect'),
      paths: this.getShapesByType('path'),
      polygons: this.getShapesByType('polygon'),

      anyIntersecting: () => {
        // Check for bounding box overlaps
        const shapes = this.svg.querySelectorAll('circle, rect, path, polygon');
        const boxes = Array.from(shapes).map(s => (s as SVGGraphicsElement).getBBox());

        for (let i = 0; i < boxes.length; i++) {
          for (let j = i + 1; j < boxes.length; j++) {
            if (this.boxesIntersect(boxes[i], boxes[j])) {
              return true;
            }
          }
        }
        return false;
      }
    };
  }

  private getShapesByType(type: string) {
    const elements = Array.from(this.svg.querySelectorAll(type));
    return elements.map(el => new SVGShapeState(el as SVGGraphicsElement));
  }

  private boxesIntersect(a: DOMRect, b: DOMRect): boolean {
    return !(a.right < b.left ||
             a.left > b.right ||
             a.bottom < b.top ||
             a.top > b.bottom);
  }

  get viewBox() {
    const vb = this.svg.viewBox.baseVal;
    return {
      x: vb.x,
      y: vb.y,
      width: vb.width,
      height: vb.height
    };
  }

  get paths() {
    return Array.from(this.svg.querySelectorAll('path')).map(p => ({
      element: p,
      length: (p as SVGPathElement).getTotalLength()
    }));
  }
}

export class SVGShapeState {
  constructor(private element: SVGGraphicsElement) {}

  get bbox() {
    return this.element.getBBox();
  }

  get attributes() {
    const attrs: Record<string, string> = {};
    for (let i = 0; i < this.element.attributes.length; i++) {
      const attr = this.element.attributes[i];
      attrs[attr.name] = attr.value;
    }
    return attrs;
  }
}
```

#### Update DomElementState

**File:** `src/client-runtime/src/dom-element-state.ts`

```typescript
export class DomElementState {
  // ... existing properties

  private canvasTracker?: CanvasStateTracker;
  private svgTracker?: SVGStateTracker;

  get ctx(): CanvasStateTracker | null {
    if (this._element instanceof HTMLCanvasElement) {
      if (!this.canvasTracker) {
        this.canvasTracker = new CanvasStateTracker(this._element);
      }
      return this.canvasTracker;
    }
    return null;
  }

  get svg(): SVGStateTracker | null {
    if (this._element instanceof SVGSVGElement) {
      if (!this.svgTracker) {
        this.svgTracker = new SVGStateTracker(this._element);
      }
      return this.svgTracker;
    }
    return null;
  }
}
```

### Example Usage

```jsx
// Canvas content queries
const canvas = useDomElementState('canvas');

{canvas.ctx?.pixelData.avg() < 128 && (
  <div className="notice">Image appears dark</div>
)}

{canvas.ctx?.dominantColor === '#ff0000' && (
  <div className="alert">Red alert detected in visualization</div>
)}

{canvas.ctx?.hasTransparency && (
  <div className="info">Image has transparent regions</div>
)}

// SVG shape queries
const diagram = useDomElementState('svg');

{diagram.svg?.shapes.circles.length > 10 && (
  <div className="warning">Complex diagram - consider simplification</div>
)}

{diagram.svg?.shapes.anyIntersecting() && (
  <div className="error">Shapes are overlapping</div>
)}

{diagram.svg?.viewBox.width > 2000 && (
  <button>Optimize large diagram</button>
)}

// Predict based on visual content
usePredictHint('red-theme', {
  trigger: canvas.ctx?.dominantColor.startsWith('#ff')
});
```

---

## Feature 5: The Space Between (Gap Detection)

### The Problem

No way to query the "empty space" between DOM elements. Gaps, potential insertion points, and layout relationships are invisible to JavaScript.

### The Solution

Make absence queryable as presence:

```jsx
const rows = useDomElementState('.table-row');

{rows.map((row, i) => (
  <>
    <TableRow ref={row} />
    {row.nextSibling?.isIntersecting && !row.isIntersecting && (
      <InsertRowHint between={[row, row.nextSibling]} />
    )}
  </>
))}

{grid.gaps.some(gap => gap.height > 100) && <GapWarning />}
```

### Implementation

#### Client-Side: Gap Detection

**File:** `src/client-runtime/src/dom-element-state.ts`

```typescript
export class DomElementState {
  // ... existing properties

  get gaps(): GapInfo[] {
    if (!this._element) return [];

    const children = Array.from(this._element.children) as HTMLElement[];
    const gaps: GapInfo[] = [];

    for (let i = 0; i < children.length - 1; i++) {
      const current = children[i];
      const next = children[i + 1];

      const currentRect = current.getBoundingClientRect();
      const nextRect = next.getBoundingClientRect();

      const gapHeight = nextRect.top - currentRect.bottom;
      const gapWidth = Math.abs(nextRect.left - currentRect.right);

      if (gapHeight > 0 || gapWidth > 0) {
        gaps.push({
          index: i,
          height: gapHeight,
          width: gapWidth,
          before: new DomElementState(current),
          after: new DomElementState(next),
          rect: {
            top: currentRect.bottom,
            left: Math.min(currentRect.left, nextRect.left),
            bottom: nextRect.top,
            right: Math.max(currentRect.right, nextRect.right)
          }
        });
      }
    }

    return gaps;
  }

  get largestGap(): GapInfo | null {
    const gaps = this.gaps;
    if (gaps.length === 0) return null;

    return gaps.reduce((largest, gap) =>
      (gap.height + gap.width) > (largest.height + largest.width) ? gap : largest
    );
  }
}

export interface GapInfo {
  index: number;
  height: number;
  width: number;
  before: DomElementState;
  after: DomElementState;
  rect: {
    top: number;
    left: number;
    bottom: number;
    right: number;
  };
}
```

### Example Usage

```jsx
// Detect layout issues
const container = useDomElementState('.container');

{container.gaps.some(g => g.height > 100) && (
  <div className="warning">Large gaps detected in layout</div>
)}

{container.largestGap && container.largestGap.height > 200 && (
  <button onClick={() => fixGaps()}>Fix layout gaps</button>
)}

// Insert UI in gaps
const list = useDomElementState('.list');

{list.gaps.map(gap => (
  <div
    key={gap.index}
    style={{
      position: 'absolute',
      top: gap.rect.top,
      left: gap.rect.left,
      height: gap.height,
      width: gap.rect.right - gap.rect.left
    }}
  >
    <button>Insert item here</button>
  </div>
))}

// Spatial relationship queries
const rows = useDomElementState('.row');

{rows[5].nextSibling && (
  rows[5].boundingRect.bottom < rows[5].nextSibling.boundingRect.top - 50
) && (
  <div>Large gap detected between rows 5 and 6</div>
)}
```

---

## Feature 6: Combined Multi-Dimensional Queries

### The Ultimate Power: Combining All Features

```jsx
const grid = useDomElementState('.product-grid');

{/* Combining SEVEN query dimensions */}
{grid.state.hover &&                              // 1. Pseudo-state
 grid.theme.isDark &&                             // 2. Theme
 grid.breakpoint.lg &&                            // 3. Breakpoint
 grid.children.vals.avg() > 50 &&                 // 4. Statistics
 grid.children[5].lookahead(3).every(c =>         // 5. Spatial
   c.isIntersecting                               // 6. Intersection
 ) &&
 grid.find('canvas')[0]?.ctx.dominantColor === 'blue' && // 7. Visual content
 <PerfectStormComponent />}
```

### Prediction Superpowers

```jsx
// Predict based on multi-dimensional state
usePredictHint('premium-modal', {
  trigger:
    products.vals.avg() > 100 &&           // Expensive products
    products.some(p => p.state.hover) &&   // User hovering
    app.theme.isDark &&                    // Dark mode
    products.slice(-2).every(p => p.isIntersecting) // Near end of list
});

// Predict theme-aware assets
usePredictHint('dark-images', {
  trigger: app.theme.isDark
});

// Predict based on visual content
usePredictHint('red-alert-modal', {
  trigger: chart.ctx.dominantColor.startsWith('#ff')
});

// Predict based on spatial patterns
usePredictHint('load-more', {
  trigger: items.slice(-3).every(i => i.isIntersecting)
});
```

---

## Playground Visualizations

### Multi-Dimensional State Panel

**File:** `playground/frontend/src/components/MultiDimensionalStatePanel.tsx`

```tsx
export function MultiDimensionalStatePanel() {
  const [state, setState] = useState({
    structural: { childrenCount: 0, depth: 0 },
    statistical: { avg: 0, sum: 0, median: 0 },
    pseudoState: { hover: false, active: false, focus: false },
    theme: { isDark: false, breakpoint: 'md' },
    spatial: { lookahead: [], lookbehind: [] },
    visual: { dominantColor: '#000000', brightness: 0 },
    gaps: { count: 0, largest: 0 }
  });

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'minimact:dom-state-update') {
        setState(event.data.data);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return (
    <div className="multi-dimensional-panel">
      <h3>Live DOM State - All Dimensions</h3>

      <div className="dimension-grid">
        {/* Structural */}
        <div className="dimension">
          <h4>📊 Structure</h4>
          <div>Children: {state.structural.childrenCount}</div>
          <div>Depth: {state.structural.depth}</div>
        </div>

        {/* Statistical */}
        <div className="dimension">
          <h4>📈 Statistics</h4>
          <div>Avg: {state.statistical.avg.toFixed(2)}</div>
          <div>Sum: {state.statistical.sum.toFixed(2)}</div>
          <div>Median: {state.statistical.median.toFixed(2)}</div>
        </div>

        {/* Pseudo-State */}
        <div className="dimension">
          <h4>🎯 Pseudo-State</h4>
          <div>Hover: {state.pseudoState.hover ? '✓' : '✗'}</div>
          <div>Active: {state.pseudoState.active ? '✓' : '✗'}</div>
          <div>Focus: {state.pseudoState.focus ? '✓' : '✗'}</div>
        </div>

        {/* Theme */}
        <div className="dimension">
          <h4>🎨 Theme</h4>
          <div>Mode: {state.theme.isDark ? 'Dark' : 'Light'}</div>
          <div>Breakpoint: {state.theme.breakpoint}</div>
        </div>

        {/* Spatial */}
        <div className="dimension">
          <h4>🔍 Spatial</h4>
          <div>Lookahead: {state.spatial.lookahead.length}</div>
          <div>Lookbehind: {state.spatial.lookbehind.length}</div>
        </div>

        {/* Visual */}
        <div className="dimension">
          <h4>🖼️ Visual</h4>
          <div>
            Color:
            <span
              className="color-swatch"
              style={{ backgroundColor: state.visual.dominantColor }}
            />
            {state.visual.dominantColor}
          </div>
          <div>Brightness: {state.visual.brightness.toFixed(0)}</div>
        </div>

        {/* Gaps */}
        <div className="dimension">
          <h4>📏 Gaps</h4>
          <div>Count: {state.gaps.count}</div>
          <div>Largest: {state.gaps.largest}px</div>
        </div>
      </div>
    </div>
  );
}
```

### DOM Topology Visualizer

```tsx
export function DOMTopologyVisualizer() {
  return (
    <div className="topology-viz">
      <h3>DOM Topology & Spatial Relationships</h3>

      <svg width="600" height="400">
        {/* Render DOM tree with gaps, spatial relationships, hover states */}
        <g className="element-nodes">
          {/* Visual representation of elements */}
          <rect className="node hover" />
          <rect className="node" />
          <rect className="node active" />
        </g>

        <g className="gaps">
          {/* Visual representation of gaps */}
          <line className="gap-indicator" />
        </g>

        <g className="spatial-relationships">
          {/* Arrows showing lookahead/lookbehind */}
          <path className="lookahead-arrow" />
        </g>
      </svg>
    </div>
  );
}
```

---

## Example Components for Playground

### Example 1: Pseudo-State Driven UI

```typescript
export const PseudoStateExample = `
import { useDomElementState } from '@minimact/core';

export function InteractiveButtons() {
  const buttons = useDomElementState('button');

  return (
    <div>
      <button>Button 1</button>
      <button>Button 2</button>
      <button>Button 3</button>

      {buttons.some(b => b.state.hover) && (
        <div className="global-tooltip">
          🎯 Hovering over button
        </div>
      )}

      {buttons.every(b => !b.state.disabled) && (
        <div className="status">All buttons active ✓</div>
      )}
    </div>
  );
}
`;
```

### Example 2: Theme-Aware Components

```typescript
export const ThemeAwareExample = `
import { useDomElementState } from '@minimact/core';

export function AdaptiveLayout() {
  const app = useDomElementState('#root');

  return (
    <div>
      {app.theme.isDark && (
        <link rel="stylesheet" href="/dark-theme.css" />
      )}

      {app.breakpoint.sm && <MobileNav />}
      {app.breakpoint.between('md', 'lg') && <TabletNav />}
      {app.breakpoint.xl && <DesktopNav />}

      {app.theme.reducedMotion && (
        <p>Animations disabled for accessibility</p>
      )}
    </div>
  );
}
`;
```

### Example 3: Spatial Queries

```typescript
export const SpatialQueryExample = `
import { useDomElementState } from '@minimact/core';

export function SmartList() {
  const items = useDomElementState('.list-item');

  return (
    <div>
      {items.map((item, i) => (
        <div className="list-item" key={i}>
          Item {i + 1}

          {/* Lookahead: next 3 items complete? */}
          {item.lookahead(3).every(it =>
            it.attributes['data-complete'] === 'true'
          ) && (
            <button>Complete batch</button>
          )}

          {/* Lookbehind: previous items had errors? */}
          {item.lookbehind(2).some(it =>
            it.state.invalid
          ) && (
            <div className="warning">Previous errors detected</div>
          )}
        </div>
      ))}

      {/* Predict based on scroll position */}
      {items.slice(-3).every(i => i.isIntersecting) && (
        <div>Loading more...</div>
      )}
    </div>
  );
}
`;
```

### Example 4: Visual Content Queries

```typescript
export const VisualContentExample = `
import { useDomElementState } from '@minimact/core';

export function ImageAnalyzer() {
  const canvas = useDomElementState('canvas');

  return (
    <div>
      <canvas width={400} height={300} />

      {canvas.ctx?.pixelData.avg() < 128 && (
        <div className="notice">
          ⚫ Image appears dark
        </div>
      )}

      {canvas.ctx?.dominantColor.startsWith('#ff') && (
        <div className="alert">
          🔴 Red dominant color detected
        </div>
      )}

      {canvas.ctx?.hasTransparency && (
        <div className="info">
          ✨ Image has transparency
        </div>
      )}
    </div>
  );
}
`;
```

### Example 5: Multi-Dimensional Query

```typescript
export const MultiDimensionalExample = `
import { useDomElementState } from '@minimact/core';

export function SuperSmartComponent() {
  const products = useDomElementState('.product');
  const app = useDomElementState('#root');

  return (
    <div>
      {/* SEVEN dimensions in ONE query */}
      {products.state.hover &&                    // Pseudo-state
       products.theme.isDark &&                   // Theme
       products.breakpoint.lg &&                  // Breakpoint
       products.vals.avg() > 100 &&               // Statistics
       products.some(p => p.isIntersecting) &&    // Intersection
       products[0].lookahead(2).length > 0 &&     // Spatial
       <PremiumUpsellModal />}

      {/* Predict based on combined conditions */}
      {usePredictHint('premium-modal', {
        trigger:
          products.vals.avg() > 100 &&
          products.some(p => p.state.hover) &&
          app.theme.isDark
      })}
    </div>
  );
}
`;
```

---

## Performance Optimization

### Lazy Observer Creation

Only create expensive observers when properties are accessed:

```typescript
class DomElementState {
  private _pseudoStateTracker?: PseudoStateTracker;
  private _themeTracker?: ThemeStateTracker;
  private _canvasTracker?: CanvasStateTracker;

  get state(): PseudoStateTracker {
    if (!this._pseudoStateTracker && this._element) {
      this._pseudoStateTracker = new PseudoStateTracker(this._element, () => this.notifyChange());
    }
    return this._pseudoStateTracker!;
  }

  // Similar for theme, canvas, etc.
}
```

### Debounced Updates

Throttle high-frequency events:

```typescript
class ThemeStateTracker {
  private pendingUpdate = false;

  private scheduleUpdate() {
    if (this.pendingUpdate) return;

    this.pendingUpdate = true;
    requestAnimationFrame(() => {
      this.notifyChange();
      this.pendingUpdate = false;
    });
  }
}
```

### Canvas Analysis Caching

Cache expensive canvas analysis:

```typescript
class CanvasStateTracker {
  private analysisCache: WeakMap<HTMLCanvasElement, AnalysisResult> = new WeakMap();

  private analyzeCanvas() {
    const cached = this.analysisCache.get(this.canvas);
    if (cached && !this.canvasHasChanged()) {
      return cached;
    }

    // Perform expensive analysis
    const result = this.performAnalysis();
    this.analysisCache.set(this.canvas, result);
    return result;
  }
}
```

---

## Testing Strategy

### Unit Tests for Advanced Features

```typescript
describe('DomElementState - Advanced Features', () => {
  describe('Pseudo-State', () => {
    it('should track hover state', () => {
      const el = document.createElement('button');
      const state = new DomElementState(el);

      el.dispatchEvent(new MouseEvent('mouseenter'));
      expect(state.state.hover).toBe(true);

      el.dispatchEvent(new MouseEvent('mouseleave'));
      expect(state.state.hover).toBe(false);
    });
  });

  describe('Theme State', () => {
    it('should detect dark mode', () => {
      const state = new DomElementState();
      // Mock matchMedia
      expect(state.theme.isDark).toBeDefined();
    });
  });

  describe('Spatial Queries', () => {
    it('should return lookahead elements', () => {
      const parent = document.createElement('div');
      parent.innerHTML = '<span></span><span></span><span></span>';

      const state = new DomElementState(parent.children[0] as HTMLElement);
      const lookahead = state.lookahead(2);

      expect(lookahead.length).toBe(2);
    });
  });

  describe('Canvas Queries', () => {
    it('should analyze canvas pixel data', () => {
      const canvas = document.createElement('canvas');
      const state = new DomElementState(canvas);

      expect(state.ctx?.pixelData.avg()).toBeGreaterThanOrEqual(0);
    });
  });
});
```

### E2E Tests

```typescript
test('hover-driven tooltip appears on prediction', async ({ page }) => {
  await page.goto('/examples/pseudo-state');

  // Verify prediction was sent
  const predictions = await page.evaluate(() => window.__minimact.predictions);
  expect(predictions).toContainEqual(expect.objectContaining({
    stateKey: expect.stringContaining('hover')
  }));

  // Hover button
  await page.hover('button');

  // Verify cache hit
  const overlay = page.locator('.prediction-overlay.success');
  await expect(overlay).toContainText('Pseudo-State Predicted');
});
```

---

## Migration from Existing Patterns

### From Manual Hover Tracking

**Before:**
```jsx
const [isHovered, setIsHovered] = useState(false);

<button
  onMouseEnter={() => setIsHovered(true)}
  onMouseLeave={() => setIsHovered(false)}
>
  {isHovered && <Tooltip />}
</button>
```

**After:**
```jsx
const btn = useDomElementState();

<button ref={btn}>
  {btn.state.hover && <Tooltip />}
</button>
```

### From matchMedia

**Before:**
```jsx
const [isDark, setIsDark] = useState(false);

useEffect(() => {
  const query = window.matchMedia('(prefers-color-scheme: dark)');
  setIsDark(query.matches);

  const handler = (e) => setIsDark(e.matches);
  query.addEventListener('change', handler);
  return () => query.removeEventListener('change', handler);
}, []);

{isDark && <DarkTheme />}
```

**After:**
```jsx
const app = useDomElementState('#root');

{app.theme.isDark && <DarkTheme />}
```

---

## Success Metrics

### Performance Goals
- Pseudo-state tracking overhead: **<0.5% CPU** (idle)
- Theme/breakpoint tracking: **<0.1% CPU** (idle)
- Canvas analysis: **<50ms** (one-time on creation)
- SVG shape queries: **<10ms** (typical scene)
- Gap detection: **<5ms** (typical layout)

### Developer Experience Goals
- Eliminate manual observer setup: **100%**
- Reduce pseudo-state tracking code: **90%**
- Reduce media query boilerplate: **95%**
- Reduce canvas analysis code: **80%**

### Prediction Accuracy Goals
- Hover-based predictions: **60-70%** hit rate
- Theme-based predictions: **80-90%** hit rate
- Spatial-based predictions: **70-80%** hit rate

---

## Timeline Estimate

### Phase 1: Pseudo-State (1 week)
- PseudoStateTracker implementation
- Integration with DomElementState
- Prediction generation
- Tests + docs

### Phase 2: Theme/Breakpoint (1 week)
- ThemeStateTracker implementation
- Breakpoint reactivity
- Media query integration
- Tests + docs

### Phase 3: Spatial Queries (1 week)
- Lookahead/lookbehind implementation
- Sibling/parent/closest queries
- Gap detection
- Tests + docs

### Phase 4: Canvas/SVG (1.5 weeks)
- CanvasStateTracker implementation
- SVGStateTracker implementation
- Visual analysis algorithms
- Tests + docs

### Phase 5: Playground Integration (1 week)
- Multi-dimensional state panel
- DOM topology visualizer
- Example components
- Visual demonstrations

### Phase 6: Optimization + Polish (0.5 weeks)
- Performance tuning
- Memory optimization
- Edge case handling

**Total: ~6 weeks for all advanced features**

---

## Conclusion

These advanced features complete the transformation of `useDomElementState()` from a DOM-state hook into a **complete query language for the browser's rendered reality**.

### What We've Built

A unified system where developers can query:
- ✅ **Structure** (DOM topology)
- ✅ **Statistics** (numeric aggregates)
- ✅ **Pseudo-State** (hover, active, focus, disabled)
- ✅ **Theme** (dark/light, high contrast, reduced motion)
- ✅ **Breakpoints** (responsive layout state)
- ✅ **Spatial Relationships** (lookahead, lookbehind, gaps)
- ✅ **Visual Content** (canvas pixels, SVG shapes, colors)
- ✅ **Potential** (what could exist, spaces between)

### The Philosophy

**"The cactus doesn't just store water. The cactus doesn't just sense the desert. The cactus IS the desert."**

Structure, space, light, shadow, temperature, potential.
All one system.
All observable.
All predictable.
All now.

### The Impact

This isn't just a framework feature. This is a **paradigm shift** in how UI frameworks treat the DOM.

React said: "Never read from the DOM"
Minimact says: "The DOM IS state - query it, react to it, predict from it"

🌵🧠🌌⚡🔥

**Building the reality engine. One dimension at a time.**
