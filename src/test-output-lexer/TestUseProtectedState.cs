using Minimact.AspNetCore.Core;
using Minimact.AspNetCore.Extensions;
using MinimactHelpers = Minimact.AspNetCore.Core.Minimact;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Minimact.Components;

[ProtectedState("internalCounter")]
[ProtectedState("secretValue")]
[Component]
public partial class TestUseProtectedState : MinimactComponent
{
    [State]
    private int publicCounter = 0;

    [State]
    private int internalCounter = 0;

    [State]
    private string secretValue = "hidden";

    protected override VNode Render()
    {
        StateManager.SyncMembersToState(this);

        return new VElement("div", "1", new Dictionary<string, string> { ["class"] = "protected-state-test" }, new VNode[]
        {
            new VElement("h2", "1.1", new Dictionary<string, string>(), "Protected State Test"),
            new VElement("div", "1.2", new Dictionary<string, string> { ["class"] = "protected-section" }, new VNode[]
            {
                new VElement("h3", "1.2.1", new Dictionary<string, string>(), "Protected (Internal Only)"),
                new VElement("p", "1.2.2", new Dictionary<string, string>(), new VNode[]
                {
                    new VText($"{(internalCounter)}", "1.2.2.1")
                }),
                new VElement("p", "1.2.3", new Dictionary<string, string>(), new VNode[]
                {
                    new VText($"{(secretValue)}", "1.2.3.1")
                }),
                new VElement("button", "1.2.4", new Dictionary<string, string> { ["onclick"] = "handleIncrementInternal" }, "Increment Internal"),
                new VElement("button", "1.2.5", new Dictionary<string, string> { ["onclick"] = "handleReveal" }, "Reveal Secret")
            }),
            new VElement("div", "1.3", new Dictionary<string, string> { ["class"] = "public-section" }, new VNode[]
            {
                new VElement("h3", "1.3.1", new Dictionary<string, string>(), "Public (Can Be Lifted)"),
                new VElement("p", "1.3.2", new Dictionary<string, string>(), new VNode[]
                {
                    new VText($"{(publicCounter)}", "1.3.2.1")
                }),
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
        SetState(nameof(secretValue), "revealed!");
    }

    /// <summary>
    /// Returns JavaScript event handlers for client-side execution
    /// These execute in the browser with bound hook context
    /// </summary>
    protected override Dictionary<string, string> GetClientHandlers()
    {
        return new Dictionary<string, string>
        {
            ["handleIncrementInternal"] = @"function () {\n  ;\n}",
            ["handleIncrementPublic"] = @"function () {\n  ;\n}",
            ["handleReveal"] = @"function () {\n  ;\n}"
        };
    }

    // State setters
    private void setPublicCounter(int value)
    {
        publicCounter = value;
        SetState(nameof(publicCounter), value);
    }

    private void setInternalCounter(int value)
    {
        internalCounter = value;
        SetState(nameof(internalCounter), value);
    }

    private void setSecretValue(string value)
    {
        secretValue = value;
        SetState(nameof(secretValue), value);
    }

}
