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

    protected override VNode Render()
    {
        StateManager.SyncMembersToState(this);

        var emailValidation = useValidation(email, new Dictionary<string, object>{ required: true, pattern: /^new List<object>{^\s@}+@new List<object>{^\s@}+\.new List<object>{^\s@}+ $ /, message: "Please enter a valid email address"});
        var passwordValidation = useValidation(password, new Dictionary<string, object>{ required: true, ["minLength"]= 8, ["maxLength"]= 100, pattern: /^(?=.*new List<object>{ a - z})(?=.*new List<object>{ A - Z})(?=.*\d) /, message: "Password must be 8+ chars with uppercase, lowercase, and number"});
        var ageValidation = useValidation(age, new Dictionary<string, object>{ required: true, ["min"]= 18, ["max"]= 120, message: "Age must be between 18 and 120"});
        var websiteValidation = useValidation(website, { required: false, pattern: /^https?: \/\/.+/,message:'Please enter a valid URL starting with http:// or https:;

        return new VElement("div", "1", new Dictionary<string, string> { ["class"] = "validation-test" }, new VNode[]
        {
            new VElement("h2", "1.1", new Dictionary<string, string>(), "Form Validation Test"),
            new VElement("form", "1.2", new Dictionary<string, string> { ["onsubmit"] = "Handle0" }, new VNode[]
            {
                new VElement("div", "1.2.1", new Dictionary<string, string> { ["class"] = "field" }, new VNode[]
                {
                    new VElement("label", "1.2.1.1", new Dictionary<string, string>(), "Email *"),
                    new VElement("input", "1.2.1.2", new Dictionary<string, string> { ["type"] = "email", ["value"] = $"{(email)}", ["onchange"] = "Handle1", ["class"] = $"{(emailValidation.hasError?"error":"")}" }),
                    new VText($"{(emailValidation.hasError && (<spanclassName= "error-message">{ emailValidation.message}</span>))}", "1.2.1.3")
                }),
                new VElement("div", "1.2.2", new Dictionary<string, string> { ["class"] = "field" }, new VNode[]
                {
                    new VElement("label", "1.2.2.1", new Dictionary<string, string>(), "Username *"),
                    new VElement("input", "1.2.2.2", new Dictionary<string, string> { ["type"] = "text", ["value"] = $"{(username)}", ["onchange"] = "Handle2", ["class"] = $"{(usernameValidation.hasError?"error":"")}" }),
                    new VText($"{(usernameValidation.isValidating && (<spanclassName= "validating">Checking availability...</span>))}{(usernameValidation.hasError && (<spanclassName= "error-message">{ usernameValidation.message}</span>))}", "1.2.2.3")
                }),
                new VElement("div", "1.2.3", new Dictionary<string, string> { ["class"] = "field" }, new VNode[]
                {
                    new VElement("label", "1.2.3.1", new Dictionary<string, string>(), "Password *"),
                    new VElement("input", "1.2.3.2", new Dictionary<string, string> { ["type"] = "password", ["value"] = $"{(password)}", ["onchange"] = "Handle3", ["class"] = $"{(passwordValidation.hasError?"error":"")}" }),
                    new VText($"{(passwordValidation.hasError && (<spanclassName= "error-message">{ passwordValidation.message}</span>))}", "1.2.3.3")
                }),
                new VElement("div", "1.2.4", new Dictionary<string, string> { ["class"] = "field" }, new VNode[]
                {
                    new VElement("label", "1.2.4.1", new Dictionary<string, string>(), "Confirm Password *"),
                    new VElement("input", "1.2.4.2", new Dictionary<string, string> { ["type"] = "password", ["value"] = $"{(confirmPassword)}", ["onchange"] = "Handle4", ["class"] = $"{(confirmPasswordValidation.hasError?"error":"")}" }),
                    new VText($"{(confirmPasswordValidation.hasError && (<spanclassName= "error-message">{ confirmPasswordValidation.message}</span>))}", "1.2.4.3")
                }),
                new VElement("div", "1.2.5", new Dictionary<string, string> { ["class"] = "field" }, new VNode[]
                {
                    new VElement("label", "1.2.5.1", new Dictionary<string, string>(), "Age *"),
                    new VElement("input", "1.2.5.2", new Dictionary<string, string> { ["type"] = "number", ["value"] = $"{(age)}", ["onchange"] = "Handle5", ["class"] = $"{(ageValidation.hasError?"error":"")}" }),
                    new VText($"{(ageValidation.hasError && (<spanclassName= "error-message">{ ageValidation.message}</span>))}", "1.2.5.3")
                }),
                new VElement("div", "1.2.6", new Dictionary<string, string> { ["class"] = "field" }, new VNode[]
                {
                    new VElement("label", "1.2.6.1", new Dictionary<string, string>(), "Website (optional)"),
                    new VElement("input", "1.2.6.2", new Dictionary<string, string> { ["type"] = "url", ["value"] = $"{(website)}", ["onchange"] = "Handle6", ["class"] = $"{(websiteValidation.hasError?"error":"")}" }),
                    new VText($"{(websiteValidation.hasError && (<spanclassName= "error-message">{ websiteValidation.message}</span>))}", "1.2.6.3")
                }),
                new VElement("button", "1.2.7", new Dictionary<string, string> { ["type"] = "submit" }, "Submit")
            })
        });
    }

    public void handleSubmit()
    {
    }

    public void Handle0(dynamic e)
    {
        e.preventDefault();handleSubmit();
    }

    public void Handle1(dynamic e)
    {
        setEmail(e.target.value);
    }

    public void Handle2(dynamic e)
    {
        setUsername(e.target.value);
    }

    public void Handle3(dynamic e)
    {
        setPassword(e.target.value);
    }

    public void Handle4(dynamic e)
    {
        setConfirmPassword(e.target.value);
    }

    public void Handle5(dynamic e)
    {
        setAge(int.TryParse(e.target.value.ToString(),  out int _p) ? _p : 0);
    }

    public void Handle6(dynamic e)
    {
        setWebsite(e.target.value);
    }

    /// <summary>
    /// Returns JavaScript event handlers for client-side execution
    /// These execute in the browser with bound hook context
    /// </summary>
    protected override Dictionary<string, string> GetClientHandlers()
    {
        return new Dictionary<string, string>
        {
            ["handleSubmit"] = @"function () {}",
            ["Handle0"] = @"function () {\n  {e.preventDefault();handleSubmit();};\n}",
            ["Handle1"] = @"function () {\n  setEmail(e.target.value);\n}",
            ["Handle2"] = @"function () {\n  setUsername(e.target.value);\n}",
            ["Handle3"] = @"function () {\n  setPassword(e.target.value);\n}",
            ["Handle4"] = @"function () {\n  setConfirmPassword(e.target.value);\n}",
            ["Handle5"] = @"function () {\n  setAge(parseInt(e.target.value)||0);\n}",
            ["Handle6"] = @"function () {\n  setWebsite(e.target.value);\n}"
        };
    }

    // State setters
    private void setEmail(string value)
    {
        email = value;
        SetState(nameof(email), value);
    }

    private void setPassword(string value)
    {
        password = value;
        SetState(nameof(password), value);
    }

    private void setConfirmPassword(string value)
    {
        confirmPassword = value;
        SetState(nameof(confirmPassword), value);
    }

    private void setAge(int value)
    {
        age = value;
        SetState(nameof(age), value);
    }

    private void setUsername(string value)
    {
        username = value;
        SetState(nameof(username), value);
    }

    private void setWebsite(string value)
    {
        website = value;
        SetState(nameof(website), value);
    }

}
