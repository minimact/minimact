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
[33m  11[0m public partial class Counter : MinimactComponent
[33m  12[0m {
[33m  13[0m     [Prop]
[33m  14[0m     public dynamic count { get; set; }
[33m  15[0m 
[33m  16[0m     protected override VNode Render()
[33m  17[0m     {
[33m  18[0m         StateManager.SyncMembersToState(this);
[33m  19[0m 
[33m  20[0m         return new VElement("div", new Dictionary<string, string> { ["class"] = "counter" }, new VNode[]
[33m  21[0m         {
[33m  22[0m             new VElement("span", new Dictionary<string, string>(), $"Count:{(count)}"),
[33m  23[0m             new VElement("button", new Dictionary<string, string> { ["onclick"] = "increment" }, "+")
[33m  24[0m         });
[33m  25[0m     }
[33m  26[0m }
[33m  27[0m 