using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Minimact.AspNetCore.Core;
using Minimact.AspNetCore.Rendering;
using Minimact.AspNetCore.Extensions;
using MinimactHelpers = Minimact.AspNetCore.Core.Minimact;

namespace MinimactTest.Components
{
[Component]
public partial class InteractiveForm : MinimactComponent
{
    [Prop]
    public dynamic onSubmit { get; set; }

    protected override VNode Render()
    {
        StateManager.SyncMembersToState(this);

        return new VElement("form", new Dictionary<string, string> { ["class"] = "form", ["onsubmit"] = "handleSubmit" }, new VNode[]
        {
            new VElement("div", new Dictionary<string, string> { ["class"] = "form-group" }, new VNode[]
            {
                new VElement("label", new Dictionary<string, string> { ["htmlFor"] = "name" }, "Name:"),
                new VElement("input", new Dictionary<string, string> { ["id"] = "name", ["type"] = "text", ["onchange"] = "handleNameChange", ["onblur"] = "validateName", ["onfocus"] = "clearError" })
            }),
            new VElement("div", new Dictionary<string, string> { ["class"] = "form-group" }, new VNode[]
            {
                new VElement("label", new Dictionary<string, string> { ["htmlFor"] = "email" }, "Email:"),
                new VElement("input", new Dictionary<string, string> { ["id"] = "email", ["type"] = "email", ["onchange"] = "handleEmailChange", ["onblur"] = "validateEmail" })
            }),
            new VElement("div", new Dictionary<string, string> { ["class"] = "actions" }, new VNode[]
            {
                new VElement("button", new Dictionary<string, string> { ["type"] = "submit", ["onclick"] = "handleClick" }, "Submit"),
                new VElement("button", new Dictionary<string, string> { ["type"] = "button", ["onclick"] = "handleCancel" }, "Cancel")
            })
        });
    }
}

}
