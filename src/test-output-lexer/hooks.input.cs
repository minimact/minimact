using Minimact.AspNetCore.Core;
using Minimact.AspNetCore.Extensions;
using MinimactHelpers = Minimact.AspNetCore.Core.Minimact;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System.Net.Http;

namespace Minimact.Components;

[Publisher("notifications")]
[ProtectedState("secret")]
[Component]
public partial class HooksExample : MinimactComponent
{
    [State]
    private int count = 0;

    [State]
    private string name = "";

    [State]
    private List<dynamic> items = new List<object>();

    [State]
    private double price = 19.99;

    [State]
    private string secret = "hidden";

    private readonly HttpClient _httpClient;

    // MVC State property: userName
    private string userName => GetState<string>("userName");

    // MVC State property: userEmail
    private string userEmail => GetState<string>("userEmail");

    protected override VNode Render()
    {
        StateManager.SyncMembersToState(this);

        // MVC State - read from State dictionary
        var userName = GetState<string>("userName");
        var userEmail = GetState<string>("userEmail");

        var inputRef = useRef(null);
        var formRef = useRef(null);
        var emailValidation = useValidation('email', {required:true, pattern:/^[^@] +@[^@] + $ /, minLength:5, maxLength:100});
        var confirmModal = useModal();
        var unitsDropdown = useDropdown(Routes.Api.Units.GetAll);
        var publish = usePub('notifications');

        return new VElement("div", "1", new Dictionary<string, string>(), new VNode[]
        {
            new VElement("input", "1.1", new Dictionary<string, string> { ["ref"] = $"{(inputRef)}", ["value"] = $"{(name)}", ["oninput"] = "Handle0" }),
            new VElement("p", "1.2", new Dictionary<string, string>(), new VNode[]
            {
                new VText($"{(count)}", "1.2.1")
            }),
            new VElement("button", "1.3", new Dictionary<string, string> { ["onclick"] = "Handle1" }, "Increment"),
            new VElement("button", "1.4", new Dictionary<string, string> { ["onclick"] = "toggleOpen" }, "Toggle"),
            (isOpen) ? new VElement("div", "1.5.1", new Dictionary<string, string>(), "Open content") : new VNull("1.5")
        });
    }

    public void Handle0(dynamic e)
    {
        SetState(nameof(name), e.target.value);
    }

    public void Handle1()
    {
        SetState(nameof(count), count + 1);
    }

    [ServerTask("streamData", Streaming = true)]
    private async IAsyncEnumerable<object> streamData(string query, [System.Runtime.CompilerServices.EnumeratorCancellation] CancellationToken cancellationToken = default)
    {
        yield return"Starting...";yield return"Processing...";yield return"Done!";
    }

    /// <summary>
    /// Returns JavaScript event handlers for client-side execution
    /// These execute in the browser with bound hook context
    /// </summary>
    protected override Dictionary<string, string> GetClientHandlers()
    {
        return new Dictionary<string, string>
        {
            ["Handle0"] = @"function () {\n  SetState(nameof(name), e.target.value);\n}",
            ["Handle1"] = @"function () {\n  SetState(nameof(count), count + 1);\n}"
        };
    }

    // State setters
    private void setCount(int value)
    {
        count = value;
        SetState(nameof(count), value);
    }

    private void setName(string value)
    {
        name = value;
        SetState(nameof(name), value);
    }

    private void setItems(List<dynamic> value)
    {
        items = value;
        SetState(nameof(items), value);
    }

    private void setPrice(double value)
    {
        price = value;
        SetState(nameof(price), value);
    }

    private void setSecret(string value)
    {
        secret = value;
        SetState(nameof(secret), value);
    }


    private void setUserName(string value)
    {
        SetState("userName", value);
    }
}
