using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Json.Serialization;
using Reluxer.Transformer.Models;

namespace Reluxer.Transformer;

/// <summary>
/// Generates template JSON files from parsed component models.
/// These templates are consumed by the Rust prediction engine for 0-2ms patches.
/// </summary>
public class TemplateGenerator
{
    private readonly TransformOptions _options;

    public TemplateGenerator(TransformOptions options)
    {
        _options = options;
    }

    /// <summary>
    /// Generates template JSON for a single component.
    /// </summary>
    public string Generate(ComponentModel component)
    {
        // Extract templates from the render tree if not already populated
        if (component.Templates.Count == 0 && component.RenderTree != null)
        {
            ExtractTemplates(component, component.RenderTree);
        }

        var output = new TemplateJsonOutput
        {
            Component = component.Name,
            Version = "1.0",
            GeneratedAt = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
        };

        // Add templates
        foreach (var kvp in component.Templates)
        {
            output.Templates[kvp.Key] = ConvertToJsonTemplate(kvp.Value);
        }

        // Add conditional elements if any
        if (component.ConditionalElements.Count > 0)
        {
            output.ConditionalElements = new Dictionary<string, JsonConditionalElement>();
            foreach (var kvp in component.ConditionalElements)
            {
                output.ConditionalElements[kvp.Key] = ConvertToJsonConditional(kvp.Value);
            }
        }

        var jsonOptions = new JsonSerializerOptions
        {
            WriteIndented = true,
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
            Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping
        };

        return JsonSerializer.Serialize(output, jsonOptions);
    }

    /// <summary>
    /// Generates template JSON for multiple components (combined output).
    /// </summary>
    public string Generate(List<ComponentModel> components)
    {
        if (components.Count == 1)
        {
            return Generate(components[0]);
        }

        // For multiple components, generate separate JSON objects
        var outputs = new List<TemplateJsonOutput>();
        foreach (var component in components)
        {
            if (component.Templates.Count == 0 && component.RenderTree != null)
            {
                ExtractTemplates(component, component.RenderTree);
            }

            var output = new TemplateJsonOutput
            {
                Component = component.Name,
                Version = "1.0",
                GeneratedAt = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
            };

            foreach (var kvp in component.Templates)
            {
                output.Templates[kvp.Key] = ConvertToJsonTemplate(kvp.Value);
            }

            if (component.ConditionalElements.Count > 0)
            {
                output.ConditionalElements = new Dictionary<string, JsonConditionalElement>();
                foreach (var kvp in component.ConditionalElements)
                {
                    output.ConditionalElements[kvp.Key] = ConvertToJsonConditional(kvp.Value);
                }
            }

            outputs.Add(output);
        }

        var jsonOptions = new JsonSerializerOptions
        {
            WriteIndented = true,
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
            Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping
        };

        return JsonSerializer.Serialize(outputs, jsonOptions);
    }

    /// <summary>
    /// Extracts templates from the VNode render tree.
    /// </summary>
    private void ExtractTemplates(ComponentModel component, VNodeModel node)
    {
        switch (node)
        {
            case VElementModel element:
                ExtractElementTemplates(component, element);
                break;

            case VTextModel text:
                ExtractTextTemplate(component, text);
                break;

            case VConditionalModel conditional:
                ExtractConditionalTemplates(component, conditional);
                break;

            case VListModel list:
                if (list.ItemTemplate != null)
                {
                    ExtractTemplates(component, list.ItemTemplate);
                }
                break;

            case VComponentWrapperModel:
                // Component wrappers don't generate templates directly
                break;
        }
    }

    private void ExtractElementTemplates(ComponentModel component, VElementModel element)
    {
        // Extract attribute templates
        foreach (var attr in element.Attributes)
        {
            var attrKey = $"{element.HexPath}.@{attr.Key}";
            var pathParts = element.HexPath.Split('.').ToList();

            if (attr.Value.IsDynamic)
            {
                var template = new TemplateInfo
                {
                    Template = "{0}",
                    Type = TemplateType.AttributeDynamic
                };
                template.Bindings.Add(attr.Value.Binding ?? attr.Value.RawValue);
                template.Slots.Add(0);
                template.Path.AddRange(pathParts);
                component.Templates[attrKey] = template;
            }
            else if (!attr.Value.IsEventHandler)
            {
                var template = new TemplateInfo
                {
                    Template = attr.Value.RawValue,
                    Type = TemplateType.AttributeStatic
                };
                template.Path.AddRange(pathParts);
                component.Templates[attrKey] = template;
            }
        }

        // Add key attribute template (auto-generated from HexPath)
        var keyPath = $"{element.HexPath}.@key";
        if (!component.Templates.ContainsKey(keyPath))
        {
            var keyTemplate = new TemplateInfo
            {
                Template = element.HexPath,
                Type = TemplateType.AttributeStatic
            };
            keyTemplate.Path.AddRange(element.HexPath.Split('.'));
            component.Templates[keyPath] = keyTemplate;
        }

        // Recurse into children
        foreach (var child in element.Children)
        {
            ExtractTemplates(component, child);
        }
    }

    private void ExtractTextTemplate(ComponentModel component, VTextModel text)
    {
        var pathParts = text.HexPath.Split('.').ToList();

        if (text.IsDynamic)
        {
            var template = new TemplateInfo
            {
                Template = "{0}",
                Type = TemplateType.Dynamic
            };
            template.Bindings.Add(text.Binding ?? "");
            template.Slots.Add(0);
            // For dynamic text, path points to parent element (omit last segment)
            // This matches Babel plugin behavior
            var parentPath = pathParts.Take(pathParts.Count - 1).ToList();
            template.Path.AddRange(parentPath);

            // Check for transforms (e.g., price.toFixed(2))
            if (text.Binding != null && text.Binding.Contains('.'))
            {
                var transformMatch = System.Text.RegularExpressions.Regex.Match(
                    text.Binding, @"(\w+)\.(\w+)\(([^)]*)\)");
                if (transformMatch.Success)
                {
                    template.Type = TemplateType.Transform;
                    template.Transform = new TransformInfo
                    {
                        Method = transformMatch.Groups[2].Value
                    };
                    var args = transformMatch.Groups[3].Value;
                    if (!string.IsNullOrEmpty(args))
                    {
                        foreach (var arg in args.Split(','))
                        {
                            if (int.TryParse(arg.Trim(), out var intArg))
                                template.Transform.Args.Add(intArg);
                            else
                                template.Transform.Args.Add(arg.Trim());
                        }
                    }
                    template.Bindings.Clear();
                    template.Bindings.Add(transformMatch.Groups[1].Value);
                }
            }

            // Check for nullable (optional chaining)
            if (text.Binding != null && text.Binding.Contains("?."))
            {
                template.Type = TemplateType.Nullable;
                template.Nullable = true;
            }

            component.Templates[text.HexPath] = template;
        }
        else
        {
            var template = new TemplateInfo
            {
                Template = text.Text,
                Type = TemplateType.Static
            };
            template.Path.AddRange(pathParts);
            component.Templates[text.HexPath] = template;
        }
    }

    private void ExtractConditionalTemplates(ComponentModel component, VConditionalModel conditional)
    {
        // Format condition expression with proper spacing
        var formattedCondition = FormatConditionExpression(conditional.Condition);

        // Create conditional element entry
        var condElement = new ConditionalElementInfo
        {
            ConditionExpression = formattedCondition,
            Operator = conditional.IsSimpleAnd ? "&&" : "?"
        };

        // Extract bindings from condition
        var bindingPattern = new System.Text.RegularExpressions.Regex(@"\b([a-zA-Z_]\w*)\b");
        var matches = bindingPattern.Matches(conditional.Condition);
        var stateIndex = 0;
        foreach (System.Text.RegularExpressions.Match match in matches)
        {
            var name = match.Groups[1].Value;
            // Skip keywords and operators
            if (name != "true" && name != "false" && name != "null" && name != "undefined")
            {
                condElement.ConditionBindings.Add($"state_{stateIndex++}");
            }
        }

        // Extract true branch
        if (conditional.TrueNode != null)
        {
            condElement.Branches.TrueBranch = ExtractBranchInfo(conditional.TrueNode);
            // Extract templates but mark as inside conditional
            ExtractTemplatesFromConditionalBranch(component, conditional.TrueNode);
        }

        // Extract false branch
        if (conditional.FalseNode != null)
        {
            condElement.Branches.FalseBranch = ExtractBranchInfo(conditional.FalseNode);
            ExtractTemplatesFromConditionalBranch(component, conditional.FalseNode);
        }

        component.ConditionalElements[conditional.HexPath] = condElement;
    }

    /// <summary>
    /// Formats condition expression with proper spacing around operators.
    /// </summary>
    private string FormatConditionExpression(string condition)
    {
        if (string.IsNullOrWhiteSpace(condition)) return condition;

        // Add spaces around && and ||
        var result = System.Text.RegularExpressions.Regex.Replace(
            condition.Trim(),
            @"\s*(&&|\|\|)\s*",
            " $1 ");

        return result.Trim();
    }

    /// <summary>
    /// Extracts templates from conditional branch nodes.
    /// Skips @key templates for elements inside conditionals (they're tracked in conditionalElements).
    /// </summary>
    private void ExtractTemplatesFromConditionalBranch(ComponentModel component, VNodeModel node)
    {
        switch (node)
        {
            case VElementModel element:
                ExtractElementTemplatesFromConditional(component, element);
                break;

            case VTextModel text:
                ExtractTextTemplate(component, text);
                break;

            case VConditionalModel conditional:
                ExtractConditionalTemplates(component, conditional);
                break;

            case VListModel list:
                if (list.ItemTemplate != null)
                {
                    ExtractTemplatesFromConditionalBranch(component, list.ItemTemplate);
                }
                break;
        }
    }

    /// <summary>
    /// Extracts templates from element inside a conditional branch.
    /// Skips @key templates since they're defined in conditionalElements.branches.
    /// </summary>
    private void ExtractElementTemplatesFromConditional(ComponentModel component, VElementModel element)
    {
        // Extract attribute templates (except for @key which is in conditionalElements)
        foreach (var attr in element.Attributes)
        {
            // Skip key attribute for conditional branch elements
            if (attr.Key == "key") continue;

            var attrKey = $"{element.HexPath}.@{attr.Key}";
            var pathParts = element.HexPath.Split('.').ToList();

            if (attr.Value.IsDynamic)
            {
                var template = new TemplateInfo
                {
                    Template = "{0}",
                    Type = TemplateType.AttributeDynamic
                };
                template.Bindings.Add(attr.Value.Binding ?? attr.Value.RawValue);
                template.Slots.Add(0);
                template.Path.AddRange(pathParts);
                component.Templates[attrKey] = template;
            }
            else if (!attr.Value.IsEventHandler)
            {
                var template = new TemplateInfo
                {
                    Template = attr.Value.RawValue,
                    Type = TemplateType.AttributeStatic
                };
                template.Path.AddRange(pathParts);
                component.Templates[attrKey] = template;
            }
        }

        // Do NOT add @key template for conditional branch elements

        // Recurse into children
        foreach (var child in element.Children)
        {
            ExtractTemplatesFromConditionalBranch(component, child);
        }
    }

    private ElementBranchInfo? ExtractBranchInfo(VNodeModel node)
    {
        return node switch
        {
            VElementModel element => ExtractElementBranchInfo(element),
            VTextModel text => new ElementBranchInfo
            {
                Type = "text",
                HexPath = text.HexPath,
                Value = text.IsDynamic ? null : text.Text,
                Binding = text.IsDynamic ? text.Binding : null
            },
            VNullModel => null,
            _ => null
        };
    }

    private ElementBranchInfo ExtractElementBranchInfo(VElementModel element)
    {
        var info = new ElementBranchInfo
        {
            Type = "element",
            Tag = element.TagName,
            HexPath = element.HexPath
        };

        // Add key attribute
        info.Attributes["key"] = element.HexPath;

        // Add other attributes (e.g., className)
        foreach (var attr in element.Attributes)
        {
            if (!attr.Value.IsEventHandler && !attr.Value.IsDynamic)
            {
                // Convert "class" back to "className" for JSON output
                var attrName = attr.Key == "class" ? "className" : attr.Key;
                info.Attributes[attrName] = attr.Value.RawValue;
            }
        }

        // Add children
        foreach (var child in element.Children)
        {
            var childInfo = ExtractBranchInfo(child);
            if (childInfo != null)
            {
                info.Children.Add(childInfo);
            }
        }

        return info;
    }

    private JsonTemplateEntry ConvertToJsonTemplate(TemplateInfo template)
    {
        var entry = new JsonTemplateEntry
        {
            Template = template.Template,
            Bindings = template.Bindings.ToArray(),
            Slots = template.Slots.ToArray(),
            Path = template.Path.ToArray(),
            Type = template.Type switch
            {
                TemplateType.Static => "static",
                TemplateType.Dynamic => "dynamic",
                TemplateType.Conditional => "conditional",
                TemplateType.Transform => "transform",
                TemplateType.Nullable => "nullable",
                TemplateType.AttributeStatic => "attribute-static",
                TemplateType.AttributeDynamic => "attribute-dynamic",
                _ => "static"
            }
        };

        if (template.ConditionalTemplates != null)
        {
            entry.ConditionalTemplates = template.ConditionalTemplates;
        }

        if (template.Transform != null)
        {
            entry.Transform = new JsonTransform
            {
                Method = template.Transform.Method,
                Args = template.Transform.Args.ToArray()
            };
        }

        if (template.Nullable)
        {
            entry.Nullable = true;
        }

        return entry;
    }

    private JsonConditionalElement ConvertToJsonConditional(ConditionalElementInfo info)
    {
        return new JsonConditionalElement
        {
            Type = info.Type,
            ConditionExpression = info.ConditionExpression,
            ConditionBindings = info.ConditionBindings.ToArray(),
            Evaluable = info.Evaluable,
            Operator = info.Operator,
            Branches = new JsonConditionalBranches
            {
                True = info.Branches.TrueBranch != null ? ConvertBranchToJson(info.Branches.TrueBranch) : null,
                False = info.Branches.FalseBranch != null ? ConvertBranchToJson(info.Branches.FalseBranch) : null
            }
        };
    }

    private JsonElementBranch ConvertBranchToJson(ElementBranchInfo branch)
    {
        return new JsonElementBranch
        {
            Type = branch.Type,
            // Only set Tag for element types, not text types
            Tag = branch.Type == "element" ? branch.Tag : null,
            HexPath = branch.HexPath,
            Attributes = branch.Attributes.Count > 0 ? branch.Attributes : null,
            Value = branch.Value,
            Binding = branch.Binding,
            Children = branch.Children.Count > 0
                ? branch.Children.Select(ConvertBranchToJson).ToArray()
                : null
        };
    }
}

#region JSON Output Models

internal class TemplateJsonOutput
{
    public string Component { get; set; } = "";
    public string Version { get; set; } = "1.0";
    public long GeneratedAt { get; set; }
    public Dictionary<string, JsonTemplateEntry> Templates { get; } = new();
    public Dictionary<string, JsonConditionalElement>? ConditionalElements { get; set; }
}

internal class JsonTemplateEntry
{
    public string Template { get; set; } = "";
    public string[] Bindings { get; set; } = Array.Empty<string>();
    public int[] Slots { get; set; } = Array.Empty<int>();
    public string[] Path { get; set; } = Array.Empty<string>();
    public string Type { get; set; } = "static";
    public Dictionary<string, string>? ConditionalTemplates { get; set; }
    public JsonTransform? Transform { get; set; }
    public bool? Nullable { get; set; }
}

internal class JsonTransform
{
    public string Method { get; set; } = "";
    public object[] Args { get; set; } = Array.Empty<object>();
}

internal class JsonConditionalElement
{
    public string Type { get; set; } = "conditional-element";
    public string ConditionExpression { get; set; } = "";
    public string[] ConditionBindings { get; set; } = Array.Empty<string>();
    public bool Evaluable { get; set; } = true;
    public string Operator { get; set; } = "&&";
    public JsonConditionalBranches Branches { get; set; } = new();
}

internal class JsonConditionalBranches
{
    [JsonPropertyName("true")]
    public JsonElementBranch? True { get; set; }

    [JsonPropertyName("false")]
    public JsonElementBranch? False { get; set; }
}

internal class JsonElementBranch
{
    public string Type { get; set; } = "element";

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? Tag { get; set; }

    public string HexPath { get; set; } = "";

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public Dictionary<string, string>? Attributes { get; set; }

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public JsonElementBranch[]? Children { get; set; }

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? Value { get; set; }

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? Binding { get; set; }
}

#endregion
