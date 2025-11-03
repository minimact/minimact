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

### useComputed

**Client-side computation with server-side rendering.** Compute values on the client using browser-only APIs or external libraries, then sync results to the server for rendering.

This hook embodies Minimact's **dehydrationist architecture**: the client computes, but the server still does ALL rendering.

#### Why useComputed?

Sometimes you need browser-only APIs or libraries:
- **lodash/moment** — Heavy libraries you don't want on the server
- **Geolocation API** — `navigator.geolocation`
- **Web Crypto API** — `crypto.subtle.encrypt()`
- **Canvas/WebGL** — Graphics computations
- **IndexedDB** — Client-side database queries

**useComputed** lets you use these on the client, then sync results to the server for rendering.

#### Basic Usage

```tsx
import { useComputed } from '@minimact/core';

function UserList({ users }) {
  // Compute on client using lodash
  const sortedUsers = useComputed('sortedUsers', () => {
    return _.sortBy(users, 'name');
  }, [users]);

  return (
    <ul>
      {sortedUsers.map(user => (
        <li key={user.id}>{user.name}</li>
      ))}
    </ul>
  );
}
```

**How it works:**
1. Client runs `_.sortBy(users, 'name')`
2. Result syncs to server via SignalR (`UpdateClientComputedState`)
3. Server accesses value via `GetClientState<User[]>('sortedUsers')`
4. Server renders `<li>` elements with sorted data

#### Async Computations

useComputed supports promises for async operations:

```tsx
function LocationMap() {
  const location = useComputed('location', async () => {
    const pos = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject);
    });
    return {
      lat: pos.coords.latitude,
      lng: pos.coords.longitude
    };
  }, []);

  if (!location) return <div>Getting location...</div>;

  return <Map center={location} />;
}
```

#### Memoization & Caching

By default, useComputed **memoizes** results to avoid unnecessary recomputation:

```tsx
const result = useComputed('result', () => {
  console.log('Computing...');
  return expensiveComputation(data);
}, [data], {
  memoize: true,    // Default: true
  expiry: 5000      // Cache expires after 5 seconds
});
```

**Without expiry:** Value is cached until dependencies change
**With expiry:** Value recomputes after N milliseconds, even if deps haven't changed

#### Debounce & Throttle

Control how often results sync to the server:

```tsx
// Debounce: Wait 300ms after last change before syncing
const filtered = useComputed('filtered', () => {
  return items.filter(item => item.name.includes(searchTerm));
}, [items, searchTerm], {
  debounce: 300  // Wait for user to stop typing
});

// Throttle: Sync at most once every 1000ms
const position = useComputed('position', () => {
  return { x: mouseX, y: mouseY };
}, [mouseX, mouseY], {
  throttle: 1000  // Max once per second
});
```

#### Initial Values

Provide an initial value to avoid `null` on first render:

```tsx
const total = useComputed('total', () => {
  return items.reduce((sum, item) => sum + item.price, 0);
}, [items], {
  initialValue: 0  // Show 0 instead of null initially
});
```

#### Complete Example: Client-Side Crypto

```tsx
import { useComputed, useState } from '@minimact/core';

function SecureForm() {
  const [password, setPassword] = useState('');

  // Hash password on client using Web Crypto API
  const hashedPassword = useComputed('hashedPassword', async () => {
    if (!password) return null;

    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }, [password], {
    debounce: 500  // Wait for user to stop typing
  });

  const handleSubmit = async () => {
    // Server receives hashedPassword via GetClientState<string>('hashedPassword')
    await fetch('/api/register', {
      method: 'POST',
      body: JSON.stringify({ hashedPassword })
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      {hashedPassword && (
        <div className="hash-preview">
          Hash: {hashedPassword.substring(0, 16)}...
        </div>
      )}
      <button type="submit">Register</button>
    </form>
  );
}
```

#### Server-Side Access

On the server, access computed values via `GetClientState<T>()`:

```csharp
public class SecureForm : MinimactComponent
{
    protected override VNode Render()
    {
        var hashedPassword = GetClientState<string>("hashedPassword");

        // Render form with hashed password preview
        return new VElement("form", new Dictionary<string, string>
        {
            { "onSubmit", "handleSubmit" }
        }, /* ... */);
    }

    private async Task HandleSubmit()
    {
        var hashedPassword = GetClientState<string>("hashedPassword");
        // Use hashedPassword for registration
    }
}
```

#### Performance Characteristics

- **Memoization:** Avoids recomputation when deps unchanged
- **Debounce/Throttle:** Reduces network traffic to server
- **Expiry:** Automatic cache invalidation for time-sensitive data
- **Async support:** Non-blocking computations with promises

#### When to Use useComputed

✅ **Use when you need:**
- Browser-only APIs (geolocation, crypto, canvas)
- Heavy client-side libraries (lodash, moment, d3)
- Client-computed values for server rendering

❌ **Don't use when:**
- You can compute on the server (just use regular code)
- You need pure client-side state (use `useState` on client)
- The computation is trivial (no need for caching/memoization)

#### vs React's useMemo

React's `useMemo` only memoizes on the client. Minimact's `useComputed`:
- Memoizes on client
- Syncs to server
- Server accesses via `GetClientState<T>()`
- Server still does ALL rendering (dehydrationist!)

---

### createContext & useContext

**Redis-like server-side cache system** for shared state across components with flexible lifetime management.

Unlike React's context (which requires Provider components), Minimact's context is stored **server-side in a cache** with scoped lifetimes.

#### createContext

Create a context with specified scope and options.

```tsx
import { createContext } from '@minimact/core';

// Session-scoped user context
const UserContext = createContext<User>('current-user', {
  scope: 'session',
  expiry: 3600000 // 1 hour in ms
});

// URL-scoped dashboard filters
const DashboardFilters = createContext<Filters>('dashboard-filters', {
  scope: 'url',
  urlPattern: '/dashboard/*',
  expiry: 3600000
});

// Application-wide theme
const ThemeContext = createContext<Theme>('app-theme', {
  scope: 'application'
});

// Request-scoped (default)
const RequestContext = createContext<RequestData>('request-data');
```

**Scope types:**
- `'request'` — Tied to current HTTP request (default)
- `'session'` — Tied to user session (persists across requests)
- `'url'` — Scoped to URL pattern (e.g., `/dashboard/*`)
- `'application'` — Global, shared across all users

#### useContext

Use a context — returns `[value, setValue, clearValue]`.

**No Provider component needed** — the context is stored server-side in a cache.

```tsx
import { useContext } from '@minimact/core';

// Component 1: Write to context
function LoginForm() {
  const [_, setUser] = useContext(UserContext);

  const handleLogin = async (credentials) => {
    const user = await authenticate(credentials);
    setUser(user); // Stored in session-scoped cache
  };

  return <form onSubmit={handleLogin}>...</form>;
}

// Component 2: Read from context (no parent-child relationship needed!)
function UserProfile() {
  const [user] = useContext(UserContext);

  if (!user) return <Login />;
  return <div>Welcome, {user.name}</div>;
}

// Component 3: Clear context
function LogoutButton() {
  const [user, _, clearUser] = useContext(UserContext);

  return (
    <button onClick={clearUser}>
      Logout {user?.name}
    </button>
  );
}
```

**Key differences from React Context:**
- ✅ **No Provider component** — just use it anywhere
- ✅ **Server-side cache** — survives page navigation
- ✅ **Scoped lifetimes** — session, URL, or application-wide
- ✅ **Type-safe** — full TypeScript inference
- ✅ **No parent-child relationship required** — any component can access

**Common patterns:**

```tsx
// Authentication
const AuthContext = createContext<User | null>('auth', {
  scope: 'session',
  expiry: 3600000
});

function useAuth() {
  const [user, setUser, clearUser] = useContext(AuthContext);
  return {
    user,
    login: (u: User) => setUser(u),
    logout: () => clearUser(),
    isAuthenticated: !!user
  };
}

// Dashboard filters (persists while on dashboard pages)
const FilterContext = createContext<Filters>('filters', {
  scope: 'url',
  urlPattern: '/dashboard/*',
  expiry: 1800000, // 30 minutes
  defaultValue: { sortBy: 'date', order: 'desc' }
});

function DashboardFilters() {
  const [filters, setFilters] = useContext(FilterContext);

  return (
    <select
      value={filters.sortBy}
      onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}
    >
      <option value="date">Date</option>
      <option value="name">Name</option>
    </select>
  );
}

// Application theme
const ThemeContext = createContext<'light' | 'dark'>('theme', {
  scope: 'application',
  defaultValue: 'light'
});

function ThemeToggle() {
  const [theme, setTheme] = useContext(ThemeContext);

  return (
    <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
      Current: {theme}
    </button>
  );
}
```

**How it works:**

1. **Client calls setter** → Updates local state instantly (optimistic UI)
2. **Cached patches applied** → If prediction exists, apply immediately
3. **SignalR syncs to server** → `UpdateContext` message sent
4. **Server stores in cache** → With specified scope and expiry
5. **Other components get updates** → Via SignalR patches

**Performance:**
- First access may require server round-trip
- Subsequent accesses use cached patches (~2-3ms)
- Changes propagate to all components using the same context

## Minimact-Specific Hooks

### useClientState

Client-only reactive state that never syncs to the server. Perfect for UI state like mouse position, scroll position, or animations.

```tsx
import { useClientState } from '@minimact/core';

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
import { usePredictHint } from '@minimact/core';

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
import { useMarkdown } from '@minimact/core';

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
import { useTemplate } from '@minimact/core';

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

### useBundle (minimact-bundle)

Declarative DOM selector primitives for applying attributes without wrapper pollution.

```tsx
import { registerBundle, useBundle } from 'minimact-bundle';

function Hero() {
  const [visible, setVisible] = useState(false);

  // Register what to target
  useEffect(() => {
    registerBundle("hero-animation", ".hero h1, .hero p, button");
  }, []);

  // Apply attributes declaratively
  useBundle("hero-animation", {
    class: visible ? "fade-in visible" : "fade-in"
  });

  return (
    <section className="hero">
      <h1>Welcome</h1>
      <p>This is awesome</p>
      <button onClick={() => setVisible(!visible)}>Toggle</button>
    </section>
  );
}
```

**Key Features:**
- No wrapper divs needed
- CSS selector, function, or direct element targeting
- Apply classes, styles, and attributes
- Automatic cleanup on unmount
- Theme switching, loading states, animations

**MES Silver Certified** - Meets Minimact Extension Standards

**Example: Theme Switching**
```tsx
const [theme, setTheme] = useState('light');

useEffect(() => {
  registerBundle("themed", "body, .card, .panel");
}, []);

useBundle("themed", {
  class: `theme-${theme}`
});
```

**Example: Loading States**
```tsx
const [loading, setLoading] = useState(false);

useEffect(() => {
  registerBundle("interactive", "button, input, select");
}, []);

useBundle("interactive", {
  class: loading ? "disabled loading" : "",
  'data-loading': loading
});
```

## Server Task Hooks

### useServerTask

Execute long-running server tasks with progress updates and cancellation support.

```tsx
import { useServerTask } from '@minimact/core';

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
import { usePaginatedServerTask } from '@minimact/core';

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

### useServerReducer

**Server-side reducer for complex state transitions.** Similar to React's `useReducer`, but the reducer function executes on the server, enabling validation, side effects, and database operations while maintaining reactive UI updates.

#### Why useServerReducer?

Traditional `useState` works great for simple values, but complex state transitions often need:
- **Validation** - Ensure state changes are valid before applying
- **Side effects** - Update database, send notifications, log events
- **Complex logic** - Multi-step updates, conditional transitions
- **Business rules** - Enforce server-side constraints

**useServerReducer** moves this logic to the server while keeping UI reactive.

#### Basic Usage

```tsx
import { useServerReducer } from '@minimact/core';

type CounterState = { count: number };
type CounterAction =
  | { type: 'increment' }
  | { type: 'decrement' }
  | { type: 'set', value: number };

function Counter() {
  const counter = useServerReducer<CounterState, CounterAction>({ count: 0 });

  return (
    <div>
      <button onClick={() => counter.dispatch({ type: 'decrement' })}>-</button>
      <span>{counter.state.count}</span>
      <button onClick={() => counter.dispatch({ type: 'increment' })}>+</button>
      {counter.dispatching && <Spinner />}
      {counter.error && <div className="error">{counter.error.message}</div>}
    </div>
  );
}
```

**Server-side reducer (C#):**

```csharp
public class Counter : MinimactComponent
{
    [ServerReducer]
    public CounterState CounterReducer(CounterState state, CounterAction action)
    {
        return action.Type switch
        {
            "increment" => new CounterState { Count = state.Count + 1 },
            "decrement" => new CounterState { Count = state.Count - 1 },
            "set" => new CounterState { Count = action.Value },
            _ => state
        };
    }
}
```

#### Async Dispatch

Wait for the server to process the action and return the new state:

```tsx
const handleReset = async () => {
  try {
    const newState = await counter.dispatchAsync({ type: 'set', value: 0 });
    console.log('Counter reset to:', newState.count);
    toast.success('Reset successful!');
  } catch (error) {
    console.error('Reset failed:', error);
    toast.error('Failed to reset counter');
  }
};

return <button onClick={handleReset}>Reset</button>;
```

#### Complex Example: Shopping Cart

```tsx
type CartState = {
  items: CartItem[];
  total: number;
  tax: number;
  shipping: number;
};

type CartAction =
  | { type: 'addItem', item: CartItem }
  | { type: 'removeItem', itemId: string }
  | { type: 'updateQuantity', itemId: string, quantity: number }
  | { type: 'applyDiscount', code: string }
  | { type: 'clear' };

function ShoppingCart() {
  const cart = useServerReducer<CartState, CartAction>({
    items: [],
    total: 0,
    tax: 0,
    shipping: 0
  });

  const handleAddToCart = async (product: Product) => {
    const newState = await cart.dispatchAsync({
      type: 'addItem',
      item: {
        id: product.id,
        name: product.name,
        price: product.price,
        quantity: 1
      }
    });

    toast.success(`Added ${product.name} to cart`);
    console.log('New total:', newState.total);
  };

  return (
    <div>
      <h2>Shopping Cart ({cart.state.items.length} items)</h2>

      {cart.state.items.map(item => (
        <div key={item.id} className="cart-item">
          <span>{item.name}</span>
          <input
            type="number"
            value={item.quantity}
            onChange={(e) => cart.dispatch({
              type: 'updateQuantity',
              itemId: item.id,
              quantity: parseInt(e.target.value)
            })}
            disabled={cart.dispatching}
          />
          <button
            onClick={() => cart.dispatch({ type: 'removeItem', itemId: item.id })}
            disabled={cart.dispatching}
          >
            Remove
          </button>
        </div>
      ))}

      {cart.dispatching && (
        <div className="loading">
          <Spinner />
          <p>Updating cart...</p>
        </div>
      )}

      <div className="cart-summary">
        <p>Subtotal: ${cart.state.total.toFixed(2)}</p>
        <p>Tax: ${cart.state.tax.toFixed(2)}</p>
        <p>Shipping: ${cart.state.shipping.toFixed(2)}</p>
        <h3>Total: ${(cart.state.total + cart.state.tax + cart.state.shipping).toFixed(2)}</h3>
      </div>

      <button
        onClick={() => cart.dispatch({ type: 'clear' })}
        disabled={cart.dispatching || cart.state.items.length === 0}
      >
        Clear Cart
      </button>

      {cart.error && (
        <div className="error">
          <p>Error: {cart.error.message}</p>
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      )}
    </div>
  );
}
```

**Server-side reducer with validation and side effects:**

```csharp
public class ShoppingCart : MinimactComponent
{
    [ServerReducer]
    public async Task<CartState> CartReducer(CartState state, CartAction action)
    {
        switch (action.Type)
        {
            case "addItem":
                // Validation
                if (state.Items.Count >= 50)
                {
                    throw new InvalidOperationException("Cart is full (max 50 items)");
                }

                var newItem = action.Item;
                var existingItem = state.Items.FirstOrDefault(i => i.Id == newItem.Id);

                if (existingItem != null)
                {
                    // Update quantity of existing item
                    existingItem.Quantity += newItem.Quantity;
                }
                else
                {
                    // Add new item
                    state.Items.Add(newItem);
                }

                // Side effect: Log to analytics
                await _analytics.TrackEvent("cart_item_added", new { itemId = newItem.Id });

                break;

            case "removeItem":
                var itemToRemove = state.Items.FirstOrDefault(i => i.Id == action.ItemId);
                if (itemToRemove != null)
                {
                    state.Items.Remove(itemToRemove);

                    // Side effect: Log removal
                    await _analytics.TrackEvent("cart_item_removed", new { itemId = action.ItemId });
                }
                break;

            case "updateQuantity":
                var itemToUpdate = state.Items.FirstOrDefault(i => i.Id == action.ItemId);
                if (itemToUpdate != null)
                {
                    // Validation
                    if (action.Quantity <= 0)
                    {
                        throw new ArgumentException("Quantity must be greater than 0");
                    }
                    if (action.Quantity > 99)
                    {
                        throw new ArgumentException("Max quantity is 99");
                    }

                    itemToUpdate.Quantity = action.Quantity;
                }
                break;

            case "applyDiscount":
                // Validation: Check discount code
                var discount = await _discountService.ValidateCode(action.Code);
                if (discount == null)
                {
                    throw new InvalidOperationException("Invalid discount code");
                }

                state.DiscountCode = action.Code;
                state.DiscountAmount = discount.Amount;

                // Side effect: Mark discount as used
                await _discountService.MarkAsUsed(action.Code);
                break;

            case "clear":
                state.Items.Clear();
                state.DiscountCode = null;
                state.DiscountAmount = 0;
                break;
        }

        // Recalculate totals
        state.Total = state.Items.Sum(i => i.Price * i.Quantity);
        state.Tax = state.Total * 0.08m; // 8% tax
        state.Shipping = state.Total > 50 ? 0 : 9.99m; // Free shipping over $50

        // Apply discount
        if (state.DiscountAmount > 0)
        {
            state.Total -= state.DiscountAmount;
        }

        return state;
    }
}
```

#### Reducer Properties

- `reducer.state` - Current reducer state
- `reducer.dispatching` - Boolean: Action is being processed
- `reducer.error` - Error object if last action failed
- `reducer.lastDispatchedAt` - Date: When last action was dispatched
- `reducer.lastActionType` - String: Type of last action (if action has `type` field)

#### Reducer Methods

- `dispatch(action)` - Fire-and-forget dispatch (non-blocking)
- `dispatchAsync(action)` - Async dispatch (returns Promise with new state)

#### How It Works

1. **Client dispatches action** → `reducer.dispatch({ type: 'increment' })`
2. **Optimistic UI update** → `reducer.dispatching = true` (instant feedback)
3. **SignalR sends action to server** → `DispatchServerReducer` message
4. **Server executes reducer** → Validation, side effects, state computation
5. **Server sends new state** → Via SignalR patches
6. **Client applies patches** → UI updates with actual result
7. **Error handling** → If server returns error, `reducer.error` is set

**Timeline:**
- **0ms**: Client calls `dispatch()`
- **0-2ms**: `dispatching = true` applied (hint queue match if predicted)
- **2ms**: SignalR message sent to server
- **10-50ms**: Server processes action, returns new state
- **50-100ms**: Client receives patches, applies to DOM

#### Error Handling

Server-side errors are captured and exposed via `reducer.error`:

```tsx
{counter.error && (
  <div className="error">
    <p>Error: {counter.error.message}</p>
    <button onClick={() => counter.dispatch({ type: 'retry' })}>
      Retry
    </button>
  </div>
)}
```

**Server-side error:**

```csharp
[ServerReducer]
public CounterState CounterReducer(CounterState state, CounterAction action)
{
    if (action.Type == "set" && action.Value < 0)
    {
        throw new ArgumentException("Count cannot be negative");
    }

    // ... rest of reducer
}
```

#### Optimistic Updates with Predictions

Like `useState`, `useServerReducer` integrates with the hint queue for instant feedback:

```tsx
// Server pre-computes patches for common actions
usePredictHint(() => ({
  serverReducer_0: {
    state: { count: counter.state.count + 1 },
    dispatching: true
  }
}), 0.95);

// When user clicks, predicted patch applies instantly (0-2ms)
<button onClick={() => counter.dispatch({ type: 'increment' })}>+</button>
```

#### vs React's useReducer

| Feature | React useReducer | Minimact useServerReducer |
|---------|------------------|---------------------------|
| **Execution** | Client-side | Server-side |
| **Validation** | Client only | Server (secure) |
| **Side effects** | useEffect needed | Built-in (async reducer) |
| **Database access** | No | Yes |
| **Type safety** | TypeScript | C# + TypeScript |
| **Network** | None | SignalR (async) |
| **Optimistic UI** | Manual | Automatic (hint queue) |

#### vs useState

Use `useServerReducer` when:
- ✅ Complex state transitions (multiple fields, conditional logic)
- ✅ Server-side validation required
- ✅ Side effects needed (DB updates, notifications)
- ✅ Business rules enforcement
- ✅ Audit logging

Use `useState` when:
- ✅ Simple single-value state
- ✅ No validation needed
- ✅ No side effects
- ✅ Client-only state (UI toggles, etc.)

#### Best Practices

1. **Keep reducers pure (when possible)** - Avoid side effects in simple cases
2. **Use action types** - Define clear action types with TypeScript unions
3. **Handle errors gracefully** - Always check `reducer.error`
4. **Show loading states** - Use `reducer.dispatching` for spinners
5. **Use dispatchAsync for critical actions** - Wait for confirmation on important operations
6. **Predict common actions** - Use `usePredictHint` for instant feedback on frequent actions

## Pub/Sub Hooks

### usePub

Publish messages to other components using a pub/sub pattern.

```tsx
import { usePub } from '@minimact/core';

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
import { useSub } from '@minimact/core';

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
import { useMicroTask } from '@minimact/core';

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
import { useMacroTask } from '@minimact/core';

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
import { useAnimationFrame } from '@minimact/core';

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
import { useIdleCallback } from '@minimact/core';

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
import { useSignalR } from '@minimact/core';

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

## Next Steps

- Learn about [Predictive Rendering](/guide/predictive-rendering)
- Explore [Core Concepts](/guide/concepts)
- See [Examples](/examples)
