using Minimact.AspNetCore.Core;

namespace Minimact.AspNetCore.Templates;

/// <summary>
/// Authentication layout template for login/register pages
/// </summary>
public abstract class AuthLayout : MinimactComponent
{
    /// <summary>
    /// Page title (e.g., "Login", "Register")
    /// </summary>
    public virtual string Title => "Authentication";

    /// <summary>
    /// Render the auth form content (implemented by child components)
    /// </summary>
    protected abstract VNode RenderContent();

    /// <summary>
    /// Render the auth layout with centered card
    /// </summary>
    protected override VNode Render()
    {
        StateManager.SyncMembersToState(this);

        return new VElement("div", new Dictionary<string, string> { ["class"] = "auth-container" }, new VNode[]
        {
            new VElement("div", new Dictionary<string, string> { ["class"] = "auth-card" }, new VNode[]
            {
                new VElement("div", new Dictionary<string, string> { ["class"] = "auth-header" }, new VNode[]
                {
                    new VElement("h1", Title),
                    new VElement("p", "Welcome to Minimact")
                }),

                new VElement("div", new Dictionary<string, string> { ["class"] = "auth-content" }, new VNode[] { RenderContent() }),

                new VElement("div", new Dictionary<string, string> { ["class"] = "auth-footer" }, new VNode[]
                {
                    new VElement("p", new VNode[]
                    {
                        new VText("Need help? "),
                        new VElement("a", new Dictionary<string, string> { ["href"] = "/support" }, "Contact support")
                    })
                })
            })
        });
    }
}
