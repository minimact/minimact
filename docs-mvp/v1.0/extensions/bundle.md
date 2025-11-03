# minimact-bundle

**Declarative DOM Selector Primitives**

Behavioral anchors without wrappers. Apply attributes, classes, and styles to arbitrary DOM elements declaratively.

---

## Overview

minimact-bundle provides declarative DOM selector primitives that let you control arbitrary DOM elements without wrapper divs or manual DOM manipulation. It's **pure declarative control** - state-driven attribute application using JSX primitives.

:::tip Revolutionary Concept
**Traditional**: Wrapper divs or imperative DOM manipulation
```tsx
// ❌ Wrapper hell
<div className="fade-in">
  <h1>Title</h1>
  <p>Description</p>
</div>

// ❌ Manual DOM manipulation
useEffect(() => {
  document.querySelectorAll('.hero h1').forEach(el => {
    el.classList.add('fade-in');
  });
}, []);
```

**Bundle**: Declarative, no wrappers needed
```tsx
// ✅ Clean, declarative
registerBundle("hero", ".hero h1, .hero p");
useBundle("hero", { class: "fade-in" });

<section className="hero">
  <h1>Title</h1>
  <p>Description</p>
</section>
```
:::

---

## Installation

```bash
npm install minimact-bundle
```

---

## Quick Start

```typescript
import { registerBundle, useBundle } from '@minimact/bundle';

function MyComponent() {
  const [visible, setVisible] = useState(false);

  // Register bundle (what it targets)
  useEffect(() => {
    registerBundle("hero-animation", ".hero h1, .hero p, button");
  }, []);

  // Use bundle (what to apply)
  useBundle("hero-animation", {
    class: visible ? "fade-in visible" : "fade-in"
  });

  return (
    <section className="hero">
      <h1>Welcome</h1>
      <p>This is awesome</p>
      <button onClick={() => setVisible(true)}>Show</button>
    </section>
  );
}
```

**Result:** All matching elements (h1, p, button) get the `fade-in` class, and when `visible` is true, they also get the `visible` class. **No wrapper divs needed!**

---

## Core Concepts

### 1. Bundle Registration

Define **what** the bundle targets:

```typescript
// CSS selector
registerBundle("hero", ".hero h1, .hero p");

// Function (dynamic selection)
registerBundle("visible", () => {
  return Array.from(document.querySelectorAll('.item'))
    .filter(el => isInViewport(el));
});

// Direct elements
registerBundle("specific", [element1, element2]);
```

### 2. Bundle Application

Define **how** to modify the targets:

```typescript
useBundle("hero", {
  class: "fade-in visible",
  style: { opacity: 1, transform: 'translateY(0)' },
  'data-animated': 'true'
});
```

---

## API Reference

### Registration

#### `registerBundle(id, selector)`

Register a bundle with a selector.

**Parameters:**
- `id: string` - Unique bundle identifier
- `selector: string | (() => Element[]) | Element[]` - Target selector

**Selector types:**
- `string` - CSS selector
- `() => Element[]` - Function returning elements
- `Element[]` - Direct element array

**Example:**
```typescript
registerBundle(
  "hero-animation",
  ".hero h1, .hero p, button"
);
```

#### `unregisterBundle(id)`

Remove a bundle registration.

**Parameters:**
- `id: string` - Bundle identifier to remove

**Example:**
```typescript
unregisterBundle("hero-animation");
```

---

### Hook (Minimact Integration)

#### `useBundle(id, attributes)`

Apply attributes to bundled elements (Minimact hook).

**Parameters:**
- `id: string` - Bundle identifier
- `attributes: BundleAttributes` - Attributes to apply

**Attributes:**
- `class` or `className` - CSS classes to add
- `style` - Inline styles (object or string)
- `data-*` - Data attributes
- Any other valid HTML attributes

**Example:**
```typescript
const bundle = useBundle("hero-animation", {
  class: "fade-in",
  style: { opacity: 1 },
  'data-animated': 'true'
});
```

---

### Standalone API

#### `Bundle` Class

For use without Minimact/hooks.

```typescript
import { Bundle, registerBundle } from '@minimact/bundle';

registerBundle("hero", ".hero h1, .hero p");

const bundle = new Bundle({
  id: "hero",
  attributes: {
    class: "fade-in"
  }
});

bundle.apply();   // Apply attributes
bundle.update({ class: "fade-out" }); // Update
bundle.cleanup(); // Remove attributes
```

---

## Real-World Examples

### Example 1: Scroll Reveal Animation

```typescript
function HomePage() {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    registerBundle("scroll-reveal", ".hero h1, .hero p, .feature-card");

    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useBundle("scroll-reveal", {
    class: scrollY > 100 ? "fade-in visible" : "fade-in",
    style: {
      opacity: scrollY > 100 ? 1 : 0,
      transform: scrollY > 100 ? 'translateY(0)' : 'translateY(20px)'
    }
  });

  return (
    <div>
      <section className="hero">
        <h1>Welcome to Our Site</h1>
        <p>Scroll down to reveal content</p>
      </section>
      <div className="feature-card">Feature 1</div>
      <div className="feature-card">Feature 2</div>
      <div className="feature-card">Feature 3</div>
    </div>
  );
}
```

### Example 2: Theme Switching

```typescript
function App() {
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    registerBundle("themed-elements", () => {
      return [
        ...Array.from(document.querySelectorAll('.card')),
        ...Array.from(document.querySelectorAll('.panel')),
        document.querySelector('body')
      ].filter(Boolean) as Element[];
    });
  }, []);

  useBundle("themed-elements", {
    class: `theme-${theme}`,
    'data-theme': theme
  });

  return (
    <div>
      <button onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')}>
        Toggle Theme ({theme})
      </button>
      <div className="card">Card 1</div>
      <div className="card">Card 2</div>
      <div className="panel">Panel Content</div>
    </div>
  );
}
```

### Example 3: Loading States

```typescript
function Dashboard() {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    registerBundle("interactive", "button, input, select, a[href]");
  }, []);

  useBundle("interactive", {
    class: loading ? "disabled loading" : "",
    'data-loading': loading,
    style: {
      pointerEvents: loading ? 'none' : 'auto',
      opacity: loading ? 0.5 : 1
    }
  });

  const handleRefresh = async () => {
    setLoading(true);
    await fetchData();
    setLoading(false);
  };

  return (
    <div>
      <button onClick={handleRefresh}>Refresh Data</button>
      <div className="content">
        <button>Action 1</button>
        <button>Action 2</button>
        <input placeholder="Search..." />
        <select>
          <option>Option 1</option>
          <option>Option 2</option>
        </select>
      </div>
    </div>
  );
}
```

### Example 4: Print Styling

```typescript
function Invoice() {
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    registerBundle("no-print", ".sidebar, .header, .footer, button");
  }, []);

  useBundle("no-print", {
    style: { display: printing ? 'none' : undefined },
    'data-print-hidden': printing
  });

  const handlePrint = () => {
    setPrinting(true);
    window.print();
    setTimeout(() => setPrinting(false), 100);
  };

  return (
    <div>
      <div className="header">
        <h1>Company Logo</h1>
        <button onClick={handlePrint}>Print Invoice</button>
      </div>
      <div className="invoice-content">
        <h2>Invoice #12345</h2>
        <p>Amount: $1,234.56</p>
      </div>
      <div className="sidebar">Navigation</div>
      <div className="footer">Footer Content</div>
    </div>
  );
}
```

### Example 5: Responsive Layout

```typescript
function Gallery() {
  const { width } = useWindowSize();
  const layout = width < 768 ? 'mobile' : width < 1024 ? 'tablet' : 'desktop';

  useEffect(() => {
    registerBundle("gallery-items", ".gallery-item");
  }, []);

  useBundle("gallery-items", {
    class: `layout-${layout}`,
    'data-layout': layout,
    style: {
      gridColumn: layout === 'mobile' ? 'span 1' :
                  layout === 'tablet' ? 'span 2' : 'span 3'
    }
  });

  return (
    <div className="gallery">
      <div className="gallery-item">Item 1</div>
      <div className="gallery-item">Item 2</div>
      <div className="gallery-item">Item 3</div>
      <div className="gallery-item">Item 4</div>
    </div>
  );
}
```

### Example 6: Dynamic Grid System

```typescript
function Dashboard() {
  const [columns, setColumns] = useState(3);

  useEffect(() => {
    registerBundle("grid-items", ".dashboard-widget");
  }, []);

  useBundle("grid-items", {
    style: {
      gridColumn: `span ${Math.floor(12 / columns)}`,
      transition: 'all 0.3s ease'
    },
    'data-columns': columns
  });

  return (
    <div>
      <div className="controls">
        <button onClick={() => setColumns(2)}>2 Columns</button>
        <button onClick={() => setColumns(3)}>3 Columns</button>
        <button onClick={() => setColumns(4)}>4 Columns</button>
      </div>
      <div className="dashboard-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)' }}>
        <div className="dashboard-widget">Sales Chart</div>
        <div className="dashboard-widget">User Stats</div>
        <div className="dashboard-widget">Revenue</div>
        <div className="dashboard-widget">Conversions</div>
      </div>
    </div>
  );
}
```

### Example 7: Focus Management

```typescript
function Modal({ isOpen }) {
  useEffect(() => {
    registerBundle("focusable", "a, button, input, select, textarea, [tabindex]");
  }, []);

  useBundle("focusable", {
    'tabindex': isOpen ? undefined : '-1',
    style: {
      pointerEvents: isOpen ? 'auto' : 'none'
    }
  });

  return isOpen ? (
    <div className="modal">
      <h2>Modal Title</h2>
      <input placeholder="Name" />
      <button>Submit</button>
      <button>Cancel</button>
    </div>
  ) : null;
}
```

---

## Advanced Patterns

### Multiple Bundles

Apply different attributes to different element groups:

```typescript
function AnimatedPage() {
  const [trigger, setTrigger] = useState(false);

  useEffect(() => {
    registerBundle("fade-in", ".card, .panel");
    registerBundle("slide-in", ".sidebar, .header");
    registerBundle("bounce-in", "button.primary");
  }, []);

  useBundle("fade-in", {
    class: trigger ? "animate-fade" : ""
  });

  useBundle("slide-in", {
    class: trigger ? "animate-slide" : ""
  });

  useBundle("bounce-in", {
    class: trigger ? "animate-bounce" : ""
  });

  return (
    <div>
      <button onClick={() => setTrigger(true)}>Animate All</button>
      {/* Cards will fade, sidebar will slide, primary buttons will bounce */}
    </div>
  );
}
```

### Conditional Registration

Register/unregister bundles dynamically:

```typescript
function FeatureToggle() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (enabled) {
      registerBundle("highlight", ".important");
    } else {
      unregisterBundle("highlight");
    }
  }, [enabled]);

  if (enabled) {
    useBundle("highlight", {
      class: "highlighted",
      style: { background: 'yellow' }
    });
  }

  return (
    <div>
      <button onClick={() => setEnabled(!enabled)}>
        Toggle Highlights
      </button>
      <p className="important">Important text 1</p>
      <p className="important">Important text 2</p>
    </div>
  );
}
```

### Dynamic Selectors

Change selector based on state:

```typescript
function FilteredView() {
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const selector = filter === 'all'
      ? '.item'
      : `.item[data-category="${filter}"]`;

    registerBundle("filtered-items", selector);
  }, [filter]);

  useBundle("filtered-items", {
    class: "visible",
    style: { display: 'block' }
  });

  return (
    <div>
      <select onChange={e => setFilter(e.target.value)}>
        <option value="all">All</option>
        <option value="tech">Tech</option>
        <option value="design">Design</option>
      </select>

      <div className="item" data-category="tech">Tech Item</div>
      <div className="item" data-category="design">Design Item</div>
      <div className="item" data-category="tech">Another Tech</div>
    </div>
  );
}
```

### Function-Based Selection

Select elements programmatically:

```typescript
function LazyLoadImages() {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    registerBundle("visible-images", () => {
      return Array.from(document.querySelectorAll('img.lazy'))
        .filter(img => {
          const rect = img.getBoundingClientRect();
          return rect.top < window.innerHeight + 100; // 100px buffer
        });
    });

    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useBundle("visible-images", {
    class: "loaded",
    'data-loaded': 'true'
  });

  return (
    <div>
      {[1, 2, 3, 4, 5].map(i => (
        <img key={i} className="lazy" data-src={`image${i}.jpg`} />
      ))}
    </div>
  );
}
```

---

## Benefits

✅ **No Wrapper Pollution** - Keep markup clean and semantic
✅ **Declarative Control** - State-driven attribute application
✅ **Reusable Bundles** - Define once, use everywhere
✅ **Dynamic Targeting** - Function-based selectors for runtime logic
✅ **Type-Safe** - Full TypeScript support
✅ **Server-Compatible** - Integrates with Minimact's SSR
✅ **Zero Output** - Renders nothing to the DOM
✅ **Pure Behavior** - Behavioral anchor without visual presence

---

## Performance

| Operation | Time |
|-----------|------|
| Bundle registration | < 1ms |
| Attribute application (10 elements) | < 2ms |
| Update attributes | < 1ms |
| Cleanup | < 1ms |

**Optimization Tips:**

```typescript
// Cache selectors that don't change
useEffect(() => {
  registerBundle("static", ".card");
}, []); // Empty deps - only register once

// Use specific selectors for better performance
registerBundle("items", ".list > .item"); // ✅ Specific
registerBundle("items", ".item");         // ❌ Too broad

// Batch updates
useBundle("multi", {
  class: "a b c",              // ✅ Single update
  style: { x: 1, y: 2, z: 3 }  // ✅ Single style update
});
```

---

## Integration with Minimact

minimact-bundle follows the standard Minimact extension pattern:

### Client-Side

```typescript
// Bundle applies attributes declaratively
useBundle("hero", {
  class: "fade-in",
  style: { opacity: 1 }
});

// Automatically syncs to server
context.signalR.updateBundleState(
  componentId,
  bundleId,
  { class: "fade-in", style: { opacity: 1 } }
);
```

### Server-Side

```csharp
// Server receives bundle state
protected override VNode Render()
{
    var bundleState = State["bundle_hero"];

    // Can use bundle state in rendering logic
    return new VNode("section",
        bundleState.Attributes.ContainsKey("class") &&
        bundleState.Attributes["class"].Contains("visible")
            ? new VNode("p", "Content is visible!")
            : new VNode("p", "Content hidden")
    );
}
```

---

## MES Certification

minimact-bundle has achieved **MES Silver** certification:

- ✅ Component context integration
- ✅ Index tracking for multiple instances
- ✅ Cleanup handling
- ✅ Server sync support
- ✅ TypeScript declarations
- ✅ Dual-mode architecture (standalone + integrated)

---

## Philosophy

> **"The DOM is now your puppet."** 🎯
>
> **"Control it declaratively. No wrappers needed."**

Traditional frameworks force you to wrap elements to control them. minimact-bundle lets you **target and control any DOM elements** without changing your markup structure.

It's **behavioral composition** - pure behavior without visual presence. Define what you want to control, then apply attributes declaratively based on state.

---

## Browser Support

- ✅ Modern browsers with `document.querySelectorAll`
- ✅ IE11+ (with polyfills)
- ✅ Server-side rendering compatible

---

## Next Steps

- [minimact-punch (DOM State)](/v1.0/extensions/punch)
- [minimact-query (SQL for DOM)](/v1.0/extensions/query)
- [minimact-quantum (DOM Entanglement)](/v1.0/extensions/quantum)
- [Core Hooks API](/v1.0/api/hooks)

---

**Part of the Minimact Quantum Stack** 🌵🎯✨
