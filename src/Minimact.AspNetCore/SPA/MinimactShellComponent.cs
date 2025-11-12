using Minimact.AspNetCore.Core;

namespace Minimact.AspNetCore.SPA;

/// <summary>
/// Base class for shell components (persistent layouts) in @minimact/spa
///
/// Shells are layouts that wrap page content and persist during same-shell navigation.
/// They stay mounted on the client to avoid re-rendering headers, sidebars, etc.
///
/// Example:
///   AdminShell.tsx renders: header + sidebar + &lt;Page /&gt; + footer
///   When navigating /admin/products → /admin/users, only &lt;Page /&gt; content swaps.
///
/// Usage:
///   public class AdminShell : MinimactShellComponent
///   {
///       protected override VNode Render()
///       {
///           return new VElement("div", new VAttribute("class", "admin-layout"),
///               new VElement("header", new VText("Admin Header")),
///               new VElement("main",
///                   new VPagePlaceholder() // &lt;Page /&gt; will be replaced with actual page
///               ),
///               new VElement("footer", new VText("Footer"))
///           );
///       }
///   }
/// </summary>
public abstract class MinimactShellComponent : MinimactComponent
{
    /// <summary>
    /// The page component that will be rendered inside this shell
    /// Set by SPA navigation system before rendering
    /// </summary>
    public MinimactComponent? PageComponent { get; set; }

    /// <summary>
    /// Render shell with page inside
    /// This is the primary entry point for shell rendering
    /// </summary>
    /// <param name="page">The page component to inject into the shell</param>
    /// <returns>Complete VNode tree with page injected at &lt;Page /&gt; placeholder</returns>
    public VNode RenderWithPage(MinimactComponent page)
    {
        PageComponent = page;

        // 1. Render shell (contains VPagePlaceholder)
        var shellVNode = Render();

        // 2. Render page (use RenderComponent() public method)
        var pageVNode = page.RenderComponent();

        // 3. Replace VPagePlaceholder with actual page VNode
        var finalVNode = ReplacePagePlaceholder(shellVNode, pageVNode);

        return finalVNode;
    }

    /// <summary>
    /// Recursively find and replace VPagePlaceholder with actual page VNode
    /// </summary>
    /// <param name="node">Shell VNode tree (contains placeholder)</param>
    /// <param name="pageVNode">Page VNode to inject</param>
    /// <returns>VNode tree with placeholder replaced</returns>
    private VNode ReplacePagePlaceholder(VNode node, VNode pageVNode)
    {
        // Base case: found the placeholder
        if (node is VPagePlaceholder)
        {
            return pageVNode;
        }

        // Recursive case: search in children
        if (node is VElement element)
        {
            // Check if any children are placeholders
            bool hasPlaceholder = element.Children.Any(child =>
                child is VPagePlaceholder || ContainsPlaceholder(child));

            if (hasPlaceholder)
            {
                // Create new element with replaced children
                var newChildren = element.Children
                    .Select(child => ReplacePagePlaceholder(child, pageVNode))
                    .ToList();

                // Create new VElement with updated children
                return new VElement(element.Tag, element.Path, element.Props, newChildren.ToArray())
                {
                    Key = element.Key
                };
            }
        }
        else if (node is Fragment fragment)
        {
            // Check if any children are placeholders
            bool hasPlaceholder = fragment.Children.Any(child =>
                child is VPagePlaceholder || ContainsPlaceholder(child));

            if (hasPlaceholder)
            {
                // Create new fragment with replaced children
                var newChildren = fragment.Children
                    .Select(child => ReplacePagePlaceholder(child, pageVNode))
                    .ToArray();

                return new Fragment(newChildren);
            }
        }

        // No placeholder found, return node as-is
        return node;
    }

    /// <summary>
    /// Check if a VNode tree contains a VPagePlaceholder
    /// Used for optimization (avoid unnecessary cloning)
    /// </summary>
    private bool ContainsPlaceholder(VNode node)
    {
        if (node is VPagePlaceholder)
        {
            return true;
        }

        if (node is VElement element)
        {
            return element.Children.Any(child => ContainsPlaceholder(child));
        }

        if (node is Fragment fragment)
        {
            return fragment.Children.Any(child => ContainsPlaceholder(child));
        }

        return false;
    }

    /// <summary>
    /// Helper method for components that directly call Render() instead of RenderWithPage()
    /// This provides a fallback and error message for debugging
    /// </summary>
    protected VNode? TryRenderPage()
    {
        if (PageComponent == null)
        {
            throw new InvalidOperationException(
                $"Shell component '{GetType().Name}' cannot render <Page /> because PageComponent is not set. " +
                "Use RenderWithPage(page) instead of Render() when rendering shells."
            );
        }

        return PageComponent.RenderComponent();
    }
}
