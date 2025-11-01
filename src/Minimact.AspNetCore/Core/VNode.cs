using Newtonsoft.Json;

namespace Minimact.AspNetCore.Core;

/// <summary>
/// Base class for Virtual DOM nodes
/// </summary>
[JsonConverter(typeof(VNodeConverter))]
public abstract class VNode
{
    /// <summary>
    /// Render this VNode to HTML string
    /// </summary>
    public abstract string ToHtml();

    /// <summary>
    /// Estimate the size of this VNode in bytes
    /// </summary>
    public abstract int EstimateSize();

    /// <summary>
    /// Normalize a VNode tree by combining adjacent text nodes
    /// (matches browser behavior where adjacent text nodes are automatically merged)
    /// </summary>
    public static VNode Normalize(VNode node)
    {
        if (node is VElement element)
        {
            // Normalize children and combine adjacent text nodes
            var normalizedChildren = new List<VNode>();
            string? pendingText = null;

            foreach (var child in element.Children)
            {
                var normalizedChild = Normalize(child);

                if (normalizedChild is VText text)
                {
                    // Accumulate adjacent text nodes
                    pendingText = (pendingText ?? "") + text.Content;
                }
                else
                {
                    // Flush pending text if any
                    if (pendingText != null)
                    {
                        normalizedChildren.Add(new VText(pendingText));
                        pendingText = null;
                    }
                    normalizedChildren.Add(normalizedChild);
                }
            }

            // Flush any remaining pending text
            if (pendingText != null)
            {
                normalizedChildren.Add(new VText(pendingText));
            }

            return new VElement(element.Tag, element.Props, normalizedChildren.ToArray())
            {
                Key = element.Key
            };
        }
        else if (node is Fragment fragment)
        {
            // Normalize fragment children too
            var normalizedChildren = new List<VNode>();
            string? pendingText = null;

            foreach (var child in fragment.Children)
            {
                var normalizedChild = Normalize(child);

                if (normalizedChild is VText text)
                {
                    pendingText = (pendingText ?? "") + text.Content;
                }
                else
                {
                    if (pendingText != null)
                    {
                        normalizedChildren.Add(new VText(pendingText));
                        pendingText = null;
                    }
                    normalizedChildren.Add(normalizedChild);
                }
            }

            if (pendingText != null)
            {
                normalizedChildren.Add(new VText(pendingText));
            }

            return new Fragment(normalizedChildren.ToArray());
        }

        // Text nodes and other types are already normalized
        return node;
    }
}

/// <summary>
/// Virtual DOM element (like <div>, <button>, etc.)
/// </summary>
public class VElement : VNode
{
    public string Tag { get; set; }
    public Dictionary<string, string> Props { get; set; }
    public List<VNode> Children { get; set; }
    public string? Key { get; set; }

    public VElement(string tag)
    {
        Tag = tag;
        Props = new Dictionary<string, string>();
        Children = new List<VNode>();
    }

    public VElement(string tag, Dictionary<string, string> props)
    {
        Tag = tag;
        Props = props;
        Children = new List<VNode>();
    }

    public VElement(string tag, string textContent)
    {
        Tag = tag;
        Props = new Dictionary<string, string>();
        Children = new List<VNode> { new VText(textContent) };
    }

    public VElement(string tag, Dictionary<string, string> props, string textContent)
    {
        Tag = tag;
        Props = props;
        Children = new List<VNode> { new VText(textContent) };
    }

    public VElement(string tag, Dictionary<string, string> props, VNode[] children)
    {
        Tag = tag;
        Props = props;
        Children = children.ToList();
    }

    public VElement(string tag, VNode[] children)
    {
        Tag = tag;
        Props = new Dictionary<string, string>();
        Children = children.ToList();
    }

    public override string ToHtml()
    {
        // Convert event handler props to data-* attributes for client-runtime
        var htmlProps = Props.Select(p =>
        {
            // Convert onClick -> data-onclick, onChange -> data-onchange, etc.
            if (p.Key.StartsWith("on", StringComparison.OrdinalIgnoreCase) && p.Key.Length > 2)
            {
                var eventName = p.Key.Substring(2).ToLower(); // onClick -> click
                return $"data-on{eventName}=\"{p.Value}\"";
            }
            return $"{p.Key}=\"{p.Value}\"";
        });

        var propsStr = string.Join(" ", htmlProps);
        var openTag = string.IsNullOrEmpty(propsStr) ? $"<{Tag}>" : $"<{Tag} {propsStr}>";
        var closeTag = $"</{Tag}>";

        if (Children.Count == 0)
        {
            // Self-closing tags
            if (IsSelfClosing(Tag))
            {
                return string.IsNullOrEmpty(propsStr) ? $"<{Tag} />" : $"<{Tag} {propsStr} />";
            }
            return $"{openTag}{closeTag}";
        }

        var childrenHtml = string.Join("", Children.Select(c => c.ToHtml()));
        return $"{openTag}{childrenHtml}{closeTag}";
    }

    public override int EstimateSize()
    {
        var size = Tag.Length + 20; // Tag + overhead
        size += Props.Sum(p => p.Key.Length + p.Value.Length);
        size += Children.Sum(c => c.EstimateSize());
        return size;
    }

    private static bool IsSelfClosing(string tag)
    {
        return tag.ToLower() switch
        {
            "br" or "hr" or "img" or "input" or "meta" or "link" => true,
            _ => false
        };
    }
}

/// <summary>
/// Virtual DOM text node
/// </summary>
public class VText : VNode
{
    public string Content { get; set; }

    public VText(string content)
    {
        Content = content ?? "";
    }

    public override string ToHtml()
    {
        // Escape HTML entities
        return System.Net.WebUtility.HtmlEncode(Content);
    }

    public override int EstimateSize()
    {
        return Content.Length;
    }
}

/// <summary>
/// Raw HTML node (for markdown, unsafe content)
/// </summary>
public class DivRawHtml : VNode
{
    public string Html { get; set; }

    public DivRawHtml(string html)
    {
        Html = html ?? "";
    }

    public override string ToHtml()
    {
        return $"<div>{Html}</div>";
    }

    public override int EstimateSize()
    {
        return Html.Length + 10;
    }
}

/// <summary>
/// Fragment (like React.Fragment or <>...</>)
/// </summary>
public class Fragment : VNode
{
    public List<VNode> Children { get; set; }

    public Fragment(params VNode[] children)
    {
        Children = children.ToList();
    }

    public override string ToHtml()
    {
        return string.Join("", Children.Select(c => c.ToHtml()));
    }

    public override int EstimateSize()
    {
        return Children.Sum(c => c.EstimateSize());
    }
}

/// <summary>
/// Custom JSON converter for VNode polymorphism
/// </summary>
public class VNodeConverter : JsonConverter
{
    public override bool CanConvert(Type objectType)
    {
        return typeof(VNode).IsAssignableFrom(objectType);
    }

    public override object? ReadJson(JsonReader reader, Type objectType, object? existingValue, JsonSerializer serializer)
    {
        var obj = Newtonsoft.Json.Linq.JObject.Load(reader);
        var type = obj["type"]?.ToString();

        // Manually deserialize to avoid infinite recursion
        // Don't use the converter for nested VNodes - they'll use this converter automatically
        switch (type)
        {
            case "Element":
                var tag = obj["tag"]?.ToString() ?? "";
                var propsObj = obj["props"] as Newtonsoft.Json.Linq.JObject;
                var props = propsObj?.ToObject<Dictionary<string, string>>() ?? new Dictionary<string, string>();
                var childrenArray = obj["children"] as Newtonsoft.Json.Linq.JArray;
                var children = new List<VNode>();

                if (childrenArray != null)
                {
                    foreach (var childToken in childrenArray)
                    {
                        var childObj = childToken as Newtonsoft.Json.Linq.JObject;
                        if (childObj != null)
                        {
                            // Recursively deserialize child VNodes - they'll use this converter
                            using (var childReader = childObj.CreateReader())
                            {
                                var child = serializer.Deserialize<VNode>(childReader);
                                if (child != null)
                                {
                                    children.Add(child);
                                }
                            }
                        }
                    }
                }

                var element = new VElement(tag, props, children.ToArray());
                var key = obj["key"]?.ToString();
                if (key != null)
                {
                    element.Key = key;
                }
                return element;

            case "Text":
                var content = obj["content"]?.ToString() ?? "";
                return new VText(content);

            case "Fragment":
                var fragChildrenArray = obj["children"] as Newtonsoft.Json.Linq.JArray;
                var fragChildren = new List<VNode>();

                if (fragChildrenArray != null)
                {
                    foreach (var childToken in fragChildrenArray)
                    {
                        var childObj = childToken as Newtonsoft.Json.Linq.JObject;
                        if (childObj != null)
                        {
                            using (var childReader = childObj.CreateReader())
                            {
                                var child = serializer.Deserialize<VNode>(childReader);
                                if (child != null)
                                {
                                    fragChildren.Add(child);
                                }
                            }
                        }
                    }
                }

                return new Fragment(fragChildren.ToArray());

            case "RawHtml":
                var html = obj["html"]?.ToString() ?? "";
                return new DivRawHtml(html);

            default:
                throw new JsonException($"Unknown VNode type: {type}");
        }
    }

    public override void WriteJson(JsonWriter writer, object? value, JsonSerializer serializer)
    {
        if (value is VElement element)
        {
            writer.WriteStartObject();
            writer.WritePropertyName("type");
            writer.WriteValue("Element");
            writer.WritePropertyName("tag");
            writer.WriteValue(element.Tag);
            writer.WritePropertyName("props");
            serializer.Serialize(writer, element.Props);
            writer.WritePropertyName("children");
            serializer.Serialize(writer, element.Children);
            if (element.Key != null)
            {
                writer.WritePropertyName("key");
                writer.WriteValue(element.Key);
            }
            writer.WriteEndObject();
        }
        else if (value is VText text)
        {
            writer.WriteStartObject();
            writer.WritePropertyName("type");
            writer.WriteValue("Text");
            writer.WritePropertyName("content");
            writer.WriteValue(text.Content);
            writer.WriteEndObject();
        }
        else if (value is Fragment fragment)
        {
            writer.WriteStartObject();
            writer.WritePropertyName("type");
            writer.WriteValue("Fragment");
            writer.WritePropertyName("children");
            serializer.Serialize(writer, fragment.Children);
            writer.WriteEndObject();
        }
        else if (value is DivRawHtml rawHtml)
        {
            writer.WriteStartObject();
            writer.WritePropertyName("type");
            writer.WriteValue("RawHtml");
            writer.WritePropertyName("html");
            writer.WriteValue(rawHtml.Html);
            writer.WriteEndObject();
        }
        else
        {
            // Unknown VNode type - write minimal valid structure
            Console.WriteLine($"[VNodeConverter] Warning: Unknown VNode type: {value?.GetType().Name ?? "null"}");
            writer.WriteStartObject();
            writer.WritePropertyName("type");
            writer.WriteValue("Text");
            writer.WritePropertyName("content");
            writer.WriteValue($"[Error: Unknown VNode type: {value?.GetType().Name ?? "null"}]");
            writer.WriteEndObject();
        }
    }
}
