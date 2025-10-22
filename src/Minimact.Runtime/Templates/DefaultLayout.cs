using Minimact.Runtime.Core;

namespace Minimact.Runtime.Templates;

/// <summary>
/// Default layout template with header, content, and footer
/// </summary>
public abstract class DefaultLayout : MinimactComponent
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
    /// Render the complete layout
    /// </summary>
    protected override VNode Render()
    {
        StateManager.SyncMembersToState(this);

        return new VElement("div", new Dictionary<string, string> { ["class"] = "layout-container" }, new VNode[]
        {
            // Header
            new VElement("header", new Dictionary<string, string> { ["class"] = "header" }, new VNode[]
            {
                new VElement("h1", Title),
                new VElement("nav", new VNode[]
                {
                    new VElement("a", new Dictionary<string, string> { ["href"] = "/" }, "Home"),
                    new VElement("a", new Dictionary<string, string> { ["href"] = "/about" }, "About"),
                    new VElement("a", new Dictionary<string, string> { ["href"] = "/contact" }, "Contact")
                })
            }),

            // Main content
            new VElement("main", new Dictionary<string, string> { ["class"] = "main-content" }, new VNode[] { RenderContent() }),

            // Footer
            new VElement("footer", new Dictionary<string, string> { ["class"] = "footer" }, new VNode[]
            {
                new VElement("p", "© 2025 Minimact. All rights reserved.")
            })
        });
    }
}
