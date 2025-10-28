# Minimact Bundle

**Declarative DOM Selector Primitives** - Behavioral anchors without wrappers 🎯

Apply attributes, classes, and styles to arbitrary DOM elements using declarative JSX primitives. No wrapper divs, no manual DOM manipulation, pure declarative control.

---

## Installation

```bash
npm install minimact-bundle
```

---

## Quick Start

```typescript
import { registerBundle, useBundle } from 'minimact-bundle';

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

## The Problem This Solves

### Traditional Approach (Wrapper Hell)

```tsx
// ❌ Have to wrap everything
<div className="fade-in">
  <h1>Title</h1>
  <p>Description</p>
  <button>Click</button>
</div>

// Or manual DOM manipulation
useEffect(() => {
  document.querySelectorAll('.hero h1, .hero p').forEach(el => {
    el.classList.add('fade-in');
  });
}, []);
```

### Bundle Approach (Clean & Declarative)

```tsx
// ✅ No wrappers, declarative control
registerBundle("hero-animation", ".hero h1, .hero p, button");

useBundle("hero-animation", {
  class: "fade-in"
});

<section className="hero">
  <h1>Title</h1>
  <p>Description</p>
  <button>Click</button>
</section>
```

---

## Core Concepts

### 1. Bundle Registration

Define **what** the bundle targets:

```typescript
// CSS selector
registerBundle("hero", ".hero h1, .hero p");

// Function (dynamic)
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

```typescript
registerBundle(
  "hero-animation",           // Unique ID
  ".hero h1, .hero p, button" // CSS selector
);
```

**Selector types:**

- `string` - CSS selector
- `() => Element[]` - Function returning elements
- `Element[]` - Direct element array

#### `unregisterBundle(id)`

Remove a bundle registration.

```typescript
unregisterBundle("hero-animation");
```

---

### Hook (Minimact Integration)

#### `useBundle(id, attributes)`

Apply attributes to bundled elements (Minimact hook).

```typescript
const bundle = useBundle("hero-animation", {
  class: "fade-in",
  style: { opacity: 1 },
  'data-animated': 'true'
});
```

**Attributes:**

- `class` or `className` - CSS classes to add
- `style` - Inline styles (object or string)
- `data-*` - Data attributes
- Any other valid HTML attributes

---

### Standalone API

#### `Bundle` Class

For use without Minimact/hooks.

```typescript
import { Bundle, registerBundle } from 'minimact-bundle';

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

### 1. Scroll Reveal Animation

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
    class: scrollY > 100 ? "fade-in visible" : "fade-in"
  });

  return (
    <div>
      <section className="hero">
        <h1>Welcome</h1>
        <p>Scroll to reveal</p>
      </section>
      <div className="feature-card">Feature 1</div>
      <div className="feature-card">Feature 2</div>
    </div>
  );
}
```

---

### 2. Theme Switching

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
    class: `theme-${theme}`
  });

  return (
    <div>
      <button onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')}>
        Toggle Theme
      </button>
      <div className="card">Card 1</div>
      <div className="card">Card 2</div>
    </div>
  );
}
```

---

### 3. Loading States

```typescript
function Dashboard() {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    registerBundle("interactive", "button, input, select, a[href]");
  }, []);

  useBundle("interactive", {
    class: loading ? "disabled loading" : "",
    'data-loading': loading
  });

  const handleRefresh = async () => {
    setLoading(true);
    await fetchData();
    setLoading(false);
  };

  return (
    <div>
      <button onClick={handleRefresh}>Refresh</button>
      <div className="content">
        <button>Action 1</button>
        <button>Action 2</button>
        <input />
        <select>...</select>
      </div>
    </div>
  );
}
```

---

### 4. Print Styling

```typescript
function Invoice() {
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    registerBundle("no-print", ".sidebar, .header, .footer, button");
  }, []);

  useBundle("no-print", {
    style: { display: printing ? 'none' : undefined }
  });

  const handlePrint = () => {
    setPrinting(true);
    window.print();
    setTimeout(() => setPrinting(false), 100);
  };

  return (
    <div>
      <div className="header">
        <button onClick={handlePrint}>Print</button>
      </div>
      <div className="invoice-content">
        {/* Invoice details */}
      </div>
      <div className="footer">Footer</div>
    </div>
  );
}
```

---

### 5. Responsive Layout

```typescript
function Gallery() {
  const { width } = useWindowSize();
  const layout = width < 768 ? 'mobile' : width < 1024 ? 'tablet' : 'desktop';

  useEffect(() => {
    registerBundle("gallery-items", ".gallery-item");
  }, []);

  useBundle("gallery-items", {
    class: `layout-${layout}`,
    'data-layout': layout
  });

  return (
    <div className="gallery">
      <div className="gallery-item">Item 1</div>
      <div className="gallery-item">Item 2</div>
      <div className="gallery-item">Item 3</div>
    </div>
  );
}
```

---

### 6. Dynamic Grid System

```typescript
function Dashboard() {
  const [columns, setColumns] = useState(3);

  useEffect(() => {
    registerBundle("grid-items", ".dashboard-widget");
  }, []);

  useBundle("grid-items", {
    style: {
      gridColumn: `span ${Math.floor(12 / columns)}`
    }
  });

  return (
    <div>
      <div className="controls">
        <button onClick={() => setColumns(2)}>2 Columns</button>
        <button onClick={() => setColumns(3)}>3 Columns</button>
        <button onClick={() => setColumns(4)}>4 Columns</button>
      </div>
      <div className="dashboard-grid">
        <div className="dashboard-widget">Sales</div>
        <div className="dashboard-widget">Users</div>
        <div className="dashboard-widget">Revenue</div>
      </div>
    </div>
  );
}
```

---

## Advanced Patterns

### Multiple Bundles

Apply different attributes to different element groups:

```typescript
useEffect(() => {
  registerBundle("fade-in", ".card, .panel");
  registerBundle("slide-in", ".sidebar, .header");
  registerBundle("bounce-in", "button.primary");
}, []);

useBundle("fade-in", { class: "animate-fade" });
useBundle("slide-in", { class: "animate-slide" });
useBundle("bounce-in", { class: "animate-bounce" });
```

---

### Conditional Registration

Register/unregister bundles dynamically:

```typescript
const [enabled, setEnabled] = useState(false);

useEffect(() => {
  if (enabled) {
    registerBundle("highlight", ".important");
  } else {
    unregisterBundle("highlight");
  }
}, [enabled]);

{enabled && <useBundle id="highlight" class="highlighted" />}
```

---

### Dynamic Selectors

Change selector based on state:

```typescript
const [filter, setFilter] = useState('all');

useEffect(() => {
  const selector = filter === 'all'
    ? '.item'
    : `.item[data-category="${filter}"]`;

  registerBundle("filtered-items", selector);
}, [filter]);

useBundle("filtered-items", { class: "visible" });
```

---

### Function-Based Selection

Select elements programmatically:

```typescript
useEffect(() => {
  registerBundle("visible-in-viewport", () => {
    return Array.from(document.querySelectorAll('.lazy-load'))
      .filter(el => {
        const rect = el.getBoundingClientRect();
        return rect.top < window.innerHeight && rect.bottom > 0;
      });
  });
}, []);

useBundle("visible-in-viewport", { class: "loaded" });
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

## Architecture

```
minimact (core framework)
  ↓
minimact-bundle (declarative DOM selectors)
  ├─ Standalone mode (no dependencies)
  └─ Integrated mode (with Minimact hooks)
```

---

## Browser Support

- Modern browsers with `document.querySelectorAll`
- IE11+ (with polyfills)
- Server-side rendering compatible

---

## MES Certification

**Silver** - Meets Minimact Extension Standards:
- ✅ Component context integration
- ✅ Index tracking
- ✅ Cleanup handling
- ✅ Server sync support
- ✅ TypeScript declarations
- ✅ Dual-mode architecture

---

## License

MIT

---

**The DOM is now your puppet.** 🎯

Control it declaratively. No wrappers needed.

**Welcome to behavioral composition.**
