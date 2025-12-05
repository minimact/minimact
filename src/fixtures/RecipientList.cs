using Minimact.AspNetCore.Core;
using Minimact.AspNetCore.Extensions;
using MinimactHelpers = Minimact.AspNetCore.Core.Minimact;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Minimact.Components;

[LoopTemplate("recipients", @"{""stateKey"":""recipients"",""arrayBinding"":""recipients"",""itemVar"":""email"",""indexVar"":""idx"",""keyBinding"":null,""itemTemplate"":{""type"":""Element"",""tag"":""div"",""propsTemplates"":{""className"":{""template"":""recipient-chip"",""bindings"":[],""slots"":[],""type"":""static""},""data-recipient-index"":{""template"":""{0}"",""bindings"":[""index""],""slots"":[0],""type"":""binding""}},""childrenTemplates"":[{""type"":""Element"",""tag"":""button"",""propsTemplates"":{""type"":{""template"":""button"",""bindings"":[],""slots"":[],""type"":""static""},""className"":{""template"":""remove-recipient-btn"",""bindings"":[],""slots"":[],""type"":""static""}},""childrenTemplates"":[{""type"":""Text"",""template"":""×"",""bindings"":[],""slots"":[]}]}]}}")]
[Component]
public partial class RecipientList : MinimactComponent
{
    // Client-computed properties (external libraries)
    [ClientComputed("recipients")]
    private List<dynamic> recipients => GetClientState<List<dynamic>>("recipients", default);

    [ClientComputed("handleRemove")]
    private dynamic handleRemove => GetClientState<dynamic>("handleRemove", default);

    protected override VNode Render()
    {
        StateManager.SyncMembersToState(this);

        return new VElement("div", "1", new Dictionary<string, string> { ["class"] = "recipient-list" }, new VNode[]
        {
            new VElement("h3", "1.1", new Dictionary<string, string>(), "To:"),
            MinimactHelpers.createElement("div", new { id = "recipients" }, recipients.Select((email, idx) => new VElement("div", "1.2.1.1", new Dictionary<string, string> { ["class"] = "recipient-chip", ["data-recipient-index"] = $"{idx}" }, new VNode[]
                {
                    new VText($"{(email)}", "1.2.1.1.1"),
                    new VElement("button", "1.2.1.1.2", new Dictionary<string, string> { ["type"] = "button", ["class"] = "remove-recipient-btn", ["onclick"] = "Handle1:{email}:{idx}" }, "×")
                })).ToArray()),
            new VElement("button", "1.3", new Dictionary<string, string> { ["id"] = "add-recipient-btn", ["type"] = "button", ["onclick"] = "handleAdd" }, "Add Recipient")
        });
    }

    public void handleAdd()
    {
        var email = /* prompt("Enter recipient email:") - requires UI */ (string?)null;
        if ((email) != null && (email.Contains("@"))) {
    SetState("recipients", recipients.Concat(new[] { email }).ToList());
}
    }

    public void Handle1(dynamic email, dynamic idx)
    {
        handleRemove(idx);
    }

    /// <summary>
    /// Returns JavaScript event handlers for client-side execution
    /// These execute in the browser with bound hook context
    /// </summary>
    protected override Dictionary<string, string> GetClientHandlers()
    {
        return new Dictionary<string, string>
        {
            ["Handle1"] = @"function () {\n  handleRemove(idx);\n}"
        };
    }
}

[Component]
public partial class SubjectLine : MinimactComponent
{
    // Client-computed properties (external libraries)
    [ClientComputed("text")]
    private dynamic text => GetClientState<dynamic>("text", default);

    protected override VNode Render()
    {
        StateManager.SyncMembersToState(this);

        return new VElement("div", "1", new Dictionary<string, string> { ["class"] = "subject-line" }, new VNode[]
        {
            new VElement("label", "1.1", new Dictionary<string, string> { ["htmlFor"] = "subject-input" }, "Subject:"),
            new VElement("input", "1.2", new Dictionary<string, string> { ["id"] = "subject-input", ["type"] = "text", ["value"] = $"{text}", ["placeholder"] = "Enter subject...", ["oninput"] = "Handle0" })
        });
    }

    public void Handle0(dynamic value)
    {
        SetState("text", value);
    }

    /// <summary>
    /// Returns JavaScript event handlers for client-side execution
    /// These execute in the browser with bound hook context
    /// </summary>
    protected override Dictionary<string, string> GetClientHandlers()
    {
        return new Dictionary<string, string>
        {
            ["Handle0"] = @"function (value) {\n  setState('text', value);\n}"
        };
    }
}

[Component]
public partial class MessageBody : MinimactComponent
{
    // Client-computed properties (external libraries)
    [ClientComputed("content")]
    private dynamic content => GetClientState<dynamic>("content", default);

    protected override VNode Render()
    {
        StateManager.SyncMembersToState(this);

        return new VElement("div", "1", new Dictionary<string, string> { ["class"] = "message-body" }, new VNode[]
        {
            new VElement("label", "1.1", new Dictionary<string, string> { ["htmlFor"] = "body-textarea" }, "Message:"),
            new VElement("textarea", "1.2", new Dictionary<string, string> { ["id"] = "body-textarea", ["value"] = $"{content}", ["placeholder"] = "Enter message...", ["rows"] = $"{10}", ["oninput"] = "Handle0" }),
            new VElement("p", "1.3", new Dictionary<string, string>(), new VNode[]
            {
                new VText("Characters:", "1.3.1"),
                new VElement("span", "1.3.2", new Dictionary<string, string> { ["id"] = "body-char-count" }, new VNode[]
                {
                    new VText($"{(MinimactHelpers.GetLength(content))}", "1.3.2.1")
                })
            })
        });
    }

    public void Handle0(dynamic value)
    {
        SetState("content", value);
    }

    /// <summary>
    /// Returns JavaScript event handlers for client-side execution
    /// These execute in the browser with bound hook context
    /// </summary>
    protected override Dictionary<string, string> GetClientHandlers()
    {
        return new Dictionary<string, string>
        {
            ["Handle0"] = @"function (value) {\n  setState('content', value);\n}"
        };
    }
}

[LoopTemplate("files", @"{""stateKey"":""files"",""arrayBinding"":""files"",""itemVar"":""file"",""indexVar"":""idx"",""keyBinding"":null,""itemTemplate"":{""type"":""Element"",""tag"":""li"",""propsTemplates"":{""data-file-index"":{""template"":""{0}"",""bindings"":[""index""],""slots"":[0],""type"":""binding""}},""childrenTemplates"":[{""type"":""Text"",""template"":""{0}"",""bindings"":[""item.name""],""slots"":[0]},{""type"":""Text"",""template"":""("",""bindings"":[],""slots"":[]},{""type"":""Text"",""template"":""{0}"",""bindings"":[""__expr__:formatBytes,item.size""],""slots"":[0]},{""type"":""Text"",""template"":"")"",""bindings"":[],""slots"":[]},{""type"":""Element"",""tag"":""button"",""propsTemplates"":{""type"":{""template"":""button"",""bindings"":[],""slots"":[],""type"":""static""},""className"":{""template"":""remove-file-btn"",""bindings"":[],""slots"":[],""type"":""static""}},""childrenTemplates"":[{""type"":""Text"",""template"":""Remove"",""bindings"":[],""slots"":[]}]}]}}")]
[Component]
public partial class AttachmentPanel : MinimactComponent
{
    [Prop]
    public double maxSize { get; set; }

    // Client-computed properties (external libraries)
    [ClientComputed("files")]
    private List<dynamic> files => GetClientState<List<dynamic>>("files", default);

    [ClientComputed("totalSize")]
    private double totalSize => GetClientState<double>("totalSize", default);

    [ClientComputed("handleFileRemove")]
    private dynamic handleFileRemove => GetClientState<dynamic>("handleFileRemove", default);

    protected override VNode Render()
    {
        StateManager.SyncMembersToState(this);

        return new VElement("div", "1", new Dictionary<string, string> { ["class"] = "attachment-panel" }, new VNode[]
        {
            new VElement("h3", "1.1", new Dictionary<string, string>(), new VNode[]
            {
                new VText("Attachments (", "1.1.1"),
                new VElement("span", "1.1.2", new Dictionary<string, string> { ["id"] = "attachment-size" }, new VNode[]
                {
                    new VText($"{(formatBytes(totalSize))}", "1.1.2.1")
                }),
                new VText($"/{(formatBytes(maxSize))})", "")
            }),
            new VElement("button", "1.2", new Dictionary<string, string> { ["id"] = "add-file-btn", ["type"] = "button", ["onclick"] = "handleFileAdd" }, "Add File (Simulated)"),
            MinimactHelpers.createElement("ul", new { id = "file-list" }, files.Select((file, idx) => new VElement("li", "1.3.1.1", new Dictionary<string, string> { ["data-file-index"] = $"{idx}" }, new VNode[]
                {
                    new VText($"{(file.name)}({(formatBytes(file.size))})", ""),
                    new VElement("button", "1.3.1.1.5", new Dictionary<string, string> { ["type"] = "button", ["class"] = "remove-file-btn", ["onclick"] = "Handle1:{file}:{idx}" }, "Remove")
                })).ToArray())
        });
    }

    public void handleFileAdd()
    {
        var fileSize = (int)Math.Floor(new Random().NextDouble() * 5000000) + 1000000;
        var fileName = $"file_{DateTimeOffset.Now.ToUnixTimeMilliseconds()}.pdf";
        var newFiles = files.Concat(new[] { new { name = fileName, size = fileSize } }).ToList();
        var newSize = newFiles.Aggregate(0, (sum, f) => sum + f.size);
        if (newSize <= maxSize) {
    SetState("files", newFiles);
    SetState("totalSize", newSize);
} else {
    Console.WriteLine($"File too large! Would exceed {formatBytes(maxSize)} limit.");
}
    }

    public void Handle1(dynamic file, dynamic idx)
    {
        handleFileRemove(idx);
    }

    /// <summary>
    /// Returns JavaScript event handlers for client-side execution
    /// These execute in the browser with bound hook context
    /// </summary>
    protected override Dictionary<string, string> GetClientHandlers()
    {
        return new Dictionary<string, string>
        {
            ["Handle1"] = @"function () {\n  handleFileRemove(idx);\n}"
        };
    }

    // Helper function: formatBytes
    private static dynamic formatBytes(dynamic bytes)
    {
        if (bytes == 0) {
    return "0 Bytes";
}
        var k = 1024;
        var sizes = new List<string> { "Bytes", "KB", "MB" };
        var i = (int)Math.Floor(Math.Log(bytes) / Math.Log(k));
        return (int)Math.Round(bytes / Math.Pow(k, i) * 100) / 100 + " " + sizes[i];
    }
}

[Component]
public partial class EmailComposer : MinimactComponent
{
    // Client-computed properties (external libraries)
    [ClientComputed("recipients")]
    private List<dynamic> recipients => GetClientState<List<dynamic>>("recipients", default);

    [ClientComputed("subject")]
    private string subject => GetClientState<string>("subject", default);

    [ClientComputed("body")]
    private string body => GetClientState<string>("body", default);

    [ClientComputed("attachments")]
    private List<dynamic> attachments => GetClientState<List<dynamic>>("attachments", default);

    [ClientComputed("totalSize")]
    private double totalSize => GetClientState<double>("totalSize", default);

    [ClientComputed("handleClearAttachments")]
    private dynamic handleClearAttachments => GetClientState<dynamic>("handleClearAttachments", default);

    [ClientComputed("handleReset")]
    private dynamic handleReset => GetClientState<dynamic>("handleReset", default);

    // Computed properties (accessed by event handlers)
    private dynamic MAX_ATTACHMENT_SIZE => 25 * 1024 * 1024;
    private dynamic MIN_RECIPIENTS => 1;
    private dynamic MIN_BODY_LENGTH => 10;
    private dynamic hasRecipients => MinimactHelpers.GetLength(recipients) >= MIN_RECIPIENTS;
    private dynamic hasSubject => MinimactHelpers.GetLength(subject) > 0;
    private dynamic hasBody => MinimactHelpers.GetLength(body) >= MIN_BODY_LENGTH;
    private dynamic attachmentsValid => totalSize <= MAX_ATTACHMENT_SIZE;
    private dynamic canSend => MinimactHelpers.ToBool(MinimactHelpers.ToBool(MinimactHelpers.ToBool(hasRecipients) && MinimactHelpers.ToBool(hasSubject)) && MinimactHelpers.ToBool(hasBody)) && MinimactHelpers.ToBool(attachmentsValid);

    protected override VNode Render()
    {
        StateManager.SyncMembersToState(this);

        var errors = new List<object> { MinimactHelpers.ToBool(!hasRecipients) && MinimactHelpers.ToBool("Add at least one recipient"), MinimactHelpers.ToBool(!hasSubject) && MinimactHelpers.ToBool("Enter a subject"), MinimactHelpers.ToBool(!hasBody) && MinimactHelpers.ToBool($"Message body must be at least {MIN_BODY_LENGTH} characters"), MinimactHelpers.ToBool(!attachmentsValid) && MinimactHelpers.ToBool($"Attachments too large ({formatBytes(totalSize)} / {formatBytes(MAX_ATTACHMENT_SIZE)})") }.Where(x => x != null).ToList();

        return MinimactHelpers.createElement("div", new { id = "email-composer-root", className = "email-composer" }, new VElement("h1", "1.1", new Dictionary<string, string>(), "New Message"), (MinimactHelpers.GetLength(errors) > 0) ? new VElement("div", "1.2.1", new Dictionary<string, string> { ["id"] = "error-panel", ["class"] = "error-panel" }, new VNode[]
            {
                new VElement("strong", "1.2.1.1", new Dictionary<string, string>(), "Cannot send:"),
                MinimactHelpers.createElement("ul", null, errors.Select((error, idx) => new VElement("li", "1.2.1.2.1.1", new Dictionary<string, string>(), new VNode[]
                    {
                        new VText($"{(error)}", "1.2.1.2.1.1.1")
                    })).ToArray())
            }) : new VNull("1.2"), (totalSize > MAX_ATTACHMENT_SIZE * 0.8) ? new VElement("div", "1.3.1", new Dictionary<string, string> { ["id"] = "warning-panel", ["class"] = "warning-panel" }, new VNode[]
            {
                new VText($"Approaching attachment size limit ({(formatBytes(totalSize))}/{(formatBytes(MAX_ATTACHMENT_SIZE))})", ""),
                new VElement("button", "1.3.1.6", new Dictionary<string, string> { ["id"] = "clear-attachments-btn", ["type"] = "button", ["onclick"] = "handleClearAttachments" }, "Clear Attachments")
            }) : new VNull("1.3"), new VComponentWrapper
{
    ComponentName = "RecipientList",
    ComponentType = "RecipientList",
    HexPath = "1.4",
    InitialState = new Dictionary<string, object> { ["recipients"] = new List<dynamic> {  } },

    ParentComponent = this
}, new VComponentWrapper
{
    ComponentName = "SubjectLine",
    ComponentType = "SubjectLine",
    HexPath = "1.5",
    InitialState = new Dictionary<string, object> { ["text"] = "" },

    ParentComponent = this
}, new VComponentWrapper
{
    ComponentName = "MessageBody",
    ComponentType = "MessageBody",
    HexPath = "1.6",
    InitialState = new Dictionary<string, object> { ["content"] = "" },

    ParentComponent = this
}, new VComponentWrapper
{
    ComponentName = "AttachmentPanel",
    ComponentType = "AttachmentPanel",
    HexPath = "1.7",
    InitialState = new Dictionary<string, object> { ["files"] = new List<dynamic> {  }, ["totalSize"] = 0 },

    ParentComponent = this
}, new VElement("div", "1.8", new Dictionary<string, string> { ["class"] = "send-controls" }, new VNode[]
            {
                new VElement("button", "1.8.1", new Dictionary<string, string> { ["id"] = "send-btn", ["class"] = "btn-send", ["type"] = "button", ["disabled"] = $"{!canSend}", ["onclick"] = "handleSend" }, "Send Email"),
                new VElement("button", "1.8.2", new Dictionary<string, string> { ["id"] = "reset-btn", ["type"] = "button", ["onclick"] = "handleReset" }, "Reset All"),
                new VElement("span", "1.8.3", new Dictionary<string, string> { ["id"] = "recipient-count", ["class"] = "recipient-count" }, $"To:{(MinimactHelpers.GetLength(recipients))}recipient{((MinimactHelpers.GetLength(recipients) != 1) ? "s" : "")}")
            }), new VElement("div", "1.9", new Dictionary<string, string> { ["id"] = "status", ["class"] = "status" }, new VNode[]
            {
                new VElement("p", "1.9.1", new Dictionary<string, string>(), new VNode[]
                {
                    new VText("Recipients:", "1.9.1.1"),
                    new VElement("span", "1.9.1.2", new Dictionary<string, string> { ["id"] = "status-recipients" }, new VNode[]
                    {
                        new VText($"{(MinimactHelpers.GetLength(recipients))}", "1.9.1.2.1")
                    })
                }),
                new VElement("p", "1.9.2", new Dictionary<string, string>(), new VNode[]
                {
                    new VText("Subject Length:", "1.9.2.1"),
                    new VElement("span", "1.9.2.2", new Dictionary<string, string> { ["id"] = "status-subject" }, new VNode[]
                    {
                        new VText($"{(MinimactHelpers.GetLength(subject))}", "1.9.2.2.1")
                    })
                }),
                new VElement("p", "1.9.3", new Dictionary<string, string>(), new VNode[]
                {
                    new VText("Body Length:", "1.9.3.1"),
                    new VElement("span", "1.9.3.2", new Dictionary<string, string> { ["id"] = "status-body" }, new VNode[]
                    {
                        new VText($"{(MinimactHelpers.GetLength(body))}", "1.9.3.2.1")
                    })
                }),
                new VElement("p", "1.9.4", new Dictionary<string, string>(), new VNode[]
                {
                    new VText("Attachments:", "1.9.4.1"),
                    new VElement("span", "1.9.4.2", new Dictionary<string, string> { ["id"] = "status-attachments" }, new VNode[]
                    {
                        new VText($"{(MinimactHelpers.GetLength(attachments))}", "1.9.4.2.1")
                    })
                }),
                new VElement("p", "1.9.5", new Dictionary<string, string>(), new VNode[]
                {
                    new VText("Total Size:", "1.9.5.1"),
                    new VElement("span", "1.9.5.2", new Dictionary<string, string> { ["id"] = "status-size" }, new VNode[]
                    {
                        new VText($"{(formatBytes(totalSize))}", "1.9.5.2.1")
                    })
                }),
                new VElement("p", "1.9.6", new Dictionary<string, string>(), new VNode[]
                {
                    new VText("Can Send:", "1.9.6.1"),
                    new VElement("span", "1.9.6.2", new Dictionary<string, string> { ["id"] = "status-can-send" }, new VNode[]
                    {
                        new VText($"{((new MObject(canSend)) ? "Yes" : "No")}", "1.9.6.2.1")
                    })
                })
            }));
    }

    public void handleSend()
    {
        if (MinimactHelpers.ToBool(canSend)) {
    var email = new { recipients = recipients, subject = subject, body = body, attachments = attachments };
    Console.WriteLine("Sending email:" + email);
    Console.WriteLine("Email sent successfully!");
    SetState("RecipientList.recipients", new List<dynamic> {  });
    SetState("SubjectLine.text", "");
    SetState("MessageBody.content", "");
    SetState("AttachmentPanel.files", new List<dynamic> {  });
    SetState("AttachmentPanel.totalSize", 0);
}
    }

    // Helper function: formatBytes
    private static dynamic formatBytes(dynamic bytes)
    {
        if (bytes == 0) {
    return "0 Bytes";
}
        var k = 1024;
        var sizes = new List<string> { "Bytes", "KB", "MB" };
        var i = (int)Math.Floor(Math.Log(bytes) / Math.Log(k));
        return (int)Math.Round(bytes / Math.Pow(k, i) * 100) / 100 + " " + sizes[i];
    }
}
