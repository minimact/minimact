using Minimact.AspNetCore.Core;
using Minimact.AspNetCore.Extensions;
using MinimactHelpers = Minimact.AspNetCore.Core.Minimact;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Minimact.Components;

[Component]
public partial class ChatHeader : MinimactComponent
{
    // Client-computed properties (external libraries)
    [ClientComputed("unreadCount")]
    private dynamic unreadCount => GetClientState<dynamic>("unreadCount", default);

    protected override VNode Render()
    {
        StateManager.SyncMembersToState(this);

        return MinimactHelpers.createElement("div", new { className = "chat-header" }, new VElement("h2", "1.1", new Dictionary<string, string>(), "Chat Room"), (unreadCount > 0) ? new VElement("span", "1.2.1", new Dictionary<string, string> { ["id"] = "unread-badge", ["class"] = "unread-badge" }, new VNode[]
            {
                new VText($"{(unreadCount)}", "1.2.1.1")
            }) : new VNull("1.2"));
    }
}

[LoopTemplate("messages", @"{""stateKey"":""messages"",""arrayBinding"":""messages"",""itemVar"":""msg"",""indexVar"":null,""keyBinding"":null,""itemTemplate"":{""type"":""Element"",""tag"":""div"",""propsTemplates"":{""className"":{""template"":""message"",""bindings"":[],""slots"":[],""type"":""static""},""data-message-id"":{""template"":""{0}"",""bindings"":[""item.id""],""slots"":[0],""type"":""binding""}},""childrenTemplates"":[{""type"":""Element"",""tag"":""strong"",""propsTemplates"":null,""childrenTemplates"":[{""type"":""Text"",""template"":""{0}"",""bindings"":[""item.author""],""slots"":[0]},{""type"":""Text"",""template"":"":"",""bindings"":[],""slots"":[]}]},{""type"":""Text"",""template"":""{0}"",""bindings"":[""item.text""],""slots"":[0]},{""type"":""Element"",""tag"":""span"",""propsTemplates"":{""className"":{""template"":""timestamp"",""bindings"":[],""slots"":[],""type"":""static""}},""childrenTemplates"":[{""type"":""Text"",""template"":""{0}"",""bindings"":[""item.timestamp""],""slots"":[0]}]}]}}")]
[Component]
public partial class MessageList : MinimactComponent
{
    // Client-computed properties (external libraries)
    [ClientComputed("messages")]
    private List<dynamic> messages => GetClientState<List<dynamic>>("messages", default);

    protected override VNode Render()
    {
        StateManager.SyncMembersToState(this);

        return new VElement("div", "1", new Dictionary<string, string> { ["class"] = "message-list" }, new VNode[]
        {
            new VElement("h3", "1.1", new Dictionary<string, string>(), $"Messages ({(messages.Count)})"),
            MinimactHelpers.createElement("div", new { id = "messages-container" }, (messages.Count == 0) ? new VElement("p", "1.2.1.1", new Dictionary<string, string> { ["id"] = "no-messages" }, "No messages yet. Start the conversation!") : messages.Select(msg => new VElement("div", "", new Dictionary<string, string> { ["class"] = "message", ["data-message-id"] = $"{msg.id}" }, new VNode[]
{
    new VElement("strong", "", new Dictionary<string, string>(), $"{(msg.author)}:"),
    new VText($"{(msg.text)}", ""),
    new VElement("span", "", new Dictionary<string, string> { ["class"] = "timestamp" }, new VNode[]
    {
        new VText($"{(msg.timestamp)}", "")
    })
})).ToList())
        });
    }
}

[Component]
public partial class MessageInput : MinimactComponent
{
    [Prop]
    public dynamic onSend { get; set; }

    // Client-computed properties (external libraries)
    [ClientComputed("draft")]
    private dynamic draft => GetClientState<dynamic>("draft", default);

    protected override VNode Render()
    {
        StateManager.SyncMembersToState(this);

        return new VElement("div", "1", new Dictionary<string, string> { ["class"] = "message-input" }, new VNode[]
        {
            new VElement("textarea", "1.1", new Dictionary<string, string> { ["id"] = "message-textarea", ["value"] = $"{draft}", ["placeholder"] = "Type a message...", ["oninput"] = "Handle1", ["onkeypress"] = "handleKeyPress" }),
            new VElement("button", "1.2", new Dictionary<string, string> { ["id"] = "send-btn", ["type"] = "button", ["disabled"] = $"{!draft.Trim()}", ["onclick"] = "onSend" }, "Send"),
            new VElement("p", "1.3", new Dictionary<string, string>(), new VNode[]
            {
                new VText("Characters:", "1.3.1"),
                new VElement("span", "1.3.2", new Dictionary<string, string> { ["id"] = "char-count" }, new VNode[]
                {
                    new VText($"{(draft.Count)}", "1.3.2.1")
                })
            })
        });
    }

    public void handleKeyPress(dynamic e)
    {
        if ((e.key == "Enter") && (!e.shiftKey)) {
    e.preventDefault();
    onSend();
}
    }

    public void Handle1(dynamic value)
    {
        SetState("draft", value);
    }

    /// <summary>
    /// Returns JavaScript event handlers for client-side execution
    /// These execute in the browser with bound hook context
    /// </summary>
    protected override Dictionary<string, string> GetClientHandlers()
    {
        return new Dictionary<string, string>
        {
            ["Handle1"] = @"function (value) {\n  setState('draft', value);\n}"
        };
    }
}

[Component]
public partial class ChatPage : MinimactComponent
{
    // Client-computed properties (external libraries)
    [ClientComputed("draft")]
    private dynamic draft => GetClientState<dynamic>("draft", default);

    [ClientComputed("messages")]
    private List<dynamic> messages => GetClientState<List<dynamic>>("messages", default);

    [ClientComputed("handleAddBotMessage")]
    private dynamic handleAddBotMessage => GetClientState<dynamic>("handleAddBotMessage", default);

    [ClientComputed("handleClear")]
    private dynamic handleClear => GetClientState<dynamic>("handleClear", default);

    protected override VNode Render()
    {
        StateManager.SyncMembersToState(this);

        var isTyping = draft.Count > 0;

        return MinimactHelpers.createElement("div", new { id = "chat-root" }, new VComponentWrapper
{
    ComponentName = "ChatHeader",
    ComponentType = "ChatHeader",
    HexPath = "1.1",
    InitialState = new Dictionary<string, object> { ["unreadCount"] = 0 },

    ParentComponent = this
}, new VComponentWrapper
{
    ComponentName = "MessageList",
    ComponentType = "MessageList",
    HexPath = "1.2",
    InitialState = new Dictionary<string, object> { ["messages"] = new List<dynamic> {  } },

    ParentComponent = this
}, (new MObject(isTyping)) ? new VElement("div", "1.3.1", new Dictionary<string, string> { ["id"] = "typing-indicator", ["class"] = "typing-indicator" }, "You are typing...") : new VNull("1.3"), new VComponentWrapper
{
    ComponentName = "MessageInput",
    ComponentType = "MessageInput",
    HexPath = "1.4",
    InitialState = new Dictionary<string, object> { ["draft"] = "" },

    ParentComponent = this
}, new VElement("div", "1.5", new Dictionary<string, string> { ["class"] = "controls" }, new VNode[]
            {
                new VElement("button", "1.5.1", new Dictionary<string, string> { ["id"] = "add-bot-btn", ["type"] = "button", ["onclick"] = "handleAddBotMessage" }, "Add Bot Message"),
                MinimactHelpers.createElement("button", new { id = "clear-btn", type = "button", onClick = handleClear, disabled = (messages.Count == 0) && (draft == "") }, "Clear All")
            }), new VElement("div", "1.6", new Dictionary<string, string> { ["id"] = "status", ["class"] = "status" }, new VNode[]
            {
                new VElement("p", "1.6.1", new Dictionary<string, string>(), new VNode[]
                {
                    new VText("Message Count:", "1.6.1.1"),
                    new VElement("span", "1.6.1.2", new Dictionary<string, string> { ["id"] = "message-count" }, new VNode[]
                    {
                        new VText($"{(messages.Count)}", "1.6.1.2.1")
                    })
                }),
                new VElement("p", "1.6.2", new Dictionary<string, string>(), new VNode[]
                {
                    new VText("Draft Length:", "1.6.2.1"),
                    new VElement("span", "1.6.2.2", new Dictionary<string, string> { ["id"] = "draft-length" }, new VNode[]
                    {
                        new VText($"{(draft.Count)}", "1.6.2.2.1")
                    })
                }),
                new VElement("p", "1.6.3", new Dictionary<string, string>(), new VNode[]
                {
                    new VText("Is Typing:", "1.6.3.1"),
                    new VElement("span", "1.6.3.2", new Dictionary<string, string> { ["id"] = "is-typing" }, new VNode[]
                    {
                        new VText($"{((new MObject(isTyping)) ? "Yes" : "No")}", "1.6.3.2.1")
                    })
                }),
                new VElement("p", "1.6.4", new Dictionary<string, string>(), new VNode[]
                {
                    new VText("Unread:", "1.6.4.1"),
                    new VElement("span", "1.6.4.2", new Dictionary<string, string> { ["id"] = "unread-count" }, new VNode[]
                    {
                        new VText($"{((GetState<dynamic>("ChatHeader.unreadCount")) ?? (0))}", "1.6.4.2.1")
                    })
                })
            }));
    }

    public void handleSend()
    {
        if (MinimactHelpers.ToBool(draft.Trim())) {
    var newMessage = new { id = DateTimeOffset.Now.ToUnixTimeMilliseconds(), text = draft, author = "Me", timestamp = DateTime.Now.ToString("t") };
    SetState("MessageList.messages", messages.Concat(new[] { newMessage }).ToList());
    SetState("MessageInput.draft", "");
    SetState("ChatHeader.unreadCount", 0);
}
    }
}
