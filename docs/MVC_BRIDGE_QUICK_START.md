# MVC Bridge - Quick Start Guide

**Bridge ASP.NET MVC Controllers and Minimact Components**

---

## ✅ What's Implemented (Server-Side)

The **server-side foundation** is complete! You can now:

1. ✅ Use **MVC Controllers** to prepare ViewModels
2. ✅ Mark properties as **`[Mutable]`** for client modification
3. ✅ Render **Minimact components** from controllers
4. ✅ Embed **serialized ViewModel** in HTML
5. ✅ **Security validation** of mutability

---

## 🚀 Quick Start

### 1. Register Services

```csharp
// Program.cs
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddMinimact();
builder.Services.AddMinimactMvcBridge(); // ✅ Enable MVC Bridge
builder.Services.AddControllersWithViews();

var app = builder.Build();

app.UseStaticFiles();
app.UseRouting();

app.UseEndpoints(endpoints =>
{
    endpoints.MapControllers();
    endpoints.MapHub<MinimactHub>("/minimact");
});

app.Run();
```

---

### 2. Create ViewModel with `[Mutable]`

```csharp
// ViewModels/ProductViewModel.cs
using Minimact.AspNetCore.Attributes;

public class ProductViewModel
{
    // ❌ IMMUTABLE - Server authority (security, business logic)
    public string ProductName { get; set; }
    public decimal Price { get; set; }
    public bool IsAdminRole { get; set; }
    public string UserEmail { get; set; }

    // ✅ MUTABLE - Client can modify (UI state, form inputs)
    [Mutable]
    public int InitialQuantity { get; set; }

    [Mutable]
    public string InitialSelectedColor { get; set; }

    [Mutable]
    public bool InitialIsExpanded { get; set; }
}
```

---

### 3. Controller Passes ViewModel to Minimact

```csharp
// Controllers/ProductsController.cs
using Minimact.AspNetCore.Rendering;

public class ProductsController : Controller
{
    private readonly IProductService _productService;
    private readonly MinimactPageRenderer _renderer;

    public ProductsController(
        IProductService productService,
        MinimactPageRenderer renderer)
    {
        _productService = productService;
        _renderer = renderer;
    }

    public async Task<IActionResult> Details(int id)
    {
        // 1. Fetch data from database (traditional MVC pattern)
        var product = await _productService.GetProductByIdAsync(id);

        if (product == null)
        {
            return NotFound();
        }

        // 2. Prepare ViewModel (traditional MVC pattern)
        var viewModel = new ProductViewModel
        {
            // Server-authoritative data
            ProductName = product.Name,
            Price = product.Price,
            IsAdminRole = User.IsInRole("Admin"),
            UserEmail = User.Identity?.Name ?? "Guest",

            // Client-mutable UI state
            InitialQuantity = 1,
            InitialSelectedColor = "Black",
            InitialIsExpanded = false
        };

        // 3. ✅ NEW: Render Minimact component instead of Razor view
        return await _renderer.RenderPage<ProductDetailsPage>(
            viewModel: viewModel,
            pageTitle: $"{product.Name} - Product Details"
        );
    }
}
```

---

### 4. Access ViewModel in TSX Component

```tsx
// src/pages/ProductDetailsPage.tsx

// TypeScript interface matching C# ViewModel
interface ProductViewModel {
    productName: string;
    price: number;
    isAdminRole: boolean;
    userEmail: string;
    initialQuantity: number;
    initialSelectedColor: string;
    initialIsExpanded: boolean;
}

export function ProductDetailsPage() {
    // ✅ Access ViewModel from window (embedded by server)
    const viewModel = (window as any).__MINIMACT_VIEWMODEL__?.data as ProductViewModel;

    if (!viewModel) {
        return <div>Loading...</div>;
    }

    return (
        <div className="product-details">
            <h1>{viewModel.productName}</h1>
            <div className="price">${viewModel.price.toFixed(2)}</div>
            <div className="user">Logged in as: {viewModel.userEmail}</div>

            {/* Conditional rendering based on server role */}
            {viewModel.isAdminRole && (
                <div className="admin-controls">
                    <h3>Admin Controls</h3>
                    <button>Edit Product</button>
                    <button>Delete Product</button>
                </div>
            )}

            {/* Display initial values (client state will be added in Phase 2) */}
            <div>
                <p>Quantity: {viewModel.initialQuantity}</p>
                <p>Color: {viewModel.initialSelectedColor}</p>
                <p>Expanded: {viewModel.initialIsExpanded ? 'Yes' : 'No'}</p>
            </div>
        </div>
    );
}
```

---

### 5. Transpile and Run

```bash
# Transpile TSX to C#
minimact transpile

# Run the application
dotnet run
```

Visit: `http://localhost:5000/products/details/1`

---

## 🎯 What Gets Generated

### HTML Output (Embedded ViewModel)

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Widget - Product Details</title>
    <script src="/js/minimact.js"></script>
</head>
<body>
    <div id="minimact-root" data-minimact-component="comp-abc123">
        <!-- Server-rendered HTML here -->
        <div class="product-details">
            <h1>Widget</h1>
            <div class="price">$99.99</div>
            <!-- ... -->
        </div>
    </div>

    <!-- ✅ Embedded ViewModel JSON -->
    <script id="minimact-viewmodel" type="application/json">
    {
        "data": {
            "productName": "Widget",
            "price": 99.99,
            "isAdminRole": true,
            "userEmail": "admin@example.com",
            "initialQuantity": 1,
            "initialSelectedColor": "Black",
            "initialIsExpanded": false
        },
        "_mutability": {
            "productName": false,
            "price": false,
            "isAdminRole": false,
            "userEmail": false,
            "initialQuantity": true,
            "initialSelectedColor": true,
            "initialIsExpanded": true
        }
    }
    </script>

    <script>
        // Make ViewModel available globally
        window.__MINIMACT_VIEWMODEL__ = JSON.parse(
            document.getElementById('minimact-viewmodel').textContent
        );

        // Initialize Minimact client runtime
        const minimact = new Minimact.Minimact('#minimact-root', {
            enableDebugLogging: true
        });
        minimact.start();
    </script>
</body>
</html>
```

---

## 📊 Current Status

### ✅ Implemented (Server-Side)

| Feature | Status |
|---------|--------|
| `[Mutable]` Attribute | ✅ Complete |
| MinimactPageRenderer | ✅ Complete |
| ViewModel Serialization | ✅ Complete |
| Mutability Metadata Extraction | ✅ Complete |
| HTML Embedding | ✅ Complete |
| Service Registration | ✅ Complete |
| MinimactComponent Extensions | ✅ Complete |
| Security Validation | ✅ Complete (foundation) |

### ⏳ Pending (Client-Side)

| Feature | Status |
|---------|--------|
| `@minimact/mvc-bridge` Package | ⏳ Not yet implemented |
| `useMvcState` Hook | ⏳ Not yet implemented |
| `useMvcViewModel` Hook | ⏳ Not yet implemented |
| Client Mutability Enforcement | ⏳ Not yet implemented |
| Babel Plugin Integration | ⏳ Not yet implemented |

---

## 🔮 Next Steps (Phase 2)

To enable **client-side mutation** and **reactive state**, implement:

### 1. Create `@minimact/mvc-bridge` Package

```typescript
// src/minimact-mvc-bridge/src/hooks.ts

export function useMvcState<T>(propertyName: string) {
    // Check mutability
    const wrapper = window.__MINIMACT_VIEWMODEL__;
    const isMutable = wrapper?._mutability?.[propertyName] ?? false;

    if (!isMutable) {
        // Return [value] only (no setter)
        return [wrapper?.data?.[propertyName]];
    }

    // Return [value, setter] for mutable properties
    const [value, setValue] = useState(wrapper?.data?.[propertyName]);
    return [value, setValue];
}

export function useMvcViewModel<T>(): T | null {
    return window.__MINIMACT_VIEWMODEL__?.data ?? null;
}
```

### 2. Use in Components

```tsx
import { useMvcState, useMvcViewModel } from '@minimact/mvc-bridge';

export function ProductDetailsPage() {
    // ❌ Immutable - no setter
    const [productName] = useMvcState<string>('productName');
    const [price] = useMvcState<number>('price');
    const [isAdmin] = useMvcState<boolean>('isAdminRole');

    // ✅ Mutable - with setter
    const [quantity, setQuantity] = useMvcState<number>('initialQuantity');
    const [color, setColor] = useMvcState<string>('initialSelectedColor');

    return (
        <div>
            <h1>{productName}</h1>
            <div className="price">${price.toFixed(2)}</div>

            {/* ✅ Interactive quantity selector */}
            <div className="quantity">
                <button onClick={() => setQuantity(quantity - 1)}>-</button>
                <span>{quantity}</span>
                <button onClick={() => setQuantity(quantity + 1)}>+</button>
            </div>

            {/* ✅ Color selector */}
            <select value={color} onChange={(e) => setColor(e.target.value)}>
                <option value="Black">Black</option>
                <option value="White">White</option>
                <option value="Red">Red</option>
            </select>

            {/* Conditional rendering */}
            {isAdmin && <button>Edit Product</button>}
        </div>
    );
}
```

---

## 🔒 Security Model

### How Mutability Works

```
┌─────────────────────────────────────────┐
│          C# ViewModel                   │
├─────────────────────────────────────────┤
│ ProductName          (immutable)        │ ← Server authority
│ Price               (immutable)         │ ← Business logic
│ IsAdminRole         (immutable)         │ ← Security
│ [Mutable]                               │
│ InitialQuantity     (mutable)           │ ← Client can modify
│ [Mutable]                               │
│ InitialSelectedColor (mutable)          │ ← Client can modify
└────────────────┬────────────────────────┘
                 │
                 ↓ (MinimactPageRenderer)
┌─────────────────────────────────────────┐
│      Serialized ViewModel JSON          │
├─────────────────────────────────────────┤
│ {                                       │
│   "data": { ... },                      │
│   "_mutability": {                      │
│     "productName": false,               │
│     "price": false,                     │
│     "initialQuantity": true,            │
│     "initialSelectedColor": true        │
│   }                                     │
│ }                                       │
└────────────────┬────────────────────────┘
                 │
                 ↓ (window.__MINIMACT_VIEWMODEL__)
┌─────────────────────────────────────────┐
│       Client (TypeScript)               │
├─────────────────────────────────────────┤
│ useMvcState('productName')              │ → [value] only
│ useMvcState('initialQuantity')          │ → [value, setter] ✅
└────────────────┬────────────────────────┘
                 │
                 ↓ (setQuantity() called)
┌─────────────────────────────────────────┐
│     SignalR → Server Validation         │
├─────────────────────────────────────────┤
│ 1. Check: Is 'initialQuantity' mutable? │
│ 2. If NO → Reject + Log security event  │
│ 3. If YES → Apply update + Re-render    │
└─────────────────────────────────────────┘
```

---

## 📝 Example: Complete Flow

### 1. User visits `/products/details/1`

**Controller:**
```csharp
var viewModel = new ProductViewModel {
    ProductName = "Widget",
    Price = 99.99m,
    IsAdminRole = true,
    InitialQuantity = 1
};

return await _renderer.RenderPage<ProductDetailsPage>(viewModel, "Product");
```

### 2. Server renders HTML

**MinimactPageRenderer:**
- Creates component instance
- Extracts mutability: `{ initialQuantity: true, price: false }`
- Serializes ViewModel to JSON
- Embeds in HTML
- Returns complete page

### 3. Client receives HTML

**Browser:**
```html
<div id="minimact-root">
    <h1>Widget</h1>
    <p>$99.99</p>
</div>

<script id="minimact-viewmodel" type="application/json">
{
    "data": { "productName": "Widget", "price": 99.99, ... },
    "_mutability": { "initialQuantity": true, "price": false }
}
</script>
```

### 4. Client JavaScript initializes

**Minimact Client:**
```javascript
window.__MINIMACT_VIEWMODEL__ = JSON.parse(...);
const minimact = new Minimact.Minimact('#minimact-root');
minimact.start(); // Connects to SignalR
```

### 5. Component accesses ViewModel

**TSX:**
```tsx
const viewModel = window.__MINIMACT_VIEWMODEL__.data;
return <h1>{viewModel.productName}</h1>;
```

---

## 🎓 Best Practices

### ✅ DO:

1. **Use `[Mutable]` for UI state only**
   ```csharp
   [Mutable]
   public int InitialQuantity { get; set; }  // ✅ UI state
   ```

2. **Keep security-sensitive data immutable**
   ```csharp
   public bool IsAdminRole { get; set; }  // ✅ No [Mutable]
   public decimal Price { get; set; }     // ✅ No [Mutable]
   ```

3. **Use TypeScript interfaces matching C# ViewModels**
   ```typescript
   interface ProductViewModel {
       productName: string;
       price: number;
   }
   ```

4. **Validate on server anyway**
   ```csharp
   [EventHandler]
   public void HandleSave() {
       // Always re-validate, even for mutable fields
       if (Quantity < 1) throw new ValidationException();
   }
   ```

### ❌ DON'T:

1. **Don't mark security data as mutable**
   ```csharp
   [Mutable]  // ❌ NEVER!
   public bool IsAdminRole { get; set; }
   ```

2. **Don't mark pricing as mutable**
   ```csharp
   [Mutable]  // ❌ NEVER!
   public decimal Price { get; set; }
   ```

3. **Don't skip server validation**
   ```csharp
   // ❌ Always validate, even if client says it's valid
   ```

---

## 🚀 Current Capabilities

**With just the server-side foundation, you can:**

✅ Use MVC Controllers for routing and data preparation
✅ Pass complex ViewModels to Minimact components
✅ Access ViewModel data in TSX components
✅ Render conditional UI based on server roles
✅ Embed serialized data with mutability metadata
✅ Prepare for client-side reactivity (Phase 2)

**This provides a solid migration path from MVC to Minimact!** 🎉

---

## 📚 See Also

- [MVC_BRIDGE_IMPLEMENTATION_PLAN.md](./MVC_BRIDGE_IMPLEMENTATION_PLAN.md) - Full implementation plan
- [README.md](../README.md) - Minimact overview
- [EXTENSION_STANDARDS.md](./EXTENSION_STANDARDS.md) - MES certification guide

---

**Ready to bridge MVC and Minimact!** 🌉
