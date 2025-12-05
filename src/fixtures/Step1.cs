using Minimact.AspNetCore.Core;
using Minimact.AspNetCore.Extensions;
using MinimactHelpers = Minimact.AspNetCore.Core.Minimact;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Minimact.Components;

[Component]
public partial class Step1 : MinimactComponent
{
    // Client-computed properties (external libraries)
    [ClientComputed("complete")]
    private dynamic complete => GetClientState<dynamic>("complete", default);

    [ClientComputed("data")]
    private dynamic data => GetClientState<dynamic>("data", default);

    [ClientComputed("handleChange")]
    private dynamic handleChange => GetClientState<dynamic>("handleChange", default);

    protected override VNode Render()
    {
        StateManager.SyncMembersToState(this);

        return MinimactHelpers.createElement("div", new { className = $"wizard-step {((complete) ? "complete" : "")}" }, new VElement("h2", "1.1", new Dictionary<string, string>(), "Step 1: Basic Information"), MinimactHelpers.createElement("input", new { id = "step1-name", type = "text", placeholder = "Name", value = (data.name) ?? ("") }), MinimactHelpers.createElement("input", new { id = "step1-email", type = "email", placeholder = "Email", value = (data.email) ?? ("") }), (new MObject(complete)) ? new VElement("span", "1.4.1", new Dictionary<string, string> { ["class"] = "check" }, "✓ Complete") : new VNull("1.4"));
    }
}

[Component]
public partial class Step2 : MinimactComponent
{
    // Client-computed properties (external libraries)
    [ClientComputed("complete")]
    private dynamic complete => GetClientState<dynamic>("complete", default);

    [ClientComputed("data")]
    private dynamic data => GetClientState<dynamic>("data", default);

    [ClientComputed("handleChange")]
    private dynamic handleChange => GetClientState<dynamic>("handleChange", default);

    protected override VNode Render()
    {
        StateManager.SyncMembersToState(this);

        return MinimactHelpers.createElement("div", new { className = $"wizard-step {((complete) ? "complete" : "")}" }, new VElement("h2", "1.1", new Dictionary<string, string>(), "Step 2: Address"), MinimactHelpers.createElement("input", new { id = "step2-address", type = "text", placeholder = "Address", value = (data.address) ?? ("") }), MinimactHelpers.createElement("input", new { id = "step2-city", type = "text", placeholder = "City", value = (data.city) ?? ("") }), (new MObject(complete)) ? new VElement("span", "1.4.1", new Dictionary<string, string> { ["class"] = "check" }, "✓ Complete") : new VNull("1.4"));
    }
}

[Component]
public partial class Step3 : MinimactComponent
{
    // Client-computed properties (external libraries)
    [ClientComputed("complete")]
    private dynamic complete => GetClientState<dynamic>("complete", default);

    [ClientComputed("data")]
    private dynamic data => GetClientState<dynamic>("data", default);

    [ClientComputed("handleChange")]
    private dynamic handleChange => GetClientState<dynamic>("handleChange", default);

    protected override VNode Render()
    {
        StateManager.SyncMembersToState(this);

        return MinimactHelpers.createElement("div", new { className = $"wizard-step {((complete) ? "complete" : "")}" }, new VElement("h2", "1.1", new Dictionary<string, string>(), "Step 3: Payment"), MinimactHelpers.createElement("input", new { id = "step3-card", type = "text", placeholder = "Card Number", value = (data.cardNumber) ?? ("") }), MinimactHelpers.createElement("input", new { id = "step3-cvv", type = "text", placeholder = "CVV", value = (data.cvv) ?? ("") }), (new MObject(complete)) ? new VElement("span", "1.4.1", new Dictionary<string, string> { ["class"] = "check" }, "✓ Complete") : new VNull("1.4"));
    }
}

[Component]
public partial class WizardPage : MinimactComponent
{
    // Client-computed properties (external libraries)
    [ClientComputed("step1Complete")]
    private dynamic step1Complete => GetClientState<dynamic>("step1Complete", default);

    [ClientComputed("step2Complete")]
    private dynamic step2Complete => GetClientState<dynamic>("step2Complete", default);

    [ClientComputed("step3Complete")]
    private dynamic step3Complete => GetClientState<dynamic>("step3Complete", default);

    // Computed properties (accessed by event handlers)
    private dynamic currentStep => (!step1Complete) ? 1 : (!step2Complete) ? 2 : (!step3Complete) ? 3 : 4;

    protected override VNode Render()
    {
        StateManager.SyncMembersToState(this);

        return MinimactHelpers.createElement("div", new { id = "wizard-root" }, new VElement("h1", "1.1", new Dictionary<string, string>(), "Setup Wizard"), new VElement("div", "1.2", new Dictionary<string, string> { ["class"] = "progress-bar" }, new VNode[]
            {
                new VElement("div", "1.2.1", new Dictionary<string, string> { ["id"] = "progress-1", ["class"] = $"{$"step {((step1Complete) ? "complete" : (currentStep == 1) ? "active" : "")}"}" }, "1"),
                new VElement("div", "1.2.2", new Dictionary<string, string> { ["id"] = "progress-2", ["class"] = $"{$"step {((step2Complete) ? "complete" : (currentStep == 2) ? "active" : "")}"}" }, "2"),
                new VElement("div", "1.2.3", new Dictionary<string, string> { ["id"] = "progress-3", ["class"] = $"{$"step {((step3Complete) ? "complete" : (currentStep == 3) ? "active" : "")}"}" }, "3")
            }), (currentStep >= 1) ? new VComponentWrapper
{
    ComponentName = "Step1",
    ComponentType = "Step1",
    HexPath = "1.3.1",
    InitialState = new Dictionary<string, object> { ["complete"] = false, ["data"] = null },

    ParentComponent = this
} : new VNull("1.3"), (currentStep >= 2) ? new VComponentWrapper
{
    ComponentName = "Step2",
    ComponentType = "Step2",
    HexPath = "1.4.1",
    InitialState = new Dictionary<string, object> { ["complete"] = false, ["data"] = null },

    ParentComponent = this
} : new VNull("1.4"), (currentStep >= 3) ? new VComponentWrapper
{
    ComponentName = "Step3",
    ComponentType = "Step3",
    HexPath = "1.5.1",
    InitialState = new Dictionary<string, object> { ["complete"] = false, ["data"] = null },

    ParentComponent = this
} : new VNull("1.5"), (currentStep == 4) ? new VElement("div", "1.6.1", new Dictionary<string, string> { ["id"] = "completion-message", ["class"] = "completion" }, new VNode[]
            {
                new VElement("h2", "1.6.1.1", new Dictionary<string, string>(), "All Steps Complete!"),
                new VElement("p", "1.6.1.2", new Dictionary<string, string>(), "You have completed all wizard steps."),
                new VElement("button", "1.6.1.3", new Dictionary<string, string> { ["id"] = "complete-btn", ["type"] = "button", ["onclick"] = "handleComplete" }, "Finish")
            }) : new VNull("1.6"), new VElement("div", "1.7", new Dictionary<string, string> { ["class"] = "wizard-nav" }, new VNode[]
            {
                new VElement("button", "1.7.1", new Dictionary<string, string> { ["id"] = "back-btn", ["type"] = "button", ["disabled"] = $"{currentStep == 1}", ["onclick"] = "handleBack" }, "← Back"),
                new VElement("button", "1.7.2", new Dictionary<string, string> { ["id"] = "next-btn", ["type"] = "button", ["disabled"] = $"{currentStep == 4}", ["onclick"] = "handleNext" }, "Next →")
            }), new VElement("div", "1.8", new Dictionary<string, string> { ["id"] = "status", ["class"] = "status" }, new VNode[]
            {
                new VElement("p", "1.8.1", new Dictionary<string, string>(), new VNode[]
                {
                    new VText("Current Step:", "1.8.1.1"),
                    new VElement("span", "1.8.1.2", new Dictionary<string, string> { ["id"] = "current-step" }, new VNode[]
                    {
                        new VText($"{(currentStep)}", "1.8.1.2.1")
                    })
                }),
                new VElement("p", "1.8.2", new Dictionary<string, string>(), new VNode[]
                {
                    new VText("Step 1 Complete:", "1.8.2.1"),
                    new VElement("span", "1.8.2.2", new Dictionary<string, string> { ["id"] = "step1-status" }, new VNode[]
                    {
                        new VText($"{((new MObject(step1Complete)) ? "Yes" : "No")}", "1.8.2.2.1")
                    })
                }),
                new VElement("p", "1.8.3", new Dictionary<string, string>(), new VNode[]
                {
                    new VText("Step 2 Complete:", "1.8.3.1"),
                    new VElement("span", "1.8.3.2", new Dictionary<string, string> { ["id"] = "step2-status" }, new VNode[]
                    {
                        new VText($"{((new MObject(step2Complete)) ? "Yes" : "No")}", "1.8.3.2.1")
                    })
                }),
                new VElement("p", "1.8.4", new Dictionary<string, string>(), new VNode[]
                {
                    new VText("Step 3 Complete:", "1.8.4.1"),
                    new VElement("span", "1.8.4.2", new Dictionary<string, string> { ["id"] = "step3-status" }, new VNode[]
                    {
                        new VText($"{((new MObject(step3Complete)) ? "Yes" : "No")}", "1.8.4.2.1")
                    })
                })
            }));
    }

    public void handleNext()
    {
        if ((currentStep == 1) && (!step1Complete)) {
    SetState("Step1.complete", true);
} else {
    if ((currentStep == 2) && (!step2Complete)) {
    SetState("Step2.complete", true);
} else {
    if ((currentStep == 3) && (!step3Complete)) {
    SetState("Step3.complete", true);
}
}
}
    }

    public void handleBack()
    {
        if (currentStep == 2) {
    SetState("Step1.complete", false);
} else {
    if (currentStep == 3) {
    SetState("Step2.complete", false);
} else {
    if (currentStep == 4) {
    SetState("Step3.complete", false);
}
}
}
    }

    public void handleComplete()
    {
        var allData = new { step1 = GetState<dynamic>("Step1.data"), step2 = GetState<dynamic>("Step2.data"), step3 = GetState<dynamic>("Step3.data") };
        Console.WriteLine("Wizard completed:" + allData);
        Console.WriteLine("Wizard completed successfully!");
    }
}
