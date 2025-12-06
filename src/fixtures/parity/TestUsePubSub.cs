using Minimact.AspNetCore.Core;
using Minimact.AspNetCore.Extensions;
using MinimactHelpers = Minimact.AspNetCore.Core.Minimact;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Minimact.Components;

[LoopTemplate("notifications", @"{""stateKey"":""notifications"",""arrayBinding"":""notifications"",""itemVar"":""notif"",""indexVar"":""index"",""keyBinding"":null,""itemTemplate"":{""type"":""Element"",""tag"":""div"",""propsTemplates"":{""className"":{""template"":""notification {0}"",""bindings"":[""item.type""],""slots"":[13],""type"":""template-literal""}},""childrenTemplates"":[{""type"":""Text"",""template"":""{0}"",""bindings"":[""item.message""],""slots"":[0]}]}}")]
[LoopTemplate("Array", @"{""stateKey"":""Array"",""arrayBinding"":""Array"",""indexVar"":null,""keyBinding"":null,""itemTemplate"":{""type"":""Element"",""tag"":""li"",""propsTemplates"":null,""childrenTemplates"":[{""type"":""Text"",""template"":"":"",""bindings"":[],""slots"":[]},{""type"":""Element"",""tag"":""span"",""propsTemplates"":null,""childrenTemplates"":null}]}}")]
[LoopTemplate("messages", @"{""stateKey"":""messages"",""arrayBinding"":""messages"",""itemVar"":""msg"",""indexVar"":null,""keyBinding"":null,""itemTemplate"":{""type"":""Element"",""tag"":""div"",""propsTemplates"":{""className"":{""template"":""message"",""bindings"":[],""slots"":[],""type"":""static""}},""childrenTemplates"":[{""type"":""Element"",""tag"":""span"",""propsTemplates"":{""className"":{""template"":""user"",""bindings"":[],""slots"":[],""type"":""static""}},""childrenTemplates"":[{""type"":""Text"",""template"":""{0}"",""bindings"":[""item.user""],""slots"":[0]}]},{""type"":""Element"",""tag"":""span"",""propsTemplates"":{""className"":{""template"":""text"",""bindings"":[],""slots"":[],""type"":""static""}},""childrenTemplates"":[{""type"":""Text"",""template"":""{0}"",""bindings"":[""item.text""],""slots"":[0]}]},{""type"":""Element"",""tag"":""span"",""propsTemplates"":{""className"":{""template"":""time"",""bindings"":[],""slots"":[],""type"":""static""}},""childrenTemplates"":[{""type"":""Text"",""template"":""{0}"",""bindings"":[""__expr__:toLocaleTimeString""],""slots"":[0]}]}]}}")]
[Component]
public partial class TestUsePubSub : MinimactComponent
{
    [State]
    private List<dynamic> messages = new List<dynamic> {  };

    [State]
    private List<dynamic> notifications = new List<dynamic> {  };

    [State]
    private dynamic onlineUsers = new Map();

    [State]
    private string inputText = "";

    // usePub: publishMessage
    private string publishMessage_channel = "chat:messages";

    // usePub: publishNotification
    private string publishNotification_channel = "app:notifications";

    // usePub: publishUserStatus
    private string publishUserStatus_channel = "users:status";

    protected override VNode Render()
    {
        StateManager.SyncMembersToState(this);

        return new VElement("div", "1", new Dictionary<string, string> { ["class"] = "pubsub-test" }, new VNode[]
        {
            new VElement("h2", "1.1", new Dictionary<string, string>(), "Pub/Sub Test"),
            new VElement("section", "1.2", new Dictionary<string, string> { ["class"] = "notifications-section" }, new VNode[]
            {
                new VElement("h3", "1.2.1", new Dictionary<string, string>(), "Notifications"),
                new VElement("div", "1.2.2", new Dictionary<string, string> { ["class"] = "notification-buttons" }, new VNode[]
                {
                    new VElement("button", "1.2.2.1", new Dictionary<string, string> { ["onclick"] = "Handle3" }, "Info"),
                    new VElement("button", "1.2.2.2", new Dictionary<string, string> { ["onclick"] = "Handle5" }, "Warning"),
                    new VElement("button", "1.2.2.3", new Dictionary<string, string> { ["onclick"] = "Handle7" }, "Error")
                }),
                MinimactHelpers.createElement("div", new { className = "notification-list" }, notifications.Select((notif, index) => new VElement("div", "1.2.3.1.1", new Dictionary<string, string> { ["class"] = $"{$"notification {notif.type}"}" }, new VNode[]
                    {
                        new VText($"{(notif.Message)}", "1.2.3.1.1.1")
                    })).ToArray())
            }),
            new VElement("section", "1.3", new Dictionary<string, string> { ["class"] = "status-section" }, new VNode[]
            {
                new VElement("h3", "1.3.1", new Dictionary<string, string>(), "User Status"),
                new VElement("div", "1.3.2", new Dictionary<string, string> { ["class"] = "status-buttons" }, new VNode[]
                {
                    new VElement("button", "1.3.2.1", new Dictionary<string, string> { ["onclick"] = "Handle9" }, "Go Online"),
                    new VElement("button", "1.3.2.2", new Dictionary<string, string> { ["onclick"] = "Handle11" }, "Go Away"),
                    new VElement("button", "1.3.2.3", new Dictionary<string, string> { ["onclick"] = "Handle13" }, "Go Offline")
                }),
                new VElement("div", "1.3.3", new Dictionary<string, string> { ["class"] = "online-users" }, new VNode[]
                {
                    new VElement("h4", "1.3.3.1", new Dictionary<string, string>(), $"Online Users ({(onlineUsers.size)})"),
                    MinimactHelpers.createElement("ul", null, Array.from(onlineUsers.entries()).Select(undefined => new VElement("li", "1.3.3.2.1.1", new Dictionary<string, string>(), new VNode[]
                        {
                            new VText($"{(userId)}:", ""),
                            new VElement("span", "1.3.3.2.1.1.3", new Dictionary<string, string> { ["class"] = $"{$"status-{status}"}" }, new VNode[]
                            {
                                new VText($"{(status)}", "1.3.3.2.1.1.3.1")
                            })
                        })).ToArray())
                })
            }),
            new VElement("section", "1.4", new Dictionary<string, string> { ["class"] = "chat-section" }, new VNode[]
            {
                new VElement("h3", "1.4.1", new Dictionary<string, string>(), "Chat Messages"),
                MinimactHelpers.createElement("div", new { className = "message-list" }, messages.Select(msg => new VElement("div", "1.4.2.1.1", new Dictionary<string, string> { ["class"] = "message" }, new VNode[]
                    {
                        new VElement("span", "1.4.2.1.1.1", new Dictionary<string, string> { ["class"] = "user" }, new VNode[]
                        {
                            new VText($"{(msg.user)}", "1.4.2.1.1.1.1")
                        }),
                        new VElement("span", "1.4.2.1.1.2", new Dictionary<string, string> { ["class"] = "text" }, new VNode[]
                        {
                            new VText($"{(msg.text)}", "1.4.2.1.1.2.1")
                        }),
                        new VElement("span", "1.4.2.1.1.3", new Dictionary<string, string> { ["class"] = "time" }, new VNode[]
                        {
                            new VText($"{(DateTime.Parse(msg.timestamp).ToString("t"))}", "1.4.2.1.1.3.1")
                        })
                    })).ToArray()),
                new VElement("div", "1.4.3", new Dictionary<string, string> { ["class"] = "message-input" }, new VNode[]
                {
                    new VElement("input", "1.4.3.1", new Dictionary<string, string> { ["type"] = "text", ["value"] = $"{inputText}", ["placeholder"] = "Type a message...", ["onchange"] = "Handle15", ["onkeypress"] = "Handle17" }),
                    new VElement("button", "1.4.3.2", new Dictionary<string, string> { ["onclick"] = "handleSendMessage" }, "Send")
                })
            })
        });
    }

    public void handleSendMessage()
    {
        if (!inputText.Trim()) {
    return;
}
        var message = new { id = DateTimeOffset.Now.ToUnixTimeMilliseconds().toString(), user = "CurrentUser", text = inputText, timestamp = DateTimeOffset.Now.ToUnixTimeMilliseconds() };
        publishMessage(message);
        SetState(nameof(inputText), "");
    }

    public void handleNotify(dynamic type)
    {
        publishNotification(new { type = type, message = $"This is a {type} notification at {DateTime.Now.ToString("t")}" });
    }

    public void handleStatusChange(dynamic status)
    {
        publishUserStatus(new { userId = "currentUser", status = status });
    }

    public void Handle3()
    {
        handleNotify("info");
    }

    public void Handle5()
    {
        handleNotify("warning");
    }

    public void Handle7()
    {
        handleNotify("error");
    }

    public void Handle9()
    {
        handleStatusChange("online");
    }

    public void Handle11()
    {
        handleStatusChange("away");
    }

    public void Handle13()
    {
        handleStatusChange("offline");
    }

    public void Handle15(dynamic value)
    {
        SetState(nameof(inputText), value);
    }

    public void Handle17(dynamic e)
    {
        MinimactHelpers.ToBool(e.key == "Enter") && MinimactHelpers.ToBool(handleSendMessage());
    }

    /// <summary>
    /// Returns JavaScript event handlers for client-side execution
    /// These execute in the browser with bound hook context
    /// </summary>
    protected override Dictionary<string, string> GetClientHandlers()
    {
        return new Dictionary<string, string>
        {
            ["Handle3"] = @"function () {\n  handleNotify('info');\n}",
            ["Handle5"] = @"function () {\n  handleNotify('warning');\n}",
            ["Handle7"] = @"function () {\n  handleNotify('error');\n}",
            ["Handle9"] = @"function () {\n  handleStatusChange('online');\n}",
            ["Handle11"] = @"function () {\n  handleStatusChange('away');\n}",
            ["Handle13"] = @"function () {\n  handleStatusChange('offline');\n}",
            ["Handle15"] = @"function (value) {\n  setInputText(value);\n}",
            ["Handle17"] = @"function (e) {\n  e.key === 'Enter' && handleSendMessage();\n}"
        };
    }

    // Publish to publishMessage_channel
    private void publishMessage(dynamic value, PubSubOptions? options = null)
    {
        EventAggregator.Instance.Publish(publishMessage_channel, value, options);
    }

    // Publish to publishNotification_channel
    private void publishNotification(dynamic value, PubSubOptions? options = null)
    {
        EventAggregator.Instance.Publish(publishNotification_channel, value, options);
    }

    // Publish to publishUserStatus_channel
    private void publishUserStatus(dynamic value, PubSubOptions? options = null)
    {
        EventAggregator.Instance.Publish(publishUserStatus_channel, value, options);
    }
}
