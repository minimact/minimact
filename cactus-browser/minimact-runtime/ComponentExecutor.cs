using System;
using System.Linq;
using Minimact.AspNetCore.Core;

namespace CactusBrowser.Runtime;

public static class ComponentExecutor
{
    public static RenderResponse Execute(RenderRequest request)
    {
        try
        {
            var assembly = DynamicCompiler.Compile(request.CSharp);
            var component = DynamicCompiler.CreateInstance(assembly);
            var vnode = component.RenderComponent();
            var vnodeJson = VNodeSerializer.Serialize(vnode);

            // Generate complete HTML page with client-runtime integration
            var componentHtml = VNodeToHtml(vnode);
            var fullHtml = GeneratePageHtml(component, componentHtml, vnodeJson);

            return new RenderResponse
            {
                Success = true,
                VNodeJson = vnodeJson,
                Html = fullHtml,
                Error = null
            };
        }
        catch (Exception ex)
        {
            return new RenderResponse
            {
                Success = false,
                VNodeJson = null,
                Html = null,
                Error = $"{ex.GetType().Name}: {ex.Message}\n{ex.StackTrace}"
            };
        }
    }

    private static string GeneratePageHtml(MinimactComponent component, string componentHtml, string vnodeJson)
    {
        var componentId = component.ComponentId;

        // For now, use a simple page structure
        // TODO: Extract handlers and effects from component metadata

        return $@"<!DOCTYPE html>
<html lang=""en"">
<head>
    <meta charset=""UTF-8"">
    <meta name=""viewport"" content=""width=device-width, initial-scale=1.0"">
    <title>Minimact Component</title>
    <script src=""asset://localhost/client-runtime.js""></script>
    <style>
        body {{
            margin: 0;
            padding: 0;
            font-family: system-ui, -apple-system, sans-serif;
        }}
        #minimact-root {{
            width: 100%;
            min-height: 100vh;
        }}
    </style>
</head>
<body>
    <div id=""minimact-root"" data-minimact-component=""{HtmlEncode(componentId)}"">{componentHtml}</div>

    <!-- VNode/ViewModel Hydration Data -->
    <script id=""minimact-vnode"" type=""application/json"">
{vnodeJson}
    </script>

    <script type=""module"">
        // Import from client-runtime bundle (loaded via script tag above)
        // The client-runtime.js exports Minimact class globally
        const {{ Minimact }} = window.MinimactRuntime || {{}};

        // Import TauriTransport
        import {{ TauriTransport }} from '/src/core/signalm/TauriTransport.ts';

        console.log('[Minimact] Initializing client-runtime...');

        // Make VNode available globally
        window.__MINIMACT_VNODE__ = JSON.parse(
            document.getElementById('minimact-vnode').textContent
        );

        const componentId = '{HtmlEncode(componentId)}';
        console.log('[Minimact] VNode loaded:', window.__MINIMACT_VNODE__);
        console.log('[Minimact] Component ID:', componentId);

        // Initialize SignalM with TauriTransport
        const transport = new TauriTransport();

        try {{
            await transport.connect();
            console.log('[Minimact] ✅ TauriTransport connected');

            // Initialize Minimact client-runtime with the transport
            const minimact = new Minimact('#minimact-root', {{
                componentId: componentId,
                enableDebugLogging: true,
                customTransport: transport
            }});

            // Listen for patches from the C# runtime via SignalM
            transport.on('ApplyPatches', (patchData) => {{
                console.log('[Minimact] Received patches:', patchData);

                if (patchData.patches && Array.isArray(patchData.patches)) {{
                    // Apply patches using Minimact's DOMPatcher
                    minimact.domPatcher.applyPatches(patchData.patches);
                    console.log('[Minimact] ✅ Applied {{0}} patches', patchData.patches.length);
                }}
            }});

            console.log('[Minimact] ✅ Client-runtime initialized with SignalM²');
            console.log('[Minimact] Ready for interactivity!');
        }} catch (error) {{
            console.error('[Minimact] ❌ Failed to initialize SignalM:', error);
        }}
    </script>
</body>
</html>";
    }

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

    private static bool IsSelfClosing(string tag)
    {
        var selfClosing = new[] { "br", "hr", "img", "input", "meta", "link" };
        return selfClosing.Contains(tag.ToLower());
    }

    private static string HtmlEncode(string text)
    {
        return text
            .Replace("&", "&amp;")
            .Replace("<", "&lt;")
            .Replace(">", "&gt;")
            .Replace("\"", "&quot;")
            .Replace("'", "&#39;");
    }
}
