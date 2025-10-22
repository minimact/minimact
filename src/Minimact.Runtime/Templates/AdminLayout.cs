using Minimact.Runtime.Core;

namespace Minimact.Runtime.Templates;

/// <summary>
/// Admin dashboard layout template with toolbar and sidebar
/// </summary>
public abstract class AdminLayout : MinimactComponent
{
    /// <summary>
    /// Page title displayed in header
    /// </summary>
    public virtual string Title => "Admin Dashboard";

    /// <summary>
    /// Current user name
    /// </summary>
    public virtual string UserName => "Admin";

    /// <summary>
    /// Render the main content (implemented by child components)
    /// </summary>
    protected abstract VNode RenderContent();

    /// <summary>
    /// Render the admin layout
    /// </summary>
    protected override VNode Render()
    {
        StateManager.SyncMembersToState(this);

        return new VElement("div", new Dictionary<string, string> { ["class"] = "admin-layout" }, new VNode[]
        {
            // Top toolbar
            new VElement("div", new Dictionary<string, string> { ["class"] = "admin-toolbar" }, new VNode[]
            {
                new VElement("div", new Dictionary<string, string> { ["class"] = "toolbar-left" }, new VNode[]
                {
                    new VElement("h1", "Admin Panel")
                }),
                new VElement("div", new Dictionary<string, string> { ["class"] = "toolbar-right" }, new VNode[]
                {
                    new VElement("span", $"Logged in as: {UserName}"),
                    new VElement("button", "Logout")
                })
            }),

            // Content area with sidebar
            new VElement("div", new Dictionary<string, string> { ["class"] = "admin-content" }, new VNode[]
            {
                // Sidebar navigation
                new VElement("aside", new Dictionary<string, string> { ["class"] = "admin-sidebar" }, new VNode[]
                {
                    new VElement("nav", new VNode[]
                    {
                        new VElement("ul", new VNode[]
                        {
                            new VElement("li", new VNode[] { new VElement("a", new Dictionary<string, string> { ["href"] = "/admin" }, "Dashboard") }),
                            new VElement("li", new VNode[] { new VElement("a", new Dictionary<string, string> { ["href"] = "/admin/users" }, "Users") }),
                            new VElement("li", new VNode[] { new VElement("a", new Dictionary<string, string> { ["href"] = "/admin/settings" }, "Settings") }),
                            new VElement("li", new VNode[] { new VElement("a", new Dictionary<string, string> { ["href"] = "/admin/logs" }, "Logs") })
                        })
                    })
                }),

                // Main content
                new VElement("main", new Dictionary<string, string> { ["class"] = "admin-main" }, new VNode[]
                {
                    new VElement("h2", Title),
                    RenderContent()
                })
            })
        });
    }
}
