using Minimact.AspNetCore.Core;
using Minimact.AspNetCore.Extensions;
using MinimactHelpers = Minimact.AspNetCore.Core.Minimact;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Minimact.Components;

[Component]
public partial class TestUseValidation : MinimactComponent
{
    [State]
    private string email = "";

    [State]
    private string password = "";

    [State]
    private string confirmPassword = "";

    [State]
    private int age = 0;

    [State]
    private string username = "";

    [State]
    private string website = "";

    [Validation]
    private ValidationField emailValidation = new ValidationField
    {
        FieldKey = "emailValidation",
        Required = true,
        Pattern = @"/^[^\s@]+@[^\s@]+\.[^\s@]+$/",
        Message = "Please enter a valid email address"
    };

    [Validation]
    private ValidationField passwordValidation = new ValidationField
    {
        FieldKey = "passwordValidation",
        Required = true,
        MinLength = 8,
        MaxLength = 100,
        Pattern = @"/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/",
        Message = "Password must be 8+ chars with uppercase, lowercase, and number"
    };

    [Validation]
    private ValidationField confirmPasswordValidation = new ValidationField
    {
        FieldKey = "confirmPasswordValidation",
        Required = true,
        Message = "Passwords do not match"
    };

    [Validation]
    private ValidationField ageValidation = new ValidationField
    {
        FieldKey = "ageValidation",
        Required = true,
        Message = "Age must be between 18 and 120"
    };

    [Validation]
    private ValidationField usernameValidation = new ValidationField
    {
        FieldKey = "usernameValidation",
        Required = true,
        MinLength = 3,
        MaxLength = 20,
        Pattern = @"/^[a-zA-Z0-9_]+$/",
        Message = "Username is already taken or invalid"
    };

    [Validation]
    private ValidationField websiteValidation = new ValidationField
    {
        FieldKey = "websiteValidation",
        Pattern = @"/^https?:\/\/.+/",
        Message = "Please enter a valid URL starting with http:// or https://"
    };

    protected override VNode Render()
    {
        StateManager.SyncMembersToState(this);

        return new VElement("div", "1", new Dictionary<string, string> { ["class"] = "validation-test" }, new VNode[]
        {
            new VElement("h2", "1.1", new Dictionary<string, string>(), "Form Validation Test"),
            new VElement("form", "1.2", new Dictionary<string, string> { ["onsubmit"] = "Handle1" }, new VNode[]
            {
                MinimactHelpers.createElement("div", new { className = "field" }, new VElement("label", "1.2.1.1", new Dictionary<string, string>(), "Email *"), MinimactHelpers.createElement("input", new { type = "email", value = email, className = (emailValidation.hasError) ? "error" : "" }), (new MObject(emailValidation.hasError)) ? new VElement("span", "1.2.1.3.1", new Dictionary<string, string> { ["class"] = "error-message" }, new VNode[]
                    {
                        new VText($"{(emailValidation.Message)}", "1.2.1.3.1.1")
                    }) : new VNull("1.2.1.3")),
                MinimactHelpers.createElement("div", new { className = "field" }, new VElement("label", "1.2.2.1", new Dictionary<string, string>(), "Username *"), MinimactHelpers.createElement("input", new { type = "text", value = username, className = (usernameValidation.hasError) ? "error" : "" }), (new MObject(usernameValidation.isValidating)) ? new VElement("span", "1.2.2.3.1", new Dictionary<string, string> { ["class"] = "validating" }, "Checking availability...") : new VNull("1.2.2.3"), (new MObject(usernameValidation.hasError)) ? new VElement("span", "1.2.2.4.1", new Dictionary<string, string> { ["class"] = "error-message" }, new VNode[]
                    {
                        new VText($"{(usernameValidation.Message)}", "1.2.2.4.1.1")
                    }) : new VNull("1.2.2.4")),
                MinimactHelpers.createElement("div", new { className = "field" }, new VElement("label", "1.2.3.1", new Dictionary<string, string>(), "Password *"), MinimactHelpers.createElement("input", new { type = "password", value = password, className = (passwordValidation.hasError) ? "error" : "" }), (new MObject(passwordValidation.hasError)) ? new VElement("span", "1.2.3.3.1", new Dictionary<string, string> { ["class"] = "error-message" }, new VNode[]
                    {
                        new VText($"{(passwordValidation.Message)}", "1.2.3.3.1.1")
                    }) : new VNull("1.2.3.3")),
                MinimactHelpers.createElement("div", new { className = "field" }, new VElement("label", "1.2.4.1", new Dictionary<string, string>(), "Confirm Password *"), MinimactHelpers.createElement("input", new { type = "password", value = confirmPassword, className = (confirmPasswordValidation.hasError) ? "error" : "" }), (new MObject(confirmPasswordValidation.hasError)) ? new VElement("span", "1.2.4.3.1", new Dictionary<string, string> { ["class"] = "error-message" }, new VNode[]
                    {
                        new VText($"{(confirmPasswordValidation.Message)}", "1.2.4.3.1.1")
                    }) : new VNull("1.2.4.3")),
                MinimactHelpers.createElement("div", new { className = "field" }, new VElement("label", "1.2.5.1", new Dictionary<string, string>(), "Age *"), MinimactHelpers.createElement("input", new { type = "number", value = age, className = (ageValidation.hasError) ? "error" : "" }), (new MObject(ageValidation.hasError)) ? new VElement("span", "1.2.5.3.1", new Dictionary<string, string> { ["class"] = "error-message" }, new VNode[]
                    {
                        new VText($"{(ageValidation.Message)}", "1.2.5.3.1.1")
                    }) : new VNull("1.2.5.3")),
                MinimactHelpers.createElement("div", new { className = "field" }, new VElement("label", "1.2.6.1", new Dictionary<string, string>(), "Website (optional)"), MinimactHelpers.createElement("input", new { type = "url", value = website, className = (websiteValidation.hasError) ? "error" : "" }), (new MObject(websiteValidation.hasError)) ? new VElement("span", "1.2.6.3.1", new Dictionary<string, string> { ["class"] = "error-message" }, new VNode[]
                    {
                        new VText($"{(websiteValidation.Message)}", "1.2.6.3.1.1")
                    }) : new VNull("1.2.6.3")),
                new VElement("button", "1.2.7", new Dictionary<string, string> { ["type"] = "submit" }, "Submit")
            })
        });
    }

    public void handleSubmit()
    {
        var isValid = MinimactHelpers.ToBool(MinimactHelpers.ToBool(MinimactHelpers.ToBool(MinimactHelpers.ToBool(MinimactHelpers.ToBool(emailValidation.isValid) && MinimactHelpers.ToBool(passwordValidation.isValid)) && MinimactHelpers.ToBool(confirmPasswordValidation.isValid)) && MinimactHelpers.ToBool(ageValidation.isValid)) && MinimactHelpers.ToBool(usernameValidation.isValid)) && MinimactHelpers.ToBool(websiteValidation.isValid);
        if (MinimactHelpers.ToBool(isValid)) {
    Console.WriteLine("Form submitted!");
}
    }

    /// <summary>
    /// Returns JavaScript event handlers for client-side execution
    /// These execute in the browser with bound hook context
    /// </summary>
    protected override Dictionary<string, string> GetClientHandlers()
    {
        return new Dictionary<string, string>
        {
            ["Handle1"] = @"function (e) {\n  e.preventDefault();\n  handleSubmit();\n}"
        };
    }
}
