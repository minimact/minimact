"use strict";
/**
 * Hook Library - Comprehensive catalog of all available Minimact hooks
 *
 * Categories:
 * - Core Hooks (built-in React-like hooks)
 * - Communication Hooks (pub/sub, SignalR)
 * - Task Hooks (server tasks, task scheduling)
 * - Advanced Hooks (context, computed values)
 * - MVC Hooks (@minimact/mvc package)
 * - Punch Hooks (@minimact/punch package - DOM element state)
 * - Query Hooks (@minimact/query package - SQL for the DOM)
 * - Trees Hooks (@minimact/trees package - Decision trees & state machines)
 * - Quantum Hooks (@minimact/quantum package - Quantum DOM entanglement)
 *
 * Each hook includes:
 * - Name, description, category
 * - Code example template
 * - Import statement
 * - Default selection status
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.HOOK_LIBRARY = void 0;
exports.getHooksByCategory = getHooksByCategory;
exports.getDefaultHooks = getDefaultHooks;
exports.getAdvancedHooks = getAdvancedHooks;
exports.getHookById = getHookById;
exports.getHookDependencies = getHookDependencies;
exports.getRequiredPackages = getRequiredPackages;
exports.HOOK_LIBRARY = [
    // ===== CORE HOOKS =====
    {
        id: 'useState',
        name: 'useState',
        description: 'Manage component state with instant updates and template prediction',
        category: 'core',
        imports: ["import { useState } from '@minimact/core';"],
        example: `export function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>
        Increment
      </button>
    </div>
  );
}`,
        isDefault: true
    },
    {
        id: 'useEffect',
        name: 'useEffect',
        description: 'Run side effects after component renders (timers, subscriptions, etc.)',
        category: 'core',
        imports: ["import { useEffect } from '@minimact/core';"],
        example: `export function Timer() {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setSeconds(s => s + 1);
    }, 1000);

    return () => clearInterval(interval); // Cleanup
  }, []); // Empty deps = run once

  return <div>Elapsed: {seconds}s</div>;
}`,
        isDefault: true,
        dependencies: ['useState']
    },
    {
        id: 'useRef',
        name: 'useRef',
        description: 'Create mutable refs that persist across renders without triggering updates',
        category: 'core',
        imports: ["import { useRef } from '@minimact/core';"],
        example: `export function FocusInput() {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFocus = () => {
    inputRef.current?.focus();
  };

  return (
    <div>
      <input ref={inputRef} type="text" placeholder="Click button to focus" />
      <button onClick={handleFocus}>Focus Input</button>
    </div>
  );
}`,
        isDefault: true
    },
    {
        id: 'useMarkdown',
        name: 'useMarkdown',
        description: 'Markdown content parsed to HTML on server (supports GFM, tables, syntax highlighting)',
        category: 'advanced',
        packageName: '@minimact/md',
        imports: ["import { useMarkdown } from '@minimact/md';"],
        example: `export function BlogPost() {
  const [content, setContent] = useMarkdown(\`
# Welcome to My Blog

This is **markdown** content that gets parsed to HTML on the server!

## Features
- GitHub Flavored Markdown
- Tables
- Task lists
- **Syntax highlighting** with Prism.js

## Code Example

\\\`\\\`\\\`csharp
public class Product
{
    public string Name { get; set; }
    public decimal Price { get; set; }

    public void Display()
    {
        Console.WriteLine(\$"{Name}: \${Price}");
    }
}
\\\`\\\`\\\`

\\\`\\\`\\\`javascript
// Client-side code
const products = await fetch('/api/products');
console.log('Loaded:', products.length);
\\\`\\\`\\\`

[Read more](https://example.com)
  \`);

  const handleUpdate = () => {
    setContent(\`
# Updated Post

The content has been **updated** dynamically!

\\\`\\\`\\\`typescript
interface User {
  id: number;
  name: string;
  email: string;
}

const user: User = {
  id: 1,
  name: 'Alice',
  email: 'alice@example.com'
};
\\\`\\\`\\\`
    \`);
  };

  return (
    <div className="blog-post">
      {content}  {/* Server renders markdown → HTML with syntax highlighting */}
      <button onClick={handleUpdate}>Update Content</button>
    </div>
  );
}

// Controller setup (C#):
// return await _renderer.RenderPage<BlogPost>(viewModel, "Blog", new MinimactPageRenderOptions
// {
//     IncludeMarkdownExtension = true,
//     EnablePrismSyntaxHighlighting = true,  // ✅ Enable Prism.js
//     PrismTheme = "prism-tomorrow"           // Optional: dark theme
// });`,
        isDefault: false
    },
    {
        id: 'useRazorMarkdown',
        name: 'useRazorMarkdown',
        description: 'Markdown with Razor syntax - dynamic state interpolation (@variables, @if, @foreach, @switch)',
        category: 'advanced',
        packageName: '@minimact/md',
        imports: ["import { useRazorMarkdown } from '@minimact/md';", "import { useState } from '@minimact/core';"],
        example: `export function TutorialPage() {
  const [language] = useState('csharp');
  const [level] = useState('intermediate');
  const [topics] = useState(['Classes', 'LINQ', 'Async/Await']);

  const [tutorial] = useRazorMarkdown(\`
# Learn @language Programming

## Difficulty Level
@switch (level) {
  case "beginner":
    🟢 **Beginner Friendly** - No prior experience needed
    break;
  case "intermediate":
    🟡 **Intermediate** - Some programming knowledge required
    break;
  case "advanced":
    🔴 **Advanced** - For experienced developers
    break;
}

## Topics Covered
@foreach (var topic in topics) {
- ✓ @topic
}

## Quick Start Example

@if (language == "csharp") {
\\\`\\\`\\\`csharp
// Hello World in C#
public class Program
{
    public static void Main()
    {
        Console.WriteLine("Hello, World!");

        // LINQ example
        var numbers = new[] { 1, 2, 3, 4, 5 };
        var evens = numbers.Where(n => n % 2 == 0);

        Console.WriteLine(\$"Even numbers: {string.Join(", ", evens)}");
    }
}
\\\`\\\`\\\`
} else {
\\\`\\\`\\\`javascript
// Hello World in JavaScript
const message = 'Hello, World!';
console.log(message);

// Array filtering
const numbers = [1, 2, 3, 4, 5];
const evens = numbers.filter(n => n % 2 === 0);
console.log('Even numbers:', evens);
\\\`\\\`\\\`
}

## Advanced Topics

@if (level == "advanced") {
For advanced learners, we'll cover:
- Design patterns
- Performance optimization
- Concurrency patterns

\\\`\\\`\\\`csharp
// Async/Await example
public async Task<List<User>> GetUsersAsync()
{
    using var client = new HttpClient();
    var response = await client.GetStringAsync("https://api.example.com/users");
    return JsonSerializer.Deserialize<List<User>>(response);
}
\\\`\\\`\\\`
}

## Practice Exercises

Try implementing these concepts in **@language**!
  \`);

  return (
    <div className="tutorial">
      {tutorial}
      <button onClick={() => nextLesson()}>Next Lesson →</button>
    </div>
  );
}

// Controller setup (C#):
// return await _renderer.RenderPage<TutorialPage>(viewModel, "Tutorial", new MinimactPageRenderOptions
// {
//     IncludeMarkdownExtension = true,
//     EnablePrismSyntaxHighlighting = true,  // ✅ Enable Prism.js
//     PrismTheme = "prism-okaidia",           // Dark theme
//     PrismLanguages = new List<string> { "csharp", "javascript", "typescript" }
// });`,
        isDefault: false,
        dependencies: ['useState']
    },
    // ===== ADVANCED HOOKS =====
    {
        id: 'useContext',
        name: 'useContext',
        description: 'Redis-like server-side cache with scoped lifetimes (session, request, URL, application)',
        category: 'advanced',
        imports: [
            "import { createContext, useContext } from '@minimact/core';"
        ],
        example: `// Create a session-scoped user context
const UserContext = createContext<User>('current-user', {
  scope: 'session',
  expiry: 3600000 // 1 hour
});

// Component 1: Login form (writes to context)
export function LoginForm() {
  const [_, setUser] = useContext(UserContext);

  const handleLogin = async (credentials) => {
    const user = await authenticate(credentials);
    setUser(user); // Stored in session cache, survives page navigation
  };

  return <form onSubmit={handleLogin}>...</form>;
}

// Component 2: User profile (reads from context)
export function UserProfile() {
  const [user] = useContext(UserContext);

  if (!user) return <Login />;
  return <div>Welcome, {user.name}</div>;
}`,
        isDefault: false
    },
    {
        id: 'useComputed',
        name: 'useComputed',
        description: 'Client-side computation with browser APIs (lodash, geolocation, crypto)',
        category: 'advanced',
        imports: ["import { useComputed } from '@minimact/core';"],
        example: `export function UserList({ users }) {
  // Use lodash on client (no server bundle bloat)
  const sortedUsers = useComputed('sortedUsers', () => {
    return _.sortBy(users, 'name');
  }, [users]);

  return <ul>{sortedUsers.map(u => <li>{u.name}</li>)}</ul>;
}

export function LocationMap() {
  // Use browser geolocation API
  const location = useComputed('location', async () => {
    const pos = await new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(resolve);
    });
    return { lat: pos.coords.latitude, lng: pos.coords.longitude };
  }, []);

  if (!location) return <div>Getting location...</div>;
  return <Map center={location} />;
}`,
        isDefault: false
    },
    // ===== TASK HOOKS =====
    {
        id: 'useServerTask',
        name: 'useServerTask',
        description: 'Execute TypeScript on C# or Rust runtime with automatic transpilation',
        category: 'tasks',
        imports: ["import { useServerTask } from '@minimact/core';"],
        example: `export function DataProcessor() {
  const crunch = useServerTask(async (numbers: number[]) => {
    return numbers
      .map(x => x * x)
      .filter(x => x > 100)
      .reduce((sum, x) => sum + x, 0);
  }, { runtime: 'rust' }); // Choose 'csharp' or 'rust'

  return (
    <div>
      <button onClick={() => crunch.start([1, 2, 3, 4, 5])}>
        Crunch Numbers
      </button>

      {crunch.status === 'running' && <Spinner />}
      {crunch.status === 'complete' && <p>Result: {crunch.result}</p>}
      {crunch.status === 'error' && <p>Error: {crunch.error}</p>}
    </div>
  );
}`,
        isDefault: false
    },
    {
        id: 'useServerReducer',
        name: 'useServerReducer',
        description: 'Redux-style state management with reducer logic running on server (validation, side effects, DB access)',
        category: 'advanced',
        imports: ["import { useServerReducer } from '@minimact/core';"],
        example: `type CartState = {
  items: Array<{ id: string; name: string; price: number; qty: number }>;
  total: number;
  tax: number;
  shipping: number;
};

type CartAction =
  | { type: 'addItem'; item: { id: string; name: string; price: number } }
  | { type: 'removeItem'; itemId: string }
  | { type: 'updateQuantity'; itemId: string; quantity: number }
  | { type: 'applyDiscount'; code: string }
  | { type: 'clear' };

export function ShoppingCart() {
  const cart = useServerReducer<CartState, CartAction>({
    items: [],
    total: 0,
    tax: 0,
    shipping: 0
  });

  const handleAddToCart = async (product: Product) => {
    try {
      const newState = await cart.dispatchAsync({
        type: 'addItem',
        item: { id: product.id, name: product.name, price: product.price }
      });
      toast.success(\`Added \${product.name} to cart\`);
    } catch (error) {
      toast.error('Failed to add item');
    }
  };

  return (
    <div>
      <h2>Shopping Cart ({cart.state.items.length} items)</h2>

      {cart.state.items.map(item => (
        <div key={item.id} className="cart-item">
          <span>{item.name}</span>
          <input
            type="number"
            value={item.qty}
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

      {cart.dispatching && <Spinner />}

      {cart.error && (
        <div className="error">
          Error: {cart.error.message}
        </div>
      )}

      <div className="cart-summary">
        <p>Subtotal: \${cart.state.total.toFixed(2)}</p>
        <p>Tax: \${cart.state.tax.toFixed(2)}</p>
        <p>Shipping: \${cart.state.shipping.toFixed(2)}</p>
        <h3>Total: \${(cart.state.total + cart.state.tax + cart.state.shipping).toFixed(2)}</h3>
      </div>

      <button
        onClick={() => cart.dispatch({ type: 'clear' })}
        disabled={cart.dispatching || cart.state.items.length === 0}
      >
        Clear Cart
      </button>
    </div>
  );
}

}`,
        serverCode: {
            language: 'csharp',
            fileName: 'ShoppingCartReducer.cs',
            code: `using Minimact.AspNetCore.Core;
using Minimact.AspNetCore.Attributes;

namespace YourProjectName.ServerReducers;

/// <summary>
/// Shopping Cart Reducer - Server-side state management
/// Handles cart operations with validation, side effects, and business logic
/// </summary>
public class ShoppingCartComponent : MinimactComponent
{
    // State types
    public class CartState
    {
        public List<CartItem> Items { get; set; } = new();
        public decimal Total { get; set; }
        public decimal Tax { get; set; }
        public decimal Shipping { get; set; }
    }

    public class CartItem
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public decimal Price { get; set; }
        public int Qty { get; set; }
    }

    public class CartAction
    {
        public string Type { get; set; } = string.Empty;
        public CartItem? Item { get; set; }
        public string? ItemId { get; set; }
        public int? Quantity { get; set; }
        public string? Code { get; set; }
    }

    /// <summary>
    /// Cart reducer with validation and side effects
    /// </summary>
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

                if (action.Item == null)
                {
                    throw new ArgumentException("Item is required");
                }

                var existingItem = state.Items.FirstOrDefault(i => i.Id == action.Item.Id);
                if (existingItem != null)
                {
                    // Update quantity of existing item
                    existingItem.Qty += 1;
                }
                else
                {
                    // Add new item
                    state.Items.Add(new CartItem
                    {
                        Id = action.Item.Id,
                        Name = action.Item.Name,
                        Price = action.Item.Price,
                        Qty = 1
                    });
                }

                // Side effect: Log to analytics (example - replace with your analytics service)
                // await _analytics.TrackEvent("cart_item_added", new { itemId = action.Item.Id });
                Console.WriteLine($"[Cart] Added item: {action.Item.Name}");
                break;

            case "removeItem":
                if (action.ItemId == null)
                {
                    throw new ArgumentException("ItemId is required");
                }

                var itemToRemove = state.Items.FirstOrDefault(i => i.Id == action.ItemId);
                if (itemToRemove != null)
                {
                    state.Items.Remove(itemToRemove);
                    Console.WriteLine($"[Cart] Removed item: {action.ItemId}");
                }
                break;

            case "updateQuantity":
                if (action.ItemId == null || action.Quantity == null)
                {
                    throw new ArgumentException("ItemId and Quantity are required");
                }

                // Server-side validation
                if (action.Quantity <= 0)
                {
                    throw new ArgumentException("Quantity must be greater than 0");
                }
                if (action.Quantity > 99)
                {
                    throw new ArgumentException("Maximum quantity is 99");
                }

                var itemToUpdate = state.Items.FirstOrDefault(i => i.Id == action.ItemId);
                if (itemToUpdate != null)
                {
                    itemToUpdate.Qty = action.Quantity.Value;
                    Console.WriteLine($"[Cart] Updated quantity for {action.ItemId}: {action.Quantity}");
                }
                break;

            case "applyDiscount":
                if (action.Code == null)
                {
                    throw new ArgumentException("Discount code is required");
                }

                // Validation: Check discount code (example - replace with your discount service)
                // var discount = await _discountService.ValidateCode(action.Code);
                // if (discount == null)
                // {
                //     throw new InvalidOperationException("Invalid discount code");
                // }

                Console.WriteLine($"[Cart] Applied discount code: {action.Code}");
                // Apply discount logic here
                break;

            case "clear":
                state.Items.Clear();
                Console.WriteLine("[Cart] Cleared cart");
                break;

            default:
                throw new ArgumentException($"Unknown action type: {action.Type}");
        }

        // Recalculate totals
        state.Total = state.Items.Sum(i => i.Price * i.Qty);
        state.Tax = state.Total * 0.08m; // 8% tax
        state.Shipping = state.Total > 50 ? 0 : 9.99m; // Free shipping over $50

        return state;
    }

    protected override VNode Render()
    {
        // This component is used for the reducer only
        // The actual UI is rendered by the client-side ShoppingCart component
        return new VText("Server Reducer Component");
    }
}
`
        },
        isDefault: false
    },
    {
        id: 'usePaginatedServerTask',
        name: 'usePaginatedServerTask',
        description: 'Server-side pagination with prefetching and automatic re-fetch on filters',
        category: 'tasks',
        imports: ["import { usePaginatedServerTask } from '@minimact/core';"],
        example: `export function UserList() {
  const [filters, setFilters] = useState({ role: 'admin' });

  const users = usePaginatedServerTask(
    async ({ page, pageSize, filters }) => {
      return await db.users
        .where(u => filters.role ? u.role === filters.role : true)
        .skip((page - 1) * pageSize)
        .take(pageSize)
        .toList();
    },
    {
      pageSize: 20,
      getTotalCount: async (filters) => {
        return await db.users
          .where(u => filters.role ? u.role === filters.role : true)
          .count();
      },
      prefetchNext: true,
      runtime: 'csharp',
      dependencies: [filters]
    }
  );

  return (
    <div>
      <ul>
        {users.items.map(user => <li key={user.id}>{user.name}</li>)}
      </ul>

      <div>
        <button onClick={users.prev} disabled={!users.hasPrev}>Previous</button>
        <span>Page {users.page} of {users.totalPages}</span>
        <button onClick={users.next} disabled={!users.hasNext}>Next</button>
      </div>

      {users.pending && <Spinner />}
    </div>
  );
}`,
        isDefault: false,
        dependencies: ['useServerTask', 'useState']
    },
    // ===== COMMUNICATION HOOKS =====
    {
        id: 'usePub',
        name: 'usePub',
        description: 'Publish messages to a channel - component-to-component communication without prop drilling',
        category: 'communication',
        imports: ["import { usePub } from '@minimact/core';"],
        example: `export function CartButton() {
  const publishCartUpdate = usePub<{ itemCount: number }>('cart:updated');

  const addToCart = (product: Product) => {
    // Add item to cart...
    const newItemCount = getCartItemCount();

    // Publish cart update to all subscribers
    publishCartUpdate({ itemCount: newItemCount }, {
      source: 'cart-button',
      timestamp: Date.now()
    });
  };

  return <button onClick={() => addToCart(product)}>Add to Cart</button>;
}`,
        isDefault: false,
        dependencies: []
    },
    {
        id: 'useSub',
        name: 'useSub',
        description: 'Subscribe to messages from a channel - listen to events from other components',
        category: 'communication',
        imports: ["import { useSub } from '@minimact/core';"],
        example: `export function CartBadge() {
  const [itemCount, setItemCount] = useState(0);

  // Subscribe to cart updates from any component
  useSub<{ itemCount: number }>('cart:updated', (message) => {
    console.log('Cart updated by:', message.source);
    setItemCount(message.value.itemCount);
  });

  return (
    <div className="cart-badge">
      🛒 {itemCount}
    </div>
  );
}`,
        isDefault: false,
        dependencies: ['useState']
    },
    {
        id: 'useMicroTask',
        name: 'useMicroTask',
        description: 'Schedule callback in microtask queue (before paint) - perfect for DOM measurements and critical updates',
        category: 'tasks',
        imports: ["import { useMicroTask } from '@minimact/core';"],
        example: `export function AutoExpandTextarea() {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleInput = (e: Event) => {
    // Schedule height adjustment in microtask (before paint)
    useMicroTask(() => {
      if (textareaRef.current) {
        // Measure scrollHeight and adjust
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
      }
    });
  };

  return (
    <textarea
      ref={textareaRef}
      onInput={handleInput}
      placeholder="Type something..."
    />
  );
}`,
        isDefault: false,
        dependencies: ['useRef']
    },
    {
        id: 'useMacroTask',
        name: 'useMacroTask',
        description: 'Schedule callback in task queue (after paint) - perfect for analytics, logging, deferred work',
        category: 'tasks',
        imports: ["import { useMacroTask } from '@minimact/core';"],
        example: `export function SearchInput() {
  const [query, setQuery] = useState('');

  const handleSearch = (value: string) => {
    setQuery(value);

    // Schedule analytics tracking after paint (non-blocking)
    useMacroTask(() => {
      analytics.track('search_query', {
        query: value,
        timestamp: Date.now()
      });
    }, 100); // Optional delay in ms
  };

  return (
    <input
      type="search"
      value={query}
      onChange={(e) => handleSearch(e.target.value)}
      placeholder="Search..."
    />
  );
}`,
        isDefault: false,
        dependencies: ['useState']
    },
    {
        id: 'useSignalR',
        name: 'useSignalR',
        description: 'Access SignalR connection state and methods - invoke server methods and listen for server events',
        category: 'communication',
        imports: ["import { useSignalR } from '@minimact/core';"],
        example: `export function ConnectionStatus() {
  const { state, connectionId, invoke, on, off } = useSignalR();

  useEffect(() => {
    // Listen for custom server events
    const handleNotification = (message: string) => {
      console.log('Server says:', message);
    };

    on('serverNotification', handleNotification);

    return () => off('serverNotification', handleNotification);
  }, [on, off]);

  const pingServer = async () => {
    try {
      const response = await invoke('Ping', 'Hello from client!');
      console.log('Server response:', response);
    } catch (error) {
      console.error('Ping failed:', error);
    }
  };

  const broadcastMessage = async () => {
    await invoke('BroadcastMessage', {
      text: 'Hello everyone!',
      timestamp: Date.now()
    });
  };

  return (
    <div className="connection-status">
      <div className="status-badge">
        Connection: <span className={state}>{state}</span>
      </div>
      <div className="connection-id">
        ID: {connectionId || 'Not connected'}
      </div>

      <div className="actions">
        <button onClick={pingServer} disabled={state !== 'Connected'}>
          Ping Server
        </button>
        <button onClick={broadcastMessage} disabled={state !== 'Connected'}>
          Broadcast Message
        </button>
      </div>

      <div className="connection-states">
        <h4>Connection States:</h4>
        <ul>
          <li><code>'Disconnected'</code> - Not connected</li>
          <li><code>'Connecting'</code> - Connection in progress</li>
          <li><code>'Connected'</code> - Active connection</li>
          <li><code>'Reconnecting'</code> - Attempting to reconnect</li>
        </ul>
      </div>
    </div>
  );
}`,
        isDefault: false,
        dependencies: ['useEffect']
    },
    // ===== MVC HOOKS =====
    {
        id: 'useMvcState',
        name: 'useMvcState',
        description: 'Access MVC ViewModel properties with automatic mutability enforcement',
        category: 'mvc',
        packageName: '@minimact/mvc',
        imports: ["import { useMvcState } from '@minimact/mvc';"],
        example: `export function ProductDetailsPage() {
  // Immutable props (no setter returned)
  const [productName] = useMvcState<string>('productName');
  const [price] = useMvcState<number>('price');

  // Mutable props (setter returned)
  const [quantity, setQuantity] = useMvcState<number>('initialQuantity', {
    sync: 'immediate' // Sync changes to server instantly
  });
  const [color, setColor] = useMvcState<string>('initialSelectedColor', {
    sync: 'debounced',
    debounceMs: 500
  });

  return (
    <div>
      <h1>{productName}</h1>
      <div>\${price.toFixed(2)}</div>

      {/* Quantity selector - client can modify */}
      <div>
        <button onClick={() => setQuantity(quantity - 1)}>-</button>
        <span>{quantity}</span>
        <button onClick={() => setQuantity(quantity + 1)}>+</button>
      </div>

      {/* Color selector - client can modify */}
      <select value={color} onChange={(e) => setColor(e.target.value)}>
        <option value="Black">Black</option>
        <option value="White">White</option>
        <option value="Red">Red</option>
      </select>
    </div>
  );
}`,
        isDefault: false
    },
    {
        id: 'useMvcViewModel',
        name: 'useMvcViewModel',
        description: 'Access the entire MVC ViewModel object with type safety',
        category: 'mvc',
        packageName: '@minimact/mvc',
        imports: ["import { useMvcViewModel } from '@minimact/mvc';"],
        example: `interface ProductViewModel {
  productName: string;
  price: number;
  isAdminRole: boolean;
  userEmail: string;
  initialQuantity: number;
  initialSelectedColor: string;
}

export function ProductDetailsPage() {
  const viewModel = useMvcViewModel<ProductViewModel>();

  return (
    <div>
      <h1>{viewModel.productName}</h1>
      <div>Logged in as: {viewModel.userEmail}</div>
      {viewModel.isAdminRole && (
        <div className="admin-controls">
          <button>Edit Product</button>
        </div>
      )}
    </div>
  );
}`,
        isDefault: false
    },
    // ===== PUNCH HOOKS (DOM Element State) =====
    {
        id: 'useDomElementState',
        name: 'useDomElementState',
        description: 'Make the DOM a reactive data source (80+ properties: intersecting, size, children, etc.)',
        category: 'punch',
        packageName: '@minimact/punch',
        imports: ["import { useDomElementState } from '@minimact/punch';"],
        example: `export function LazyLoadGallery() {
  const container = useDomElementState('.gallery-container');

  return (
    <div>
      <div className="gallery-container">
        {/* Show pagination when > 5 children */}
        {container.childrenCount > 5 && <Pagination />}

        {/* Lazy load content when scrolled into view */}
        {container.isIntersecting && <GalleryContent />}

        {/* Show loading indicator when not in viewport */}
        {!container.isIntersecting && <Skeleton />}
      </div>

      {/* Show statistics */}
      <div>Total items: {container.childrenCount}</div>
    </div>
  );
}`,
        isDefault: false
    },
    {
        id: 'useDomElementState-pseudo',
        name: 'useDomElementState (Pseudo-State)',
        description: 'Query CSS pseudo-classes as reactive state (:hover, :focus, :active)',
        category: 'punch',
        packageName: '@minimact/punch',
        imports: ["import { useDomElementState } from '@minimact/punch';"],
        example: `export function ButtonGroup() {
  const buttons = useDomElementState('button');

  return (
    <div>
      {/* Show global tooltip when ANY button is hovered */}
      {buttons.some(b => b.state.hover) && <GlobalTooltip />}

      {/* Show keyboard outline when focused */}
      {buttons.some(b => b.state.focus) && <KeyboardOutline />}

      {/* Show active animation */}
      {buttons.some(b => b.state.active) && <PressAnimation />}

      <button>Button 1</button>
      <button>Button 2</button>
      <button>Button 3</button>
    </div>
  );
}`,
        isDefault: false,
        dependencies: ['useDomElementState']
    },
    {
        id: 'useDomElementState-theme',
        name: 'useDomElementState (Theme)',
        description: 'React to dark/light mode and responsive breakpoints',
        category: 'punch',
        packageName: '@minimact/punch',
        imports: ["import { useDomElementState } from '@minimact/punch';"],
        example: `export function ResponsiveLayout() {
  const app = useDomElementState('#root');

  return (
    <div>
      {/* Theme-aware components */}
      {app.theme.isDark && <DarkModeStyles />}
      {app.theme.isLight && <LightModeStyles />}

      {/* Responsive breakpoints (Tailwind-style) */}
      {app.breakpoint.sm && <MobileNav />}
      {app.breakpoint.md && <TabletLayout />}
      {app.breakpoint.lg && <DesktopLayout />}
      {app.breakpoint.between('md', 'xl') && <TabletOnlyFeature />}
    </div>
  );
}`,
        isDefault: false,
        dependencies: ['useDomElementState']
    },
    {
        id: 'useDomElementState-history',
        name: 'useDomElementState (Temporal)',
        description: 'Track state history, trends, and stability patterns over time',
        category: 'punch',
        packageName: '@minimact/punch',
        imports: ["import { useDomElementState } from '@minimact/punch';"],
        example: `export function Editor() {
  const editor = useDomElementState('#editor');

  return (
    <div>
      {/* Smart auto-save based on stability */}
      {editor.history.hasStabilized && <AutoSave />}
      {!editor.history.hasStabilized && <SavingIndicator />}

      {/* Performance monitoring */}
      {editor.history.changesPerSecond > 10 && (
        <PerformanceWarning rate={editor.history.changesPerSecond} />
      )}

      {/* Data freshness indicators */}
      {editor.history.timeSinceLastChange > 60000 && <StaleDataWarning />}

      {/* Trend analysis */}
      {editor.history.trend === 'increasing' && <GrowingContent />}
      {editor.history.isOscillating && <DataLoadingIssue />}

      <div id="editor" contentEditable>...</div>
    </div>
  );
}`,
        isDefault: false,
        dependencies: ['useDomElementState']
    },
    {
        id: 'useDomElementState-stats',
        name: 'useDomElementState (Statistics)',
        description: 'Aggregate statistics over collections of elements',
        category: 'punch',
        packageName: '@minimact/punch',
        imports: ["import { useDomElementState } from '@minimact/punch';"],
        example: `export function PriceList() {
  const prices = useDomElementState('.price');

  return (
    <div>
      {/* Show premium badge when average > $100 */}
      {prices.vals.avg() > 100 && <PremiumBadge />}

      {/* Show bulk discount when total > $1000 */}
      {prices.vals.sum() > 1000 && <BulkDiscount />}

      {/* Show statistics */}
      <div className="stats">
        <div>Average: \${prices.vals.avg().toFixed(2)}</div>
        <div>Total: \${prices.vals.sum().toFixed(2)}</div>
        <div>Median: \${prices.vals.median().toFixed(2)}</div>
        <div>Range: \${prices.vals.min()} - \${prices.vals.max()}</div>
      </div>

      <div className="price">$99.99</div>
      <div className="price">$149.99</div>
      <div className="price">$79.99</div>
    </div>
  );
}`,
        isDefault: false,
        dependencies: ['useDomElementState']
    },
    // ===== QUERY HOOKS (SQL for the DOM) =====
    {
        id: 'useDomQuery',
        name: 'useDomQuery',
        description: 'Query the DOM with SQL-like syntax (SELECT, WHERE, ORDER BY, JOIN, GROUP BY)',
        category: 'query',
        packageName: '@minimact/query',
        imports: ["import { useDomQuery } from '@minimact/query';"],
        example: `export function DashboardStats() {
  // Query DOM like a SQL database
  const query = useDomQuery()
    .from('.metric-card')
    .where(card => card.isIntersecting && card.state.hover)
    .orderBy(card => card.history.changeCount, 'DESC')
    .limit(10);

  return (
    <div>
      <h2>Top 10 Most Active Cards</h2>
      {query.select(card => ({
        id: card.attributes.id,
        title: card.textContent,
        changes: card.history.changeCount,
        isHovered: card.state.hover
      })).map(row => (
        <div key={row.id} className={row.isHovered ? 'highlight' : ''}>
          {row.title} - {row.changes} changes
        </div>
      ))}
    </div>
  );
}`,
        isDefault: false
    },
    {
        id: 'useDomQuery-groupby',
        name: 'useDomQuery (GROUP BY)',
        description: 'Aggregate and group DOM elements like SQL GROUP BY with HAVING',
        category: 'query',
        packageName: '@minimact/query',
        imports: ["import { useDomQuery } from '@minimact/query';"],
        example: `export function ComponentStats() {
  const stats = useDomQuery()
    .from('.component')
    .groupBy(c => c.lifecycle.lifecycleState)
    .having(group => group.count > 5); // Only states with 5+ components

  return (
    <div>
      <h2>Component Lifecycle Summary</h2>
      {stats.select(group => ({
        state: group.key,
        count: group.count,
        avgChanges: group.items.reduce((sum, c) =>
          sum + c.history.changeCount, 0) / group.count
      })).map(row => (
        <div key={row.state}>
          <strong>{row.state}</strong>: {row.count} components
          (avg {row.avgChanges.toFixed(1)} changes)
        </div>
      ))}
    </div>
  );
}`,
        isDefault: false,
        dependencies: ['useDomQuery']
    },
    {
        id: 'useDomQuery-join',
        name: 'useDomQuery (JOIN)',
        description: 'Relate DOM elements to each other with SQL JOIN operations',
        category: 'query',
        packageName: '@minimact/query',
        imports: ["import { useDomQuery } from '@minimact/query';"],
        example: `export function ProductReviews() {
  const products = useDomQuery()
    .from('.product')
    .leftJoin(
      useDomQuery().from('.review'),
      (product, review) =>
        product.attributes['data-id'] === review.attributes['data-product-id']
    )
    .where(result => result.right !== null); // Has reviews

  return (
    <div>
      <h2>Products with Reviews</h2>
      {products.select(result => ({
        productId: result.left.attributes['data-id'],
        productName: result.left.textContent,
        reviewCount: result.right?.childrenCount || 0
      })).map(row => (
        <div key={row.productId}>
          {row.productName} - {row.reviewCount} reviews
        </div>
      ))}
    </div>
  );
}`,
        isDefault: false,
        dependencies: ['useDomQuery']
    },
    {
        id: 'useDomQuery-aggregates',
        name: 'useDomQuery (Aggregates)',
        description: 'Use SQL aggregate functions (COUNT, SUM, AVG, MIN, MAX, STDDEV)',
        category: 'query',
        packageName: '@minimact/query',
        imports: ["import { useDomQuery } from '@minimact/query';"],
        example: `export function PerformanceMonitor() {
  const components = useDomQuery().from('.component');

  const unstable = components
    .where(c => c.history.changesPerSecond > 10);

  return (
    <div>
      <h2>Performance Metrics</h2>

      <div className="metrics">
        <div>Total Components: {components.count()}</div>
        <div>Unstable Components: {unstable.count()}</div>
        <div>Avg Changes: {components.avg(c => c.history.changeCount).toFixed(1)}</div>
        <div>Max Changes: {components.max(c => c.history.changeCount)}</div>
        <div>Min Changes: {components.min(c => c.history.changeCount)}</div>
      </div>

      {unstable.any() && (
        <div className="alert">
          ⚠️ {unstable.count()} components are unstable!
        </div>
      )}
    </div>
  );
}`,
        isDefault: false,
        dependencies: ['useDomQuery']
    },
    {
        id: 'useDomQuery-setops',
        name: 'useDomQuery (Set Operations)',
        description: 'Combine queries with SQL set operations (UNION, INTERSECT, EXCEPT)',
        category: 'query',
        packageName: '@minimact/query',
        imports: ["import { useDomQuery } from '@minimact/query';"],
        example: `export function InteractiveElements() {
  const buttons = useDomQuery().from('button');
  const links = useDomQuery().from('a');
  const inputs = useDomQuery().from('input');

  // UNION - all interactive elements
  const allInteractive = buttons.union(links).union(inputs);

  // INTERSECT - elements that are both hovered AND focused
  const hovered = useDomQuery().from('.interactive').where(el => el.state.hover);
  const focused = useDomQuery().from('.interactive').where(el => el.state.focus);
  const both = hovered.intersect(focused);

  // EXCEPT - visible but not in viewport
  const allCards = useDomQuery().from('.card');
  const visible = allCards.where(c => c.isIntersecting);
  const offscreen = allCards.except(visible);

  return (
    <div>
      <div>Interactive elements: {allInteractive.count()}</div>
      <div>Hovered + Focused: {both.count()}</div>
      <div>Offscreen cards: {offscreen.count()}</div>
    </div>
  );
}`,
        isDefault: false,
        dependencies: ['useDomQuery']
    },
    {
        id: 'useDomQueryThrottled',
        name: 'useDomQueryThrottled',
        description: 'Throttled queries - limit updates to once every N milliseconds for performance',
        category: 'query',
        packageName: '@minimact/query',
        imports: ["import { useDomQueryThrottled } from '@minimact/query';"],
        example: `export function LiveDataFeed() {
  // Only update max 4 times per second (every 250ms)
  const liveData = useDomQueryThrottled(250)
    .from('.data-point')
    .where(d => d.isIntersecting)
    .orderBy(d => d.attributes['data-timestamp'], 'DESC')
    .limit(100);

  return (
    <div>
      <h2>Live Data Feed</h2>
      <p className="info">Updates throttled to 250ms for performance</p>

      {liveData.select(d => ({
        id: d.attributes['data-id'],
        value: d.textContent,
        timestamp: d.attributes['data-timestamp']
      })).map(row => (
        <div key={row.id} className="data-row">
          {row.timestamp}: {row.value}
        </div>
      ))}
    </div>
  );
}`,
        isDefault: false
    },
    {
        id: 'useDomQueryDebounced',
        name: 'useDomQueryDebounced',
        description: 'Debounced queries - only update after N milliseconds of DOM inactivity',
        category: 'query',
        packageName: '@minimact/query',
        imports: ["import { useDomQueryDebounced } from '@minimact/query';"],
        example: `export function SearchResults() {
  // Only update after 500ms of no DOM changes (user stopped typing/scrolling)
  const results = useDomQueryDebounced(500)
    .from('.search-result')
    .where(result => result.isIntersecting)
    .orderBy(result => result.attributes['data-relevance'], 'DESC');

  return (
    <div>
      <h2>Search Results</h2>
      <p className="info">Updates debounced to 500ms after activity stops</p>

      <div className="stats">
        Total: {results.count()} results
      </div>

      {results.select(r => ({
        id: r.attributes['data-id'],
        title: r.textContent,
        relevance: r.attributes['data-relevance']
      })).map(row => (
        <div key={row.id}>
          {row.title} (relevance: {row.relevance})
        </div>
      ))}
    </div>
  );
}`,
        isDefault: false
    },
    {
        id: 'useDomQuery-accessibility',
        name: 'useDomQuery (Accessibility Audit)',
        description: 'Query the DOM to audit accessibility issues and violations',
        category: 'query',
        packageName: '@minimact/query',
        imports: ["import { useDomQuery } from '@minimact/query';"],
        example: `export function AccessibilityAudit() {
  // Find buttons without labels
  const unlabeled = useDomQuery()
    .from('button')
    .where(btn =>
      !btn.attributes['aria-label'] &&
      !btn.textContent?.trim()
    );

  // Find disabled elements without aria-disabled
  const improperDisabled = useDomQuery()
    .from('input, button')
    .where(el =>
      el.state.disabled &&
      !el.attributes['aria-disabled']
    );

  // Find images without alt text
  const missingAlt = useDomQuery()
    .from('img')
    .where(img => !img.attributes['alt']);

  const hasIssues = unlabeled.any() || improperDisabled.any() || missingAlt.any();

  return (
    <div className={hasIssues ? 'audit-fail' : 'audit-pass'}>
      <h2>Accessibility Audit</h2>

      <div className="issues">
        <div className={unlabeled.count() > 0 ? 'error' : 'pass'}>
          Unlabeled buttons: {unlabeled.count()}
        </div>
        <div className={improperDisabled.count() > 0 ? 'error' : 'pass'}>
          Improperly disabled: {improperDisabled.count()}
        </div>
        <div className={missingAlt.count() > 0 ? 'error' : 'pass'}>
          Images without alt: {missingAlt.count()}
        </div>
      </div>

      {hasIssues ? (
        <div className="alert">⚠️ Accessibility issues detected!</div>
      ) : (
        <div className="success">✓ All accessibility checks passed!</div>
      )}
    </div>
  );
}`,
        isDefault: false
    },
    // ===== TREES HOOKS (Decision Trees & State Machines) =====
    {
        id: 'useDecisionTree',
        name: 'useDecisionTree',
        description: 'Universal state machine with decision trees - declarative state transitions for any value types',
        category: 'trees',
        packageName: '@minimact/trees',
        imports: ["import { useDecisionTree } from '@minimact/trees';"],
        example: `export function OnboardingFlow() {
  const [step, setStep] = useState('welcome');
  const [hasAccount, setHasAccount] = useState(false);

  // Decision tree using colon syntax: stateName:Value
  const nextStepTree = {
    'step:Welcome': 'profile',
    'step:Profile': {
      'hasAccount:True': 'preferences',
      'hasAccount:False': 'signup'
    },
    'step:Signup': 'preferences',
    'step:Preferences': 'complete'
  };

  // useDecisionTree syncs tree result to server for predictive rendering
  const nextStep = useDecisionTree(nextStepTree, { step, hasAccount });

  const handleNext = () => {
    if (nextStep) setStep(nextStep);
  };

  return (
    <div>
      {/* Welcome Step */}
      {step === 'welcome' && (
        <div>
          <h2>Welcome to Our App!</h2>
          <button onClick={handleNext}>Get Started</button>
        </div>
      )}

      {/* Profile Step */}
      {step === 'profile' && (
        <div>
          <h2>Your Profile</h2>
          <label>
            <input
              type="checkbox"
              checked={hasAccount}
              onChange={(e) => setHasAccount(e.target.checked)}
            />
            I already have an account
          </label>
          <button onClick={handleNext}>Next</button>
        </div>
      )}

      {/* Signup Step */}
      {step === 'signup' && (
        <div>
          <h2>Create Account</h2>
          <form>
            <input type="email" placeholder="Email" />
            <input type="password" placeholder="Password" />
          </form>
          <button onClick={handleNext}>Next</button>
        </div>
      )}

      {/* Preferences Step */}
      {step === 'preferences' && (
        <div>
          <h2>Preferences</h2>
          <label>
            <input type="checkbox" /> Email notifications
          </label>
          <label>
            <input type="checkbox" /> Dark mode
          </label>
          <button onClick={handleNext}>Complete</button>
        </div>
      )}

      {/* Complete Step */}
      {step === 'complete' && (
        <div>
          <h2>All Set!</h2>
          <p>Your account is ready to go.</p>
        </div>
      )}
    </div>
  );
}`,
        isDefault: false,
        dependencies: ['useState']
    },
    {
        id: 'useDecisionTree-validation',
        name: 'useDecisionTree (Form Validation)',
        description: 'Multi-step form validation with conditional paths and async validation',
        category: 'trees',
        packageName: '@minimact/trees',
        imports: ["import { useDecisionTree } from '@minimact/trees';"],
        example: `export function CheckoutForm() {
  const [step, setStep] = useState('cart');
  const [items, setItems] = useState([]);
  const [shippingMethod, setShippingMethod] = useState('standard');

  // Decision tree using colon syntax
  const nextStepTree = {
    'step:Cart': 'shipping',
    'step:Shipping': {
      'shippingMethod:Pickup': 'payment',
      'shippingMethod:Standard': 'delivery',
      'shippingMethod:Express': 'delivery'
    },
    'step:Delivery': 'payment',
    'step:Payment': 'confirmation'
  };

  // useDecisionTree syncs tree result to server
  const nextStep = useDecisionTree(nextStepTree, { step, shippingMethod });

  const handleNext = async () => {
    // Validation before transition
    if (step === 'cart' && items.length === 0) {
      alert('Cart is empty');
      return;
    }

    if (step === 'shipping') {
      const valid = await validateAddress();
      if (!valid) {
        alert('Invalid shipping address');
        return;
      }
    }

    if (nextStep) setStep(nextStep);
  };

  return (
    <div>
      {/* Render current step */}
      {step === 'cart' && <CartStep items={items} setItems={setItems} />}
      {step === 'shipping' && (
        <ShippingStep
          shippingMethod={shippingMethod}
          setShippingMethod={setShippingMethod}
        />
      )}
      {step === 'delivery' && <DeliveryStep />}
      {step === 'payment' && <PaymentStep />}
      {step === 'confirmation' && <ConfirmationStep />}

      {/* Navigation */}
      <button onClick={handleNext}>
        {step === 'confirmation' ? 'Done' : 'Next'}
      </button>
    </div>
  );
}`,
        isDefault: false,
        dependencies: ['useState']
    },
    {
        id: 'useDecisionTree-game',
        name: 'useDecisionTree (Game State)',
        description: 'Game state management with complex branching logic and score tracking',
        category: 'trees',
        packageName: '@minimact/trees',
        imports: ["import { useDecisionTree } from '@minimact/trees';"],
        example: `export function AdventureGame() {
  const [location, setLocation] = useState('start');
  const [action, setAction] = useState('');
  const [hasKey, setHasKey] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [won, setWon] = useState(false);
  const [score, setScore] = useState(0);

  // Decision tree using colon syntax: stateName:Value
  const gameTree = {
    'location:Start': {
      'choice:Forest': 'forest',
      'choice:Cave': 'cave'
    },
    'location:Forest': {
      'hasKey:True': 'treasure',
      'action:Fight': {
        'won:True': 'wolf-victory',
        'won:False': 'game-over'
      },
      'action:Explore': 'forest-explore'
    },
    'location:Cave': {
      'hasTorch:True': 'cave-deep',
      'hasTorch:False': 'cave-dark'
    },
    'location:Wolf-victory': 'treasure',
    'location:Cave-deep': {
      'action:Take-gem': 'treasure',
      'action:Leave': 'game-over'
    },
    'location:Treasure': 'win',
    'location:Game-over': 'start' // Restart
  };

  // useDecisionTree syncs game state to server
  const nextLocation = useDecisionTree(gameTree, {
    location,
    action,
    hasKey,
    hasTorch,
    won,
    choice: '' // Will be set by navigation
  });

  const navigate = (choice: string) => {
    if (nextLocation) {
      setLocation(nextLocation);
      setAction('');
    }
  };

  const performAction = (newAction: string, newWon?: boolean) => {
    setAction(newAction);
    if (newWon !== undefined) setWon(newWon);

    if (nextLocation) {
      setLocation(nextLocation);
      if (nextLocation === 'treasure') setScore(score + 100);
    }
  };

  return (
    <div className="game">
      <div className="score">Score: {score}</div>

      {location === 'start' && (
        <div>
          <h2>The Adventure Begins</h2>
          <p>You stand at a crossroads. Which path will you take?</p>
          <button onClick={() => navigate('forest')}>Enter the Dark Forest</button>
          <button onClick={() => navigate('cave')}>Explore the Cave</button>
        </div>
      )}

      {location === 'forest' && (
        <div>
          <h2>Dark Forest</h2>
          <p>You hear a wolf howling in the distance...</p>
          <button onClick={() => performAction('fight', true)}>Fight the Wolf</button>
          <button onClick={() => performAction('explore')}>Search for Another Path</button>
        </div>
      )}

      {location === 'treasure' && (
        <div>
          <h2>Victory!</h2>
          <p>You found the treasure! Score: {score}</p>
        </div>
      )}

      {location === 'game-over' && (
        <div>
          <h2>Game Over</h2>
          <button onClick={() => { setLocation('start'); setScore(0); }}>Try Again</button>
        </div>
      )}
    </div>
  );
}`,
        isDefault: false,
        dependencies: ['useState']
    },
    {
        id: 'useDecisionTree-survey',
        name: 'useDecisionTree (Conditional Survey)',
        description: 'Dynamic survey with skip logic and branching questions',
        category: 'trees',
        packageName: '@minimact/trees',
        imports: ["import { useDecisionTree } from '@minimact/trees';"],
        example: `export function DynamicSurvey() {
  const [question, setQuestion] = useState('q1');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [answer, setAnswer] = useState('');
  const [frequency, setFrequency] = useState('');

  // Decision tree using colon syntax: stateName:Value
  const surveyTree = {
    'question:Q1': {
      'answer:Yes': 'q2-car',
      'answer:No': 'q2-transport'
    },
    'question:Q2-car': 'q3',
    'question:Q2-transport': 'q3',
    'question:Q3': {
      'frequency:Daily': 'q4-daily',
      'frequency:Weekly': 'q4-weekly',
      'frequency:Rarely': 'complete'
    },
    'question:Q4-daily': 'complete',
    'question:Q4-weekly': 'complete'
  };

  // useDecisionTree syncs survey state to server
  const nextQuestion = useDecisionTree(surveyTree, {
    question,
    answer,
    frequency
  });

  const questions = {
    q1: 'Do you own a car?',
    'q2-car': 'What type of car do you drive?',
    'q2-transport': 'What is your primary mode of transportation?',
    q3: 'How often do you commute?',
    'q4-daily': 'What time do you usually commute?',
    'q4-weekly': 'Which days do you commute?'
  };

  const handleAnswer = (newAnswer: string) => {
    const newAnswers = { ...answers, [question]: newAnswer };
    setAnswers(newAnswers);

    // Update state based on question
    if (question === 'q1') {
      setAnswer(newAnswer.charAt(0).toUpperCase() + newAnswer.slice(1));
    } else if (question === 'q3') {
      setFrequency(newAnswer.charAt(0).toUpperCase() + newAnswer.slice(1));
    }

    // Navigate to next question
    if (nextQuestion) {
      setQuestion(nextQuestion);
    }
  };

  const totalQuestions = Object.keys(questions).length;
  const currentIndex = Object.keys(questions).indexOf(question) + 1;
  const progress = (currentIndex / totalQuestions) * 100;

  return (
    <div className="survey">
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: \`\${progress}%\` }} />
      </div>

      {question !== 'complete' && (
        <div className="question">
          <h3>{questions[question]}</h3>
          <div className="answer-options">
            {question === 'q1' && (
              <>
                <button onClick={() => handleAnswer('yes')}>Yes</button>
                <button onClick={() => handleAnswer('no')}>No</button>
              </>
            )}
            {question === 'q3' && (
              <>
                <button onClick={() => handleAnswer('daily')}>Daily</button>
                <button onClick={() => handleAnswer('weekly')}>Weekly</button>
                <button onClick={() => handleAnswer('rarely')}>Rarely</button>
              </>
            )}
            {/* Other question types would have their own inputs */}
          </div>
        </div>
      )}

      {question === 'complete' && (
        <div className="complete">
          <h2>Thank you!</h2>
          <p>Survey completed.</p>
          <pre>{JSON.stringify(answers, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}`,
        isDefault: false,
        dependencies: ['useState']
    },
    // ===== QUANTUM HOOKS (Quantum DOM Entanglement) =====
    {
        id: 'useQuantumEntanglement',
        name: 'useQuantumEntanglement',
        description: 'Quantum DOM entanglement - share DOM identity across clients with mutation vectors',
        category: 'quantum',
        packageName: '@minimact/quantum',
        imports: ["import { createQuantumManager } from '@minimact/quantum';"],
        example: `export function CollaborativeSlider() {
  const [volume, setVolume] = useState(50);
  const sliderRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!sliderRef.current) return;

    // Create quantum manager
    const quantum = createQuantumManager({
      clientId: 'user-' + Math.random().toString(36).substr(2, 9),
      signalR: window.signalRManager,
      debugLogging: true
    });

    // Entangle slider with remote client
    const entangle = async () => {
      const link = await quantum.entangle(
        sliderRef.current!,
        {
          clientId: 'collaborator-id', // Target client
          selector: '#volume-slider'
        },
        'bidirectional' // Both users can control
      );

      // Listen for remote changes
      sliderRef.current!.addEventListener('quantum-awareness', (event: any) => {
        console.log(\`\${event.detail.sourceClient} changed the slider!\`);
        // Show indicator that remote user made change
      });
    };

    entangle();
  }, []);

  return (
    <div className="collaborative-slider">
      <h3>Volume Control (Shared)</h3>
      <input
        ref={sliderRef}
        id="volume-slider"
        type="range"
        min="0"
        max="100"
        value={volume}
        onChange={(e) => setVolume(Number(e.target.value))}
      />
      <span>{volume}%</span>
      <p className="hint">
        🌌 Changes are instantly synced with your collaborator
      </p>
    </div>
  );
}`,
        isDefault: false,
        dependencies: ['useState', 'useEffect', 'useRef']
    },
    {
        id: 'useQuantumEntanglement-broadcast',
        name: 'useQuantumEntanglement (Broadcast)',
        description: 'Entangle element with ALL clients - perfect for shared toggles and classroom presentations',
        category: 'quantum',
        packageName: '@minimact/quantum',
        imports: ["import { createQuantumManager } from '@minimact/quantum';"],
        example: `export function SharedThemeToggle() {
  const [isDark, setIsDark] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!toggleRef.current) return;

    const quantum = createQuantumManager({
      clientId: 'user-' + Math.random().toString(36).substr(2, 9),
      signalR: window.signalRManager
    });

    // Entangle with ALL clients on this page
    quantum.entangleWithAll(toggleRef.current, 'mirror');

    return () => {
      // Cleanup on unmount
    };
  }, []);

  const handleToggle = () => {
    setIsDark(!isDark);
    document.body.classList.toggle('dark-mode');
  };

  return (
    <div className="theme-toggle">
      <button
        ref={toggleRef}
        onClick={handleToggle}
        className={\`toggle \${isDark ? 'dark' : 'light'}\`}
      >
        {isDark ? '🌙 Dark Mode' : '☀️ Light Mode'}
      </button>
      <p className="hint">
        🌌 Toggle affects all connected users instantly
      </p>
    </div>
  );
}`,
        isDefault: false,
        dependencies: ['useState', 'useEffect', 'useRef']
    },
    {
        id: 'useQuantumEntanglement-presentation',
        name: 'useQuantumEntanglement (Presentation)',
        description: 'Teacher/presenter controls - sync slides or controls to all viewers with mirror mode',
        category: 'quantum',
        packageName: '@minimact/quantum',
        imports: ["import { createQuantumManager } from '@minimact/quantum';"],
        example: `export function PresentationController() {
  const [slideIndex, setSlideIndex] = useState(0);
  const [isPresenter, setIsPresenter] = useState(false);
  const slidesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!slidesRef.current || !isPresenter) return;

    const quantum = createQuantumManager({
      clientId: 'presenter-' + sessionStorage.getItem('userId'),
      signalR: window.signalRManager,
      debugLogging: true
    });

    // Mirror mode: Presenter controls, students follow
    quantum.entangle(slidesRef.current, {
      clientId: 'student-*', // Wildcard: all students
      selector: '#presentation-slides'
    }, 'mirror');
  }, [isPresenter]);

  const nextSlide = () => {
    setSlideIndex(prev => Math.min(prev + 1, slides.length - 1));
  };

  const prevSlide = () => {
    setSlideIndex(prev => Math.max(prev - 1, 0));
  };

  const slides = ['Intro', 'Concepts', 'Demo', 'Q&A'];

  return (
    <div className="presentation">
      <div ref={slidesRef} id="presentation-slides" className="slides">
        <h1>{slides[slideIndex]}</h1>
        <p>Slide {slideIndex + 1} of {slides.length}</p>
      </div>

      {isPresenter && (
        <div className="controls">
          <button onClick={prevSlide} disabled={slideIndex === 0}>
            ← Previous
          </button>
          <button onClick={nextSlide} disabled={slideIndex === slides.length - 1}>
            Next →
          </button>
          <p className="hint">
            🌌 All students see your current slide instantly
          </p>
        </div>
      )}

      {!isPresenter && (
        <p className="viewer-mode">
          👁️ Viewing mode - Following presenter
        </p>
      )}
    </div>
  );
}`,
        isDefault: false,
        dependencies: ['useState', 'useEffect', 'useRef']
    },
    {
        id: 'useQuantumEntanglement-support',
        name: 'useQuantumEntanglement (Remote Support)',
        description: 'Bidirectional form control - support agents can see and help fill customer forms in real-time',
        category: 'quantum',
        packageName: '@minimact/quantum',
        imports: ["import { createQuantumManager } from '@minimact/quantum';"],
        example: `export function SupportForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    issue: ''
  });
  const [supportConnected, setSupportConnected] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!formRef.current) return;

    const quantum = createQuantumManager({
      clientId: 'customer-' + sessionStorage.getItem('sessionId'),
      signalR: window.signalRManager
    });

    // Connect to support agent (if available)
    const connectSupport = async () => {
      try {
        const link = await quantum.entangle(formRef.current!, {
          clientId: 'support-agent',
          selector: '#customer-form-view'
        }, 'bidirectional'); // Agent can type to help

        setSupportConnected(true);

        // Listen for agent assistance
        formRef.current!.addEventListener('quantum-awareness', (event: any) => {
          if (event.detail.sourceClient.startsWith('support-')) {
            // Show "Agent is helping..." indicator
            showAgentIndicator();
          }
        });
      } catch (err) {
        console.log('No support agent available');
      }
    };

    connectSupport();
  }, []);

  const showAgentIndicator = () => {
    // Show visual indicator that agent is typing
    const indicator = document.createElement('div');
    indicator.textContent = '👤 Support agent is helping...';
    indicator.className = 'agent-indicator';
    document.body.appendChild(indicator);
    setTimeout(() => indicator.remove(), 3000);
  };

  return (
    <form ref={formRef} className="support-form">
      <h2>Help & Support</h2>

      {supportConnected && (
        <div className="status connected">
          ✅ Support agent connected - they can see your form
        </div>
      )}

      <label>
        Name:
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        />
      </label>

      <label>
        Email:
        <input
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        />
      </label>

      <label>
        Issue Description:
        <textarea
          value={formData.issue}
          onChange={(e) => setFormData({ ...formData, issue: e.target.value })}
          rows={4}
        />
      </label>

      <button type="submit">Submit</button>

      <p className="hint">
        🌌 Support agent sees your typing in real-time and can help fill fields
      </p>
    </form>
  );
}`,
        isDefault: false,
        dependencies: ['useState', 'useEffect', 'useRef']
    },
    // ===== CHART HOOKS (@minimact/charts) =====
    {
        id: 'barChart',
        name: 'BarChart (Plugin)',
        description: 'Server-rendered bar chart with instant template patch updates and axes',
        category: 'charts',
        packageName: '@minimact/charts',
        imports: ["import type { DataPoint } from '@minimact/charts';"],
        example: `export function SalesDashboard() {
  const [salesData] = useState<DataPoint[]>([
    { category: 'Jan', value: 4000 },
    { category: 'Feb', value: 3000 },
    { category: 'Mar', value: 2000 },
    { category: 'Apr', value: 2780 },
    { category: 'May', value: 1890 },
    { category: 'Jun', value: 2390 }
  ]);

  return (
    <div>
      <h2>Monthly Sales</h2>
      <Plugin name="BarChart" state={{
        data: salesData,
        width: 600,
        height: 400,
        margin: { top: 20, right: 30, bottom: 50, left: 60 },
        barFill: '#4CAF50',
        showGrid: true,
        xAxis: { dataKey: 'category', label: 'Month' },
        yAxis: { label: 'Sales ($)', tickCount: 5 }
      }} />
    </div>
  );
}`,
        isDefault: false
    },
    {
        id: 'lineChart',
        name: 'LineChart (Plugin)',
        description: 'Server-rendered line chart with smooth curves and real-time updates',
        category: 'charts',
        packageName: '@minimact/charts',
        imports: ["import type { DataPoint } from '@minimact/charts';"],
        example: `export function TrendAnalysis() {
  const [trendData] = useState<DataPoint[]>([
    { category: 'Week 1', value: 12500 },
    { category: 'Week 2', value: 15200 },
    { category: 'Week 3', value: 14800 },
    { category: 'Week 4', value: 18300 }
  ]);

  return (
    <div>
      <h2>Revenue Trend</h2>
      <Plugin name="LineChart" state={{
        data: trendData,
        width: 600,
        height: 400,
        margin: { top: 20, right: 30, bottom: 50, left: 60 },
        strokeColor: '#2196F3',
        strokeWidth: 3,
        showGrid: true,
        xAxis: { dataKey: 'category' },
        yAxis: { label: 'Revenue ($)', tickCount: 5 }
      }} />
    </div>
  );
}`,
        isDefault: false
    },
    {
        id: 'pieChart',
        name: 'PieChart (Plugin)',
        description: 'Server-rendered pie/donut chart with custom colors and labels',
        category: 'charts',
        packageName: '@minimact/charts',
        imports: ["import type { DataPoint } from '@minimact/charts';"],
        example: `export function CategoryBreakdown() {
  const [categoryData] = useState<DataPoint[]>([
    { category: 'Electronics', value: 45, fill: '#4CAF50' },
    { category: 'Clothing', value: 25, fill: '#2196F3' },
    { category: 'Food', value: 20, fill: '#FF9800' },
    { category: 'Other', value: 10, fill: '#9C27B0' }
  ]);

  return (
    <div>
      <h2>Sales by Category</h2>
      <Plugin name="PieChart" state={{
        data: categoryData,
        width: 400,
        height: 400,
        innerRadius: 0,
        outerRadius: 100,
        cx: '50%',
        cy: '50%'
      }} />
    </div>
  );
}`,
        isDefault: false
    },
    {
        id: 'areaChart',
        name: 'AreaChart (Plugin)',
        description: 'Server-rendered area chart with gradient fill for growth trends',
        category: 'charts',
        packageName: '@minimact/charts',
        imports: ["import type { DataPoint } from '@minimact/charts';"],
        example: `export function GrowthTrend() {
  const [growthData] = useState<DataPoint[]>([
    { category: 'Q1', value: 45000 },
    { category: 'Q2', value: 52000 },
    { category: 'Q3', value: 48000 },
    { category: 'Q4', value: 61000 }
  ]);

  return (
    <div>
      <h2>Quarterly Growth</h2>
      <Plugin name="AreaChart" state={{
        data: growthData,
        width: 600,
        height: 400,
        margin: { top: 20, right: 30, bottom: 50, left: 60 },
        fill: 'rgba(76, 175, 80, 0.3)',
        stroke: '#4CAF50',
        strokeWidth: 2,
        showGrid: true,
        xAxis: { dataKey: 'category', label: 'Quarter' },
        yAxis: { label: 'Revenue ($)', tickCount: 5 }
      }} />
    </div>
  );
}`,
        isDefault: false
    }
];
/**
 * Get hooks by category
 */
function getHooksByCategory(category) {
    return exports.HOOK_LIBRARY.filter(h => h.category === category);
}
/**
 * Get default hooks (shown by default in UI)
 */
function getDefaultHooks() {
    return exports.HOOK_LIBRARY.filter(h => h.isDefault);
}
/**
 * Get non-default hooks (shown when expanded)
 */
function getAdvancedHooks() {
    return exports.HOOK_LIBRARY.filter(h => !h.isDefault);
}
/**
 * Get hook by ID
 */
function getHookById(id) {
    return exports.HOOK_LIBRARY.find(h => h.id === id);
}
/**
 * Get all dependencies for a hook (recursively)
 */
function getHookDependencies(hookId) {
    const hook = getHookById(hookId);
    if (!hook || !hook.dependencies)
        return [];
    const deps = new Set();
    const queue = [...hook.dependencies];
    while (queue.length > 0) {
        const depId = queue.shift();
        if (deps.has(depId))
            continue;
        deps.add(depId);
        const depHook = getHookById(depId);
        if (depHook?.dependencies) {
            queue.push(...depHook.dependencies);
        }
    }
    return Array.from(deps);
}
/**
 * Get required NPM packages for selected hooks
 */
function getRequiredPackages(selectedHookIds) {
    const packages = new Set();
    for (const hookId of selectedHookIds) {
        const hook = getHookById(hookId);
        if (hook?.packageName) {
            packages.add(hook.packageName);
        }
    }
    return Array.from(packages);
}
