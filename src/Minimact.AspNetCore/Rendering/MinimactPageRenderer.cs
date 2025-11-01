using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.DependencyInjection;
using Minimact.AspNetCore.Attributes;
using Minimact.AspNetCore.Core;
using System.Reflection;
using System.Text.Json;

namespace Minimact.AspNetCore.Rendering;

/// <summary>
/// Service for rendering Minimact components from MVC controllers.
///
/// Allows controllers to pass ViewModels to Minimact components,
/// bridging traditional ASP.NET MVC patterns with Minimact reactivity.
/// </summary>
public class MinimactPageRenderer
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ComponentRegistry _registry;

    public MinimactPageRenderer(IServiceProvider serviceProvider, ComponentRegistry registry)
    {
        _serviceProvider = serviceProvider;
        _registry = registry;
    }

    /// <summary>
    /// Render a Minimact component with a ViewModel from a controller.
    /// </summary>
    /// <typeparam name="TComponent">The Minimact component type to render</typeparam>
    /// <param name="viewModel">The ViewModel to pass to the component</param>
    /// <param name="pageTitle">The HTML page title</param>
    /// <param name="options">Optional rendering options</param>
    /// <returns>IActionResult containing the rendered HTML page</returns>
    /// <example>
    /// // In controller:
    /// var viewModel = new ProductViewModel { Name = "Widget", Price = 99.99m };
    /// return await _renderer.RenderPage&lt;ProductDetailsPage&gt;(viewModel, "Product Details");
    /// </example>
    public async Task<IActionResult> RenderPage<TComponent>(
        object viewModel,
        string pageTitle,
        MinimactPageRenderOptions? options = null)
        where TComponent : MinimactComponent
    {
        options ??= new MinimactPageRenderOptions();

        // 1. Extract mutability metadata from ViewModel
        var mutability = ExtractMutabilityMetadata(viewModel);

        // 2. Create component instance with ViewModel
        var component = ActivatorUtilities.CreateInstance<TComponent>(
            _serviceProvider,
            viewModel
        );

        // 3. Set ViewModel and mutability on component
        component.SetMvcViewModel(viewModel, mutability);

        // 4. Register component
        _registry.RegisterComponent(component);

        // 5. Initialize and render
        var vnode = await component.InitializeAndRenderAsync();
        var html = vnode.ToHtml();

        // 6. Serialize ViewModel for client
        var viewModelJson = SerializeViewModel(viewModel, mutability);

        // 7. Generate complete HTML page
        var pageHtml = GeneratePageHtml(component, html, pageTitle, viewModelJson, options);

        return new ContentResult
        {
            Content = pageHtml,
            ContentType = "text/html",
            StatusCode = 200
        };
    }

    /// <summary>
    /// Extract mutability metadata from ViewModel properties.
    /// Properties marked with [Mutable] can be modified from client.
    /// </summary>
    private Dictionary<string, bool> ExtractMutabilityMetadata(object viewModel)
    {
        var type = viewModel.GetType();
        var mutability = new Dictionary<string, bool>();

        foreach (var prop in type.GetProperties(BindingFlags.Public | BindingFlags.Instance))
        {
            var isMutable = prop.GetCustomAttribute<MutableAttribute>() != null;
            var propertyName = ToCamelCase(prop.Name);
            mutability[propertyName] = isMutable;
        }

        return mutability;
    }

    /// <summary>
    /// Serialize ViewModel and mutability metadata to JSON.
    /// </summary>
    private string SerializeViewModel(object viewModel, Dictionary<string, bool> mutability)
    {
        var wrapper = new
        {
            data = viewModel,
            _mutability = mutability
        };

        return JsonSerializer.Serialize(wrapper, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            WriteIndented = false
        });
    }

    /// <summary>
    /// Generate complete HTML page with Minimact client runtime.
    /// </summary>
    private string GeneratePageHtml(
        MinimactComponent component,
        string componentHtml,
        string title,
        string viewModelJson,
        MinimactPageRenderOptions options)
    {
        var scriptSrc = options.ClientScriptPath ?? "/js/minimact.js";
        var enableDebugLogging = options.EnableDebugLogging ? "true" : "false";

        return $@"<!DOCTYPE html>
<html lang=""en"">
<head>
    <meta charset=""UTF-8"">
    <meta name=""viewport"" content=""width=device-width, initial-scale=1.0"">
    <title>{EscapeHtml(title)}</title>
    <script src=""{EscapeHtml(scriptSrc)}""></script>
    {(options.AdditionalHeadContent != null ? options.AdditionalHeadContent : "")}
    <style>
        body {{
            font-family: system-ui, -apple-system, sans-serif;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }}
        button {{
            padding: 8px 16px;
            margin: 4px;
            cursor: pointer;
            border: 1px solid #ccc;
            border-radius: 4px;
            background: white;
        }}
        button:hover {{
            background: #f0f0f0;
        }}
    </style>
</head>
<body>
    <div id=""minimact-root"" data-minimact-component=""{component.ComponentId}"">{componentHtml}</div>

    <!-- MVC ViewModel Data -->
    <script id=""minimact-viewmodel"" type=""application/json"">
{viewModelJson}
    </script>

    <script>
        // Make ViewModel available globally for hooks
        window.__MINIMACT_VIEWMODEL__ = JSON.parse(
            document.getElementById('minimact-viewmodel').textContent
        );

        // Initialize Minimact client runtime
        const minimact = new Minimact.Minimact('#minimact-root', {{
            enableDebugLogging: {enableDebugLogging}
        }});
        minimact.start();
    </script>
    {(options.AdditionalBodyContent != null ? options.AdditionalBodyContent : "")}
</body>
</html>";
    }

    /// <summary>
    /// Convert PascalCase to camelCase
    /// </summary>
    private string ToCamelCase(string str)
    {
        if (string.IsNullOrEmpty(str) || char.IsLower(str[0]))
            return str;

        return char.ToLower(str[0]) + str.Substring(1);
    }

    /// <summary>
    /// Escape HTML special characters
    /// </summary>
    private string EscapeHtml(string text)
    {
        if (string.IsNullOrEmpty(text))
            return text;

        return text
            .Replace("&", "&amp;")
            .Replace("<", "&lt;")
            .Replace(">", "&gt;")
            .Replace("\"", "&quot;")
            .Replace("'", "&#39;");
    }
}

/// <summary>
/// Options for rendering Minimact pages
/// </summary>
public class MinimactPageRenderOptions
{
    /// <summary>
    /// Path to Minimact client script (default: "/js/minimact.js")
    /// </summary>
    public string? ClientScriptPath { get; set; }

    /// <summary>
    /// Enable debug logging in client runtime (default: false)
    /// </summary>
    public bool EnableDebugLogging { get; set; } = false;

    /// <summary>
    /// Additional HTML to inject in &lt;head&gt;
    /// </summary>
    public string? AdditionalHeadContent { get; set; }

    /// <summary>
    /// Additional HTML to inject before &lt;/body&gt;
    /// </summary>
    public string? AdditionalBodyContent { get; set; }
}
