using System.Text.Json;
using AngleSharp.Dom;
using AngleSharp.Html.Parser;

namespace Minimact.AspNetCore.DynamicState;

/// <summary>
/// Server-side compiler for dynamic value bindings
/// Evaluates functions with current state and inserts values into HTML
///
/// Philosophy: Structure ONCE. Bind SEPARATELY. Update DIRECTLY.
/// </summary>
public class DynamicValueCompiler
{
    private readonly List<DynamicBinding> _bindings = new();
    private readonly HtmlParser _parser = new();

    /// <summary>
    /// Register a dynamic value binding
    /// </summary>
    /// <param name="selector">CSS selector</param>
    /// <param name="fn">Function that returns value based on state</param>
    /// <param name="dependencies">Dependency paths (optional, for optimization)</param>
    public void RegisterBinding(string selector, Func<object, object> fn, List<string>? dependencies = null)
    {
        _bindings.Add(new DynamicBinding
        {
            Selector = selector,
            Function = fn,
            Dependencies = dependencies ?? new List<string>(),
            Type = DynamicBindingType.Value
        });
    }

    /// <summary>
    /// Register attribute binding
    /// </summary>
    public void RegisterAttributeBinding(string selector, string attribute, Func<object, object> fn, List<string>? dependencies = null)
    {
        _bindings.Add(new DynamicBinding
        {
            Selector = selector,
            Function = fn,
            Dependencies = dependencies ?? new List<string>(),
            Type = DynamicBindingType.Attribute,
            Metadata = new Dictionary<string, string> { ["attribute"] = attribute }
        });
    }

    /// <summary>
    /// Register class binding
    /// </summary>
    public void RegisterClassBinding(string selector, Func<object, object> fn, List<string>? dependencies = null)
    {
        _bindings.Add(new DynamicBinding
        {
            Selector = selector,
            Function = fn,
            Dependencies = dependencies ?? new List<string>(),
            Type = DynamicBindingType.Class
        });
    }

    /// <summary>
    /// Register style binding
    /// </summary>
    public void RegisterStyleBinding(string selector, string property, Func<object, object> fn, List<string>? dependencies = null)
    {
        _bindings.Add(new DynamicBinding
        {
            Selector = selector,
            Function = fn,
            Dependencies = dependencies ?? new List<string>(),
            Type = DynamicBindingType.Style,
            Metadata = new Dictionary<string, string> { ["property"] = property }
        });
    }

    /// <summary>
    /// Register visibility binding
    /// </summary>
    public void RegisterVisibilityBinding(string selector, Func<object, bool> fn, List<string>? dependencies = null)
    {
        _bindings.Add(new DynamicBinding
        {
            Selector = selector,
            Function = (state) => fn(state),
            Dependencies = dependencies ?? new List<string>(),
            Type = DynamicBindingType.Show
        });
    }

    /// <summary>
    /// Register element order binding (DOM Choreography)
    /// </summary>
    public void RegisterOrderBinding(string containerSelector, Func<object, string[]> fn, List<string>? dependencies = null)
    {
        _bindings.Add(new DynamicBinding
        {
            Selector = containerSelector,
            Function = (state) => fn(state),
            Dependencies = dependencies ?? new List<string>(),
            Type = DynamicBindingType.Order
        });
    }

    /// <summary>
    /// Compile HTML with dynamic values evaluated and inserted
    /// Server evaluates functions → renders values → attaches metadata for hydration
    /// </summary>
    public string CompileHtml(string html, object state)
    {
        var document = _parser.ParseDocument(html);

        foreach (var binding in _bindings)
        {
            try
            {
                // Evaluate function with current state to get VALUE
                var value = binding.Function(state);
                binding.CurrentValue = value;

                // Find elements matching selector
                var elements = document.QuerySelectorAll(binding.Selector);

                if (elements.Length == 0)
                {
                    // Not an error - element might not exist in this render
                    continue;
                }

                foreach (var element in elements)
                {
                    ApplyBinding(element, binding, value);

                    // Attach binding metadata for hydration
                    AttachBindingMetadata(element, binding);
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[Minimact] Error evaluating binding '{binding.Selector}': {ex.Message}");
            }
        }

        return document.DocumentElement?.OuterHtml ?? html;
    }

    /// <summary>
    /// Apply binding based on type
    /// </summary>
    private void ApplyBinding(IElement element, DynamicBinding binding, object value)
    {
        switch (binding.Type)
        {
            case DynamicBindingType.Value:
                // Insert value into element - MINIMAL
                element.TextContent = value?.ToString() ?? "";
                break;

            case DynamicBindingType.Attribute:
                // Update attribute
                var attrName = binding.Metadata.GetValueOrDefault("attribute", "");
                element.SetAttribute(attrName, value?.ToString() ?? "");
                break;

            case DynamicBindingType.Class:
                // Update class
                element.ClassName = value?.ToString() ?? "";
                break;

            case DynamicBindingType.Style:
                // Update style property
                var property = binding.Metadata.GetValueOrDefault("property", "");
                var htmlElement = element as IHtmlElement;
                if (htmlElement != null)
                {
                    var currentStyle = htmlElement.GetAttribute("style") ?? "";
                    var newStyle = UpdateStyleProperty(currentStyle, property, value?.ToString() ?? "");
                    htmlElement.SetAttribute("style", newStyle);
                }
                break;

            case DynamicBindingType.Show:
                // Update visibility
                var visible = value is bool b && b;
                var htmlElem = element as IHtmlElement;
                if (htmlElem != null)
                {
                    var style = htmlElem.GetAttribute("style") ?? "";
                    var newStyle = UpdateStyleProperty(style, "display", visible ? "" : "none");
                    htmlElem.SetAttribute("style", newStyle);
                }
                break;

            case DynamicBindingType.Order:
                // DOM Choreography - rearrange children
                if (value is string[] childSelectors)
                {
                    RearrangeChildren(element, childSelectors);
                }
                break;
        }
    }

    /// <summary>
    /// Update a specific CSS property in a style string
    /// </summary>
    private string UpdateStyleProperty(string currentStyle, string property, string value)
    {
        var styles = currentStyle
            .Split(';', StringSplitOptions.RemoveEmptyEntries)
            .Select(s => s.Trim())
            .Where(s => !string.IsNullOrEmpty(s))
            .ToList();

        // Remove existing property
        styles = styles.Where(s => !s.StartsWith($"{property}:", StringComparison.OrdinalIgnoreCase)).ToList();

        // Add new value if not empty
        if (!string.IsNullOrEmpty(value))
        {
            styles.Add($"{property}: {value}");
        }

        return string.Join("; ", styles);
    }

    /// <summary>
    /// Rearrange child elements based on selector order (DOM Choreography)
    /// </summary>
    private void RearrangeChildren(IElement container, string[] childSelectors)
    {
        // Find children matching selectors
        var orderedChildren = new List<IElement>();

        foreach (var selector in childSelectors)
        {
            // Try to find in container first
            var child = container.QuerySelector(selector);

            // If not in container, search in document (for teleportation)
            if (child == null)
            {
                child = container.Owner?.QuerySelector(selector);
            }

            if (child != null)
            {
                orderedChildren.Add(child);
            }
        }

        // Append in new order (moves elements)
        foreach (var child in orderedChildren)
        {
            container.AppendChild(child);
        }
    }

    /// <summary>
    /// Attach binding metadata for hydration
    /// Client reads this to know which bindings to register
    /// </summary>
    private void AttachBindingMetadata(IElement element, DynamicBinding binding)
    {
        var metadata = new
        {
            bindingId = binding.BindingId,
            selector = binding.Selector,
            dependencies = binding.Dependencies,
            type = binding.Type.ToString().ToLower()
        };

        element.SetAttribute("data-minimact-binding", JsonSerializer.Serialize(metadata));
    }

    /// <summary>
    /// Extract dependencies from function
    /// (In real implementation, Babel transpiler does this)
    /// </summary>
    private List<string> ExtractDependencies(Func<object, object> fn)
    {
        // Placeholder - Babel transpiler would inject this metadata
        // For now, return empty list
        return new List<string>();
    }

    /// <summary>
    /// Clear all bindings
    /// </summary>
    public void Clear()
    {
        _bindings.Clear();
    }

    /// <summary>
    /// Get binding count (for debugging)
    /// </summary>
    public int BindingCount => _bindings.Count;
}
