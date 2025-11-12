# SPA Walkthrough: Building a Single Page Application

Welcome, future **Minimalist**! 👋 This walkthrough will teach you how to build a **Single Page Application** with Minimact in **under 15 minutes**. You'll create a multi-page admin dashboard with instant client-side navigation, persistent layouts (shells), and zero page flicker.

:::tip Looking for MVC?
This walkthrough covers the **SPA pattern** (client-side navigation with shells). If you want traditional server-side rendering without client-side routing, check out the [MVC Walkthrough](/v1.0/guide/mvc-walkthrough).
:::

:::tip What You'll Learn
By the end of this walkthrough, you'll understand:
- How shells (persistent layouts) work in Minimact SPA
- How to use the `<Link>` component for client-side navigation
- How pages swap instantly without full page reloads
- How SignalR enables server-side routing with client-side rendering
- The difference between same-shell and different-shell navigation
:::

## Before You Begin

**Prerequisites:**
- [.NET 8.0 SDK](https://dotnet.microsoft.com/download) or later
- [Node.js 18+](https://nodejs.org/)
- Basic understanding of React (JSX, components)
- Basic understanding of ASP.NET Core MVC
- **Complete the [MVC Walkthrough](/v1.0/guide/mvc-walkthrough) first**

**Estimated Time:** 15 minutes

---

## What is Minimact SPA?

**@minimact/spa** enables client-side navigation while preserving the ASP.NET Core MVC pattern. Here's what makes it special:

### Traditional MVC (Full Page Reloads)
```
User clicks link
  ↓
Browser requests /products/2
  ↓
Server renders entire HTML page
  ↓
Browser parses HTML, loads CSS/JS
  ↓
Page visible (200-500ms) ❌ Flicker, slow
```

### Minimact SPA (Instant Navigation)
```
User clicks <Link to="/products/2">
  ↓
SignalR sends NavigateTo message
  ↓
Server renders page component only
  ↓
Client applies patches (10-50ms) ✅ No flicker, instant!
```

**Key Innovation:** Server-side routing + client-side rendering = Best of both worlds!

---

## Step 1: Install @minimact/spa (1 minute)

In your existing Minimact project (from the MVC walkthrough):

```bash
# Navigate to project directory
cd MyTaskManager

# Import @minimact/spa module
swig import @minimact/spa
```

This downloads the SPA module to `mact_modules/@minimact/spa/`.

Update `Program.cs` to enable SPA:

```csharp
using Minimact.AspNetCore.Extensions;
using Minimact.AspNetCore.SPA;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddMinimact();
builder.Services.AddMinimactMvcBridge();

// Add SPA services
builder.Services.AddSingleton<ShellRegistry>();
builder.Services.AddSingleton<SPASessionState>();

builder.Services.AddControllersWithViews();
builder.Services.AddSignalR();

var app = builder.Build();

// Scan for shells at startup
var shellRegistry = app.Services.GetRequiredService<ShellRegistry>();
shellRegistry.ScanAssembly(Assembly.GetExecutingAssembly());

app.UseStaticFiles();

app.UseMinimact(options => {
    options.UseSPA = true;  // ✅ Enable SPA mode
    options.EnableHotReload = app.Environment.IsDevelopment();
});

app.MapControllers();
app.Run();
```

---

## Step 2: Understand Shells vs Pages (2 minutes)

### Shells (Persistent Layouts)

**Shells** are persistent layouts that stay mounted during navigation. Think of them as "application frames" that wrap page content.

**Examples:**
- `AdminShell` - Admin dashboard with sidebar, header, footer
- `PublicShell` - Public-facing site with marketing header
- `CheckoutShell` - Minimal checkout flow (no distractions)

**Key Properties:**
- Defined in `Shells/` directory
- Contain `<Page />` component (placeholder for page content)
- Stay mounted during same-shell navigation (no flicker!)
- Full swap only when shell changes (e.g., Admin → Public)

### Pages (Route Components)

**Pages** are the actual content components that swap during navigation.

**Examples:**
- `ProductListPage` - Shows list of products
- `ProductDetailsPage` - Shows product details
- `UserListPage` - Admin user management

**Key Properties:**
- Defined in `Pages/` directory
- Use `useMvcState()` to access ViewModel data
- Swap instantly via SignalR patches
- Can adapt rendering based on shell context

---

## Step 3: Create Your First Shell (3 minutes)

Let's create an admin shell with a sidebar, header, and footer.

Create `Shells/AdminShell.tsx`:

```tsx
import { Page, Link } from '@minimact/spa';
import { useMvcState } from '@minimact/mvc';

export default function AdminShell() {
  // Access shell-level data
  const [userName] = useMvcState<string>('__ShellData.UserName');
  const [userRole] = useMvcState<string>('__ShellData.UserRole');

  return (
    <div style={{
      display: 'grid',
      gridTemplateRows: 'auto 1fr auto',
      gridTemplateColumns: '250px 1fr',
      minHeight: '100vh',
      fontFamily: 'system-ui'
    }}>
      {/* Header - spans both columns */}
      <header style={{
        gridColumn: '1 / 3',
        padding: '16px 24px',
        backgroundColor: '#1f2937',
        color: 'white',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid #374151'
      }}>
        <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>
          Admin Dashboard
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '14px', color: '#9ca3af' }}>
            {userName} ({userRole})
          </span>
          <Link to="/logout" style={{ color: '#ef4444', textDecoration: 'none' }}>
            Logout
          </Link>
        </div>
      </header>

      {/* Sidebar */}
      <aside style={{
        backgroundColor: '#111827',
        padding: '24px 0',
        borderRight: '1px solid #374151'
      }}>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <Link
            to="/admin/dashboard"
            style={{
              padding: '12px 24px',
              color: '#d1d5db',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              transition: 'background-color 0.2s'
            }}
          >
            📊 Dashboard
          </Link>
          <Link
            to="/admin/products"
            style={{
              padding: '12px 24px',
              color: '#d1d5db',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}
          >
            📦 Products
          </Link>
          <Link
            to="/admin/users"
            style={{
              padding: '12px 24px',
              color: '#d1d5db',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}
          >
            👥 Users
          </Link>
          <Link
            to="/admin/orders"
            style={{
              padding: '12px 24px',
              color: '#d1d5db',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}
          >
            🛒 Orders
          </Link>
          <Link
            to="/admin/settings"
            style={{
              padding: '12px 24px',
              color: '#d1d5db',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}
          >
            ⚙️ Settings
          </Link>
        </nav>
      </aside>

      {/* Main Content Area - <Page /> swaps here */}
      <main style={{
        padding: '24px',
        backgroundColor: '#f9fafb',
        overflow: 'auto'
      }}>
        <Page />
      </main>

      {/* Footer - spans both columns */}
      <footer style={{
        gridColumn: '1 / 3',
        padding: '16px 24px',
        backgroundColor: '#1f2937',
        color: '#9ca3af',
        fontSize: '14px',
        borderTop: '1px solid #374151',
        textAlign: 'center'
      }}>
        © 2025 Admin Panel • Built with Minimact
      </footer>
    </div>
  );
}
```

**Key Points:**
- `<Page />` component is a **placeholder** where page content will be injected
- Sidebar links use `<Link>` for client-side navigation
- Shell state accessed via `useMvcState('__ShellData.PropertyName')`

---

## Step 4: Create Pages (3 minutes)

Now let's create pages that will swap inside the shell.

### Dashboard Page

Create `Pages/AdminDashboardPage.tsx`:

```tsx
import { useMvcState } from '@minimact/mvc';
import { Link } from '@minimact/spa';

export default function AdminDashboardPage() {
  const [totalProducts] = useMvcState<number>('TotalProducts');
  const [totalUsers] = useMvcState<number>('TotalUsers');
  const [totalOrders] = useMvcState<number>('TotalOrders');
  const [revenue] = useMvcState<number>('Revenue');

  return (
    <div>
      <h2 style={{ fontSize: '28px', marginBottom: '24px', fontWeight: '700' }}>
        Dashboard Overview
      </h2>

      {/* Stats Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '16px',
        marginBottom: '32px'
      }}>
        <div style={{
          padding: '20px',
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>
            Total Products
          </p>
          <p style={{ fontSize: '32px', fontWeight: '700', color: '#111827' }}>
            {totalProducts}
          </p>
        </div>

        <div style={{
          padding: '20px',
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>
            Total Users
          </p>
          <p style={{ fontSize: '32px', fontWeight: '700', color: '#111827' }}>
            {totalUsers}
          </p>
        </div>

        <div style={{
          padding: '20px',
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>
            Total Orders
          </p>
          <p style={{ fontSize: '32px', fontWeight: '700', color: '#111827' }}>
            {totalOrders}
          </p>
        </div>

        <div style={{
          padding: '20px',
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>
            Total Revenue
          </p>
          <p style={{ fontSize: '32px', fontWeight: '700', color: '#10b981' }}>
            ${revenue.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{
        padding: '20px',
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <h3 style={{ fontSize: '18px', marginBottom: '16px', fontWeight: '600' }}>
          Quick Actions
        </h3>
        <div style={{ display: 'flex', gap: '12px' }}>
          <Link
            to="/admin/products/new"
            style={{
              padding: '10px 20px',
              backgroundColor: '#3b82f6',
              color: 'white',
              borderRadius: '6px',
              textDecoration: 'none',
              fontWeight: '500'
            }}
          >
            Add Product
          </Link>
          <Link
            to="/admin/users"
            style={{
              padding: '10px 20px',
              backgroundColor: '#10b981',
              color: 'white',
              borderRadius: '6px',
              textDecoration: 'none',
              fontWeight: '500'
            }}
          >
            Manage Users
          </Link>
          <Link
            to="/admin/orders"
            style={{
              padding: '10px 20px',
              backgroundColor: '#f59e0b',
              color: 'white',
              borderRadius: '6px',
              textDecoration: 'none',
              fontWeight: '500'
            }}
          >
            View Orders
          </Link>
        </div>
      </div>
    </div>
  );
}
```

### Product List Page

Create `Pages/AdminProductListPage.tsx`:

```tsx
import { useMvcState } from '@minimact/mvc';
import { Link } from '@minimact/spa';
import { useState } from '@minimact/core';

interface Product {
  id: number;
  name: string;
  price: number;
  stock: number;
}

export default function AdminProductListPage() {
  const [products] = useMvcState<Product[]>('Products');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px'
      }}>
        <h2 style={{ fontSize: '28px', fontWeight: '700' }}>
          Products
        </h2>
        <Link
          to="/admin/products/new"
          style={{
            padding: '10px 20px',
            backgroundColor: '#3b82f6',
            color: 'white',
            borderRadius: '6px',
            textDecoration: 'none',
            fontWeight: '500'
          }}
        >
          Add Product
        </Link>
      </div>

      {/* Search Bar */}
      <input
        type="text"
        placeholder="Search products..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        style={{
          width: '100%',
          padding: '12px',
          border: '1px solid #d1d5db',
          borderRadius: '6px',
          fontSize: '14px',
          marginBottom: '24px'
        }}
      />

      {/* Products Table */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        overflow: 'hidden'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
            <tr>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>
                ID
              </th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>
                Name
              </th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>
                Price
              </th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>
                Stock
              </th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map(product => (
              <tr key={product.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '12px 16px', fontSize: '14px' }}>
                  {product.id}
                </td>
                <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: '500' }}>
                  {product.name}
                </td>
                <td style={{ padding: '12px 16px', fontSize: '14px' }}>
                  ${product.price.toFixed(2)}
                </td>
                <td style={{ padding: '12px 16px', fontSize: '14px' }}>
                  {product.stock}
                </td>
                <td style={{ padding: '12px 16px', fontSize: '14px' }}>
                  <Link
                    to={`/admin/products/${product.id}`}
                    style={{ color: '#3b82f6', textDecoration: 'none', marginRight: '16px' }}
                  >
                    View
                  </Link>
                  <Link
                    to={`/admin/products/${product.id}/edit`}
                    style={{ color: '#10b981', textDecoration: 'none' }}
                  >
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

---

## Step 5: Create Controllers with Shell Metadata (3 minutes)

Controllers need to specify which shell to use and provide shell-level data.

Create `Controllers/AdminController.cs`:

```csharp
using Microsoft.AspNetCore.Mvc;
using Minimact.AspNetCore.Rendering;

namespace MyTaskManager.Controllers;

[ApiController]
[Route("admin")]
public class AdminController : ControllerBase
{
    private readonly MinimactPageRenderer _renderer;

    public AdminController(MinimactPageRenderer renderer)
    {
        _renderer = renderer;
    }

    [HttpGet("dashboard")]
    public async Task<IActionResult> Dashboard()
    {
        var viewModel = new DashboardViewModel
        {
            TotalProducts = 142,
            TotalUsers = 1023,
            TotalOrders = 589,
            Revenue = 125430,

            // Shell metadata
            __Shell = "Admin",
            __ShellData = new
            {
                UserName = User.Identity?.Name ?? "Admin",
                UserRole = "Administrator"
            }
        };

        return await _renderer.RenderPage<AdminDashboardPage>(
            viewModel: viewModel,
            pageTitle: "Dashboard",
            options: new MinimactPageRenderOptions
            {
                UseSPA = true,  // ✅ Enable SPA mode
                ShellName = "Admin"
            }
        );
    }

    [HttpGet("products")]
    public async Task<IActionResult> Products()
    {
        // Simulate database query
        var products = new List<Product>
        {
            new() { Id = 1, Name = "Widget Pro", Price = 49.99m, Stock = 100 },
            new() { Id = 2, Name = "Gadget Plus", Price = 79.99m, Stock = 50 },
            new() { Id = 3, Name = "Doohickey Max", Price = 99.99m, Stock = 25 }
        };

        var viewModel = new ProductListViewModel
        {
            Products = products,

            // Shell metadata (same shell as dashboard)
            __Shell = "Admin",
            __ShellData = new
            {
                UserName = User.Identity?.Name ?? "Admin",
                UserRole = "Administrator"
            }
        };

        return await _renderer.RenderPage<AdminProductListPage>(
            viewModel: viewModel,
            pageTitle: "Products",
            options: new MinimactPageRenderOptions
            {
                UseSPA = true,
                ShellName = "Admin"
            }
        );
    }
}
```

**Key Points:**
- `__Shell` specifies which shell to use (e.g., "Admin")
- `__ShellData` provides shell-level state (user info, navigation, etc.)
- `UseSPA = true` enables client-side navigation

---

## Step 6: Build and Test Navigation (2 minutes)

In Swig IDE:

1. **Click "Build"** — Transpiles TSX → C#
2. **Click "Run"** — Launches server
3. **Open browser** → Navigate to `http://localhost:5000/admin/dashboard`

Now try clicking the sidebar links:

```
Dashboard → Products → Users → Orders → Settings
```

**What to observe:**
- ⚡ **Instant navigation** (10-50ms)
- 🎯 **No page flicker** — Sidebar/header stay mounted
- 🔄 **URL updates** — Browser URL changes
- ⬅️ **Back button works** — Browser history preserved

---

## Step 7: Understanding What Just Happened (1 minute)

Let's break down the magic:

### Same-Shell Navigation Flow

When you click `<Link to="/admin/products">`:

```
1. Client: Link click intercepted
   ↓
2. Client: SignalR.invoke('NavigateTo', '/admin/products')
   ↓
3. Server: MinimactHub.NavigateTo() receives request
   ↓
4. Server: Route to AdminController.Products()
   ↓
5. Server: Build ProductListViewModel
   ↓
6. Server: Check shell → "Admin" (same as current)
   ↓
7. Server: Render ONLY AdminProductListPage (not shell)
   ↓
8. Server: Rust reconciler diffs old page vs new page
   ↓
9. Server: Generate patches (5-20 patches typically)
   ↓
10. Server: Send { shellChanged: false, patches: [...] }
    ↓
11. Client: Apply patches to <Page /> container ONLY
    ↓
12. Client: Update URL via history.pushState()
    ↓
13. Result: Page swaps in ~10-50ms ⚡
```

**Key Insight:** Because the shell didn't change, only the `<Page />` content area is patched. The sidebar, header, and footer **stay mounted** and don't flicker!

### Different-Shell Navigation Flow

If you navigated from Admin shell to Public shell:

```
Server: Check shell → "Public" (different from "Admin")
   ↓
Server: Render BOTH shell + page
   ↓
Server: Rust reconciles entire tree
   ↓
Server: Send { shellChanged: true, patches: [...] }
   ↓
Client: Apply patches to entire document root
   ↓
Result: Full swap but still faster than page reload (~20-100ms)
```

---

## Step 8: Add a Second Shell (Bonus) (2 minutes)

Let's add a public-facing shell for non-admin pages.

Create `Shells/PublicShell.tsx`:

```tsx
import { Page, Link } from '@minimact/spa';

export default function PublicShell() {
  return (
    <div style={{ fontFamily: 'system-ui' }}>
      {/* Marketing Header */}
      <header style={{
        padding: '16px 24px',
        backgroundColor: 'white',
        borderBottom: '1px solid #e5e7eb',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <Link to="/" style={{ fontSize: '24px', fontWeight: '700', textDecoration: 'none', color: '#111827' }}>
          TaskManager
        </Link>
        <nav style={{ display: 'flex', gap: '24px' }}>
          <Link to="/features" style={{ textDecoration: 'none', color: '#6b7280' }}>
            Features
          </Link>
          <Link to="/pricing" style={{ textDecoration: 'none', color: '#6b7280' }}>
            Pricing
          </Link>
          <Link to="/contact" style={{ textDecoration: 'none', color: '#6b7280' }}>
            Contact
          </Link>
          <Link to="/admin/dashboard" style={{
            padding: '8px 16px',
            backgroundColor: '#3b82f6',
            color: 'white',
            borderRadius: '6px',
            textDecoration: 'none'
          }}>
            Admin Login
          </Link>
        </nav>
      </header>

      {/* Page Content */}
      <main>
        <Page />
      </main>

      {/* Marketing Footer */}
      <footer style={{
        padding: '40px 24px',
        backgroundColor: '#111827',
        color: '#9ca3af',
        textAlign: 'center'
      }}>
        <p>© 2025 TaskManager • Built with Minimact</p>
      </footer>
    </div>
  );
}
```

Now when users navigate from `/admin/dashboard` (Admin shell) to `/features` (Public shell), they'll see a full swap with different layout.

---

## Performance Characteristics

Let's measure what we just built:

| Navigation Type | Time | Size | Shell Mounted | Flicker |
|----------------|------|------|---------------|---------|
| **Full Page Reload** | 200-500ms | 50-100KB | ❌ No | ✅ Yes |
| **SPA Same Shell** | **10-50ms** | **2-10KB** | ✅ Yes | ❌ No |
| **SPA Different Shell** | 20-100ms | 10-30KB | ❌ No | ❌ No |

**Your admin dashboard** now navigates **4-10× faster** than traditional page reloads! 🚀

---

## Advanced Features

### Prefetching

Pre-load pages on hover for instant navigation:

```tsx
<Link to="/products/123" prefetch>
  View Product
</Link>
```

When the user hovers over the link, Minimact pre-fetches the page data so clicking feels **instant**.

### Loading States

Show progress indicators during navigation:

```tsx
import { useNavigation } from '@minimact/spa';

export default function MyPage() {
  const navigation = useNavigation();

  return (
    <div>
      {navigation.isNavigating && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: '3px',
          backgroundColor: '#3b82f6'
        }}>
          <div className="loading-bar-animation" />
        </div>
      )}
      {/* Page content */}
    </div>
  );
}
```

### Navigation Guards

Protect routes with server-side guards:

```csharp
public class RequireAdminGuard : INavigationGuard
{
    public Task<bool> CanNavigate(NavigationContext context)
    {
        if (!context.User.IsInRole("Admin"))
        {
            context.RedirectTo("/login");
            return Task.FromResult(false);
        }

        return Task.FromResult(true);
    }
}
```

---

## Next Steps

Congratulations! 🎉 You've built a fully functional SPA with Minimact. You now understand:

- ✅ How shells provide persistent layouts
- ✅ How pages swap instantly via SignalR
- ✅ The difference between same-shell and different-shell navigation
- ✅ How to use `<Link>` for client-side routing
- ✅ How `__Shell` and `__ShellData` control layouts

### Continue Learning

- **[Predictive Rendering](/v1.0/guide/predictive-rendering)** — Learn how hint queues predict user actions
- **[API Reference](/v1.0/api/spa)** — Explore all SPA hooks and components
- **[Examples](/v1.0/examples)** — See more complex SPA applications

### Build More

Try extending your admin dashboard:

1. **Add more pages** — Settings, Orders, Reports
2. **Add loading states** — Show progress during navigation
3. **Add prefetching** — Pre-load pages on hover
4. **Add guards** — Protect admin routes with authentication
5. **Add transitions** — Animate page swaps with CSS

---

## Troubleshooting

### Navigation doesn't work

**Check:**
1. `UseSPA = true` in render options
2. `@minimact/spa` module installed in `mact_modules/`
3. `ShellRegistry` registered in `Program.cs`
4. Shell components transpiled correctly (have `<Page />`)

### Shell flickers on same-shell navigation

**Solution:** Make sure both pages use the **same shell name** in `__Shell` property. If shell name changes, Minimact does a full swap.

### Back button doesn't work

**Solution:** Ensure `popstate` event handler is registered in `@minimact/spa` initialization. This should be automatic if SPA mode is enabled.

### 404 errors on navigation

**Solution:** Check your controller routes. SignalR navigation uses the same routing as normal HTTP requests.

---

## Summary

In just 15 minutes, you've:
- ✅ Installed `@minimact/spa`
- ✅ Created persistent shells (Admin + Public)
- ✅ Built multiple pages with client-side navigation
- ✅ Achieved **10-50ms navigation** (4-10× faster than full page reloads)
- ✅ Eliminated page flicker with shell persistence
- ✅ Maintained full ASP.NET Core MVC patterns

**Welcome to the future of server-side web development!** 🌵

> *"The cactus doesn't hydrate — it stores."* — Every Minimalist
