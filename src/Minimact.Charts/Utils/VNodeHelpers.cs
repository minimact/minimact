using System.Reflection;
using Minimact.AspNetCore.Core;

namespace Minimact.Charts.Utils;

/// <summary>
/// Helper methods for creating VNodes with cleaner syntax
/// </summary>
public static class VNodeHelpers
{
    /// <summary>
    /// Create a VElement with anonymous object props
    /// </summary>
    public static VElement Element(string tag, object? props = null, params VNode[] children)
    {
        var propsDict = ConvertToPropsDict(props);
        return new VElement(tag, propsDict, children);
    }

    /// <summary>
    /// Create a VElement with text content
    /// </summary>
    public static VElement Element(string tag, object? props, string textContent)
    {
        var propsDict = ConvertToPropsDict(props);
        return new VElement(tag, propsDict, textContent);
    }

    /// <summary>
    /// Create a text VNode
    /// </summary>
    public static VText Text(string content)
    {
        return new VText(content);
    }

    /// <summary>
    /// Convert anonymous object to Dictionary<string, string>
    /// </summary>
    private static Dictionary<string, string> ConvertToPropsDict(object? props)
    {
        if (props == null)
        {
            return new Dictionary<string, string>();
        }

        var dict = new Dictionary<string, string>();

        foreach (PropertyInfo prop in props.GetType().GetProperties())
        {
            var value = prop.GetValue(props);
            if (value != null)
            {
                // Convert property name from camelCase to kebab-case for HTML attributes
                var key = ToKebabCase(prop.Name);
                dict[key] = value.ToString() ?? string.Empty;
            }
        }

        return dict;
    }

    /// <summary>
    /// Convert camelCase/PascalCase to kebab-case
    /// Example: strokeWidth -> stroke-width, dataCategory -> data-category
    /// </summary>
    private static string ToKebabCase(string str)
    {
        if (string.IsNullOrEmpty(str))
        {
            return str;
        }

        // Special case: preserve data_ prefix
        if (str.StartsWith("data_"))
        {
            return "data-" + ToKebabCase(str.Substring(5));
        }

        var result = new System.Text.StringBuilder();
        result.Append(char.ToLower(str[0]));

        for (int i = 1; i < str.Length; i++)
        {
            if (char.IsUpper(str[i]))
            {
                result.Append('-');
                result.Append(char.ToLower(str[i]));
            }
            else
            {
                result.Append(str[i]);
            }
        }

        return result.ToString();
    }
}
