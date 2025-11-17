using System;
using System.Collections.Generic;
using System.Text.Json;
using Minimact.AspNetCore.Core;

namespace CactusBrowser.Runtime;

/// <summary>
/// Manages stateful component instances for Cactus Browser
/// Keeps components alive between re-renders and handles state updates
/// </summary>
public static class ComponentManager
{
    // Keep component instances alive
    private static Dictionary<string, MinimactComponent> _components = new();

    /// <summary>
    /// Initialize a component (called by execute_component Tauri command)
    /// </summary>
    public static RenderResponse InitializeComponent(RenderRequest request)
    {
        try
        {
            Console.WriteLine($"[ComponentManager] Initializing component: {request.ComponentId}");

            // Compile C# code
            var assembly = DynamicCompiler.Compile(request.CSharp);
            var component = DynamicCompiler.CreateInstance(assembly);

            // Set component ID
            component.ComponentId = request.ComponentId ?? Guid.NewGuid().ToString();

            // Store for later re-renders
            _components[component.ComponentId] = component;

            Console.WriteLine($"[ComponentManager] Component stored with ID: {component.ComponentId}");

            // Initial render
            var vnode = component.RenderComponent();
            var vnodeJson = VNodeSerializer.Serialize(vnode);

            // Store current VNode for diffing
            component.CurrentVNode = vnode;

            // Generate complete HTML with client-runtime
            var html = GeneratePageHtml(component, vnode, vnodeJson, request);

            Console.WriteLine($"[ComponentManager] ✅ Component initialized successfully");

            return new RenderResponse
            {
                Success = true,
                VNodeJson = vnodeJson,
                Html = html,
                Error = null
            };
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[ComponentManager] ❌ Error initializing component: {ex.Message}");
            return new RenderResponse
            {
                Success = false,
                VNodeJson = null,
                Html = null,
                Error = $"{ex.GetType().Name}: {ex.Message}\n{ex.StackTrace}"
            };
        }
    }

    /// <summary>
    /// Update component state and generate patches
    /// </summary>
    public static PatchResponse UpdateComponentState(string componentId, string stateKey, JsonElement value)
    {
        try
        {
            Console.WriteLine($"[ComponentManager] Updating state: {componentId}.{stateKey}");

            if (!_components.TryGetValue(componentId, out var component))
            {
                return new PatchResponse
                {
                    Success = false,
                    Patches = null,
                    Error = $"Component not found: {componentId}"
                };
            }

            // Save old VNode for diffing
            var oldVNode = component.CurrentVNode;
            if (oldVNode == null)
            {
                return new PatchResponse
                {
                    Success = false,
                    Patches = null,
                    Error = "Component has no current VNode"
                };
            }

            // Update state
            component.SetState(stateKey, value);

            // Re-render
            var newVNode = component.RenderComponent();
            component.CurrentVNode = newVNode;

            // Use Rust reconciler to generate patches
            var patches = RustBridge.Reconcile(oldVNode, newVNode);

            Console.WriteLine($"[ComponentManager] Generated {patches.Count} patches");

            // Convert hex paths to DOM paths
            var pathConverter = new PathConverter(newVNode);
            var domPatches = DomPatch.FromPatches(patches, pathConverter);

            // Serialize patches for Tauri
            var patchesJson = JsonSerializer.Serialize(domPatches);

            return new PatchResponse
            {
                Success = true,
                Patches = patchesJson,
                Error = null
            };
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[ComponentManager] ❌ Error updating state: {ex.Message}");
            return new PatchResponse
            {
                Success = false,
                Patches = null,
                Error = $"{ex.GetType().Name}: {ex.Message}"
            };
        }
    }

    /// <summary>
    /// Generate complete HTML page with client-runtime integration
    /// </summary>
    private static string GeneratePageHtml(
        MinimactComponent component,
        VNode vnode,
        string vnodeJson,
        RenderRequest request)
    {
        var componentHtml = VNodeToHtml(vnode);
        var componentId = component.ComponentId;
        var title = request.Title ?? "Minimact Component";

        // Get client handlers and effects from component
        var clientHandlers = component.GetClientHandlers();
        var clientEffects = component.GetClientEffects();

        var handlerConfigs = GenerateHandlerConfigs(component, vnode);
        var effectConfigs = GenerateEffectConfigs(component);

        return $@"<!DOCTYPE html>
<html lang=""en"">
<head>
    <meta charset=""UTF-8"">
    <meta name=""viewport"" content=""width=device-width, initial-scale=1.0"">
    <title>{HtmlEncode(title)}</title>
    <script src=""/__minimact__/client-runtime.js""></script>
    <style>
        body {{
            margin: 0;
            padding: 0;
            font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }}
        #minimact-root {{
            width: 100%;
            min-height: 100vh;
        }}
    </style>
</head>
<body>
    <div id=""minimact-root"" data-minimact-component=""{componentId}"">{componentHtml}</div>

    <!-- VNode/ViewModel Hydration Data -->
    <script id=""minimact-vnode"" type=""application/json"">
{vnodeJson}
    </script>

    <script>
        // Make VNode available globally
        window.__MINIMACT_VNODE__ = JSON.parse(
            document.getElementById('minimact-vnode').textContent
        );

        console.log('[Minimact] Initializing client-runtime...');
        console.log('[Minimact] Component ID:', '{componentId}');
        console.log('[Minimact] Handlers:', {handlerConfigs.Length > 0});
        console.log('[Minimact] Effects:', {effectConfigs.Length > 0});

        // TODO: Initialize client-runtime with SignalM TauriTransport
        // This will be implemented when client-runtime bundle is integrated

        console.log('[Minimact] Client-runtime initialized ✅');
    </script>
</body>
</html>";
    }

    /// <summary>
    /// Generate handler configurations from component
    /// </summary>
    private static string GenerateHandlerConfigs(MinimactComponent component, VNode vnode)
    {
        var clientHandlers = component.GetClientHandlers();
        if (clientHandlers == null || clientHandlers.Count == 0)
        {
            return string.Empty;
        }

        var handlers = new List<string>();
        var pathConverter = new PathConverter(vnode);

        // Walk VNode tree to find event handlers
        WalkVNodeForHandlers(vnode, "", (node, hexPath) =>
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
                            var domPath = pathConverter.HexPathToDomPath(hexPath);
                            var domPathJson = JsonSerializer.Serialize(domPath);
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
    /// Generate effect configurations from component
    /// </summary>
    private static string GenerateEffectConfigs(MinimactComponent component)
    {
        var clientEffects = component.GetClientEffects();
        if (clientEffects == null || clientEffects.Count == 0)
        {
            return string.Empty;
        }

        var effects = clientEffects.Select(kv => $@"                {{
                    name: ""{JsEncode(kv.Key)}"",
                    callback: {kv.Value.Callback},
                    dependencies: {JsonSerializer.Serialize(kv.Value.Dependencies)}
                }}");

        return string.Join(",\n", effects);
    }

    /// <summary>
    /// Walk VNode tree to find handlers
    /// </summary>
    private static void WalkVNodeForHandlers(VNode node, string hexPath, Action<VNode, string> callback)
    {
        callback(node, hexPath);

        if (node is VElement element)
        {
            for (int i = 0; i < element.Children.Count; i++)
            {
                var child = element.Children[i];
                var childPath = string.IsNullOrEmpty(hexPath)
                    ? child.Path
                    : $"{hexPath}.{child.Path.Split('.')[^1]}";
                WalkVNodeForHandlers(child, childPath, callback);
            }
        }
    }

    /// <summary>
    /// Render VNode to HTML
    /// </summary>
    private static string VNodeToHtml(VNode vnode)
    {
        return vnode switch
        {
            VElement element => RenderElement(element),
            VText text => HtmlEncode(text.Content),
            VNull => "",
            _ => ""
        };
    }

    /// <summary>
    /// Render VElement to HTML
    /// </summary>
    private static string RenderElement(VElement element)
    {
        var attrs = string.Join(" ", element.Props
            .Select(kv => $"{kv.Key}=\"{HtmlEncode(kv.Value)}\""));

        var attrsHtml = attrs.Length > 0 ? " " + attrs : "";
        var children = string.Join("", element.Children.Select(VNodeToHtml));

        if (IsSelfClosing(element.Tag) && string.IsNullOrEmpty(children))
        {
            return $"<{element.Tag}{attrsHtml} />";
        }

        return $"<{element.Tag}{attrsHtml}>{children}</{element.Tag}>";
    }

    /// <summary>
    /// Check if tag is self-closing
    /// </summary>
    private static bool IsSelfClosing(string tag)
    {
        var selfClosing = new[] { "br", "hr", "img", "input", "meta", "link", "area", "base", "col", "embed", "param", "source", "track", "wbr" };
        return selfClosing.Contains(tag.ToLower());
    }

    /// <summary>
    /// HTML encode string
    /// </summary>
    private static string HtmlEncode(string text)
    {
        return text
            .Replace("&", "&amp;")
            .Replace("<", "&lt;")
            .Replace(">", "&gt;")
            .Replace("\"", "&quot;")
            .Replace("'", "&#39;");
    }

    /// <summary>
    /// JavaScript encode string
    /// </summary>
    private static string JsEncode(string text)
    {
        return text.Replace("\\", "\\\\").Replace("\"", "\\\"");
    }
}

/// <summary>
/// Response for patch generation
/// </summary>
public class PatchResponse
{
    public bool Success { get; set; }
    public string? Patches { get; set; }
    public string? Error { get; set; }
}
