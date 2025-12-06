using Minimact.AspNetCore.Core;
using Minimact.AspNetCore.Extensions;
using MinimactHelpers = Minimact.AspNetCore.Core.Minimact;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Minimact.Components;

[Component]
public partial class TestUseTemplate : MainLayout
{
    public override string Title => "";

    public override string ShowSidebar => "true";

    public override string Theme => "light";

    [State]
    private string pageTitle = "Dashboard";

    protected override VNode RenderContent()
    {
        return new VElement("div", "1", new Dictionary<string, string> { ["class"] = "dashboard-page" }, new VNode[]
        {
            new VElement("h1", "1.1", new Dictionary<string, string>(), new VNode[]
            {
                new VText($"{(pageTitle)}", "1.1.1")
            }),
            new VElement("div", "1.2", new Dictionary<string, string> { ["class"] = "dashboard-grid" }, new VNode[]
            {
                new VElement("div", "1.2.1", new Dictionary<string, string> { ["class"] = "widget" }, new VNode[]
                {
                    new VElement("h2", "1.2.1.1", new Dictionary<string, string>(), "Statistics"),
                    new VElement("p", "1.2.1.2", new Dictionary<string, string>(), "Total users: 1,234"),
                    new VElement("p", "1.2.1.3", new Dictionary<string, string>(), "Active sessions: 56")
                }),
                new VElement("div", "1.2.2", new Dictionary<string, string> { ["class"] = "widget" }, new VNode[]
                {
                    new VElement("h2", "1.2.2.1", new Dictionary<string, string>(), "Recent Activity"),
                    new VElement("ul", "1.2.2.2", new Dictionary<string, string>(), new VNode[]
                    {
                        new VElement("li", "1.2.2.2.1", new Dictionary<string, string>(), "User signed up"),
                        new VElement("li", "1.2.2.2.2", new Dictionary<string, string>(), "Order placed"),
                        new VElement("li", "1.2.2.2.3", new Dictionary<string, string>(), "Comment posted")
                    })
                })
            }),
            new VElement("button", "1.3", new Dictionary<string, string> { ["onclick"] = "Handle0" }, "Update Title")
        });
    }

    public void Handle0()
    {
        SetState(nameof(pageTitle), "Updated Dashboard");
    }

    /// <summary>
    /// Returns JavaScript event handlers for client-side execution
    /// These execute in the browser with bound hook context
    /// </summary>
    protected override Dictionary<string, string> GetClientHandlers()
    {
        return new Dictionary<string, string>
        {
            ["Handle0"] = @"function () {\n  setPageTitle('Updated Dashboard');\n}"
        };
    }
}

[Component]
public partial class SettingsPage : MainLayout
{
    public override string Title => "Settings";

    public override string ShowSidebar => "false";

    public override string Theme => "dark";

    protected override VNode RenderContent()
    {
        return new VElement("div", "1", new Dictionary<string, string> { ["class"] = "settings-page" }, new VNode[]
        {
            new VElement("h1", "1.1", new Dictionary<string, string>(), "Settings"),
            new VElement("section", "1.2", new Dictionary<string, string>(), new VNode[]
            {
                new VElement("h2", "1.2.1", new Dictionary<string, string>(), "Account"),
                new VElement("p", "1.2.2", new Dictionary<string, string>(), "Manage your account settings")
            }),
            new VElement("section", "1.3", new Dictionary<string, string>(), new VNode[]
            {
                new VElement("h2", "1.3.1", new Dictionary<string, string>(), "Preferences"),
                new VElement("p", "1.3.2", new Dictionary<string, string>(), "Customize your experience")
            })
        });
    }
}

[Component]
public partial class LandingPage : MarketingLayout
{
    public override string ShowHeader => "true";

    public override string ShowFooter => "true";

    public override string CtaText => "Get Started";

    protected override VNode RenderContent()
    {
        return new VElement("div", "1", new Dictionary<string, string> { ["class"] = "landing-page" }, new VNode[]
        {
            new VElement("section", "1.1", new Dictionary<string, string> { ["class"] = "hero" }, new VNode[]
            {
                new VElement("h1", "1.1.1", new Dictionary<string, string>(), "Welcome to Our Platform"),
                new VElement("p", "1.1.2", new Dictionary<string, string>(), "The best solution for your needs")
            }),
            new VElement("section", "1.2", new Dictionary<string, string> { ["class"] = "features" }, new VNode[]
            {
                new VElement("div", "1.2.1", new Dictionary<string, string> { ["class"] = "feature" }, new VNode[]
                {
                    new VElement("h2", "1.2.1.1", new Dictionary<string, string>(), "Fast"),
                    new VElement("p", "1.2.1.2", new Dictionary<string, string>(), "Lightning quick performance")
                }),
                new VElement("div", "1.2.2", new Dictionary<string, string> { ["class"] = "feature" }, new VNode[]
                {
                    new VElement("h2", "1.2.2.1", new Dictionary<string, string>(), "Secure"),
                    new VElement("p", "1.2.2.2", new Dictionary<string, string>(), "Enterprise-grade security")
                }),
                new VElement("div", "1.2.3", new Dictionary<string, string> { ["class"] = "feature" }, new VNode[]
                {
                    new VElement("h2", "1.2.3.1", new Dictionary<string, string>(), "Scalable"),
                    new VElement("p", "1.2.3.2", new Dictionary<string, string>(), "Grows with your business")
                })
            })
        });
    }
}

[Component]
public partial class AdminPage : AdminLayout
{
    public override string Title => "Admin Panel";

    public override string ActiveSection => "";

    public override string Permissions => "";

    [State]
    private string section = "users";

    protected override VNode RenderContent()
    {
        return new VElement("div", "1", new Dictionary<string, string> { ["class"] = "admin-page" }, new VNode[]
        {
            new VElement("nav", "1.1", new Dictionary<string, string> { ["class"] = "admin-nav" }, new VNode[]
            {
                new VElement("button", "1.1.1", new Dictionary<string, string> { ["onclick"] = "Handle0" }, "Users"),
                new VElement("button", "1.1.2", new Dictionary<string, string> { ["onclick"] = "Handle2" }, "Content"),
                new VElement("button", "1.1.3", new Dictionary<string, string> { ["onclick"] = "Handle4" }, "Settings")
            }),
            MinimactHelpers.createElement("div", new { className = "admin-content" }, (section == "users") ? new VElement("div", "1.2.1.1", new Dictionary<string, string>(), new VNode[]
                {
                    new VElement("h2", "1.2.1.1.1", new Dictionary<string, string>(), "User Management"),
                    new VElement("p", "1.2.1.1.2", new Dictionary<string, string>(), "Manage users here")
                }) : new VNull("1.2.1"), (section == "content") ? new VElement("div", "1.2.2.1", new Dictionary<string, string>(), new VNode[]
                {
                    new VElement("h2", "1.2.2.1.1", new Dictionary<string, string>(), "Content Management"),
                    new VElement("p", "1.2.2.1.2", new Dictionary<string, string>(), "Manage content here")
                }) : new VNull("1.2.2"), (section == "settings") ? new VElement("div", "1.2.3.1", new Dictionary<string, string>(), new VNode[]
                {
                    new VElement("h2", "1.2.3.1.1", new Dictionary<string, string>(), "System Settings"),
                    new VElement("p", "1.2.3.1.2", new Dictionary<string, string>(), "Configure system here")
                }) : new VNull("1.2.3"))
        });
    }

    public void Handle0()
    {
        SetState(nameof(section), "users");
    }

    public void Handle2()
    {
        SetState(nameof(section), "content");
    }

    public void Handle4()
    {
        SetState(nameof(section), "settings");
    }

    /// <summary>
    /// Returns JavaScript event handlers for client-side execution
    /// These execute in the browser with bound hook context
    /// </summary>
    protected override Dictionary<string, string> GetClientHandlers()
    {
        return new Dictionary<string, string>
        {
            ["Handle0"] = @"function () {\n  setSection('users');\n}",
            ["Handle2"] = @"function () {\n  setSection('content');\n}",
            ["Handle4"] = @"function () {\n  setSection('settings');\n}"
        };
    }
}
