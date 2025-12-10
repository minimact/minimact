using Minimact;
using System.Collections.Generic;
using System.Linq;

[Component]
public partial class ExpressionsExample : MinimactComponent
{
    [State]
    private int count = 0;

    [State]
    private double price = 19.99;

    [State]
    private string name = "John";

    [State]
    private List<string> items = new List<string> { "a", "b", "c" };

    [State]
    private dynamic user = new { firstName = "John", lastName = "Doe" };

    protected override VNode Render()
    {
        var doubled = count * 2;
        var total = count * price;
        var fullName = user.firstName + " " + user.lastName;
        var itemCount = items.Count;
        var filtered = items.Where(x => x != "b").ToList();
        var mapped = items.Select(x => x.ToUpper()).ToList();

        return new VElement("div", "1", new Dictionary<string, string>(), new VNode[]
        {
            new VElement("p", "1.1", new Dictionary<string, string>(), new VText($"Count: {count}", "1.1.1")),
            new VElement("p", "1.2", new Dictionary<string, string>(), new VText($"Doubled: {doubled}", "1.2.1")),
            new VElement("p", "1.3", new Dictionary<string, string>(), new VText($"Price: ${price.ToString("F2")}", "1.3.1")),
            new VElement("p", "1.4", new Dictionary<string, string>(), new VText($"Total: ${total.ToString("F2")}", "1.4.1")),
            new VElement("p", "1.5", new Dictionary<string, string>(), new VText($"Name: {name.ToUpper()}", "1.5.1")),
            new VElement("p", "1.6", new Dictionary<string, string>(), new VText($"Full name: {fullName}", "1.6.1")),
            new VElement("p", "1.7", new Dictionary<string, string>(), new VText($"Items: {itemCount}", "1.7.1")),
            new VElement("p", "1.8", new Dictionary<string, string>(), new VText($"Optional: {user?.email}", "1.8.1"))
        });
    }
}
