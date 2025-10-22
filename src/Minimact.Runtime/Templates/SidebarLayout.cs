using Minimact.Runtime.Core;

namespace Minimact.Runtime.Templates;

/// <summary>
/// Sidebar layout template with navigation sidebar and main content area
/// </summary>
public abstract class SidebarLayout : MinimactComponent
{
    /// <summary>
    /// Page title displayed in header
    /// </summary>
    public virtual string Title => "Page";

    /// <summary>
    /// Render the main content (implemented by child components)
    /// </summary>
    protected abstract VNode RenderContent();

    /// <summary>
    /// Render the complete layout with sidebar
    /// </summary>
    protected override VNode Render()
    {
        StateManager.SyncMembersToState(this);

        return new VElement("div", new Dictionary<string, string> { ["class"] = "layout-container" }, new VNode[]
        {
            // Sidebar
            new VElement("aside", new Dictionary<string, string> { ["class"] = "sidebar" }, new VNode[]
            {
                new VElement("nav", new VNode[]
                {
                    new VElement("h2", "Navigation"),
                    new VElement("ul", new VNode[]
                    {
                        new VElement("li", new VNode[] { new VElement("a", new Dictionary<string, string> { ["href"] = "/" }, "Home") }),
                        new VElement("li", new VNode[] { new VElement("a", new Dictionary<string, string> { ["href"] = "/dashboard" }, "Dashboard") }),
                        new VElement("li", new VNode[] { new VElement("a", new Dictionary<string, string> { ["href"] = "/settings" }, "Settings") })
                    })
                })
            }),

            // Main content area
            new VElement("main", new Dictionary<string, string> { ["class"] = "main-content" }, new VNode[]
            {
                new VElement("header", new VNode[] { new VElement("h1", Title) }),
                new VElement("div", new Dictionary<string, string> { ["class"] = "content" }, new VNode[] { RenderContent() })
            })
        });
    }
}
