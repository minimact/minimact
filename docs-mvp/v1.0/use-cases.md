# Use Cases

Minimact unlocks patterns that are difficult or impossible in traditional frameworks. This guide shows you what you can build and which hooks to use.

## Server Tasks & Heavy Computation

### Long-Running Operations

Execute expensive operations on the server with real-time progress updates.

**Use Cases:**
- AI/ML model inference (image classification, generation)
- Large dataset analysis with progress tracking
- Video transcoding with multi-format outputs
- PDF generation and email sending
- Batch email campaigns with live status updates

**Hooks:** [useServerTask](/api/hooks#useservertask)

```tsx
import { useServerTask } from 'minimact';

function AIImageGenerator() {
  const [task, generateImage] = useServerTask(async (updateProgress) => {
    updateProgress(0, 'Initializing model...');

    updateProgress(25, 'Generating base image...');
    const base = await runStableDiffusion(prompt);

    updateProgress(75, 'Upscaling...');
    const upscaled = await upscaleImage(base);

    updateProgress(100, 'Complete!');
    return upscaled;
  });

  return (
    <div>
      <button onClick={generateImage} disabled={task.isRunning}>
        Generate Image
      </button>
      {task.isRunning && (
        <div>
          <progress value={task.progress} max={100} />
          <p>{task.status}</p>
        </div>
      )}
      {task.result && <img src={task.result} />}
    </div>
  );
}
```

### Heavy Business Logic

Keep complex business logic secure on the server.

**Use Cases:**
- Invoice generation with tax calculations
- Payment processing with Stripe/payment gateways
- Complex pricing calculations with discounts/coupons
- Multi-stage data pipelines with progress reporting

**Hooks:** [useServerTask](/api/hooks#useservertask)

```tsx
function CheckoutButton({ cart }) {
  const [task, processPayment] = useServerTask(async (updateProgress) => {
    updateProgress(10, 'Validating cart...');
    await validateInventory(cart);

    updateProgress(30, 'Calculating totals...');
    const total = await calculateWithTax(cart);

    updateProgress(60, 'Processing payment...');
    const charge = await stripe.charges.create({ amount: total });

    updateProgress(90, 'Generating invoice...');
    await generateInvoice(charge.id);

    return { orderId: charge.id, total };
  });

  return (
    <button onClick={processPayment} disabled={task.isRunning}>
      {task.isRunning ? `Processing... ${task.progress}%` : 'Checkout'}
    </button>
  );
}
```

**Why it matters:** Private keys, database connections, and API credentials never leave the server. All written in TypeScript, transpiled to C#.

## Pagination & Data Fetching

### Traditional Pagination

Server-side filtering, sorting, and counting with automatic prefetching.

**Use Cases:**
- Table pagination with page numbers
- Product catalogs with filters
- Admin dashboards with sortable tables
- User management interfaces

**Hooks:** [usePaginatedServerTask](/api/hooks#usepaginatedservertask)

```tsx
import { usePaginatedServerTask } from 'minimact';

function ProductCatalog() {
  const {
    data,
    isLoading,
    currentPage,
    totalPages,
    loadNextPage,
    loadPreviousPage,
    goToPage
  } = usePaginatedServerTask(
    async (params) => {
      // params: { page, pageSize, offset, limit }
      return await db.products
        .skip(params.offset)
        .take(params.limit)
        .toArray();
    },
    { pageSize: 20 }
  );

  return (
    <div>
      <div className="products">
        {data.map(product => <ProductCard key={product.id} {...product} />)}
      </div>

      <Pagination
        current={currentPage}
        total={totalPages}
        onNext={loadNextPage}
        onPrevious={loadPreviousPage}
        onGoTo={goToPage}
      />
    </div>
  );
}
```

### Infinite Scroll

Progressive loading for social feeds and endless catalogs.

**Use Cases:**
- Social media feeds
- Image galleries
- Blog archives
- Activity streams

**Hooks:** [usePaginatedServerTask](/api/hooks#usepaginatedservertask)

```tsx
function InfiniteFeed() {
  const { data, loadNextPage, hasNextPage } = usePaginatedServerTask(
    async (params) => await fetchPosts(params),
    { pageSize: 10 }
  );

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasNextPage) {
        loadNextPage();
      }
    });

    const sentinel = document.querySelector('#load-more');
    if (sentinel) observer.observe(sentinel);

    return () => observer.disconnect();
  }, [hasNextPage]);

  return (
    <div>
      {data.map(post => <Post key={post.id} {...post} />)}
      {hasNextPage && <div id="load-more">Loading...</div>}
    </div>
  );
}
```

### Advanced Patterns

**Use Cases:**
- Filtered + sorted pagination (all server-side)
- Full-text search with paginated results
- Analytics dashboards with aggregated data
- Multi-table synchronized pagination

```tsx
function SearchResults({ query, filters }) {
  const { data, reload } = usePaginatedServerTask(
    async (params) => {
      return await db.products
        .where('name', 'contains', query)
        .where('category', 'in', filters.categories)
        .where('price', 'between', [filters.minPrice, filters.maxPrice])
        .orderBy(filters.sortBy, filters.sortOrder)
        .skip(params.offset)
        .take(params.limit)
        .toArray();
    },
    { pageSize: 20 }
  );

  // Reload when filters change
  useEffect(() => {
    reload();
  }, [query, filters]);

  return <ResultsGrid items={data} />;
}
```

## Real-Time Communication

### Pub/Sub Messaging

Decouple components with event-based communication.

**Use Cases:**
- Shopping cart updates across components
- Toast notifications from anywhere
- Activity feeds and audit logs
- Component-to-component messaging

**Hooks:** [usePub](/api/hooks#usepub), [useSub](/api/hooks#usesub)

```tsx
// Publisher component
import { usePub } from 'minimact';

function AddToCartButton({ product }) {
  const publish = usePub();

  const addToCart = () => {
    publish('cart:add', {
      productId: product.id,
      quantity: 1
    });
  };

  return <button onClick={addToCart}>Add to Cart</button>;
}

// Subscriber component (anywhere in the app)
import { useSub } from 'minimact';

function CartBadge() {
  const [count, setCount] = useState(0);

  useSub('cart:add', (message) => {
    setCount(c => c + message.quantity);
  });

  useSub('cart:remove', (message) => {
    setCount(c => c - message.quantity);
  });

  return <span className="badge">{count}</span>;
}
```

**Wildcard Subscriptions:**

```tsx
// Listen to all cart events
useSub('cart:*', (message) => {
  console.log('Cart event:', message);
  trackAnalytics('cart_interaction', message);
});

// Listen to multiple specific events
useSub(['user:login', 'user:logout'], (message) => {
  updateAuthUI(message);
});
```

### SignalR Direct Access

Low-level SignalR control for custom protocols.

**Use Cases:**
- Custom server events
- Real-time notifications
- Live chat systems
- Connection monitoring

**Hooks:** [useSignalR](/api/hooks#usesignalr)

```tsx
import { useSignalR } from 'minimact';

function LiveNotifications() {
  const { state, connectionId, on, off, invoke } = useSignalR();
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    // Listen for server-pushed notifications
    on('notification', (notification) => {
      setNotifications(prev => [notification, ...prev]);
    });

    return () => off('notification');
  }, []);

  const markAsRead = async (id) => {
    await invoke('MarkNotificationRead', id);
  };

  return (
    <div>
      <p>Connection: {state}</p>
      {notifications.map(n => (
        <Notification key={n.id} {...n} onRead={markAsRead} />
      ))}
    </div>
  );
}
```

## Performance & Scheduling

### Task Scheduling

Control when code runs for optimal performance.

**Use Cases:**
- Defer non-critical work to idle time
- Smooth animations with requestAnimationFrame
- Debounce expensive operations
- Background processing

**Hooks:** [useMicroTask](/api/hooks#usemicrotask), [useMacroTask](/api/hooks#usemacrotask), [useAnimationFrame](/api/hooks#useanimationframe), [useIdleCallback](/api/hooks#useidlecallback)

```tsx
import { useAnimationFrame, useIdleCallback } from 'minimact';

function SmoothCounter() {
  const [count, setCount] = useState(0);
  const [target, setTarget] = useState(0);

  // Smooth animation to target
  useAnimationFrame(() => {
    if (count < target) {
      setCount(c => Math.min(c + 1, target));
    }
  });

  // Defer analytics to idle time
  useIdleCallback((deadline) => {
    if (deadline.timeRemaining() > 50) {
      trackAnalytics('counter_update', { value: count });
    }
  });

  return (
    <div>
      <h1>{count}</h1>
      <button onClick={() => setTarget(target + 10)}>+10</button>
    </div>
  );
}
```

## DOM as Data Source (Extensions)

### Reactive DOM Properties

Query DOM state reactively without manual event listeners.

**Use Cases:**
- Lazy-load ads when visible
- Responsive layouts based on element size
- Scroll-triggered animations
- Viewport-aware components

**Hooks:** [useDomElementState](/api/hooks#usedomelementstate) (minimact-punch)

```tsx
import { useDomElementState } from 'minimact-punch';

function LazyAd() {
  const ad = useDomElementState('#ad-container');

  return (
    <div id="ad-container">
      {/* Only load expensive ad when visible */}
      {ad.isIntersecting && <GoogleAd />}

      {/* Responsive based on container size */}
      {ad.width < 300 ? <CompactAd /> : <FullAd />}

      {/* Show scroll progress */}
      <progress value={ad.scrollTop} max={ad.scrollHeight} />
    </div>
  );
}
```

**80+ reactive properties:**
- `isIntersecting` - Element in viewport
- `width`, `height` - Dimensions
- `scrollTop`, `scrollLeft` - Scroll position
- `childrenCount` - Number of children
- Statistical aggregates: `.vals.avg()`, `.vals.sum()`, `.vals.median()`

### SQL-like DOM Queries

Query DOM like a relational database.

**Use Cases:**
- Find unstable components (high change rate)
- Aggregate statistics across elements
- Complex DOM filtering
- Performance monitoring

**Hooks:** [useDomQuery](/api/hooks#usedomquery) (minimact-query)

```tsx
import { useDomQuery } from 'minimact-query';

function PerformanceMonitor() {
  const slowComponents = useDomQuery()
    .from('.component')
    .where(c => c.history.changesPerSecond > 10)
    .orderBy(c => c.history.volatility, 'DESC')
    .limit(10);

  return (
    <div>
      <h2>Unstable Components</h2>
      {slowComponents.map(c => (
        <ComponentAlert key={c.id} component={c} />
      ))}
    </div>
  );
}
```

### Dynamic Value Binding

Separate structure from content for sub-millisecond updates.

**Use Cases:**
- High-frequency price updates
- Real-time dashboards
- Stock tickers
- Live sports scores

**Hooks:** [useDynamicState](/api/hooks#usedynamicstate) (minimact-dynamic)

```tsx
import { useDynamicState } from 'minimact-dynamic';

function PriceDisplay() {
  const [price, setPrice] = useState(100);
  const [isPremium, setIsPremium] = useState(false);

  // Define structure ONCE
  const jsx = <span className="price"></span>;

  // Bind value dynamically
  useDynamicState('.price', (state) =>
    state.isPremium ? state.price * 0.8 : state.price
  );

  // Updates bypass VDOM - direct DOM mutation (<1ms)
  return jsx;
}
```

### Spatial Queries

Query viewport regions as a 2D database.

**Use Cases:**
- Header overflow detection
- Sidebar density monitoring
- Region-based analytics
- Spatial collision detection

**Hooks:** [useArea](/api/hooks#usearea) (minimact-spatial)

```tsx
import { useArea } from 'minimact-spatial';

function AdaptiveLayout() {
  const header = useArea({ top: 0, height: 80 });
  const sidebar = useArea('#sidebar');

  return (
    <>
      {/* Compact mode when header is full */}
      {header.isFull && <CompactHeader />}

      {/* Show scroll indicator for dense sidebars */}
      {sidebar.elementsCount > 10 && <ScrollIndicator />}

      {/* Monitor coverage */}
      <p>Sidebar coverage: {sidebar.coverage}%</p>
    </>
  );
}
```

### Declarative State Machines

XState-like decision trees with predictive transitions.

**Use Cases:**
- Complex conditional pricing
- Multi-level permission systems
- Dynamic discount calculation
- Workflow state management

**Hooks:** [useDecisionTree](/api/hooks#usedecisiontree) (minimact-trees)

```tsx
import { useDecisionTree } from 'minimact-trees';

function DynamicPricing({ role, itemCount }) {
  const price = useDecisionTree({
    roleAdmin: 0,                    // Admins: free
    rolePremium: {
      count5Plus: 0,                 // Premium + 5+ items: free
      count3to4: 5,                  // Premium + 3-4 items: $5
      count1to2: 10                  // Premium + 1-2 items: $10
    },
    roleBasic: {
      count10Plus: 15,               // Basic + 10+ items: $15
      count1to9: 25                  // Basic + 1-9 items: $25
    }
  }, {
    role,
    count: itemCount
  });

  return <p>Price: ${price}</p>;
}
```

## Core Reactive Patterns

### Client-Only State

High-frequency updates without server round-trips.

**Use Cases:**
- Mouse position tracking
- Scroll position
- Animation state
- UI-only toggles (dropdowns, modals)
- Integration with external libraries (lodash, moment.js)

**Hooks:** [useClientState](/api/hooks#useclientstate)

```tsx
import { useClientState } from 'minimact';

function MouseTracker() {
  const [pos, setPos] = useClientState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useClientState(false);

  return (
    <div
      onMouseMove={(e) => setPos({ x: e.clientX, y: e.clientY })}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      Mouse: ({pos.x}, {pos.y})
      {isHovered && <Tooltip />}
    </div>
  );
}
```

**Benefits:**
- Zero network latency (instant updates)
- No server load
- Perfect for animations and high-frequency events

### Server State

Default state management with automatic synchronization.

**Use Cases:**
- Form data
- Shopping carts
- User preferences
- Application state that needs server persistence

**Hooks:** [useState](/api/hooks#usestate)

```tsx
import { useState } from 'minimact';

function ShoppingCart() {
  const [items, setItems] = useState([]);
  const [coupon, setCoupon] = useState('');

  // Semantic array operations (10x faster template learning)
  const addItem = (item) => setItems.append(item);
  const removeItem = (index) => setItems.removeAt(index);
  const updateQuantity = (index, qty) =>
    setItems.updateAt(index, { quantity: qty });

  return (
    <div>
      {items.map((item, i) => (
        <CartItem
          key={i}
          item={item}
          onRemove={() => removeItem(i)}
          onUpdateQty={(qty) => updateQuantity(i, qty)}
        />
      ))}
      <input
        value={coupon}
        onChange={(e) => setCoupon(e.target.value)}
        placeholder="Coupon code"
      />
    </div>
  );
}
```

### Side Effects

Lifecycle hooks for setup and cleanup.

**Use Cases:**
- Data fetching on mount
- Setting up subscriptions
- DOM measurements
- Timers and intervals

**Hooks:** [useEffect](/api/hooks#useeffect)

```tsx
import { useEffect, useState } from 'minimact';

function UserProfile({ userId }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Runs when userId changes
    loadUser(userId).then(setUser);
  }, [userId]);

  useEffect(() => {
    // Setup on mount
    const timer = setInterval(() => {
      checkNotifications();
    }, 5000);

    // Cleanup on unmount
    return () => clearInterval(timer);
  }, []);

  return <div>{user?.name}</div>;
}
```

### Refs & DOM Access

Direct DOM manipulation when needed.

**Use Cases:**
- Focus management
- Scroll to element
- Third-party library integration
- Canvas/WebGL rendering

**Hooks:** [useRef](/api/hooks#useref)

```tsx
import { useRef, useEffect } from 'minimact';

function AutoFocusInput() {
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return <input ref={inputRef} />;
}
```

## Common Patterns

### Predictive Rendering

Explicitly hint upcoming state changes for instant UI updates.

**Use Cases:**
- Increment/decrement counters
- Toggle switches
- Pagination controls
- Any predictable user interaction

**Hooks:** [usePredictHint](/api/hooks#usepredicthint)

```tsx
import { usePredictHint, useState } from 'minimact';

function Counter() {
  const [count, setCount] = useState(0);

  // Predict next increment (95% confident)
  usePredictHint(() => ({ count: count + 1 }), 0.95);

  return (
    <div>
      <p>Count: {count}</p>
      {/* Instant update - DOM patch already cached! */}
      <button onClick={() => setCount(count + 1)}>+</button>
    </div>
  );
}
```

**Result:** 2-3ms perceived latency vs 47ms (traditional SSR)

### Markdown Rendering

Server-side markdown parsing for security and performance.

**Use Cases:**
- Blog posts
- Documentation
- User comments (with sanitization)
- Rich text content

**Hooks:** [useMarkdown](/api/hooks#usemarkdown)

```tsx
import { useMarkdown } from 'minimact';

function BlogPost({ markdown }) {
  const html = useMarkdown(markdown);

  return (
    <article dangerouslySetInnerHTML={{ __html: html }} />
  );
}
```

### Layout Templates

Apply consistent layouts across pages.

**Use Cases:**
- Admin dashboards
- Marketing pages
- Documentation sites
- Multi-layout applications

**Hooks:** [useTemplate](/api/hooks#usetemplate)

```tsx
import { useTemplate } from 'minimact';

function Dashboard() {
  useTemplate('AdminLayout'); // Sidebar + header

  return (
    <div>
      <h1>Dashboard</h1>
      {/* Content renders inside layout */}
    </div>
  );
}

function LandingPage() {
  useTemplate('MarketingLayout'); // Full-width

  return <HeroSection />;
}
```

## Key Differentiators

✅ **Single Language** - Write TypeScript, runs on server as C#
✅ **Type Safety** - Types flow from TS to C#
✅ **Real-Time by Default** - WebSocket/SignalR built-in
✅ **Server-Native** - Heavy computation on server automatically
✅ **Progress Tracking** - Built into every async operation
✅ **Unified Pagination** - One hook replaces 100+ lines
✅ **Minimal Client Bundle** - 13.33 KB (71% smaller than React)
✅ **Predictive Rendering** - 95-98% cache hit rates

## Who Benefits

👤 **Solo Developers** - Build real-time apps alone
🏢 **Small Startups** - Enterprise features without enterprise cost
🎓 **Students** - Learn one language, build full stack
🏪 **Small Businesses** - Afford advanced features
💼 **Enterprises** - 10x faster development

## Next Steps

- Explore the [Hooks API Reference](/api/hooks)
- Learn about [Predictive Rendering](/guide/predictive-rendering)
- See [Code Examples](/examples)
- Read [Core Concepts](/guide/concepts)
