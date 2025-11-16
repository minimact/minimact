using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Hosting;
using Minimact.AspNetCore.Attributes;
using Minimact.AspNetCore.Core;
using Minimact.AspNetCore.Services;
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
    private readonly IWebHostEnvironment _environment;

    public MinimactPageRenderer(
        IServiceProvider serviceProvider,
        ComponentRegistry registry,
        IWebHostEnvironment environment)
    {
        _serviceProvider = serviceProvider;
        _registry = registry;
        _environment = environment;
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

        // 2. Create page component instance
        var pageComponent = ActivatorUtilities.CreateInstance<TComponent>(_serviceProvider);

        // 3. Set ViewModel and mutability on component
        pageComponent.SetMvcViewModel(viewModel, mutability);

        // 4. Register page component
        _registry.RegisterComponent(pageComponent);

        MinimactComponent component;
        VNode vnode;

        // 5. Check if SPA mode is enabled
        if (options.UseSPA && !string.IsNullOrEmpty(options.ShellName))
        {
            // SPA mode: Render shell with page inside
            var shellRegistry = _serviceProvider.GetService<SPA.ShellRegistry>();
            if (shellRegistry != null)
            {
                var shell = shellRegistry.CreateShell(options.ShellName, viewModel, _serviceProvider);
                if (shell != null)
                {
                    _registry.RegisterComponent(shell);
                    vnode = shell.RenderWithPage(pageComponent);
                    component = shell; // Use shell as the main component for HTML generation
                }
                else
                {
                    // Fallback: No shell found, render page only
                    vnode = await pageComponent.InitializeAndRenderAsync();
                    component = pageComponent;
                }
            }
            else
            {
                // Fallback: SPA not configured, render page only
                vnode = await pageComponent.InitializeAndRenderAsync();
                component = pageComponent;
            }
        }
        else
        {
            // Non-SPA mode: Render page only
            vnode = await pageComponent.InitializeAndRenderAsync();
            component = pageComponent;
        }

        var html = vnode.ToHtml();

        // 6. Serialize ViewModel for client
        var viewModelJson = SerializeViewModel(component, viewModel, mutability);

        // 7. Auto-enable hot-reload in development (unless explicitly disabled)
        if (options.EnableHotReload == null && _environment.IsDevelopment())
        {
            options.EnableHotReload = true;
        }

        // 8. Generate complete HTML page
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
        // Generate module script tags from mact_modules/
        var extensionScripts = GenerateModuleScripts(component, options);

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
        var enableClientDebugMode = options.EnableClientDebugMode ? "true" : "false";

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

        // Enable client debug mode if configured
        if ({enableClientDebugMode}) {{
            if (typeof Minimact !== 'undefined' && Minimact.setDebugMode) {{
                Minimact.setDebugMode(true);
                console.log('[Minimact] Client debug mode enabled - debug() calls will be sent to server');
            }}
        }}

        // Initialize Minimact client runtime with handlers and effects
        const minimact = new Minimact.Minimact('#minimact-root', {{
            componentId: '{component.ComponentId}',
            enableDebugLogging: {enableDebugLogging},
            handlers: [
{GenerateHandlerConfigs(component)}
            ],
            effects: [
{GenerateEffectConfigs(component)}
            ]
        }});
        minimact.start();

        {(options.EnableHotReload == true ? @"
        // Lazy-load hot-reload module (development only)
        import('@minimact/core/hot-reload').then(({ enableHotReload }) => {
            enableHotReload();
            console.log('[Minimact] Hot-reload enabled');
        }).catch(err => {
            console.warn('[Minimact] Failed to load hot-reload module:', err);
        });" : "")}

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
    /// Generate handler configurations with pre-computed DOM paths
    /// Walks VNode tree, finds event handlers, converts hex paths to DOM indices
    /// </summary>
    private string GenerateHandlerConfigs(MinimactComponent component)
    {
        var clientHandlers = component.GetClientHandlers();
        if (clientHandlers == null || clientHandlers.Count == 0)
        {
            return string.Empty;
        }

        var handlers = new List<string>();
        var vnode = component.CurrentVNode;
        if (vnode == null)
        {
            return string.Empty;
        }

        var pathConverter = new PathConverter(vnode);

        // Walk VNode tree to find event handlers
        WalkVNodeForHandlers(vnode, (node, hexPath) =>
        {
            if (node is VElement element)
            {
                foreach (var prop in element.Props)
                {
                    // Check for event handlers (onClick, onChange, onSubmit, etc.)
                    if (prop.Key.StartsWith("on") && prop.Key.Length > 2 && char.IsUpper(prop.Key[2]))
                    {
                        var handlerName = prop.Value?.ToString();
                        if (handlerName != null && clientHandlers.ContainsKey(handlerName))
                        {
                            var jsCode = clientHandlers[handlerName];

                            // Convert hex path → DOM indices
                            var domPath = pathConverter.HexPathToDomPath(hexPath);
                            var domPathJson = JsonSerializer.Serialize(domPath);

                            // Extract event type (onClick → click, onChange → change)
                            var eventType = prop.Key.Substring(2).ToLowerInvariant();

                            handlers.Add($@"                {{
                    domPath: {domPathJson},
                    eventType: ""{eventType}"",
                    jsCode: {jsCode}
                }}");
                        }
                    }
                }
            }
        });

        return string.Join(",\n", handlers);
    }

    /// <summary>
    /// Generate effect configurations (no DOM paths needed)
    /// Effects execute with hook context - they don't need to be bound to DOM elements
    /// </summary>
    private string GenerateEffectConfigs(MinimactComponent component)
    {
        var clientEffects = component.GetClientEffects();
        if (clientEffects == null || clientEffects.Count == 0)
        {
            return string.Empty;
        }

        var effects = new List<string>();

        foreach (var effect in clientEffects)
        {
            var depsJson = JsonSerializer.Serialize(effect.Value.Dependencies);

            effects.Add($@"                {{
                    callback: {effect.Value.Callback},
                    dependencies: {depsJson}
                }}");
        }

        return string.Join(",\n", effects);
    }

    /// <summary>
    /// Walk VNode tree and execute callback for each node with its hex path
    /// </summary>
    private void WalkVNodeForHandlers(VNode node, Action<VNode, string> callback)
    {
        if (node == null)
        {
            return;
        }

        // Get hex path for this node
        var hexPath = node.Path ?? "";

        // Execute callback for this node
        callback(node, hexPath);

        // Recurse into children
        if (node is VElement element && element.Children != null)
        {
            foreach (var child in element.Children)
            {
                WalkVNodeForHandlers(child, callback);
            }
        }
    }

    /// <summary>
    /// Generate script tags for modules from mact_modules/ directory
    /// </summary>
    private string GenerateModuleScripts(MinimactComponent component, MinimactPageRenderOptions options)
    {
        // Try to get MactModuleRegistry (may not be registered)
        var registry = _serviceProvider.GetService<MactModuleRegistry>();

        // If no registry or no modules, fall back to legacy behavior
        if (registry == null || registry.Count == 0)
        {
            return GenerateLegacyExtensionScripts(options);
        }

        var modulesToInclude = DetermineModulesToInclude(component, registry);

        var scripts = new System.Text.StringBuilder();
        foreach (var module in modulesToInclude)
        {
            var moduleSrc = registry.GetWebPath(module);

            if (options.EnableCacheBusting)
            {
                var timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
                moduleSrc += $"?v={timestamp}";
            }

            if (module.Type == "module")
            {
                scripts.AppendLine($"    <script type=\"module\" src=\"{moduleSrc}\"></script>");
            }
            else
            {
                scripts.AppendLine($"    <script src=\"{moduleSrc}\"></script>");
            }
        }

        return scripts.ToString();
    }

    /// <summary>
    /// Generate legacy extension scripts (fallback when mact_modules/ not available)
    /// </summary>
    private string GenerateLegacyExtensionScripts(MinimactPageRenderOptions options)
    {
        var scripts = new System.Text.StringBuilder();

        if (options.IncludeMvcExtension)
        {
            var mvcScriptSrc = "/js/minimact-mvc.min.js";
            if (options.EnableCacheBusting)
            {
                var timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
                mvcScriptSrc += $"?v={timestamp}";
            }
            scripts.AppendLine($"    <script src=\"{mvcScriptSrc}\"></script>");
        }

        if (options.IncludePunchExtension)
        {
            var punchScriptSrc = "/js/minimact-punch.min.js";
            if (options.EnableCacheBusting)
            {
                var timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
                punchScriptSrc += $"?v={timestamp}";
            }
            scripts.AppendLine($"    <script src=\"{punchScriptSrc}\"></script>");
        }

        if (options.IncludeMarkdownExtension)
        {
            var mdScriptSrc = "/js/minimact-md.min.js";
            if (options.EnableCacheBusting)
            {
                var timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
                mdScriptSrc += $"?v={timestamp}";
            }
            scripts.AppendLine($"    <script src=\"{mdScriptSrc}\"></script>");
        }

        return scripts.ToString();
    }

    /// <summary>
    /// Determine which modules to include based on component's ModuleInfo attribute
    /// </summary>
    private IEnumerable<ModuleMetadata> DetermineModulesToInclude(
        MinimactComponent component,
        MactModuleRegistry registry)
    {
        var moduleInfo = component.GetType().GetCustomAttribute<ModuleInfoAttribute>();

        // Option 1: Explicit include list (overrides everything)
        if (moduleInfo?.Include != null && moduleInfo.Include.Length > 0)
        {
            return registry.GetModules(moduleInfo.Include);
        }

        // Option 2: OptOut = true with no Exclude list (core only, no modules)
        if (moduleInfo?.OptOut == true && (moduleInfo.Exclude == null || moduleInfo.Exclude.Length == 0))
        {
            return Enumerable.Empty<ModuleMetadata>();
        }

        // Option 3: OptOut = true with Exclude list (include all except excluded)
        if (moduleInfo?.OptOut == true && moduleInfo.Exclude != null && moduleInfo.Exclude.Length > 0)
        {
            return registry.GetModulesExcluding(moduleInfo.Exclude);
        }

        // Option 4: Default (include everything from mact_modules/)
        return registry.GetAllModules();
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
    /// Enable client debug mode - sends debug() calls to server for C# breakpoint debugging (default: false)
    /// When enabled, window.minimactDebug() will send messages to MinimactHub.DebugMessage
    /// Set a breakpoint in MinimactHub.DebugMessage to inspect client state in C#
    /// </summary>
    public bool EnableClientDebugMode { get; set; } = false;

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
    /// Enable hot-reload (default: null = auto-detect based on environment)
    /// - null: Auto-enable in Development, disable in Production (default)
    /// - true: Force enable (even in production, useful for staging)
    /// - false: Force disable (even in development)
    /// Lazy-loads @minimact/core/hot-reload module on client
    /// Uses the existing SignalR hub for file change notifications
    /// </summary>
    public bool? EnableHotReload { get; set; } = null;

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

    /// <summary>
    /// Enable SPA mode (default: false)
    /// When true, renders page inside a shell component
    /// </summary>
    public bool UseSPA { get; set; } = false;

    /// <summary>
    /// Shell name to use (default: "Default")
    /// Only used when UseSPA = true
    /// </summary>
    public string? ShellName { get; set; } = "Default";
}
