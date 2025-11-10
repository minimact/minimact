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

        // 2. Create component instance (parameterless constructor)
        var component = ActivatorUtilities.CreateInstance<TComponent>(_serviceProvider);

        // 3. Set ViewModel and mutability on component
        component.SetMvcViewModel(viewModel, mutability);

        // 4. Register component
        _registry.RegisterComponent(component);

        // 5. Initialize and render
        var vnode = await component.InitializeAndRenderAsync();
        var html = vnode.ToHtml();

        // 6. Serialize ViewModel for client
        var viewModelJson = SerializeViewModel(component, viewModel, mutability);

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
    private string SerializeViewModel(MinimactComponent component, object viewModel, Dictionary<string, bool> mutability)
    {
        var wrapper = new
        {
            data = viewModel,
            _mutability = mutability,
            _componentType = component.GetType().Name,
            _componentId = component.ComponentId
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

        // Add cache busting for development
        if (options.EnableCacheBusting)
        {
            var timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
            scriptSrc += $"?v={timestamp}";
        }

        // Auto-detect required extension scripts based on options
        var extensionScripts = new System.Text.StringBuilder();
        if (options.IncludeMvcExtension)
        {
            var mvcScriptSrc = "/js/minimact-mvc.min.js";
            if (options.EnableCacheBusting)
            {
                var timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
                mvcScriptSrc += $"?v={timestamp}";
            }
            extensionScripts.AppendLine($"    <script src=\"{mvcScriptSrc}\"></script>");
        }
        if (options.IncludePunchExtension)
        {
            var punchScriptSrc = "/js/minimact-punch.min.js";
            if (options.EnableCacheBusting)
            {
                var timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
                punchScriptSrc += $"?v={timestamp}";
            }
            extensionScripts.AppendLine($"    <script src=\"{punchScriptSrc}\"></script>");
        }
        if (options.IncludeMarkdownExtension)
        {
            var mdScriptSrc = "/js/minimact-md.min.js";
            if (options.EnableCacheBusting)
            {
                var timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
                mdScriptSrc += $"?v={timestamp}";
            }
            extensionScripts.AppendLine($"    <script src=\"{mdScriptSrc}\"></script>");
        }

        // Prism.js for syntax highlighting (if enabled)
        var prismIncludes = new System.Text.StringBuilder();
        if (options.EnablePrismSyntaxHighlighting)
        {
            var prismTheme = options.PrismTheme ?? "prism";
            prismIncludes.AppendLine($"    <!-- Prism.js Syntax Highlighting -->");
            prismIncludes.AppendLine($"    <link href=\"https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/{prismTheme}.min.css\" rel=\"stylesheet\" />");
            prismIncludes.AppendLine($"    <script src=\"https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/prism.min.js\" data-manual></script>");

            // Include language plugins
            if (options.PrismLanguages != null && options.PrismLanguages.Any())
            {
                foreach (var lang in options.PrismLanguages)
                {
                    prismIncludes.AppendLine($"    <script src=\"https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-{lang}.min.js\"></script>");
                }
            }
            else
            {
                // Default language set
                prismIncludes.AppendLine($"    <script src=\"https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-csharp.min.js\"></script>");
                prismIncludes.AppendLine($"    <script src=\"https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-javascript.min.js\"></script>");
                prismIncludes.AppendLine($"    <script src=\"https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-typescript.min.js\"></script>");
                prismIncludes.AppendLine($"    <script src=\"https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-css.min.js\"></script>");
                prismIncludes.AppendLine($"    <script src=\"https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-markup.min.js\"></script>");
                prismIncludes.AppendLine($"    <script src=\"https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-json.min.js\"></script>");
                prismIncludes.AppendLine($"    <script src=\"https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-python.min.js\"></script>");
                prismIncludes.AppendLine($"    <script src=\"https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-sql.min.js\"></script>");
                prismIncludes.AppendLine($"    <script src=\"https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-bash.min.js\"></script>");
            }
        }

        var enableDebugLogging = options.EnableDebugLogging ? "true" : "false";

        return $@"<!DOCTYPE html>
<html lang=""en"">
<head>
    <meta charset=""UTF-8"">
    <meta name=""viewport"" content=""width=device-width, initial-scale=1.0"">
    <title>{EscapeHtml(title)}</title>
{prismIncludes}    <script src=""{EscapeHtml(scriptSrc)}""></script>
{extensionScripts}    {(options.AdditionalHeadContent != null ? options.AdditionalHeadContent : "")}
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

        // Register client-only event handlers
        window.MinimactHandlers = window.MinimactHandlers || {{}};
{GenerateClientHandlersScript(component)}
        // Initialize Minimact client runtime
        const minimact = new Minimact.Minimact('#minimact-root', {{
            enableDebugLogging: {enableDebugLogging}
        }});
        minimact.start();

        {(options.EnablePrismSyntaxHighlighting ? @"
        // Initialize Prism.js for syntax highlighting
        if (typeof Prism !== 'undefined') {
            Prism.highlightAll();
        }" : "")}
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

    /// <summary>
    /// Generate JavaScript to register client-only event handlers
    /// </summary>
    private string GenerateClientHandlersScript(MinimactComponent component)
    {
        var clientHandlers = component.GetClientHandlers();
        if (clientHandlers == null || clientHandlers.Count == 0)
        {
            return string.Empty;
        }

        var script = new System.Text.StringBuilder();
        foreach (var handler in clientHandlers)
        {
            // Escape the JavaScript code for embedding in HTML
            var escapedJs = handler.Value
                .Replace("\\", "\\\\")  // Escape backslashes
                .Replace("\"", "\\\""); // Escape quotes

            script.AppendLine($"        window.MinimactHandlers['{handler.Key}'] = {escapedJs};");
        }

        return script.ToString();
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
    /// Enable cache busting by appending timestamp to script URL (default: false)
    /// Recommended for development to ensure latest script is loaded
    /// </summary>
    public bool EnableCacheBusting { get; set; } = false;

    /// <summary>
    /// Include @minimact/mvc extension script (default: true for MVC Bridge)
    /// Set to true when using useMvcState or useMvcViewModel hooks
    /// Adds: &lt;script src="/js/minimact-mvc.min.js"&gt;&lt;/script&gt;
    /// </summary>
    public bool IncludeMvcExtension { get; set; } = true;

    /// <summary>
    /// Include @minimact/punch extension script (default: false)
    /// Set to true when using useDomElementState hook
    /// Adds: &lt;script src="/js/minimact-punch.min.js"&gt;&lt;/script&gt;
    /// </summary>
    public bool IncludePunchExtension { get; set; } = false;

    /// <summary>
    /// Include @minimact/md extension script (default: false)
    /// Set to true when using useMarkdown or useRazorMarkdown hooks
    /// Adds: &lt;script src="/js/minimact-md.min.js"&gt;&lt;/script&gt;
    /// </summary>
    public bool IncludeMarkdownExtension { get; set; } = false;

    /// <summary>
    /// Enable Prism.js syntax highlighting for code blocks (default: false)
    /// Automatically includes Prism.js CDN scripts and CSS
    /// Perfect for markdown code blocks in useMarkdown/useRazorMarkdown
    /// </summary>
    public bool EnablePrismSyntaxHighlighting { get; set; } = false;

    /// <summary>
    /// Prism.js theme to use (default: "prism")
    /// Options: "prism", "prism-dark", "prism-twilight", "prism-okaidia", "prism-tomorrow"
    /// Only used if EnablePrismSyntaxHighlighting = true
    /// </summary>
    public string? PrismTheme { get; set; }

    /// <summary>
    /// Languages to include for Prism.js syntax highlighting (default: null = common languages)
    /// Examples: "csharp", "javascript", "typescript", "python", "sql", "bash"
    /// If null, includes: csharp, javascript, typescript, css, markup, json, python, sql, bash
    /// Only used if EnablePrismSyntaxHighlighting = true
    /// </summary>
    public List<string>? PrismLanguages { get; set; }

    /// <summary>
    /// Additional HTML to inject in &lt;head&gt;
    /// </summary>
    public string? AdditionalHeadContent { get; set; }

    /// <summary>
    /// Additional HTML to inject before &lt;/body&gt;
    /// </summary>
    public string? AdditionalBodyContent { get; set; }
}
