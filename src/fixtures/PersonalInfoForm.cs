using Minimact.AspNetCore.Core;
using Minimact.AspNetCore.Extensions;
using MinimactHelpers = Minimact.AspNetCore.Core.Minimact;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Minimact.Components;

[Component]
public partial class PersonalInfoForm : MinimactComponent
{
    // Client-computed properties (external libraries)
    [ClientComputed("isValid")]
    private dynamic isValid => GetClientState<dynamic>("isValid", default);

    [ClientComputed("data")]
    private dynamic data => GetClientState<dynamic>("data", default);

    [ClientComputed("validate")]
    private dynamic validate => GetClientState<dynamic>("validate", default);

    protected override VNode Render()
    {
        StateManager.SyncMembersToState(this);

        return MinimactHelpers.createElement("div", new { className = $"form-section {((isValid) ? "valid" : "invalid")}" }, new VElement("h2", "1.1", new Dictionary<string, string>(), "Personal Information"), MinimactHelpers.createElement("input", new { id = "name-input", type = "text", placeholder = "Name", value = (data.name) ?? ("") }), MinimactHelpers.createElement("input", new { id = "email-input", type = "email", placeholder = "Email", value = (data.email) ?? ("") }), MinimactHelpers.createElement("input", new { id = "phone-input", type = "tel", placeholder = "Phone", value = (data.phone) ?? ("") }), (new MObject(isValid)) ? new VElement("span", "1.5.1", new Dictionary<string, string> { ["class"] = "check-mark" }, "✓") : new VNull("1.5"));
    }
}

[Component]
public partial class AddressForm : MinimactComponent
{
    // Client-computed properties (external libraries)
    [ClientComputed("isValid")]
    private dynamic isValid => GetClientState<dynamic>("isValid", default);

    [ClientComputed("data")]
    private dynamic data => GetClientState<dynamic>("data", default);

    [ClientComputed("validate")]
    private dynamic validate => GetClientState<dynamic>("validate", default);

    protected override VNode Render()
    {
        StateManager.SyncMembersToState(this);

        return MinimactHelpers.createElement("div", new { className = $"form-section {((isValid) ? "valid" : "invalid")}" }, new VElement("h2", "1.1", new Dictionary<string, string>(), "Address"), MinimactHelpers.createElement("input", new { id = "street-input", type = "text", placeholder = "Street", value = (data.street) ?? ("") }), MinimactHelpers.createElement("input", new { id = "city-input", type = "text", placeholder = "City", value = (data.city) ?? ("") }), MinimactHelpers.createElement("input", new { id = "zip-input", type = "text", placeholder = "ZIP Code", value = (data.zip) ?? ("") }), (new MObject(isValid)) ? new VElement("span", "1.5.1", new Dictionary<string, string> { ["class"] = "check-mark" }, "✓") : new VNull("1.5"));
    }
}

[Component]
public partial class PaymentForm : MinimactComponent
{
    // Client-computed properties (external libraries)
    [ClientComputed("isValid")]
    private dynamic isValid => GetClientState<dynamic>("isValid", default);

    [ClientComputed("data")]
    private dynamic data => GetClientState<dynamic>("data", default);

    [ClientComputed("validate")]
    private dynamic validate => GetClientState<dynamic>("validate", default);

    protected override VNode Render()
    {
        StateManager.SyncMembersToState(this);

        return MinimactHelpers.createElement("div", new { className = $"form-section {((isValid) ? "valid" : "invalid")}" }, new VElement("h2", "1.1", new Dictionary<string, string>(), "Payment"), MinimactHelpers.createElement("input", new { id = "card-input", type = "text", placeholder = "Card Number", value = (data.cardNumber) ?? ("") }), MinimactHelpers.createElement("input", new { id = "cvv-input", type = "text", placeholder = "CVV", value = (data.cvv) ?? ("") }), MinimactHelpers.createElement("input", new { id = "expiry-input", type = "text", placeholder = "Expiry (MM/YY)", value = (data.expiry) ?? ("") }), (new MObject(isValid)) ? new VElement("span", "1.5.1", new Dictionary<string, string> { ["class"] = "check-mark" }, "✓") : new VNull("1.5"));
    }
}

[Component]
public partial class RegistrationPage : MinimactComponent
{
    // Client-computed properties (external libraries)
    [ClientComputed("personalValid")]
    private dynamic personalValid => GetClientState<dynamic>("personalValid", default);

    [ClientComputed("addressValid")]
    private dynamic addressValid => GetClientState<dynamic>("addressValid", default);

    [ClientComputed("paymentValid")]
    private dynamic paymentValid => GetClientState<dynamic>("paymentValid", default);

    // Computed properties (accessed by event handlers)
    private dynamic allValid => MinimactHelpers.ToBool(MinimactHelpers.ToBool(personalValid) && MinimactHelpers.ToBool(addressValid)) && MinimactHelpers.ToBool(paymentValid);

    protected override VNode Render()
    {
        StateManager.SyncMembersToState(this);

        var invalidSections = new List<object> { MinimactHelpers.ToBool(!personalValid) && MinimactHelpers.ToBool("Personal Info"), MinimactHelpers.ToBool(!addressValid) && MinimactHelpers.ToBool("Address"), MinimactHelpers.ToBool(!paymentValid) && MinimactHelpers.ToBool("Payment") }.Where(x => x != null).ToList();

        return MinimactHelpers.createElement("div", new { id = "registration-root" }, new VElement("h1", "1.1", new Dictionary<string, string>(), "Registration"), (!allValid) ? new VElement("div", "1.2.1", new Dictionary<string, string> { ["id"] = "validation-summary", ["class"] = "validation-summary error" }, new VNode[]
            {
                new VElement("strong", "1.2.1.1", new Dictionary<string, string>(), "Please complete the following sections:"),
                MinimactHelpers.createElement("ul", null, invalidSections.Select(section => new VElement("li", "1.2.1.2.1.1", new Dictionary<string, string>(), new VNode[]
                    {
                        new VText($"{(section)}", "1.2.1.2.1.1.1")
                    })).ToArray())
            }) : new VNull("1.2"), new VComponentWrapper
{
    ComponentName = "PersonalInfoForm",
    ComponentType = "PersonalInfoForm",
    HexPath = "1.3",
    InitialState = new Dictionary<string, object> { ["isValid"] = false, ["data"] = null },

    ParentComponent = this
}, new VComponentWrapper
{
    ComponentName = "AddressForm",
    ComponentType = "AddressForm",
    HexPath = "1.4",
    InitialState = new Dictionary<string, object> { ["isValid"] = false, ["data"] = null },

    ParentComponent = this
}, new VComponentWrapper
{
    ComponentName = "PaymentForm",
    ComponentType = "PaymentForm",
    HexPath = "1.5",
    InitialState = new Dictionary<string, object> { ["isValid"] = false, ["data"] = null },

    ParentComponent = this
}, MinimactHelpers.createElement("button", new { id = "submit-btn", type = "button", onClick = "handleSubmit", disabled = !allValid, className = (allValid) ? "btn-primary" : "btn-disabled" }, "Complete Registration"), new VElement("div", "1.7", new Dictionary<string, string> { ["id"] = "status", ["class"] = "status" }, new VNode[]
            {
                new VElement("p", "1.7.1", new Dictionary<string, string>(), new VNode[]
                {
                    new VText("Personal Valid:", "1.7.1.1"),
                    new VElement("span", "1.7.1.2", new Dictionary<string, string> { ["id"] = "personal-valid" }, new VNode[]
                    {
                        new VText($"{((new MObject(personalValid)) ? "Yes" : "No")}", "1.7.1.2.1")
                    })
                }),
                new VElement("p", "1.7.2", new Dictionary<string, string>(), new VNode[]
                {
                    new VText("Address Valid:", "1.7.2.1"),
                    new VElement("span", "1.7.2.2", new Dictionary<string, string> { ["id"] = "address-valid" }, new VNode[]
                    {
                        new VText($"{((new MObject(addressValid)) ? "Yes" : "No")}", "1.7.2.2.1")
                    })
                }),
                new VElement("p", "1.7.3", new Dictionary<string, string>(), new VNode[]
                {
                    new VText("Payment Valid:", "1.7.3.1"),
                    new VElement("span", "1.7.3.2", new Dictionary<string, string> { ["id"] = "payment-valid" }, new VNode[]
                    {
                        new VText($"{((new MObject(paymentValid)) ? "Yes" : "No")}", "1.7.3.2.1")
                    })
                }),
                new VElement("p", "1.7.4", new Dictionary<string, string>(), new VNode[]
                {
                    new VText("All Valid:", "1.7.4.1"),
                    new VElement("span", "1.7.4.2", new Dictionary<string, string> { ["id"] = "all-valid" }, new VNode[]
                    {
                        new VText($"{((new MObject(allValid)) ? "Yes" : "No")}", "1.7.4.2.1")
                    })
                })
            }));
    }

    public void handleSubmit()
    {
        if (MinimactHelpers.ToBool(allValid)) {
    var data = new { personal = GetState<dynamic>("PersonalInfoForm.data"), address = GetState<dynamic>("AddressForm.data"), payment = GetState<dynamic>("PaymentForm.data") };
    Console.WriteLine("Submitting registration:" + data);
    Console.WriteLine("Registration submitted successfully!");
}
    }
}
