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
[33m  11[0m public partial class UserProfile : MinimactComponent
[33m  12[0m {
[33m  13[0m     [Prop]
[33m  14[0m     public dynamic user { get; set; }
[33m  15[0m 
[33m  16[0m     [Prop]
[33m  17[0m     public bool loading { get; set; }
[33m  18[0m 
[33m  19[0m     protected override VNode Render()
[33m  20[0m     {
[33m  21[0m         StateManager.SyncMembersToState(this);
[33m  22[0m 
[33m  23[0m         return MinimactHelpers.createElement("div", new { className = "profile" }, (new MObject(loading)) ? new VElement("div", new Dictionary<string, string> { ["class"] = "spinner" }, "Loading...") : MinimactHelpers.createElement("div", new { className = "user-info" }, new VElement("h1", new Dictionary<string, string>(), new VNode[]
[33m  24[0m                 {
[33m  25[0m                     new VText($"{(user.name)}")
[33m  26[0m                 }), new VElement("p", new Dictionary<string, string>(), new VNode[]
[33m  27[0m                 {
[33m  28[0m                     new VText($"{(user.email)}")
[33m  29[0m                 }), (new MObject(user.isAdmin)) ? new VElement("span", new Dictionary<string, string> { ["class"] = "badge" }, "Admin") : null));
[33m  30[0m     }
[33m  31[0m }
[33m  32[0m 