using Minimact;
using System.Collections.Generic;
using System.Threading.Tasks;

[Component]
public partial class ServerTaskExample : MinimactComponent
{
    [State]
    private List<User> users = new List<User>();

    [State]
    private bool loading = false;

    [ServerTask]
    public async Task<object> fetchUsers()
    {
        var response = await HttpClient.GetAsync("/api/users");
        return await response.Content.ReadFromJsonAsync<object>();
    }

    [ServerTask]
    public async Task<object> fetchUser(double id)
    {
        var response = await HttpClient.GetAsync($"/api/users/{id}");
        return await response.Content.ReadFromJsonAsync<object>();
    }

    [ServerTask]
    public async Task<object> searchUsers(string query, double limit)
    {
        var results = new List<object>();
        var response = await HttpClient.GetAsync($"/api/users?q={query}&limit={limit}");
        var data = await response.Content.ReadFromJsonAsync<List<dynamic>>();
        foreach (var user in data)
        {
            if (MinimactHelpers.ToBool(user.active))
            {
                results.Add(user);
            }
        }
        return results;
    }

    private void Handle0()
    {
        _ = fetchUsers();
    }

    protected override VNode Render()
    {
        return new VElement("div", "1", new Dictionary<string, string>(), new VNode[]
        {
            new VElement("button", "1.1", new Dictionary<string, string> { ["onclick"] = "Handle0" }, "Load Users"),
            new VElement("ul", "1.2", new Dictionary<string, string>(),
                users.Select(user => new VElement("li", "1.2.1", new Dictionary<string, string>
                {
                    ["key"] = $"{user.id}"
                }, new VText($"{user.name}", "1.2.1.1"))).ToArray())
        });
    }
}
