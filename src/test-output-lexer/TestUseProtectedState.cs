using Minimact.AspNetCore.Core;
using Minimact.AspNetCore.Extensions;
using MinimactHelpers = Minimact.AspNetCore.Core.Minimact;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Minimact.Components;

[Component]
public partial class TestUseProtectedState : MinimactComponent
{
    [State]
    private int publicCounter = 0;

    protected override VNode Render()
    {
        StateManager.SyncMembersToState(this);

        return new VElement("div", "1", new Dictionary<string, string> { ["class"] = "protected-state-test" }, new VNode[]
        {
            new VElement("h2", "1.1", new Dictionary<string, string>(), "Protected State Test"),
            new VElement("div", "1.2", new Dictionary<string, string> { ["class"] = "protected-section" }, new VNode[]
            {
                new VElement("h3", "1.2.1", new Dictionary<string, string>(), "Protected (Internal Only)"),
                new VElement("p", "1.2.2", new Dictionary<string, string>(), $"Internal Counter:{(internalCounter)}"),
                new VElement("p", "1.2.3", new Dictionary<string, string>(), $"Secret:{(secretValue)}"),
                new VElement("button", "1.2.4", new Dictionary<string, string> { ["onclick"] = "handleIncrementInternal" }, "Increment Internal"),
                new VElement("button", "1.2.5", new Dictionary<string, string> { ["onclick"] = "handleReveal" }, "Reveal Secret")
            }),
            new VElement("div", "1.3", new Dictionary<string, string> { ["class"] = "public-section" }, new VNode[]
            {
                new VElement("h3", "1.3.1", new Dictionary<string, string>(), "Public (Can Be Lifted)"),
                new VElement("p", "1.3.2", new Dictionary<string, string>(), $"Public Counter:{(publicCounter)}"),
                new VElement("button", "1.3.3", new Dictionary<string, string> { ["onclick"] = "handleIncrementPublic" }, "Increment Public")
            })
        });
    }

    public void handleIncrementInternal()
    {
        SetState(nameof(internalCounter), internalCounter + 1);
    }

    public void handleIncrementPublic()
    {
        SetState(nameof(publicCounter), publicCounter + 1);
    }

    public void handleReveal()
    {
        SetState(nameof(secretValue), 'revealed!');
    }

    /// <summary>
    /// Returns JavaScript event handlers for client-side execution
    /// These execute in the browser with bound hook context
    /// </summary>
    protected override Dictionary<string, string> GetClientHandlers()
    {
        return new Dictionary<string, string>
        {
            ["handleIncrementInternal"] = @"function () {\n  { setInternalCounter(internalCounter + 1); };\n}",
            ["handleIncrementPublic"] = @"function () {\n  { setPublicCounter(publicCounter + 1); };\n}",
            ["handleReveal"] = @"function () {\n  { setSecretValue('revealed!'); };\n}"
        };
    }
}
