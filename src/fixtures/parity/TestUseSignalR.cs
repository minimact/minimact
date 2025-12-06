using Minimact.AspNetCore.Core;
using Minimact.AspNetCore.Extensions;
using MinimactHelpers = Minimact.AspNetCore.Core.Minimact;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Minimact.Components;

[LoopTemplate("messages", @"{""stateKey"":""messages"",""arrayBinding"":""messages"",""itemVar"":""msg"",""indexVar"":""index"",""keyBinding"":null,""itemTemplate"":{""type"":""Element"",""tag"":""div"",""propsTemplates"":null,""childrenTemplates"":[{""type"":""Element"",""tag"":""span"",""propsTemplates"":{""className"":{""template"":""user"",""bindings"":[],""slots"":[],""type"":""static""}},""childrenTemplates"":[{""type"":""Text"",""template"":""{0}"",""bindings"":[""item.user""],""slots"":[0]}]},{""type"":""Element"",""tag"":""span"",""propsTemplates"":{""className"":{""template"":""text"",""bindings"":[],""slots"":[],""type"":""static""}},""childrenTemplates"":[{""type"":""Text"",""template"":""{0}"",""bindings"":[""item.text""],""slots"":[0]}]},{""type"":""Element"",""tag"":""span"",""propsTemplates"":{""className"":{""template"":""time"",""bindings"":[],""slots"":[],""type"":""static""}},""childrenTemplates"":[{""type"":""Text"",""template"":""{0}"",""bindings"":[""__expr__:toLocaleTimeString""],""slots"":[0]}]}]}}")]
[LoopTemplate("Array", @"{""stateKey"":""Array"",""arrayBinding"":""Array"",""itemVar"":""stock"",""indexVar"":null,""keyBinding"":null,""itemTemplate"":{""type"":""Element"",""tag"":""div"",""propsTemplates"":{""className"":{""template"":""stock-item"",""bindings"":[],""slots"":[],""type"":""static""}},""childrenTemplates"":[{""type"":""Element"",""tag"":""span"",""propsTemplates"":{""className"":{""template"":""symbol"",""bindings"":[],""slots"":[],""type"":""static""}},""childrenTemplates"":[{""type"":""Text"",""template"":""{0}"",""bindings"":[""item.symbol""],""slots"":[0]}]},{""type"":""Element"",""tag"":""span"",""propsTemplates"":{""className"":{""template"":""price"",""bindings"":[],""slots"":[],""type"":""static""}},""childrenTemplates"":[{""type"":""Text"",""template"":""$"",""bindings"":[],""slots"":[]},{""type"":""Text"",""template"":""{0}"",""bindings"":[""__expr__:item.price.toFixed""],""slots"":[0]}]},{""type"":""Element"",""tag"":""span"",""propsTemplates"":null,""childrenTemplates"":[{""type"":""conditional"",""template"":""{0}"",""bindings"":[""__expr__:item.change""],""slots"":[0],""conditionalTemplates"":{""true"":""+"",""false"":""""},""conditionalBindingIndex"":0},{""type"":""Text"",""template"":""{0}"",""bindings"":[""__expr__:item.change.toFixed""],""slots"":[0]},{""type"":""Text"",""template"":""%"",""bindings"":[],""slots"":[]}]},{""type"":""Element"",""tag"":""button"",""propsTemplates"":null,""childrenTemplates"":[{""type"":""Text"",""template"":""Remove"",""bindings"":[],""slots"":[]}]}]}}")]
[Component]
public partial class TestUseSignalR : MinimactComponent
{
    [State]
    private List<dynamic> messages = new List<dynamic> {  };

    [State]
    private dynamic stockPrices = new Map();

    [State]
    private string connectionStatus = "disconnected";

    [State]
    private string inputMessage = "";

    [State]
    private string currentUser = "User1";

    // useSignalR: chatHub
    private string chatHub_hubUrl = "/hubs/chat";
    private bool chatHub_connected = false;
    private string chatHub_connectionId = null;
    private string chatHub_error = null;

    // useSignalR: stockHub
    private string stockHub_hubUrl = "/hubs/stocks";
    private bool stockHub_connected = false;
    private string stockHub_connectionId = null;
    private string stockHub_error = null;

    protected override VNode Render()
    {
        StateManager.SyncMembersToState(this);

        return new VElement("div", "1", new Dictionary<string, string> { ["class"] = "signalr-test" }, new VNode[]
        {
            new VElement("h2", "1.1", new Dictionary<string, string>(), "SignalR Test"),
            new VElement("div", "1.2", new Dictionary<string, string> { ["class"] = $"{$"connection-status {connectionStatus}"}" }, $"Status:{(connectionStatus)}"),
            new VElement("section", "1.3", new Dictionary<string, string> { ["class"] = "chat-section" }, new VNode[]
            {
                new VElement("h3", "1.3.1", new Dictionary<string, string>(), "Chat Hub"),
                new VElement("div", "1.3.2", new Dictionary<string, string> { ["class"] = "user-controls" }, new VNode[]
                {
                    new VElement("input", "1.3.2.1", new Dictionary<string, string> { ["type"] = "text", ["value"] = $"{currentUser}", ["placeholder"] = "Your name", ["onchange"] = "Handle5" }),
                    new VElement("button", "1.3.2.2", new Dictionary<string, string> { ["onclick"] = "handleJoinChat" }, "Join"),
                    new VElement("button", "1.3.2.3", new Dictionary<string, string> { ["onclick"] = "handleLeaveChat" }, "Leave")
                }),
                MinimactHelpers.createElement("div", new { className = "message-list" }, messages.Select((msg, index) => new VElement("div", "1.3.3.1.1", new Dictionary<string, string> { ["class"] = $"{$"message {((msg.user == "System") ? "system" : "")}"}" }, new VNode[]
                    {
                        new VElement("span", "1.3.3.1.1.1", new Dictionary<string, string> { ["class"] = "user" }, new VNode[]
                        {
                            new VText($"{(msg.user)}", "1.3.3.1.1.1.1")
                        }),
                        new VElement("span", "1.3.3.1.1.2", new Dictionary<string, string> { ["class"] = "text" }, new VNode[]
                        {
                            new VText($"{(msg.text)}", "1.3.3.1.1.2.1")
                        }),
                        new VElement("span", "1.3.3.1.1.3", new Dictionary<string, string> { ["class"] = "time" }, new VNode[]
                        {
                            new VText($"{(DateTime.Parse(msg.timestamp).ToString("t"))}", "1.3.3.1.1.3.1")
                        })
                    })).ToArray()),
                new VElement("div", "1.3.4", new Dictionary<string, string> { ["class"] = "message-input" }, new VNode[]
                {
                    new VElement("input", "1.3.4.1", new Dictionary<string, string> { ["type"] = "text", ["value"] = $"{inputMessage}", ["placeholder"] = "Type a message...", ["onchange"] = "Handle7", ["onkeypress"] = "Handle9" }),
                    new VElement("button", "1.3.4.2", new Dictionary<string, string> { ["onclick"] = "handleSendMessage" }, "Send")
                })
            }),
            new VElement("section", "1.4", new Dictionary<string, string> { ["class"] = "stocks-section" }, new VNode[]
            {
                new VElement("h3", "1.4.1", new Dictionary<string, string>(), "Stock Ticker Hub"),
                new VElement("div", "1.4.2", new Dictionary<string, string> { ["class"] = "subscribe-controls" }, new VNode[]
                {
                    new VElement("button", "1.4.2.1", new Dictionary<string, string> { ["onclick"] = "Handle11" }, "+ AAPL"),
                    new VElement("button", "1.4.2.2", new Dictionary<string, string> { ["onclick"] = "Handle13" }, "+ GOOGL"),
                    new VElement("button", "1.4.2.3", new Dictionary<string, string> { ["onclick"] = "Handle15" }, "+ MSFT"),
                    new VElement("button", "1.4.2.4", new Dictionary<string, string> { ["onclick"] = "Handle17" }, "+ AMZN")
                }),
                MinimactHelpers.createElement("div", new { className = "stock-list" }, Array.from(stockPrices.values()).Select(stock => new VElement("div", "1.4.3.1.1", new Dictionary<string, string> { ["class"] = "stock-item" }, new VNode[]
                    {
                        new VElement("span", "1.4.3.1.1.1", new Dictionary<string, string> { ["class"] = "symbol" }, new VNode[]
                        {
                            new VText($"{(stock.symbol)}", "1.4.3.1.1.1.1")
                        }),
                        new VElement("span", "1.4.3.1.1.2", new Dictionary<string, string> { ["class"] = "price" }, $"${(stock.price.ToString("F2"))}"),
                        new VElement("span", "1.4.3.1.1.3", new Dictionary<string, string> { ["class"] = $"{$"change {((stock.change >= 0) ? "up" : "down")}"}" }, $"{((stock.change >= 0) ? "+" : "")}{(stock.change.ToString("F2"))}%"),
                        new VElement("button", "1.4.3.1.1.4", new Dictionary<string, string> { ["onclick"] = "Handle19:{stock}" }, "Remove")
                    })).ToArray())
            })
        });
    }

    public void handleSendMessage()
    {
        if (!inputMessage.Trim()) {
    return;
}
        try {
    await chatHub.invoke("SendMessage", currentUser, inputMessage);
    SetState(nameof(inputMessage), "");
} catch (Exception error) {
    console.error("Failed to send message:", error);
}
    }

    public void handleJoinChat()
    {
        try {
    await chatHub.invoke("JoinChat", currentUser);
} catch (Exception error) {
    console.error("Failed to join chat:", error);
}
    }

    public void handleLeaveChat()
    {
        try {
    await chatHub.invoke("LeaveChat", currentUser);
} catch (Exception error) {
    console.error("Failed to leave chat:", error);
}
    }

    public void handleSubscribeStock(dynamic symbol)
    {
        try {
    await stockHub.invoke("SubscribeToStock", symbol);
} catch (Exception error) {
    console.error("Failed to subscribe:", error);
}
    }

    public void handleUnsubscribeStock(dynamic symbol)
    {
        try {
    await stockHub.invoke("UnsubscribeFromStock", symbol);
    SetState(nameof(stockPrices), prev => { var updated = new Map(prev); updated.delete(symbol); return updated; });
} catch (Exception error) {
    console.error("Failed to unsubscribe:", error);
}
    }

    public void Handle5(dynamic value)
    {
        SetState(nameof(currentUser), value);
    }

    public void Handle7(dynamic value)
    {
        SetState(nameof(inputMessage), value);
    }

    public void Handle9(dynamic e)
    {
        MinimactHelpers.ToBool(e.key == "Enter") && MinimactHelpers.ToBool(handleSendMessage());
    }

    public void Handle11()
    {
        handleSubscribeStock("AAPL");
    }

    public void Handle13()
    {
        handleSubscribeStock("GOOGL");
    }

    public void Handle15()
    {
        handleSubscribeStock("MSFT");
    }

    public void Handle17()
    {
        handleSubscribeStock("AMZN");
    }

    public void Handle19(dynamic stock)
    {
        handleUnsubscribeStock(stock.symbol);
    }

    /// <summary>
    /// Returns JavaScript event handlers for client-side execution
    /// These execute in the browser with bound hook context
    /// </summary>
    protected override Dictionary<string, string> GetClientHandlers()
    {
        return new Dictionary<string, string>
        {
            ["Handle5"] = @"function (value) {\n  setCurrentUser(value);\n}",
            ["Handle7"] = @"function (value) {\n  setInputMessage(value);\n}",
            ["Handle9"] = @"function (e) {\n  e.key === 'Enter' && handleSendMessage();\n}",
            ["Handle11"] = @"function () {\n  handleSubscribeStock('AAPL');\n}",
            ["Handle13"] = @"function () {\n  handleSubscribeStock('GOOGL');\n}",
            ["Handle15"] = @"function () {\n  handleSubscribeStock('MSFT');\n}",
            ["Handle17"] = @"function () {\n  handleSubscribeStock('AMZN');\n}",
            ["Handle19"] = @"function () {\n  handleUnsubscribeStock(stock.symbol);\n}"
        };
    }

    // SignalR send method for chatHub
    // Note: useSignalR is primarily client-side.
    // Server-side SignalR invocation can use HubContext directly if needed.
    private async Task chatHub_send(string methodName, params object[] args)
    {
        if (HubContext != null && ConnectionId != null)
        {
            // Send message to specific client connection
            await HubContext.Clients.Client(ConnectionId).SendAsync(methodName, args);
        }
    }

    // SignalR send method for stockHub
    // Note: useSignalR is primarily client-side.
    // Server-side SignalR invocation can use HubContext directly if needed.
    private async Task stockHub_send(string methodName, params object[] args)
    {
        if (HubContext != null && ConnectionId != null)
        {
            // Send message to specific client connection
            await HubContext.Clients.Client(ConnectionId).SendAsync(methodName, args);
        }
    }
}
