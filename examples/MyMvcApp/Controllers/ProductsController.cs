using Microsoft.AspNetCore.Mvc;
using Minimact.AspNetCore.Rendering;
using MyMvcApp.ViewModels;

namespace MyMvcApp.Controllers;

[ApiController]
[Route("[controller]")]
public class ProductsController : ControllerBase
{
    private readonly MinimactPageRenderer _renderer;

    public ProductsController(MinimactPageRenderer renderer)
    {
        _renderer = renderer;
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> Details(int id)
    {
        // 1. Fetch data (simulated - replace with database call)
        var product = GetProductById(id);

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

        // 3. Render Minimact component with ViewModel
        return await _renderer.RenderPage<Minimact.Components.ProductDetailsPage>(
            viewModel: viewModel,
            pageTitle: $"{product.Name} - Product Details",
            options: new MinimactPageRenderOptions
            {
                EnableDebugLogging = true,    // Enable debug logging for troubleshooting
                EnableCacheBusting = true     // Disable browser caching during development
            }
        );
    }

    // Simulated database - replace with Entity Framework
    private ProductData? GetProductById(int id)
    {
        var products = new[]
        {
            new ProductData { Id = 1, Name = "Widget", Price = 99.99m },
            new ProductData { Id = 2, Name = "Gadget", Price = 149.99m },
            new ProductData { Id = 3, Name = "Doohickey", Price = 79.99m }
        };

        return products.FirstOrDefault(p => p.Id == id);
    }
}

// Simple data model - replace with Entity Framework entity
public class ProductData
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public decimal Price { get; set; }
}
