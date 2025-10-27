# Hooks API Reference

Minimact provides React-compatible hooks that work in server-side components, plus some Minimact-specific hooks for advanced features.

## Core Hooks

### useState

Server-side state management with automatic re-rendering.

```tsx
const [count, setCount] = useState(0);
const [name, setName] = useState('');
const [user, setUser] = useState<User | null>(null);
```

**Transpiles to C#:**

```csharp
[UseState]
private int count = 0;

[UseState]
private string name = "";

[UseState]
private User? user = null;
```

**Updates trigger automatic re-render:**

```tsx
setCount(count + 1); // Server re-renders, sends DOM patches to client
```

#### Semantic Array Operations

For array state, Minimact provides semantic helper methods that make template learning 10x faster:

```tsx
const [items, setItems] = useState<Item[]>([]);

// Semantic operations (10x faster template learning)
setItems.append(newItem);              // Add to end
setItems.prepend(newItem);             // Add to start
setItems.insertAt(2, newItem);         // Insert at index
setItems.removeAt(1);                  // Remove by index
setItems.updateAt(0, { status: 'done' }); // Update by index
setItems.appendMany([item1, item2]);   // Add multiple
setItems.removeWhere(item => item.done); // Remove matching
setItems.updateWhere(
  item => item.id === 5,
  { status: 'active' }
);

// Traditional setter still works
setItems([...items, newItem]);
```

**Why semantic operations?**
- Server knows your intent (append vs prepend vs insert)
- Template extraction is 10-20ms instead of 100-200ms
- No array diffing required
- 100% backward compatible

### useEffect

Side effects that run on the server after render.

```tsx
useEffect(() => {
    console.log('Component initialized');

    // Cleanup function
    return () => {
        console.log('Component disposed');
    };
}, []); // Empty deps = run once
```

**With dependencies:**

```tsx
useEffect(() => {
    // Runs when userId changes
    loadUserData(userId);
}, [userId]);
```

**Note:** useEffect runs on the server, not the client. For client-side effects, use `useClientState` with event handlers.

### useRef

Create a mutable reference that persists across renders.

```tsx
const countRef = useRef(0);
const elementRef = useRef<HTMLElement>(null);

// Accessing ref value
console.log(countRef.current);

// DOM ref
<div ref={elementRef}>Content</div>
```

**Transpiles to C#:**

```csharp
[UseRef]
private int countRef = 0;

[UseRef]
private VNode? elementRef = null;
```

## Minimact-Specific Hooks

### useClientState

Client-only reactive state that never syncs to the server. Perfect for UI state like mouse position, scroll position, or animations.

```tsx
import { useClientState } from 'minimact';

const [mousePos, setMousePos] = useClientState({ x: 0, y: 0 });
const [isHovered, setIsHovered] = useClientState(false);

// Client-only - no server round-trip
<div
  onMouseMove={(e) => setMousePos({ x: e.clientX, y: e.clientY })}
  onMouseEnter={() => setIsHovered(true)}
  onMouseLeave={() => setIsHovered(false)}
>
  Mouse: {mousePos.x}, {mousePos.y}
  {isHovered && <Tooltip />}
</div>
```

**Benefits:**
- Zero network latency (instant updates)
- No server load
- Perfect for high-frequency events
- Integrates with external libraries (lodash, moment.js, etc.)

### usePredictHint

Explicitly tell the prediction system about upcoming state changes for 100% cache hit rates.

```tsx
import { usePredictHint } from 'minimact';

function Counter() {
  const [count, setCount] = useState(0);

  // Hint: next click will increment count
  usePredictHint(() => ({ count: count + 1 }), 0.95);

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>+</button>
    </div>
  );
}
```

**Parameters:**
- `predictor`: Function that returns predicted state changes
- `confidence`: 0.0 to 1.0 (how confident this prediction is)

**Result:** Client receives pre-rendered DOM patch, applies it instantly on click (2-3ms vs 47ms).

### useMarkdown

Server-side markdown parsing and rendering.

```tsx
import { useMarkdown } from 'minimact';

function BlogPost({ content }: { content: string }) {
  const html = useMarkdown(content);

  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
```

**Features:**
- Parsed on server (no client-side markdown library needed)
- Supports GitHub-flavored markdown
- Syntax highlighting for code blocks
- Cached for performance

### useTemplate

Apply layout templates to components.

```tsx
import { useTemplate } from 'minimact';

function Dashboard() {
  useTemplate('AdminLayout'); // Apply admin layout

  return (
    <div>
      <h1>Dashboard</h1>
      {/* Content renders inside layout */}
    </div>
  );
}
```

**Available layouts:**
- `DefaultLayout` - Basic layout with header/footer
- `SidebarLayout` - Layout with sidebar navigation
- `AuthLayout` - Layout for login/signup pages
- `AdminLayout` - Admin dashboard layout

## Extension Hooks

### useDomElementState (minimact-punch)

Make the DOM queryable like a database with 80+ reactive properties.

```tsx
import { useDomElementState } from 'minimact-punch';

function AdBanner() {
  const banner = useDomElementState('#ad-banner');

  // Reactive properties (auto-update via observers)
  return (
    <div id="ad-banner">
      {banner.isIntersecting && <AdContent />}
      {banner.width < 300 && <CompactAd />}
      Scroll depth: {banner.scrollTop}px
      Children: {banner.childrenCount}
    </div>
  );
}
```

**80+ Properties including:**
- `isIntersecting` - IntersectionObserver integration
- `width`, `height`, `top`, `left` - Dimensions and position
- `childrenCount` - Number of children
- `scrollTop`, `scrollLeft` - Scroll position
- `classList`, `attributes` - DOM attributes
- Statistical aggregates: `.vals.avg()`, `.vals.sum()`, `.vals.median()`

**MES Silver Certified** - Meets Minimact Extension Standards

### useDomQuery (minimact-query)

Query the DOM with SQL semantics.

```tsx
import { useDomQuery } from 'minimact-query';

const unstableComponents = useDomQuery()
  .from('.component')
  .where(c => c.history.changesPerSecond > 10)
  .orderBy(c => c.history.volatility, 'DESC')
  .limit(10);
```

### useDynamicState (minimact-dynamic)

Separate DOM structure from value binding for sub-millisecond updates.

```tsx
import { useDynamicState } from 'minimact-dynamic';

const [state, setState] = useState({ price: 100, isPremium: false });

// Define structure ONCE
<span className="price"></span>

// Bind values with function
useDynamicState('.price', (s) =>
  s.isPremium ? s.price * 0.8 : s.price
);

// Updates bypass VDOM - direct DOM mutation (<1ms)
```

### useArea (minimact-spatial)

Query spatial regions of the viewport as a 2D database.

```tsx
import { useArea } from 'minimact-spatial';

const header = useArea({ top: 0, height: 80 });
const sidebar = useArea('#sidebar');

return (
  <>
    {header.isFull && <CompactMode />}
    {sidebar.elementsCount > 10 && <ScrollIndicator />}
    Coverage: {sidebar.coverage}%
  </>
);
```

### useDecisionTree (minimact-trees)

Declarative state machines with predictive transitions.

```tsx
import { useDecisionTree } from 'minimact-trees';

const price = useDecisionTree({
  roleAdmin: 0,
  rolePremium: {
    count5: 0,
    count3: 5
  },
  roleBasic: 10
}, { role: 'admin', count: 5 });

// Result: 0 (matched roleAdmin path)
```

## Server Task Hooks

### useServerTask

Execute long-running server tasks with progress updates and cancellation support.

```tsx
import { useServerTask } from 'minimact';

function DataProcessor() {
  const [task, startTask] = useServerTask(async (updateProgress) => {
    for (let i = 0; i <= 100; i += 10) {
      await delay(500);
      updateProgress(i); // Client receives progress updates in real-time
    }
    return 'Processing complete!';
  });

  return (
    <div>
      <button onClick={startTask} disabled={task.isRunning}>
        Process Data
      </button>
      {task.isRunning && (
        <div>
          <progress value={task.progress} max={100} />
          <p>{task.progress}% complete</p>
        </div>
      )}
      {task.error && <p className="error">Error: {task.error}</p>}
      {task.result && <p className="success">Result: {task.result}</p>}
    </div>
  );
}
```

**Task Properties:**
- `task.isRunning` - Boolean: Task is currently executing
- `task.progress` - Number: Current progress (0-100)
- `task.result` - Any: Task result when complete
- `task.error` - String: Error message if task failed
- `task.status` - `'idle' | 'running' | 'completed' | 'failed'`

**Options:**
```tsx
const [task, startTask] = useServerTask(taskFunction, {
  onSuccess: (result) => console.log('Task completed:', result),
  onError: (error) => console.error('Task failed:', error),
  onProgress: (progress) => console.log('Progress:', progress)
});
```

### usePaginatedServerTask

Execute server tasks with automatic pagination for large datasets.

```tsx
import { usePaginatedServerTask } from 'minimact';

function UserList() {
  const {
    data,
    isLoading,
    error,
    hasNextPage,
    hasPreviousPage,
    currentPage,
    totalPages,
    loadNextPage,
    loadPreviousPage,
    goToPage
  } = usePaginatedServerTask(
    async (params) => {
      // params: { page, pageSize, offset, limit }
      return await apiClient.getUsers(params);
    },
    {
      pageSize: 20,
      initialPage: 1
    }
  );

  if (isLoading) return <Spinner />;
  if (error) return <Error message={error} />;

  return (
    <div>
      {data.map(user => <UserCard key={user.id} user={user} />)}

      <div className="pagination">
        <button onClick={loadPreviousPage} disabled={!hasPreviousPage}>
          Previous
        </button>
        <span>Page {currentPage} of {totalPages}</span>
        <button onClick={loadNextPage} disabled={!hasNextPage}>
          Next
        </button>
      </div>
    </div>
  );
}
```

**Pagination Properties:**
- `data` - Array: Current page data
- `isLoading` - Boolean: Loading state
- `error` - String: Error message
- `hasNextPage` - Boolean: More pages available
- `hasPreviousPage` - Boolean: Can go to previous page
- `currentPage` - Number: Current page number
- `totalPages` - Number: Total page count
- `totalItems` - Number: Total item count

**Pagination Methods:**
- `loadNextPage()` - Load next page
- `loadPreviousPage()` - Load previous page
- `goToPage(pageNumber)` - Jump to specific page
- `reload()` - Reload current page
- `setPageSize(size)` - Change page size

## Pub/Sub Hooks

### usePub

Publish messages to other components using a pub/sub pattern.

```tsx
import { usePub } from 'minimact';

function CartButton() {
  const publish = usePub();

  const addToCart = (item) => {
    // Publish message to 'cart:add' channel
    publish('cart:add', { item, quantity: 1 });
  };

  return <button onClick={() => addToCart(product)}>Add to Cart</button>;
}
```

### useSub

Subscribe to messages from other components.

```tsx
import { useSub } from 'minimact';

function CartCounter() {
  const [count, setCount] = useState(0);

  // Subscribe to 'cart:add' messages
  useSub('cart:add', (message) => {
    setCount(c => c + message.quantity);
  });

  return <div>Cart Items: {count}</div>;
}
```

**Pub/Sub Patterns:**
```tsx
// Wildcard subscriptions
useSub('cart:*', (message) => {
  console.log('Any cart event:', message);
});

// Multiple subscriptions
useSub(['cart:add', 'cart:remove'], (message) => {
  updateCart(message);
});
```

## Task Scheduling Hooks

### useMicroTask

Schedule a callback to run as a microtask (before next render).

```tsx
import { useMicroTask } from 'minimact';

function Component() {
  useMicroTask(() => {
    // Runs before next paint
    console.log('Microtask executed');
  });
}
```

### useMacroTask

Schedule a callback to run as a macrotask (after current event loop).

```tsx
import { useMacroTask } from 'minimact';

function Component() {
  useMacroTask(() => {
    // Runs in next event loop iteration
    console.log('Macrotask executed');
  }, 1000); // Optional delay in ms
}
```

### useAnimationFrame

Schedule a callback to run before next repaint (requestAnimationFrame).

```tsx
import { useAnimationFrame } from 'minimact';

function AnimatedComponent() {
  const [position, setPosition] = useState(0);

  useAnimationFrame((deltaTime) => {
    setPosition(p => p + deltaTime * 0.1);
  });

  return <div style={{ transform: `translateX(${position}px)` }}>Moving</div>;
}
```

### useIdleCallback

Schedule a callback to run when browser is idle (requestIdleCallback).

```tsx
import { useIdleCallback } from 'minimact';

function Component() {
  useIdleCallback((deadline) => {
    // deadline.timeRemaining() - ms until deadline
    while (deadline.timeRemaining() > 0 && hasWork()) {
      doWork();
    }
  });
}
```

## SignalR Hook

### useSignalR

Access SignalR connection state and methods directly.

```tsx
import { useSignalR } from 'minimact';

function ConnectionStatus() {
  const { state, connectionId, invoke, on, off } = useSignalR();

  useEffect(() => {
    // Listen for custom server events
    on('serverNotification', (message) => {
      console.log('Server says:', message);
    });

    return () => off('serverNotification');
  }, []);

  const pingServer = async () => {
    const response = await invoke('Ping', 'Hello!');
    console.log('Server response:', response);
  };

  return (
    <div>
      <p>Connection: {state}</p>
      <p>ID: {connectionId}</p>
      <button onClick={pingServer}>Ping Server</button>
    </div>
  );
}
```

**SignalR State Values:**
- `'Disconnected'` - Not connected
- `'Connecting'` - Connection in progress
- `'Connected'` - Active connection
- `'Reconnecting'` - Attempting to reconnect

## Extension Hooks

### useDomElementState (minimact-punch)

Make the DOM queryable like a database with 80+ reactive properties.

```tsx
import { useDomElementState } from 'minimact-punch';

function AdBanner() {
  const banner = useDomElementState('#ad-banner');

  // Reactive properties (auto-update via observers)
  return (
    <div id="ad-banner">
      {banner.isIntersecting && <AdContent />}
      {banner.width < 300 && <CompactAd />}
      Scroll depth: {banner.scrollTop}px
      Children: {banner.childrenCount}
    </div>
  );
}
```

**80+ Properties including:**
- `isIntersecting` - IntersectionObserver integration
- `width`, `height`, `top`, `left` - Dimensions and position
- `childrenCount` - Number of children
- `scrollTop`, `scrollLeft` - Scroll position
- `classList`, `attributes` - DOM attributes
- Statistical aggregates: `.vals.avg()`, `.vals.sum()`, `.vals.median()`

**MES Silver Certified** - Meets Minimact Extension Standards

### useDomQuery (minimact-query)

Query the DOM with SQL semantics.

```tsx
import { useDomQuery } from 'minimact-query';

const unstableComponents = useDomQuery()
  .from('.component')
  .where(c => c.history.changesPerSecond > 10)
  .orderBy(c => c.history.volatility, 'DESC')
  .limit(10);
```

### useDynamicState (minimact-dynamic)

Separate DOM structure from value binding for sub-millisecond updates.

```tsx
import { useDynamicState } from 'minimact-dynamic';

const [state, setState] = useState({ price: 100, isPremium: false });

// Define structure ONCE
<span className="price"></span>

// Bind values with function
useDynamicState('.price', (s) =>
  s.isPremium ? s.price * 0.8 : s.price
);

// Updates bypass VDOM - direct DOM mutation (<1ms)
```

### useArea (minimact-spatial)

Query spatial regions of the viewport as a 2D database.

```tsx
import { useArea } from 'minimact-spatial';

const header = useArea({ top: 0, height: 80 });
const sidebar = useArea('#sidebar');

return (
  <>
    {header.isFull && <CompactMode />}
    {sidebar.elementsCount > 10 && <ScrollIndicator />}
    Coverage: {sidebar.coverage}%
  </>
);
```

### useDecisionTree (minimact-trees)

Declarative state machines with predictive transitions.

```tsx
import { useDecisionTree } from 'minimact-trees';

const price = useDecisionTree({
  roleAdmin: 0,
  rolePremium: {
    count5: 0,
    count3: 5
  },
  roleBasic: 10
}, { role: 'admin', count: 5 });

// Result: 0 (matched roleAdmin path)
```

## Next Steps

- Learn about [Predictive Rendering](/guide/predictive-rendering)
- Explore [Core Concepts](/guide/concepts)
- See [Examples](/examples)
