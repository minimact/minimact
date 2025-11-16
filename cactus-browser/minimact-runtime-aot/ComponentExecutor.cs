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
            var html = VNodeToHtml(vnode);

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
            return new RenderResponse
            {
                Success = false,
                VNodeJson = null,
                Html = null,
                Error = $"{ex.GetType().Name}: {ex.Message}\n{ex.StackTrace}"
            };
        }
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
