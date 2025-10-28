using Minimact.AspNetCore.Core;
using Minimact.Testing.Models;

namespace Minimact.Testing.Core;

/// <summary>
/// Renders VNode trees to MockDOM and applies patches using the real Rust reconciler
/// This ensures tests use the exact same logic as production
/// </summary>
public static class VNodeRenderer
{
    /// <summary>
    /// Initial render: Convert VNode to MockElement
    /// Used for first render only
    /// </summary>
    public static MockElement InitialRender(VNode vnode)
    {
        return vnode switch
        {
            VElement element => RenderElement(element),
            VText text => RenderText(text),
            Fragment fragment => RenderFragment(fragment),
            _ => throw new NotSupportedException($"Unknown VNode type: {vnode.GetType().Name}")
        };
    }

    /// <summary>
    /// Re-render: Use Rust reconciler to compute patches, then apply them to MockDOM
    /// This is the REAL production path - same as what happens in the browser
    /// </summary>
    public static void ApplyRerender(MockElement rootElement, VNode oldVNode, VNode newVNode, DOMPatcher patcher)
    {
        // 1. Call REAL Rust reconciler (same as production!)
        var patches = RustBridge.Reconcile(oldVNode, newVNode);

        // 2. Apply patches to MockDOM (same as browser would do)
        patcher.ApplyPatches(rootElement, patches.Select(p => ConvertPatch(p)).ToList());
    }

    /// <summary>
    /// Convert Rust Patch to our DOMPatch model
    /// </summary>
    private static DOMPatch ConvertPatch(Patch rustPatch)
    {
        return new DOMPatch
        {
            Type = rustPatch.Type switch
            {
                "SetAttribute" => PatchType.SetAttribute,
                "SetText" => PatchType.SetText,
                "InsertChild" => PatchType.InsertChild,
                "RemoveChild" => PatchType.RemoveChild,
                "ReplaceChild" => PatchType.ReplaceChild,
                _ => throw new NotSupportedException($"Unknown patch type: {rustPatch.Type}")
            },
            Path = rustPatch.Path,
            Content = rustPatch.Content,
            Props = rustPatch.Props,
            Node = rustPatch.Node
        };
    }

    private static MockElement RenderElement(VElement element)
    {
        var mockElement = new MockElement
        {
            TagName = element.Tag,
            Attributes = new Dictionary<string, string>(element.Props)
        };

        // Extract ID if present
        if (element.Props.TryGetValue("id", out var id))
        {
            mockElement.Id = id;
        }

        // Render children
        foreach (var child in element.Children)
        {
            var mockChild = InitialRender(child);
            mockChild.Parent = mockElement;
            mockElement.Children.Add(mockChild);
        }

        // If element has only one text child, set TextContent directly
        if (mockElement.Children.Count == 1 && mockElement.Children[0].TagName == "#text")
        {
            mockElement.TextContent = mockElement.Children[0].TextContent;
            mockElement.Children.Clear(); // Remove the text node child
        }

        return mockElement;
    }

    private static MockElement RenderText(VText text)
    {
        return new MockElement
        {
            TagName = "#text",
            TextContent = text.Content
        };
    }

    private static MockElement RenderFragment(Fragment fragment)
    {
        // Fragments don't create a DOM node, they just group children
        // For testing purposes, we'll create a wrapper div
        var wrapper = new MockElement
        {
            TagName = "div",
            Attributes = new Dictionary<string, string>
            {
                ["data-fragment"] = "true"
            }
        };

        foreach (var child in fragment.Children)
        {
            var mockChild = InitialRender(child);
            mockChild.Parent = wrapper;
            wrapper.Children.Add(mockChild);
        }

        return wrapper;
    }
}
