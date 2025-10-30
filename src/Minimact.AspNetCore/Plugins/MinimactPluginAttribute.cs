namespace Minimact.AspNetCore.Plugins;

/// <summary>
/// Marks a class as a Minimact plugin for auto-discovery
/// </summary>
[AttributeUsage(AttributeTargets.Class, AllowMultiple = false)]
public class MinimactPluginAttribute : Attribute
{
    public string Name { get; }

    public MinimactPluginAttribute(string name)
    {
        Name = name;
    }
}
