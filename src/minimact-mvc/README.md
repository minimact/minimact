# @minimact/mvc

**MVC Bridge for Minimact** - Seamless integration between ASP.NET MVC Controllers and Minimact components

---

## Overview

`@minimact/mvc` bridges traditional ASP.NET MVC patterns with modern Minimact reactivity, allowing you to:

- ✅ Use **MVC Controllers** for routing and data preparation
- ✅ Pass **ViewModels** to Minimact components
- ✅ Access ViewModel data via **`useMvcState`** hook
- ✅ Enforce **security boundaries** with `[Mutable]` attribute
- ✅ Sync mutable state back to server via **SignalR**
- ✅ Full **TypeScript type safety**

---

## Installation

```bash
npm install @minimact/mvc
```

**Server-side setup:**

```csharp
// Program.cs
builder.Services.AddMinimact();
builder.Services.AddMinimactMvcBridge(); // ✅ Enable MVC Bridge
```

---

## Quick Start

### 1. Create ViewModel with `[Mutable]` Attribute

```csharp
using Minimact.AspNetCore.Attributes;

public class ProductViewModel
{
    // ❌ IMMUTABLE - Server authority (security, business logic)
    public string ProductName { get; set; }
    public decimal Price { get; set; }
    public bool IsAdminRole { get; set; }

    // ✅ MUTABLE - Client can modify (UI state, form inputs)
    [Mutable]
    public int InitialQuantity { get; set; }

    [Mutable]
    public string InitialSelectedColor { get; set; }
}
```

### 2. Controller Passes ViewModel to Minimact

```csharp
using Minimact.AspNetCore.Rendering;

public class ProductsController : Controller
{
    private readonly MinimactPageRenderer _renderer;

    public async Task<IActionResult> Details(int id)
    {
        var viewModel = new ProductViewModel
        {
            ProductName = "Widget",
            Price = 99.99m,
            IsAdminRole = User.IsInRole("Admin"),
            InitialQuantity = 1,
            InitialSelectedColor = "Black"
        };

        return await _renderer.RenderPage<ProductDetailsPage>(
            viewModel,
            "Product Details"
        );
    }
}
```

### 3. Access ViewModel in TSX Component

```tsx
import { useMvcState, useMvcViewModel } from '@minimact/mvc';

interface ProductViewModel {
    productName: string;
    price: number;
    isAdminRole: boolean;
    initialQuantity: number;
    initialSelectedColor: string;
}

export function ProductDetailsPage() {
    // ❌ IMMUTABLE - Read-only (no setter)
    const [productName] = useMvcState<string>('productName');
    const [price] = useMvcState<number>('price');
    const [isAdmin] = useMvcState<boolean>('isAdminRole');

    // ✅ MUTABLE - With setter (syncs to server)
    const [quantity, setQuantity] = useMvcState<number>('initialQuantity');
    const [color, setColor] = useMvcState<string>('initialSelectedColor');

    // Or access entire ViewModel (read-only)
    const viewModel = useMvcViewModel<ProductViewModel>();

    return (
        <div>
            <h1>{productName}</h1>
            <p>${price.toFixed(2)}</p>

            {/* Interactive quantity selector */}
            <div>
                <button onClick={() => setQuantity(quantity - 1)}>-</button>
                <span>{quantity}</span>
                <button onClick={() => setQuantity(quantity + 1)}>+</button>
            </div>

            {/* Color selector */}
            <select value={color} onChange={(e) => setColor(e.target.value)}>
                <option value="Black">Black</option>
                <option value="White">White</option>
                <option value="Red">Red</option>
            </select>

            {/* Conditional rendering based on server role */}
            {isAdmin && (
                <div className="admin-controls">
                    <button>Edit Product</button>
                    <button>Delete Product</button>
                </div>
            )}
        </div>
    );
}
```

---

## API Reference

### `useMvcState<T>(propertyName, options?)`

Access a ViewModel property as reactive state.

**Parameters:**
- `propertyName` - Name of the ViewModel property (camelCase)
- `options` - Optional configuration

**Returns:**
- `[value]` - If property is **immutable** (no `[Mutable]` attribute)
- `[value, setter]` - If property is **mutable** (has `[Mutable]` attribute)

**Examples:**

```tsx
// Immutable (no setter)
const [isAdmin] = useMvcState<boolean>('isAdminRole');

// Mutable (with setter)
const [count, setCount] = useMvcState<number>('initialCount');
setCount(10); // Syncs to server

// With options
const [query, setQuery] = useMvcState<string>('initialSearchQuery', {
    sync: 'debounced',  // Debounce server sync
    syncDelay: 500,      // 500ms delay
    defaultValue: ''     // Default if not in ViewModel
});
```

**Options:**

```typescript
interface UseMvcStateOptions {
    defaultValue?: any;           // Default if property not found
    forceMutable?: boolean;       // Override mutability (dangerous!)
    equals?: (a, b) => boolean;   // Custom equality check
    sync?: 'immediate' | 'debounced' | 'manual'; // Sync strategy
    syncDelay?: number;           // Debounce delay (ms)
}
```

---

### `useMvcViewModel<T>()`

Access the entire ViewModel (read-only).

**Returns:** ViewModel data or `null`

**Example:**

```tsx
interface MyViewModel {
    fullName: string;
    posts: Array<{ title: string }>;
}

const viewModel = useMvcViewModel<MyViewModel>();

if (!viewModel) {
    return <div>Loading...</div>;
}

return (
    <div>
        <h1>{viewModel.fullName}</h1>
        {viewModel.posts.map(post => (
            <article key={post.title}>{post.title}</article>
        ))}
    </div>
);
```

---

### `isMvcPropertyMutable(propertyName)`

Check if a ViewModel property is mutable.

**Returns:** `boolean`

**Example:**

```tsx
const canEditName = isMvcPropertyMutable('fullName');

return (
    <div>
        <input value={fullName} disabled={!canEditName} />
        {canEditName && <button>Save</button>}
    </div>
);
```

---

### `flushMvcState()`

Manually flush all pending debounced state changes to server.

Useful for form submission.

**Example:**

```tsx
const [name, setName] = useMvcState('initialName', { sync: 'debounced' });

const handleSubmit = async () => {
    flushMvcState(); // Ensure all changes synced
    await submitForm();
};
```

---

### `getMvcStateMetadata()`

Get metadata about all MVC state bindings.

Useful for debugging and DevTools.

**Returns:** Array of `{ propertyName, isMutable }`

**Example:**

```tsx
const metadata = getMvcStateMetadata();

console.log('MVC State Bindings:');
metadata.forEach(({ propertyName, isMutable }) => {
    console.log(`  ${propertyName}: ${isMutable ? 'mutable' : 'immutable'}`);
});
```

---

## Security Model

### Mutability Enforcement

```
┌─────────────────────────────────────┐
│         C# ViewModel                │
├─────────────────────────────────────┤
│ ProductName      (immutable)        │ ← Server authority
│ Price           (immutable)         │ ← Business logic
│ IsAdminRole     (immutable)         │ ← Security
│                                     │
│ [Mutable]                           │
│ InitialQuantity  (mutable)          │ ← Client can modify
└────────────┬────────────────────────┘
             │
             ↓ (MinimactPageRenderer)
┌─────────────────────────────────────┐
│    Serialized ViewModel JSON        │
├─────────────────────────────────────┤
│ {                                   │
│   "data": { ... },                  │
│   "_mutability": {                  │
│     "productName": false,           │
│     "price": false,                 │
│     "initialQuantity": true         │
│   }                                 │
│ }                                   │
└────────────┬────────────────────────┘
             │
             ↓ (Client)
┌─────────────────────────────────────┐
│   useMvcState('productName')        │ → [value] only
│   useMvcState('initialQuantity')    │ → [value, setter] ✅
└────────────┬────────────────────────┘
             │
             ↓ (setQuantity() called)
┌─────────────────────────────────────┐
│     SignalR → Server Validation     │
├─────────────────────────────────────┤
│ 1. Check: Is 'initialQuantity'      │
│    marked [Mutable]?                │
│ 2. If NO → Reject + Log security    │
│ 3. If YES → Apply + Re-render       │
└─────────────────────────────────────┘
```

### Best Practices

✅ **DO:**

```csharp
// Mark UI state as mutable
[Mutable]
public int InitialCount { get; set; }

[Mutable]
public string InitialSearchQuery { get; set; }
```

❌ **DON'T:**

```csharp
// ❌ NEVER mark security data as mutable!
[Mutable]
public bool IsAdminRole { get; set; }  // Security violation!

// ❌ NEVER mark pricing as mutable!
[Mutable]
public decimal Price { get; set; }  // Business logic violation!
```

---

## Sync Strategies

### Immediate Sync (Default)

Syncs every state change to server immediately.

```tsx
const [count, setCount] = useMvcState('initialCount');
setCount(5); // Syncs immediately
```

### Debounced Sync

Batches changes together (useful for text inputs).

```tsx
const [query, setQuery] = useMvcState('initialSearchQuery', {
    sync: 'debounced',
    syncDelay: 300  // 300ms delay
});

// User types fast: "hello world"
// Only syncs once after 300ms of inactivity
```

### Manual Sync

No auto-sync (you control when to sync).

```tsx
const [draft, setDraft] = useMvcState('initialDraft', {
    sync: 'manual'
});

// User edits draft...
setDraft('new content');  // No server sync yet

// Explicit sync on save
const handleSave = () => {
    flushMvcState();  // Sync all pending changes
    submitForm();
};
```

---

## TypeScript Support

Full type safety between C# and TypeScript:

```csharp
// C# ViewModel
public class UserViewModel
{
    public string FullName { get; set; }
    public int Age { get; set; }
    public bool IsVerified { get; set; }
}
```

```tsx
// TypeScript interface (matching C#)
interface UserViewModel {
    fullName: string;  // C# PascalCase → TypeScript camelCase
    age: number;
    isVerified: boolean;
}

// TypeScript enforces types
const [fullName] = useMvcState<string>('fullName');  // ✅
const [age] = useMvcState<number>('age');            // ✅
const [isVerified] = useMvcState<boolean>('isVerified'); // ✅

// TypeScript error if wrong type
const [age] = useMvcState<string>('age');  // ❌ Type error!
```

---

## Integration with Minimact Features

### Template Patch System

`useMvcState` automatically integrates with the Template Patch System:

```tsx
const [count, setCount] = useMvcState('initialCount');

setCount(5);
// 1. Checks HintQueue for cached patch
// 2. If found → Apply instantly (0ms)
// 3. Syncs to server in background
```

### PlaygroundBridge

Automatically sends telemetry to Minimact Playground:

```tsx
// Cache hits/misses automatically logged
const [count, setCount] = useMvcState('initialCount');

setCount(10);
// → PlaygroundBridge.cacheHit() called if template found
// → PlaygroundBridge.cacheMiss() called if no template
```

---

## Examples

### Shopping Cart

```csharp
public class CartViewModel
{
    // Immutable (pricing, inventory)
    public decimal TotalPrice { get; set; }
    public List<Product> AvailableProducts { get; set; }
    public bool CanCheckout { get; set; }

    // Mutable (cart state)
    [Mutable]
    public int InitialQuantity { get; set; }

    [Mutable]
    public string InitialCouponCode { get; set; }
}
```

```tsx
export function ShoppingCart() {
    const [totalPrice] = useMvcState<number>('totalPrice');
    const [canCheckout] = useMvcState<boolean>('canCheckout');
    const [quantity, setQuantity] = useMvcState<number>('initialQuantity');
    const [coupon, setCoupon] = useMvcState<string>('initialCouponCode', {
        sync: 'debounced'
    });

    return (
        <div>
            <div>Total: ${totalPrice.toFixed(2)}</div>

            <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value))}
            />

            <input
                type="text"
                value={coupon}
                onChange={(e) => setCoupon(e.target.value)}
                placeholder="Coupon code"
            />

            <button disabled={!canCheckout}>
                Checkout
            </button>
        </div>
    );
}
```

---

## Troubleshooting

### "No ViewModel found" Warning

**Problem:** ViewModel not embedded in HTML

**Solution:** Ensure you're rendering via `MinimactPageRenderer`:

```csharp
// ✅ Correct
return await _renderer.RenderPage<MyPage>(viewModel, "Title");

// ❌ Wrong (no ViewModel embedding)
return View(viewModel);
```

### State Not Syncing to Server

**Problem:** State changes not reflected on server

**Checklist:**
1. Is property marked `[Mutable]` in C#?
2. Is SignalR connected? (Check browser console)
3. Is `MinimactHub` mapped? (Check `/minimact` endpoint)
4. Check server logs for mutability violations

### TypeScript Errors

**Problem:** Type mismatch between C# and TypeScript

**Solution:** Ensure TypeScript interface matches C# ViewModel:

```csharp
// C# (PascalCase)
public string FullName { get; set; }
```

```tsx
// TypeScript (camelCase)
interface MyViewModel {
    fullName: string;  // ✅ Correct
    FullName: string;  // ❌ Wrong casing
}
```

---

## License

MIT

---

## See Also

- [MVC_BRIDGE_IMPLEMENTATION_PLAN.md](../../docs/MVC_BRIDGE_IMPLEMENTATION_PLAN.md) - Full implementation plan
- [MVC_BRIDGE_QUICK_START.md](../../docs/MVC_BRIDGE_QUICK_START.md) - Quick start guide
- [Minimact Documentation](https://docs.minimact.com) - Official docs
