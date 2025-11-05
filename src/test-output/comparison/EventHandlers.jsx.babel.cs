[33m   1[0m using Minimact.AspNetCore.Core;
[33m   2[0m using Minimact.AspNetCore.Extensions;
[33m   3[0m using MinimactHelpers = Minimact.AspNetCore.Core.Minimact;
[33m   4[0m using System.Collections.Generic;
[33m   5[0m using System.Linq;
[33m   6[0m using System.Threading.Tasks;
[33m   7[0m 
[33m   8[0m namespace Minimact.Components;
[33m   9[0m 
[33m  10[0m [Component]
[33m  11[0m public partial class InteractiveForm : MinimactComponent
[33m  12[0m {
[33m  13[0m     [Prop]
[33m  14[0m     public dynamic onSubmit { get; set; }
[33m  15[0m 
[33m  16[0m     protected override VNode Render()
[33m  17[0m     {
[33m  18[0m         StateManager.SyncMembersToState(this);
[33m  19[0m 
[33m  20[0m         return new VElement("form", new Dictionary<string, string> { ["class"] = "form", ["onsubmit"] = "handleSubmit" }, new VNode[]
[33m  21[0m         {
[33m  22[0m             new VElement("div", new Dictionary<string, string> { ["class"] = "form-group" }, new VNode[]
[33m  23[0m             {
[33m  24[0m                 new VElement("label", new Dictionary<string, string> { ["htmlFor"] = "name" }, "Name:"),
[33m  25[0m                 new VElement("input", new Dictionary<string, string> { ["id"] = "name", ["type"] = "text", ["onchange"] = "handleNameChange", ["onblur"] = "validateName", ["onfocus"] = "clearError" })
[33m  26[0m             }),
[33m  27[0m             new VElement("div", new Dictionary<string, string> { ["class"] = "form-group" }, new VNode[]
[33m  28[0m             {
[33m  29[0m                 new VElement("label", new Dictionary<string, string> { ["htmlFor"] = "email" }, "Email:"),
[33m  30[0m                 new VElement("input", new Dictionary<string, string> { ["id"] = "email", ["type"] = "email", ["onchange"] = "handleEmailChange", ["onblur"] = "validateEmail" })
[33m  31[0m             }),
[33m  32[0m             new VElement("div", new Dictionary<string, string> { ["class"] = "actions" }, new VNode[]
[33m  33[0m             {
[33m  34[0m                 new VElement("button", new Dictionary<string, string> { ["type"] = "submit", ["onclick"] = "handleClick" }, "Submit"),
[33m  35[0m                 new VElement("button", new Dictionary<string, string> { ["type"] = "button", ["onclick"] = "handleCancel" }, "Cancel")
[33m  36[0m             })
[33m  37[0m         });
[33m  38[0m     }
[33m  39[0m }
[33m  40[0m 