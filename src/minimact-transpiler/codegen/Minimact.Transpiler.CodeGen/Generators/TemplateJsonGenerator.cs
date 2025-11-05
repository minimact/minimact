using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Text.Json.Serialization;
using Minimact.Transpiler.CodeGen.Nodes;
using Minimact.Transpiler.CodeGen.Visitors;

namespace Minimact.Transpiler.CodeGen.Generators;

/// <summary>
/// Generates templates.json metadata for the Rust predictor
/// Uses hexcode paths (e.g., "10000000.20000000") instead of array indices
/// </summary>
public class TemplateJsonGenerator : INodeVisitor
{
    private readonly Dictionary<string, TemplateMetadata> _templates = new();
    private string _componentName = string.Empty;

    /// <summary>
    /// Generate templates.json content from a component
    /// </summary>
    public string GenerateFromComponent(ComponentNode component)
    {
        _componentName = component.ComponentName;

        // Visit the component to collect templates
        component.Accept(this);

        // Build the output structure
        var output = new
        {
            component = _componentName,
            version = "1.0",
            generatedAt = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
            templates = _templates
        };

        // Serialize to JSON with pretty printing
        var options = new JsonSerializerOptions
        {
            WriteIndented = true,
            DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
        };

        return JsonSerializer.Serialize(output, options);
    }

    #region INodeVisitor Implementation

    public void Visit(ComponentNode node)
    {
        _componentName = node.ComponentName;

        // Visit render method
        if (node.RenderMethod != null)
        {
            node.RenderMethod.Accept(this);
        }
    }

    public void Visit(RenderMethodNode node)
    {
        // Visit all children
        if (node.Children != null)
        {
            foreach (var child in node.Children)
            {
                child.Accept(this);
            }
        }
    }

    public void Visit(JSXElementNode node)
    {
        // Extract attribute templates
        if (node.Attributes != null)
        {
            foreach (var attr in node.Attributes)
            {
                attr.Accept(this);
            }
        }

        // Visit children
        if (node.Children != null)
        {
            foreach (var child in node.Children)
            {
                child.Accept(this);
            }
        }
    }

    public void Visit(TextTemplateNode node)
    {
        if (node.Bindings?.Count > 0 && !string.IsNullOrEmpty(node.Path))
        {
            // Dynamic text template - use path directly from JSON
            _templates[node.Path] = new TemplateMetadata
            {
                Template = node.Template,
                Bindings = node.Bindings.Select(b => b.Path).ToList(),
                Slots = ExtractSlotPositions(node.Template),
                Path = node.PathSegments ?? new List<string>(),
                Type = "dynamic"
            };
        }
    }

    public void Visit(StaticTextNode node)
    {
        // Static text generates templates too - use path directly from JSON
        if (!string.IsNullOrEmpty(node.Content) && !string.IsNullOrEmpty(node.Path))
        {
            _templates[node.Path] = new TemplateMetadata
            {
                Template = node.Content,
                Bindings = new List<string>(),
                Slots = new List<int>(),
                Path = node.PathSegments ?? new List<string>(),
                Type = "static"
            };
        }
    }

    public void Visit(AttributeTemplateNode node)
    {
        if (node.Bindings?.Count > 0)
        {
            // Dynamic attribute
            var key = node.Path ?? BuildTemplateKey(node.PathSegments, $"@{node.Attribute}");
            _templates[key] = new TemplateMetadata
            {
                Template = node.Template,
                Bindings = node.Bindings.Select(b => b.Path).ToList(),
                Slots = ExtractSlotPositions(node.Template),
                Path = node.PathSegments ?? new List<string>(),
                Type = "attribute-dynamic"
            };
        }
        else if (!string.IsNullOrEmpty(node.Template))
        {
            // Static attribute
            var key = node.Path ?? BuildTemplateKey(node.PathSegments, $"@{node.Attribute}");
            _templates[key] = new TemplateMetadata
            {
                Template = node.Template,
                Bindings = new List<string>(),
                Slots = new List<int>(),
                Path = node.PathSegments ?? new List<string>(),
                Type = "attribute-static"
            };
        }
    }

    public void Visit(StaticAttributeNode node)
    {
        // Static attribute - use path directly from JSON
        if (!string.IsNullOrEmpty(node.Value) && !string.IsNullOrEmpty(node.Path))
        {
            _templates[node.Path] = new TemplateMetadata
            {
                Template = node.Value,
                Bindings = new List<string>(),
                Slots = new List<int>(),
                Path = node.PathSegments ?? new List<string>(),
                Type = "attribute-static"
            };
        }
    }

    public void Visit(DynamicAttributeNode node)
    {
        // Dynamic attribute - use path directly from JSON
        if (!string.IsNullOrEmpty(node.Path))
        {
            var template = node.Template ?? node.Value ?? "{0}";
            var bindings = node.Bindings?.Select(b => b.Path).ToList()
                ?? (node.Binding != null ? new List<string> { node.Binding } : new List<string>());

            // Determine if this is truly dynamic or static
            // For style attributes, check StyleObject.HasBindings or IsStatic
            string attributeType;
            if (node.Subtype == "style-object" && node.StyleObject != null)
            {
                var hasBindings = node.StyleObject.HasBindings == true ||
                                (node.StyleObject.Bindings?.Count > 0);
                var isStatic = node.StyleObject.IsStatic == true;

                attributeType = (hasBindings && !isStatic) ? "attribute-dynamic" : "attribute-static";
            }
            else
            {
                // For non-style attributes, check if bindings exist
                attributeType = bindings.Count > 0 ? "attribute-dynamic" : "attribute-static";
            }

            _templates[node.Path] = new TemplateMetadata
            {
                Template = template,
                Bindings = bindings,
                Slots = ExtractSlotPositions(template),
                Path = node.PathSegments ?? new List<string>(),
                Type = attributeType
            };
        }

        // Visit children if any (for complex attribute values)
        if (node.Children != null)
        {
            foreach (var child in node.Children)
            {
                child.Accept(this);
            }
        }
    }

    public void Visit(EventHandlerAttributeNode node)
    {
        // Event handlers generate dynamic attribute templates
        if (!string.IsNullOrEmpty(node.Path) && !string.IsNullOrEmpty(node.HandlerName))
        {
            _templates[node.Path] = new TemplateMetadata
            {
                Template = "{0}",
                Bindings = new List<string> { node.HandlerName },
                Slots = new List<int> { 0 },
                Path = node.PathSegments ?? new List<string>(),
                Type = "attribute-dynamic"
            };
        }
    }

    public void Visit(LoopTemplateNode node)
    {
        // Visit loop body
        if (node.Body != null)
        {
            node.Body.Accept(this);
        }
    }

    public void Visit(ConditionalTemplateNode node)
    {
        // Generate conditional template metadata if present
        if (!string.IsNullOrEmpty(node.Template) &&
            node.Bindings?.Count > 0 &&
            node.ConditionalTemplates != null &&
            !string.IsNullOrEmpty(node.Path))
        {
            _templates[node.Path] = new TemplateMetadata
            {
                Template = node.Template,
                Bindings = node.Bindings.Select(b => b.Path).ToList(),
                Slots = ExtractSlotPositions(node.Template),
                Path = node.PathSegments ?? new List<string>(),
                Type = "conditional",
                ConditionalTemplates = node.ConditionalTemplates
            };
        }

        // Visit branches for nested nodes
        if (node.Consequent != null)
        {
            node.Consequent.Accept(this);
        }
        if (node.Alternate != null)
        {
            node.Alternate.Accept(this);
        }
    }

    public void Visit(ComplexTemplateNode node)
    {
        // Check if we have bindings (either Bindings array or singular Binding for transforms)
        List<string> bindings = new List<string>();

        if (node.Bindings?.Count > 0)
        {
            bindings = node.Bindings.Select(b => b.Path).ToList();
        }
        else if (node is ExpressionNode expr && !string.IsNullOrEmpty(expr.Binding))
        {
            // Transform expressions use singular "binding" property
            bindings = new List<string> { expr.Binding };
        }

        if (bindings.Count > 0 && !string.IsNullOrEmpty(node.Path))
        {
            // Determine the template type
            string templateType;
            object? transform = null;
            bool? nullable = null;
            Dictionary<string, string>? conditionalTemplates = null;
            string template = node.Template ?? "{0}";

            // Check if this is a conditional expression with template mappings
            if (node is ExpressionNode exprNode && exprNode.ConditionalTemplates != null && exprNode.ConditionalTemplates.Count > 0)
            {
                templateType = "conditional";
                conditionalTemplates = exprNode.ConditionalTemplates;
            }
            // Check if this is a transform expression
            else if (node is ExpressionNode exprNode2 && exprNode2.IsTransform == true && !string.IsNullOrEmpty(exprNode2.Transform))
            {
                templateType = "transform";
                transform = new
                {
                    method = exprNode2.Transform,
                    args = exprNode2.TransformArgs ?? new List<object>()
                };
            }
            // Check if this has nullable/optional chaining
            else if (bindings.Any(b => b.Contains("?")))
            {
                templateType = "nullable";
                nullable = true;
            }
            // Check if this is simple dynamic (single binding, no operators)
            else if (template == "{0}" && bindings.Count == 1)
            {
                templateType = "dynamic";
            }
            else
            {
                templateType = "complex";
            }

            _templates[node.Path] = new TemplateMetadata
            {
                Template = template,
                Bindings = bindings,
                Slots = ExtractSlotPositions(template),
                Path = node.PathSegments ?? new List<string>(),
                Type = templateType,
                Transform = transform,
                Nullable = nullable,
                ConditionalTemplates = conditionalTemplates
            };
        }
    }

    #endregion

    /// <summary>
    /// Build template key from hex path segments
    /// Example: ["10000000", "20000000"] + "text[0]" → "10000000.20000000.text[0]"
    /// </summary>
    private string BuildTemplateKey(List<string>? pathSegments, string suffix)
    {
        if (pathSegments == null || pathSegments.Count == 0)
        {
            return suffix;
        }

        return string.Join(".", pathSegments) + "." + suffix;
    }

    /// <summary>
    /// Extract slot positions from template string
    /// Example: "Count: {0}, Price: ${1}" → [7, 20]
    /// </summary>
    private List<int> ExtractSlotPositions(string template)
    {
        var positions = new List<int>();
        var index = 0;
        var slotNumber = 0;

        while (index < template.Length)
        {
            var slotPattern = $"{{{slotNumber}}}";
            var pos = template.IndexOf(slotPattern, index);

            if (pos == -1) break;

            positions.Add(pos);
            index = pos + slotPattern.Length;
            slotNumber++;
        }

        return positions;
    }
}

/// <summary>
/// Template metadata structure for templates.json
/// </summary>
public class TemplateMetadata
{
    [JsonPropertyName("template")]
    public string Template { get; set; } = string.Empty;

    [JsonPropertyName("bindings")]
    public List<string> Bindings { get; set; } = new();

    [JsonPropertyName("slots")]
    public List<int> Slots { get; set; } = new();

    [JsonPropertyName("path")]
    public List<string> Path { get; set; } = new();

    [JsonPropertyName("type")]
    public string Type { get; set; } = string.Empty;

    [JsonPropertyName("transform")]
    public object? Transform { get; set; }

    [JsonPropertyName("conditionalTemplates")]
    public Dictionary<string, string>? ConditionalTemplates { get; set; }

    [JsonPropertyName("nullable")]
    public bool? Nullable { get; set; }
}
