using Minimact.CommandCenter.Models;

namespace Minimact.Testing.Core;

/// <summary>
/// Mock DOM element - simulates a browser DOM element
/// CRITICAL: BoundingBox is required for Minimact Punch (intersection observer)
/// </summary>
public class MockElement
{
    public string Id { get; set; } = string.Empty;
    public string TagName { get; set; } = string.Empty;
    public Dictionary<string, string> Attributes { get; set; } = new();
    public List<MockElement> Children { get; set; } = new();
    public MockElement? Parent { get; set; }
    public string? TextContent { get; set; }

    /// <summary>
    /// Bounding box for intersection observer simulation
    /// CRITICAL: Must be set for useDomElementState tests to work!
    /// </summary>
    public Rect? BoundingBox { get; set; }

    /// <summary>
    /// For Minimact Punch - intersection observer state
    /// </summary>
    public bool IsIntersecting { get; set; }

    /// <summary>
    /// Get attribute value, or null if not found
    /// </summary>
    public string? GetAttribute(string name)
    {
        return Attributes.TryGetValue(name, out var value) ? value : null;
    }

    /// <summary>
    /// Set attribute value
    /// </summary>
    public void SetAttribute(string name, string value)
    {
        Attributes[name] = value;
    }

    /// <summary>
    /// Remove attribute
    /// </summary>
    public void RemoveAttribute(string name)
    {
        Attributes.Remove(name);
    }

    /// <summary>
    /// Get element by ID (searches this element and descendants)
    /// </summary>
    public MockElement? GetElementById(string id)
    {
        if (Id == id)
            return this;

        foreach (var child in Children)
        {
            var found = child.GetElementById(id);
            if (found != null)
                return found;
        }

        return null;
    }

    /// <summary>
    /// Query selector (simple implementation - just ID and class for now)
    /// </summary>
    public MockElement? QuerySelector(string selector)
    {
        // #id selector
        if (selector.StartsWith("#"))
        {
            var id = selector.Substring(1);
            return GetElementById(id);
        }

        // .class selector
        if (selector.StartsWith("."))
        {
            var className = selector.Substring(1);
            return QueryByClass(className);
        }

        // tag selector
        return QueryByTag(selector);
    }

    private MockElement? QueryByClass(string className)
    {
        var classAttr = GetAttribute("class");
        if (classAttr != null && classAttr.Split(' ').Contains(className))
            return this;

        foreach (var child in Children)
        {
            var found = child.QueryByClass(className);
            if (found != null)
                return found;
        }

        return null;
    }

    private MockElement? QueryByTag(string tagName)
    {
        if (TagName.Equals(tagName, StringComparison.OrdinalIgnoreCase))
            return this;

        foreach (var child in Children)
        {
            var found = child.QueryByTag(tagName);
            if (found != null)
                return found;
        }

        return null;
    }

    /// <summary>
    /// Render element as HTML string (for debugging)
    /// </summary>
    public string ToHTML(int indent = 0)
    {
        var indentStr = new string(' ', indent * 2);
        var result = $"{indentStr}<{TagName}";

        // Add attributes
        foreach (var attr in Attributes)
        {
            result += $" {attr.Key}=\"{attr.Value}\"";
        }

        // Self-closing tags
        if (Children.Count == 0 && string.IsNullOrEmpty(TextContent))
        {
            return result + " />";
        }

        result += ">";

        // Text content
        if (!string.IsNullOrEmpty(TextContent))
        {
            result += TextContent;
        }

        // Children
        if (Children.Count > 0)
        {
            result += "\n";
            foreach (var child in Children)
            {
                result += child.ToHTML(indent + 1) + "\n";
            }
            result += indentStr;
        }

        result += $"</{TagName}>";
        return result;
    }

    public override string ToString()
    {
        var attrs = string.Join(", ", Attributes.Select(kv => $"{kv.Key}=\"{kv.Value}\""));
        return $"<{TagName} {attrs}> ({Children.Count} children)";
    }
}
