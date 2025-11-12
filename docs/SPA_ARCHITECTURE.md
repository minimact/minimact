# @minimact/spa - Single Page Application Architecture

## Overview

`@minimact/spa` enables client-side navigation in Minimact while preserving the ASP.NET Core MVC pattern. Pages swap instantly via SignalR without full page reloads, while shells (layouts) stay mounted for optimal performance.

**Key Innovation**: Server-side routing + client-side rendering = Best of both worlds.

---

## Core Concepts

### 1. **Shells** (Application Layouts)

Shells are persistent layouts that wrap page content. They stay mounted during navigation within the same shell.

**Examples:**
- `AdminShell` - Admin dashboard with sidebar
- `PublicShell` - Public site with marketing header
- `CheckoutShell` - Minimal checkout flow
- `DefaultShell` - Simple layout (no shell specified)

**Key Properties:**
- Defined as TSX components in `Shells/` directory
- Contain `<Page />` component as placeholder for page content
- Stay mounted during same-shell navigation (no flicker)
- Full swap only when shell changes (e.g., Admin → Public)

### 2. **Pages** (Route Components)

Pages are the actual content components that swap during navigation.

**Examples:**
- `ProductDetailsPage` - Shows product info
- `UserListPage` - Admin user management
- `CheckoutPage` - Checkout flow

**Key Properties:**
- Defined as TSX components in `Pages/` directory
- Use `useMvcState()` to access ViewModel data (including shell metadata)
- Can adapt rendering based on shell context
- Swap instantly via SignalR patches

### 3. **Link Component**

Client-side navigation component that intercepts clicks and uses SignalR instead of full page loads.

**Usage:**
```tsx
<Link to="/products/123">View Product</Link>
```

**Behavior:**
- Intercepts click event
- Sends `NavigateTo` SignalR message
- Receives patches from server
- Applies patches (page-only or full shell+page)
- Updates browser URL via `history.pushState()`

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser                               │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │              Shell (Persistent)                     │    │
│  │  ┌──────────────────────────────────────────────┐  │    │
│  │  │          <header>                            │  │    │
│  │  │          <aside> Sidebar                     │  │    │
│  │  └──────────────────────────────────────────────┘  │    │
│  │  ┌──────────────────────────────────────────────┐  │    │
│  │  │       <Page /> (Swappable Content)           │  │    │
│  │  │       ↓ Patches applied here ↓               │  │    │
│  │  │                                               │  │    │
│  │  └──────────────────────────────────────────────┘  │    │
│  │  ┌──────────────────────────────────────────────┐  │    │
│  │  │          <footer>                            │  │    │
│  │  └──────────────────────────────────────────────┘  │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  User clicks <Link to="/products/2">                        │
│         ↓                                                    │
│  SignalR.invoke('NavigateTo', '/products/2')                │
└──────────────────┼───────────────────────────────────────────┘
                   │
                   │ SignalR WebSocket
                   ↓
┌─────────────────────────────────────────────────────────────┐
│                    ASP.NET Core Server                       │
│                                                              │
│  MinimactHub.NavigateTo(url)                                │
│         ↓                                                    │
│  Route to Controller → Execute action                       │
│         ↓                                                    │
│  Build ViewModel (includes __Shell, __ShellData)            │
│         ↓                                                    │
│  Render Page component → VNode tree                         │
│         ↓                                                    │
│  Rust reconciler → Compute patches                          │
│         ↓                                                    │
│  Return { patches, pageData, shellChanged, url }            │
│         ↓                                                    │
│  Send response via SignalR                                  │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation

### Phase 1: Shell System

#### 1.1 Shell Component Definition

**File:** `Shells/AdminShell.tsx`

```tsx
import { Page } from '@minimact/spa';

export default function AdminShell() {
  const [userName] = useMvcState<string>('__ShellData.UserName');

  return (
    <div className="admin-layout">
      <header className="admin-header">
        <h1>Admin Dashboard</h1>
        <div className="user-info">Welcome, {userName}</div>
      </header>

      <div className="admin-body">
        <aside className="admin-sidebar">
          <nav>
            <Link to="/admin/products">Products</Link>
            <Link to="/admin/users">Users</Link>
            <Link to="/admin/orders">Orders</Link>
          </nav>
        </aside>

        <main className="admin-content">
          <Page /> {/* Page content swaps here */}
        </main>
      </div>

      <footer className="admin-footer">
        © 2025 Admin Panel
      </footer>
    </div>
  );
}
```

**Transpiles to C#:**

```csharp
public class AdminShell : MinimactShellComponent
{
    protected override VNode Render()
    {
        var userName = GetMvcState<string>("__ShellData.UserName");

        return new VElement("div", new VAttribute("class", "admin-layout"),
            new VElement("header", new VAttribute("class", "admin-header"),
                new VElement("h1", new VText("Admin Dashboard")),
                new VElement("div", new VAttribute("class", "user-info"),
                    new VText($"Welcome, {userName}")
                )
            ),
            new VElement("div", new VAttribute("class", "admin-body"),
                new VElement("aside", new VAttribute("class", "admin-sidebar"),
                    new VElement("nav",
                        new VLink("/admin/products", "Products"),
                        new VLink("/admin/users", "Users"),
                        new VLink("/admin/orders", "Orders")
                    )
                ),
                new VElement("main", new VAttribute("class", "admin-content"),
                    new VPagePlaceholder() // <Page /> becomes VPagePlaceholder
                )
            ),
            new VElement("footer", new VAttribute("class", "admin-footer"),
                new VText("© 2025 Admin Panel")
            )
        );
    }
}
```

#### 1.2 Shell Registry

**File:** `Minimact.AspNetCore/SPA/ShellRegistry.cs`

```csharp
namespace Minimact.AspNetCore.SPA;

/// <summary>
/// Registry of all shell components (layouts) in the application
/// </summary>
public class ShellRegistry
{
    private readonly Dictionary<string, Type> _shells = new();
    private readonly ILogger<ShellRegistry> _logger;

    public ShellRegistry(ILogger<ShellRegistry> logger)
    {
        _logger = logger;
    }

    /// <summary>
    /// Register a shell component
    /// </summary>
    public void RegisterShell(string name, Type shellType)
    {
        if (!typeof(MinimactShellComponent).IsAssignableFrom(shellType))
        {
            throw new ArgumentException($"Shell {name} must inherit from MinimactShellComponent");
        }

        _shells[name] = shellType;
        _logger.LogInformation($"Registered shell: {name} ({shellType.Name})");
    }

    /// <summary>
    /// Get shell component type by name
    /// </summary>
    public Type? GetShellType(string? name)
    {
        if (string.IsNullOrEmpty(name))
        {
            // Return default shell (if exists)
            return _shells.TryGetValue("Default", out var defaultShell) ? defaultShell : null;
        }

        return _shells.TryGetValue(name, out var shellType) ? shellType : null;
    }

    /// <summary>
    /// Create shell instance with ViewModel
    /// </summary>
    public MinimactShellComponent? CreateShell(string? name, object viewModel, IServiceProvider services)
    {
        var shellType = GetShellType(name);
        if (shellType == null) return null;

        var shell = (MinimactShellComponent)ActivatorUtilities.CreateInstance(services, shellType);
        shell.SetViewModel(viewModel);

        return shell;
    }

    /// <summary>
    /// Auto-discover shells in assembly
    /// Called at startup
    /// </summary>
    public void ScanAssembly(Assembly assembly)
    {
        var shellTypes = assembly.GetTypes()
            .Where(t => typeof(MinimactShellComponent).IsAssignableFrom(t) && !t.IsAbstract);

        foreach (var type in shellTypes)
        {
            var name = type.Name.Replace("Shell", "");
            RegisterShell(name, type);
        }

        _logger.LogInformation($"Discovered {_shells.Count} shells in {assembly.GetName().Name}");
    }
}
```

#### 1.3 Base Shell Component Class

**File:** `Minimact.AspNetCore/Core/MinimactShellComponent.cs`

```csharp
namespace Minimact.AspNetCore.Core;

/// <summary>
/// Base class for shell components (persistent layouts)
/// </summary>
public abstract class MinimactShellComponent : MinimactComponent
{
    /// <summary>
    /// The page component that will be rendered inside this shell
    /// </summary>
    public MinimactComponent? PageComponent { get; set; }

    /// <summary>
    /// Render shell with page inside
    /// </summary>
    public VNode RenderWithPage(MinimactComponent page)
    {
        PageComponent = page;
        return Render();
    }

    /// <summary>
    /// Helper to render the <Page /> placeholder
    /// Replaces VPagePlaceholder with actual page VNode
    /// </summary>
    protected VNode RenderPage()
    {
        if (PageComponent == null)
        {
            throw new InvalidOperationException("PageComponent not set. Call RenderWithPage() instead of Render().");
        }

        return PageComponent.Render();
    }
}
```

---

### Phase 2: Page System

#### 2.1 Page Component Definition

**File:** `Pages/ProductDetailsPage.tsx`

```tsx
import { useMvcState, Link } from '@minimact/spa';

export default function ProductDetailsPage() {
  const [productId] = useMvcState<number>('ProductId');
  const [productName] = useMvcState<string>('ProductName');
  const [price] = useMvcState<number>('Price');
  const [stock] = useMvcState<number>('Stock');

  // Access shell metadata
  const [shell] = useMvcState<string>('__Shell');
  const [shellData] = useMvcState<any>('__ShellData');

  const isAdmin = shell === 'Admin';

  return (
    <div className="product-details">
      <h1>{productName}</h1>
      <p className="price">${price}</p>
      <p className="stock">In stock: {stock}</p>

      {isAdmin ? (
        <div className="admin-actions">
          <Link to={`/admin/products/${productId}/edit`}>Edit Product</Link>
          <button onClick={() => handleDelete(productId)}>Delete</button>
        </div>
      ) : (
        <div className="customer-actions">
          <button onClick={() => addToCart(productId)}>Add to Cart</button>
          <Link to="/cart">View Cart</Link>
        </div>
      )}

      <Link to="/products">Back to Products</Link>
    </div>
  );
}
```

#### 2.2 Controller + ViewModel Pattern

**File:** `Controllers/ProductsController.cs`

```csharp
[ApiController]
[Route("products")]
public class ProductsController : Controller
{
    private readonly IProductRepository _products;
    private readonly MinimactPageRenderer _renderer;

    [HttpGet("{id}")]
    public IActionResult Details(int id)
    {
        var product = _products.GetById(id);

        if (product == null)
        {
            return NotFound();
        }

        // Determine shell based on user role
        var isAdmin = User.IsInRole("Admin");
        var shellName = isAdmin ? "Admin" : "Public";

        var viewModel = new ProductDetailsViewModel
        {
            ProductId = product.Id,
            ProductName = product.Name,
            Price = product.Price,
            Stock = product.Stock,

            // Shell metadata (automatically included by SPA renderer)
            __Shell = shellName,
            __ShellData = new
            {
                UserName = User.Identity?.Name,
                UserRole = isAdmin ? "Admin" : "Customer",
                ShowAdminTools = isAdmin
            }
        };

        return _renderer.RenderPage<ProductDetailsPage>(viewModel, new MinimactPageRenderOptions
        {
            UseSPA = true,  // Enable SPA mode
            ShellName = shellName
        });
    }
}
```

**File:** `ViewModels/ProductDetailsViewModel.cs`

```csharp
public class ProductDetailsViewModel : MinimactViewModel
{
    public int ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public int Stock { get; set; }

    // Shell metadata (inherited from MinimactViewModel)
    // public string? __Shell { get; set; }
    // public object? __ShellData { get; set; }
}
```

---

### Phase 3: Link Component & Client-Side Navigation

#### 3.1 Link Component (Client-Side)

**File:** `src/@minimact/spa/src/Link.ts`

```typescript
import { ComponentContext } from '@minimact/core';

/**
 * Client-side Link component for SPA navigation
 * Intercepts clicks and uses SignalR instead of full page reload
 */
export class Link {
  private element: HTMLAnchorElement;
  private signalR: any;
  private domPatcher: any;

  constructor(
    element: HTMLAnchorElement,
    context: ComponentContext
  ) {
    this.element = element;
    this.signalR = context.signalR;
    this.domPatcher = context.domPatcher;

    this.attachClickHandler();
  }

  private attachClickHandler() {
    this.element.addEventListener('click', async (e) => {
      // Only intercept left-clicks without modifiers
      if (
        e.button !== 0 ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey ||
        e.defaultPrevented
      ) {
        return;
      }

      const href = this.element.getAttribute('href');

      // Only intercept internal links
      if (!href || href.startsWith('http') || href.startsWith('//')) {
        return;
      }

      e.preventDefault();

      await this.navigate(href);
    });
  }

  private async navigate(url: string) {
    const startTime = performance.now();

    try {
      console.log(`[SPA] Navigating to: ${url}`);

      // Send navigation request via SignalR
      const response = await this.signalR.invoke('NavigateTo', url);

      // Response structure:
      // {
      //   shellName: string,
      //   shellChanged: boolean,
      //   patches: Patch[],
      //   pageData: object,
      //   url: string
      // }

      if (response.shellChanged) {
        console.log('[SPA] Shell changed - applying full patches');

        // Full shell + page swap
        const rootElement = document.querySelector('[data-minimact-root]') as HTMLElement;
        this.domPatcher.applyPatches(rootElement, response.patches);
      } else {
        console.log('[SPA] Same shell - applying page patches only');

        // Just swap <Page> content (shell stays mounted)
        const pageContainer = document.querySelector('[data-minimact-page]') as HTMLElement;

        if (pageContainer) {
          this.domPatcher.applyPatches(pageContainer, response.patches);
        } else {
          console.warn('[SPA] Page container not found, applying full patches');
          const rootElement = document.querySelector('[data-minimact-root]') as HTMLElement;
          this.domPatcher.applyPatches(rootElement, response.patches);
        }
      }

      // Update browser URL
      window.history.pushState({ url }, '', url);

      // Update MVC state with new page data
      window.minimact?.updateMvcState(response.pageData);

      // Scroll to top
      window.scrollTo(0, 0);

      const latency = performance.now() - startTime;
      console.log(`[SPA] Navigation completed in ${latency.toFixed(2)}ms`);

    } catch (error) {
      console.error('[SPA] Navigation failed:', error);

      // Fallback: full page reload
      console.log('[SPA] Falling back to full page reload');
      window.location.href = url;
    }
  }
}
```

#### 3.2 Link Component Registration

**File:** `src/@minimact/spa/src/index.ts`

```typescript
import { Link } from './Link';

/**
 * Initialize SPA module
 * Automatically registers Link component handlers
 */
export function initializeSPA() {
  console.log('[SPA] Initializing @minimact/spa');

  // Find all Link elements and attach handlers
  const links = document.querySelectorAll('a[data-minimact-link]');

  links.forEach((linkElement) => {
    const context = (window as any).minimact.getContext(linkElement);
    new Link(linkElement as HTMLAnchorElement, context);
  });

  // Handle browser back/forward buttons
  window.addEventListener('popstate', async (e) => {
    const url = e.state?.url || window.location.pathname;
    console.log('[SPA] Popstate - navigating to:', url);

    // Re-navigate via SignalR
    const response = await (window as any).minimact.signalR.invoke('NavigateTo', url);

    // Apply patches...
    // (same logic as Link.navigate)
  });
}

// Auto-initialize if data-minimact-spa attribute exists
if (document.querySelector('[data-minimact-spa]')) {
  initializeSPA();
}
```

#### 3.3 Link TSX Component

**File:** `@minimact/spa` (exported)

```tsx
// In TSX files, developers use <Link> like React Router
import { Link } from '@minimact/spa';

<Link to="/products/123">View Product</Link>
```

**Transpiles to C#:**

```csharp
public class VLink : VElement
{
    public VLink(string to, string text)
        : base("a",
            new VAttribute("href", to),
            new VAttribute("data-minimact-link", "true"),
            new VText(text))
    {
    }
}
```

---

### Phase 4: SignalR Navigation Hub

#### 4.1 NavigateTo Hub Method

**File:** `Minimact.AspNetCore/SignalR/MinimactHub.cs`

```csharp
/// <summary>
/// Handle client-side navigation request
/// Routes to controller, renders page, returns patches
/// </summary>
public async Task<NavigationResponse> NavigateTo(string url)
{
    try
    {
        var connectionId = Context.ConnectionId;

        Console.WriteLine($"[SPA] NavigateTo: {url} (Connection: {connectionId})");

        // 1. Parse URL and route to controller
        var httpContext = CreateHttpContextForUrl(url);
        var routeData = await _router.RouteAsync(httpContext);

        if (routeData == null)
        {
            return new NavigationResponse
            {
                Success = false,
                Error = $"Route not found: {url}"
            };
        }

        // 2. Execute controller action
        var controllerContext = new ControllerContext
        {
            HttpContext = httpContext,
            RouteData = routeData
        };

        var controller = _controllerFactory.CreateController(controllerContext);
        var result = await controller.ExecuteAsync(controllerContext);

        // 3. Extract ViewModel from result
        var viewModel = ExtractViewModel(result);
        var newShellName = viewModel.__Shell;
        var pageName = ExtractPageName(result);

        // 4. Get current shell from session
        var currentShellName = _sessionState.GetCurrentShell(connectionId);
        var shellChanged = newShellName != currentShellName;

        Console.WriteLine($"[SPA] Current shell: {currentShellName}, New shell: {newShellName}, Changed: {shellChanged}");

        // 5. Render and compute patches
        VNode newVNode;
        VNode? oldVNode;

        if (shellChanged)
        {
            // Full shell + page render
            var shell = _shellRegistry.CreateShell(newShellName, viewModel, _serviceProvider);
            var page = _pageRegistry.CreatePage(pageName, viewModel, _serviceProvider);

            if (shell != null)
            {
                newVNode = shell.RenderWithPage(page);
            }
            else
            {
                // No shell, just render page
                newVNode = page.Render();
            }

            oldVNode = _sessionState.GetCurrentVNode(connectionId);

            // Update session
            _sessionState.SetCurrentShell(connectionId, newShellName);
            _sessionState.SetCurrentVNode(connectionId, newVNode);
        }
        else
        {
            // Just render page component (shell unchanged)
            var page = _pageRegistry.CreatePage(pageName, viewModel, _serviceProvider);
            newVNode = page.Render();

            oldVNode = _sessionState.GetCurrentPageVNode(connectionId);

            // Update session (page VNode only)
            _sessionState.SetCurrentPageVNode(connectionId, newVNode);
        }

        // 6. Compute patches
        var patches = _reconciler.ComputePatches(oldVNode, newVNode);

        Console.WriteLine($"[SPA] Computed {patches.Count} patches");

        // 7. Return response
        return new NavigationResponse
        {
            Success = true,
            ShellName = newShellName,
            ShellChanged = shellChanged,
            Patches = patches,
            PageData = viewModel,
            Url = url
        };
    }
    catch (Exception ex)
    {
        Console.WriteLine($"[SPA] NavigateTo failed: {ex.Message}");

        return new NavigationResponse
        {
            Success = false,
            Error = ex.Message
        };
    }
}

/// <summary>
/// Create a minimal HttpContext for routing a URL
/// </summary>
private HttpContext CreateHttpContextForUrl(string url)
{
    var httpContext = new DefaultHttpContext
    {
        RequestServices = _serviceProvider
    };

    httpContext.Request.Method = "GET";
    httpContext.Request.Path = url;
    httpContext.Request.Scheme = "https";
    httpContext.Request.Host = new HostString("localhost");

    // Copy user/auth from current SignalR context
    httpContext.User = Context.User;

    return httpContext;
}
```

#### 4.2 Navigation Response Model

**File:** `Minimact.AspNetCore/SPA/NavigationResponse.cs`

```csharp
namespace Minimact.AspNetCore.SPA;

public class NavigationResponse
{
    /// <summary>
    /// Whether navigation succeeded
    /// </summary>
    public bool Success { get; set; }

    /// <summary>
    /// Error message if failed
    /// </summary>
    public string? Error { get; set; }

    /// <summary>
    /// Name of the shell component
    /// </summary>
    public string? ShellName { get; set; }

    /// <summary>
    /// Whether shell changed (full swap vs page-only swap)
    /// </summary>
    public bool ShellChanged { get; set; }

    /// <summary>
    /// DOM patches to apply (from Rust reconciler)
    /// </summary>
    public List<Patch> Patches { get; set; } = new();

    /// <summary>
    /// Page ViewModel data (for updating MVC state)
    /// </summary>
    public object? PageData { get; set; }

    /// <summary>
    /// Final URL (for history.pushState)
    /// </summary>
    public string Url { get; set; } = string.Empty;
}
```

---

### Phase 5: Session State Management

#### 5.1 SPA Session State

**File:** `Minimact.AspNetCore/SPA/SPASessionState.cs`

```csharp
namespace Minimact.AspNetCore.SPA;

/// <summary>
/// Tracks SPA state per SignalR connection
/// Needed for computing patches during navigation
/// </summary>
public class SPASessionState
{
    private readonly ConcurrentDictionary<string, SessionData> _sessions = new();

    public void SetCurrentShell(string connectionId, string? shellName)
    {
        var session = GetOrCreate(connectionId);
        session.CurrentShell = shellName;
    }

    public string? GetCurrentShell(string connectionId)
    {
        return _sessions.TryGetValue(connectionId, out var session) ? session.CurrentShell : null;
    }

    public void SetCurrentVNode(string connectionId, VNode vnode)
    {
        var session = GetOrCreate(connectionId);
        session.CurrentVNode = vnode;
    }

    public VNode? GetCurrentVNode(string connectionId)
    {
        return _sessions.TryGetValue(connectionId, out var session) ? session.CurrentVNode : null;
    }

    public void SetCurrentPageVNode(string connectionId, VNode vnode)
    {
        var session = GetOrCreate(connectionId);
        session.CurrentPageVNode = vnode;
    }

    public VNode? GetCurrentPageVNode(string connectionId)
    {
        return _sessions.TryGetValue(connectionId, out var session) ? session.CurrentPageVNode : null;
    }

    public void RemoveSession(string connectionId)
    {
        _sessions.TryRemove(connectionId, out _);
    }

    private SessionData GetOrCreate(string connectionId)
    {
        return _sessions.GetOrAdd(connectionId, _ => new SessionData());
    }

    private class SessionData
    {
        public string? CurrentShell { get; set; }
        public VNode? CurrentVNode { get; set; }
        public VNode? CurrentPageVNode { get; set; }
    }
}
```

---

### Phase 6: Babel Plugin Changes

#### 6.1 Transpile `<Page />` Component

**In Babel Plugin:**

```javascript
// When encountering <Page /> in Shell components
if (node.name.name === 'Page') {
  // Replace with VPagePlaceholder() call
  return t.newExpression(
    t.identifier('VPagePlaceholder'),
    []
  );
}
```

**Result:**
```tsx
<Page />
```

**Becomes:**
```csharp
new VPagePlaceholder()
```

#### 6.2 VPagePlaceholder VNode Type

**File:** `Minimact.AspNetCore/VNodes/VPagePlaceholder.cs`

```csharp
namespace Minimact.AspNetCore.VNodes;

/// <summary>
/// Placeholder VNode for <Page /> component in shells
/// During rendering, this is replaced with the actual page VNode
/// </summary>
public class VPagePlaceholder : VNode
{
    public VPagePlaceholder() : base("page-placeholder")
    {
    }

    /// <summary>
    /// Replace this placeholder with actual page VNode
    /// </summary>
    public VNode ReplaceWith(VNode pageVNode)
    {
        return pageVNode;
    }
}
```

#### 6.3 Shell Rendering with Page Replacement

**In MinimactShellComponent:**

```csharp
public VNode RenderWithPage(MinimactComponent page)
{
    // 1. Render shell (contains VPagePlaceholder)
    var shellVNode = Render();

    // 2. Find VPagePlaceholder and replace with page VNode
    var pageVNode = page.Render();
    var finalVNode = ReplacePagePlaceholder(shellVNode, pageVNode);

    return finalVNode;
}

private VNode ReplacePagePlaceholder(VNode node, VNode pageVNode)
{
    if (node is VPagePlaceholder)
    {
        return pageVNode;
    }

    if (node is VElement element)
    {
        // Recursively replace in children
        var newChildren = element.Children
            .Select(child => ReplacePagePlaceholder(child, pageVNode))
            .ToList();

        element.Children = newChildren;
    }

    return node;
}
```

---

### Phase 7: Program.cs Integration

#### 7.1 SPA Setup

**File:** `Program.cs`

```csharp
using Minimact.AspNetCore.Extensions;
using Minimact.AspNetCore.SPA;

var builder = WebApplication.CreateBuilder(args);

// Add Minimact services
builder.Services.AddMinimact();
builder.Services.AddMinimactMvcBridge();

// Add SPA services
builder.Services.AddSingleton<ShellRegistry>();
builder.Services.AddSingleton<SPASessionState>();

builder.Services.AddControllersWithViews();
builder.Services.AddSignalR();

var app = builder.Build();

// Scan for shells
var shellRegistry = app.Services.GetRequiredService<ShellRegistry>();
shellRegistry.ScanAssembly(Assembly.GetExecutingAssembly());

app.UseStaticFiles();
app.UseRouting();

app.UseMinimact(options =>
{
    options.UseSPA = true;  // Enable SPA mode
    options.EnableHotReload = app.Environment.IsDevelopment();
});

app.MapControllers();
app.MapHub<MinimactHub>("/minimact");

app.Run();
```

---

## URL Routing Patterns

### Single Shell Application

```
/                      → Default shell, Home page
/products              → Default shell, Product list page
/products/123          → Default shell, Product details page
/cart                  → Default shell, Cart page
/checkout              → Checkout shell, Checkout page
```

**Shell Selection Logic:**
```csharp
var shellName = url.StartsWith("/checkout") ? "Checkout" : "Default";
```

### Multi-Shell Application

```
/admin/products        → Admin shell, Product list page
/admin/products/123    → Admin shell, Product details page
/admin/users           → Admin shell, User list page
/products              → Public shell, Product list page
/products/123          → Public shell, Product details page
/cart                  → Public shell, Cart page
```

**Shell Selection Logic:**
```csharp
var shellName = url.StartsWith("/admin") ? "Admin" : "Public";
```

---

## Performance Characteristics

### Initial Load (Full Page)
- **Time:** ~200-500ms (server render + HTML download)
- **Size:** ~50-100KB (HTML + hydration data)
- **Process:** Traditional server-side rendering

### Same-Shell Navigation (Page Swap)
- **Time:** ~10-50ms (SignalR roundtrip + patch application)
- **Size:** ~2-10KB (patches only)
- **Process:** SignalR → Controller → Render page → Patches → Apply
- **Benefit:** Shell stays mounted (no header/sidebar flicker)

### Different-Shell Navigation (Full Swap)
- **Time:** ~20-100ms (SignalR roundtrip + larger patches)
- **Size:** ~10-30KB (shell + page patches)
- **Process:** SignalR → Controller → Render shell+page → Patches → Apply
- **Benefit:** Still faster than full page reload (no HTML parsing, no JS re-execution)

### Comparison

| Navigation Type | Time | Size | Shell Mounted | Page Flicker |
|----------------|------|------|---------------|--------------|
| Full Page Reload | 200-500ms | 50-100KB | ❌ No | ✅ Yes |
| SPA Same Shell | 10-50ms | 2-10KB | ✅ Yes | ❌ No |
| SPA Different Shell | 20-100ms | 10-30KB | ❌ No | ❌ No |

---

## Advanced Features

### 1. Prefetching

```tsx
<Link to="/products/123" prefetch>
  Product 123
</Link>
```

**Implementation:**
```typescript
// On hover, prefetch page data
linkElement.addEventListener('mouseenter', async () => {
  if (linkElement.dataset.prefetch) {
    const response = await signalR.invoke('PrefetchPage', href);
    cache.store(href, response);
  }
});
```

### 2. Loading States

```tsx
import { useNavigation } from '@minimact/spa';

export default function MyPage() {
  const navigation = useNavigation();

  return (
    <div>
      {navigation.isNavigating && <LoadingBar />}
      {/* Page content */}
    </div>
  );
}
```

### 3. Navigation Guards

```csharp
public class RequireAuthNavigationGuard : INavigationGuard
{
    public Task<bool> CanNavigate(NavigationContext context)
    {
        if (!context.User.Identity?.IsAuthenticated)
        {
            context.RedirectTo("/login");
            return Task.FromResult(false);
        }

        return Task.FromResult(true);
    }
}
```

### 4. Scroll Restoration

```typescript
// Save scroll position before navigation
window.addEventListener('beforeunload', () => {
  sessionStorage.setItem('scrollPos', window.scrollY.toString());
});

// Restore scroll position after navigation
window.addEventListener('load', () => {
  const scrollPos = sessionStorage.getItem('scrollPos');
  if (scrollPos) {
    window.scrollTo(0, parseInt(scrollPos));
  }
});
```

---

## Error Handling

### Navigation Failures

```csharp
public async Task<NavigationResponse> NavigateTo(string url)
{
    try
    {
        // ... navigation logic
    }
    catch (RouteNotFoundException ex)
    {
        // Redirect to 404 page
        return await NavigateTo("/404");
    }
    catch (UnauthorizedAccessException ex)
    {
        // Redirect to login
        return await NavigateTo($"/login?returnUrl={url}");
    }
    catch (Exception ex)
    {
        // Log error and show error page
        _logger.LogError(ex, $"Navigation failed: {url}");

        return new NavigationResponse
        {
            Success = false,
            Error = "An error occurred during navigation"
        };
    }
}
```

### Client-Side Fallback

```typescript
try {
  await navigate(url);
} catch (error) {
  console.error('[SPA] Navigation failed, falling back to full page reload', error);
  window.location.href = url;
}
```

---

## Testing

### Unit Tests (C#)

```csharp
[Fact]
public async Task NavigateTo_SameShell_ReturnsPagePatchesOnly()
{
    // Arrange
    var hub = CreateHub();
    SetupSession("connection1", shellName: "Admin");

    // Act
    var response = await hub.NavigateTo("/admin/products/2");

    // Assert
    Assert.True(response.Success);
    Assert.Equal("Admin", response.ShellName);
    Assert.False(response.ShellChanged);
    Assert.NotEmpty(response.Patches);
}

[Fact]
public async Task NavigateTo_DifferentShell_ReturnsFullPatches()
{
    // Arrange
    var hub = CreateHub();
    SetupSession("connection1", shellName: "Admin");

    // Act
    var response = await hub.NavigateTo("/public/products/2");

    // Assert
    Assert.True(response.Success);
    Assert.Equal("Public", response.ShellName);
    Assert.True(response.ShellChanged);
    Assert.NotEmpty(response.Patches);
}
```

### Integration Tests

```csharp
[Fact]
public async Task EndToEnd_NavigationPreservesShell()
{
    // Start browser
    var browser = await Browser.Launch();
    var page = await browser.NewPage();

    // Navigate to admin page
    await page.GotoAsync("http://localhost:5000/admin/products");

    // Get shell element
    var shell = await page.QuerySelectorAsync(".admin-layout");
    var shellId = await shell.GetAttributeAsync("data-id");

    // Click link to navigate
    await page.ClickAsync("a[href='/admin/products/1']");

    // Wait for navigation
    await page.WaitForSelectorAsync(".product-details");

    // Verify shell element is the same (not re-rendered)
    var shellAfter = await page.QuerySelectorAsync(".admin-layout");
    var shellIdAfter = await shellAfter.GetAttributeAsync("data-id");

    Assert.Equal(shellId, shellIdAfter);
}
```

---

## Migration Guide

### From Traditional MVC to SPA

**Before:**
```csharp
public IActionResult Details(int id)
{
    var product = _db.Products.Find(id);
    return View(product); // Returns full HTML page
}
```

**After:**
```csharp
public IActionResult Details(int id)
{
    var product = _db.Products.Find(id);

    var viewModel = new ProductDetailsViewModel
    {
        ProductId = product.Id,
        ProductName = product.Name,
        __Shell = "Admin"
    };

    return _renderer.RenderPage<ProductDetailsPage>(viewModel, new MinimactPageRenderOptions
    {
        UseSPA = true
    });
}
```

**TSX (before):**
```tsx
<a href="/products/123">View Product</a>
```

**TSX (after):**
```tsx
<Link to="/products/123">View Product</Link>
```

---

## FAQ

### Q: Do I need to change my controllers?
**A:** No! Controllers work exactly the same. Just add `UseSPA = true` to render options.

### Q: What happens if JavaScript is disabled?
**A:** Full page reloads work as fallback. Links are still `<a>` tags with `href`.

### Q: Can I mix SPA and non-SPA pages?
**A:** Yes! Non-SPA pages use traditional full page reloads. SPA pages use client-side navigation.

### Q: How do I handle authentication redirects?
**A:** Controller returns 401 → SignalR navigation → Client redirects to login page via SPA.

### Q: Does this work with hot-reload?
**A:** Yes! Hot-reload patches work for both shells and pages.

### Q: Can I have nested shells?
**A:** Not directly. But you can have shell-specific components that feel like nested layouts.

---

## Implementation Checklist

### Phase 1: Core Infrastructure
- [ ] Create `MinimactShellComponent` base class
- [ ] Create `ShellRegistry` service
- [ ] Create `VPagePlaceholder` VNode type
- [ ] Update Babel plugin to transpile `<Page />`
- [ ] Create shell rendering logic (replace placeholder)

### Phase 2: Client-Side Navigation
- [ ] Create `Link` component (TypeScript)
- [ ] Implement click interception
- [ ] Implement SignalR navigation call
- [ ] Implement patch application (page-only vs full)
- [ ] Implement history.pushState integration
- [ ] Handle browser back/forward buttons

### Phase 3: Server-Side Routing
- [ ] Create `SPASessionState` service
- [ ] Implement `NavigateTo` hub method
- [ ] Implement route parsing and controller execution
- [ ] Implement shell vs page-only rendering
- [ ] Implement patch computation
- [ ] Create `NavigationResponse` model

### Phase 4: ViewModel Integration
- [ ] Add `__Shell` and `__ShellData` to `MinimactViewModel`
- [ ] Update `MinimactPageRenderer` to support SPA mode
- [ ] Update MVC state system to include shell metadata

### Phase 5: Testing & Polish
- [ ] Unit tests for navigation logic
- [ ] Integration tests for end-to-end navigation
- [ ] Error handling and fallbacks
- [ ] Performance optimization
- [ ] Documentation and examples

### Phase 6: Advanced Features
- [ ] Prefetching
- [ ] Loading states
- [ ] Navigation guards
- [ ] Scroll restoration
- [ ] Transition animations

---

## Conclusion

`@minimact/spa` brings the best of both worlds:
- **Server-side routing** (controllers, auth, data fetching)
- **Client-side navigation** (instant page swaps, no flicker)
- **Shell persistence** (headers/sidebars stay mounted)
- **Progressive enhancement** (works without JS)

**Result:** Fast, SEO-friendly, developer-friendly single-page applications with the full power of ASP.NET Core MVC.

**HIP HIP... MACT YAY!** 🎉
