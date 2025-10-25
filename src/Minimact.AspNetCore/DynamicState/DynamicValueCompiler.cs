using System.Text.Json;
using Minimact.AspNetCore.Core;

namespace Minimact.AspNetCore.DynamicState;

/// <summary>
/// Server-side compiler for dynamic value bindings
/// Evaluates functions with current state and applies values to VNode tree
///
/// Philosophy: Structure ONCE. Bind SEPARATELY. Update DIRECTLY.
/// </summary>
public class DynamicValueCompiler
{
    private readonly List<DynamicBinding> _bindings = new();

    /// <summary>
    /// Register a dynamic value binding
    /// </summary>
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
    /// Apply dynamic bindings to VNode tree
    /// Server evaluates functions → inserts values → attaches metadata
    /// </summary>
    public void ApplyToVNode(VNode vnode, object state)
    {
        foreach (var binding in _bindings)
        {
            try
            {
                // Evaluate function with current state to get VALUE
                var value = binding.Function(state);
                binding.CurrentValue = value;

                // Apply binding to VNode tree
                ApplyBindingToTree(vnode, binding, value);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[Minimact] Error evaluating binding '{binding.Selector}': {ex.Message}");
            }
        }
    }

    /// <summary>
    /// Apply binding to VNode tree recursively
    /// </summary>
    private void ApplyBindingToTree(VNode vnode, DynamicBinding binding, object value)
    {
        // Only work with VElement (not VText)
        if (vnode is not VElement element)
        {
            return;
        }

        // Match on className (simplified selector matching)
        var selectorClass = binding.Selector.TrimStart('.');

        if (MatchesSelector(element, selectorClass))
        {
            ApplyBinding(element, binding, value);
            AttachBindingMetadata(element, binding);
        }

        // Recurse through children
        foreach (var child in element.Children)
        {
            ApplyBindingToTree(child, binding, value);
        }
    }

    /// <summary>
    /// Check if VElement matches selector (simplified - only class matching for now)
    /// </summary>
    private bool MatchesSelector(VElement element, string selectorClass)
    {
        if (element.Props.TryGetValue("className", out var className))
        {
            var classNames = className.Split(' ', StringSplitOptions.RemoveEmptyEntries);
            return classNames.Contains(selectorClass);
        }

        return false;
    }

    /// <summary>
    /// Apply binding based on type
    /// </summary>
    private void ApplyBinding(VElement element, DynamicBinding binding, object value)
    {
        switch (binding.Type)
        {
            case DynamicBindingType.Value:
                // Set text content
                element.Children = new List<VNode> { new VText(value?.ToString() ?? "") };
                break;

            case DynamicBindingType.Attribute:
                // Update attribute
                var attrName = binding.Metadata.GetValueOrDefault("attribute", "");
                element.Props[attrName] = value?.ToString() ?? "";
                break;

            case DynamicBindingType.Class:
                // Update class
                element.Props["className"] = value?.ToString() ?? "";
                break;

            case DynamicBindingType.Style:
                // Update style property
                var property = binding.Metadata.GetValueOrDefault("property", "");
                var currentStyle = element.Props.GetValueOrDefault("style", "");
                var newStyle = UpdateStyleProperty(currentStyle, property, value?.ToString() ?? "");
                element.Props["style"] = newStyle;
                break;

            case DynamicBindingType.Show:
                // Update visibility
                var visible = value is bool b && b;
                var style = element.Props.GetValueOrDefault("style", "");
                var updatedStyle = UpdateStyleProperty(style, "display", visible ? "" : "none");
                element.Props["style"] = updatedStyle;
                break;

            case DynamicBindingType.Order:
                // DOM Choreography - would need container-specific logic
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
    /// Attach binding metadata for hydration
    /// Client reads this to know which bindings to register
    /// </summary>
    private void AttachBindingMetadata(VElement element, DynamicBinding binding)
    {
        var metadata = new
        {
            bindingId = binding.BindingId,
            selector = binding.Selector,
            dependencies = binding.Dependencies,
            type = binding.Type.ToString().ToLower()
        };

        element.Props["data-minimact-binding"] = JsonSerializer.Serialize(metadata);
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
