using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.Json;
using Minimact.Transpiler.CodeGen.Converters;
using Minimact.Transpiler.CodeGen.Nodes;
using Minimact.Transpiler.CodeGen.Visitors;

namespace Minimact.Transpiler.CodeGen.Generators;

/// <summary>
/// Generates VNode tree construction code from JSON IR
/// Matches the behavior of babel-plugin-minimact/src/generators/jsx.cjs
/// </summary>
public class VNodeTreeGenerator
{
    private readonly ExpressionConverter _expressionConverter;
    private readonly StringBuilder _output;

    public VNodeTreeGenerator(ExpressionConverter? expressionConverter = null)
    {
        _expressionConverter = expressionConverter ?? new ExpressionConverter();
        _output = new StringBuilder();
    }

    public string Generate(RenderMethodNode renderMethod)
    {
        _output.Clear();

        if (renderMethod.Children == null || renderMethod.Children.Count == 0)
        {
            return "new VNode()";
        }

        if (renderMethod.Children.Count == 1)
        {
            return GenerateVNode(renderMethod.Children[0]);
        }

        // Multiple root children - wrap in Fragment
        return GenerateFragment(renderMethod.Children);
    }

    private string GenerateVNode(BaseNode node)
    {
        return node switch
        {
            JSXElementNode element => GenerateVElement(element),
            StaticTextNode text => GenerateStaticText(text),
            TextTemplateNode template => GenerateTextTemplate(template),
            // Check if ExpressionNode is actually a loop (CallExpression with .map())
            ExpressionNode expr when expr.LoopTemplate != null => GenerateLoopFromExpression(expr),
            // Check if ExpressionNode is actually a conditional (LogicalExpression with &&)
            ExpressionNode expr when expr.IsConditional == true => GenerateLogicalExpression(expr),
            ComplexTemplateNode complex => GenerateComplexTemplate(complex),
            ConditionalTemplateNode conditional => GenerateConditional(conditional),
            LoopTemplateNode loop => GenerateLoop(loop),
            _ => throw new NotImplementedException($"VNode generation not implemented for {node.GetType().Name}")
        };
    }

    #region VElement Generation

    private string GenerateVElement(JSXElementNode element)
    {
        var tag = element.Tag;
        var propsDict = GeneratePropsDict(element.Attributes);
        var children = element.Children ?? new List<BaseNode>();

        // No children
        if (children.Count == 0)
        {
            return $"new VElement(\"{tag}\", {propsDict})";
        }

        // Single child optimization
        if (children.Count == 1)
        {
            var child = children[0];

            // Single static text - use string overload
            if (child is StaticTextNode staticText)
            {
                var escapedText = EscapeString(staticText.Content);
                return $"new VElement(\"{tag}\", {propsDict}, \"{escapedText}\")";
            }

            // Single child node
            var childCode = GenerateVNode(child);
            return $"new VElement(\"{tag}\", {propsDict}, new VNode[] {{ {childCode} }})";
        }

        // Multiple children
        var childrenArray = GenerateChildrenArray(children);
        return $"new VElement(\"{tag}\", {propsDict}, new VNode[] {{ {childrenArray} }})";
    }

    private string GeneratePropsDict(List<BaseNode>? attributes)
    {
        if (attributes == null || attributes.Count == 0)
        {
            return "new Dictionary<string, string>()";
        }

        var props = new List<string>();

        foreach (var attr in attributes)
        {
            // Handle different attribute node types
            if (attr is StaticAttributeNode staticAttr)
            {
                var htmlAttrName = staticAttr.Name == "className" ? "class" : staticAttr.Name;
                var escapedValue = EscapeString(staticAttr.Value);
                props.Add("[\"" + htmlAttrName + "\"] = \"" + escapedValue + "\"");
            }
            else if (attr is DynamicAttributeNode dynamicAttr)
            {
                var htmlAttrName = dynamicAttr.Name == "className" ? "class" : dynamicAttr.Name;

                // Handle style objects (subtype: "style-object")
                if (dynamicAttr.Subtype == "style-object" && dynamicAttr.StyleObject != null)
                {
                    var css = dynamicAttr.StyleObject.Css ?? "";
                    var escapedCss = EscapeString(css);
                    props.Add($"[\"{htmlAttrName}\"] = \"{escapedCss}\"");
                }
                else if (dynamicAttr.Bindings != null && dynamicAttr.Bindings.Count > 0 && dynamicAttr.Template != null)
                {
                    var csharpTemplate = ConvertTemplateToCSharp(dynamicAttr.Template, dynamicAttr.Bindings);
                    props.Add($"[\"{htmlAttrName}\"] = $\"{csharpTemplate}\"");
                }
                else if (dynamicAttr.Value != null)
                {
                    var escapedValue = EscapeString(dynamicAttr.Value);
                    props.Add($"[\"{htmlAttrName}\"] = \"{escapedValue}\"");
                }
            }
            else if (attr is EventHandlerAttributeNode eventAttr)
            {
                props.Add($"[\"{eventAttr.Name.ToLower()}\"] = \"{eventAttr.HandlerName}\"");
            }
            else if (attr is AttributeTemplateNode attrTemplate)
            {
                var name = attrTemplate.Attribute;
                var htmlAttrName = name == "className" ? "class" : name;

                if (attrTemplate.Subtype == "static")
                {
                    var escapedValue = EscapeString(attrTemplate.Template);
                    props.Add($"[\"{htmlAttrName}\"] = \"{escapedValue}\"");
                }
                else if (name.StartsWith("on"))
                {
                    props.Add($"[\"{name.ToLower()}\"] = \"{attrTemplate.Template}\"");
                }
                else if (attrTemplate.Bindings != null && attrTemplate.Bindings.Count > 0)
                {
                    var csharpTemplate = ConvertTemplateToCSharp(attrTemplate.Template, attrTemplate.Bindings);
                    props.Add($"[\"{htmlAttrName}\"] = $\"{csharpTemplate}\"");
                }
                else
                {
                    var escapedValue = EscapeString(attrTemplate.Template);
                    props.Add($"[\"{htmlAttrName}\"] = \"{escapedValue}\"");
                }
            }
        }

        if (props.Count == 0)
        {
            return "new Dictionary<string, string>()";
        }

        return $"new Dictionary<string, string> {{ {string.Join(", ", props)} }}";
    }

    #endregion

    #region Children Generation

    private string GenerateChildrenArray(List<BaseNode> children)
    {
        // Detect and merge consecutive text/expression children into mixed content
        var processed = ProcessMixedContent(children);

        var childCodes = processed.Select(child =>
        {
            if (child is MixedContentNode mixed)
            {
                return GenerateMixedContent(mixed);
            }
            else
            {
                return GenerateVNode(child);
            }
        });

        return string.Join(", ", childCodes);
    }

    private List<BaseNode> ProcessMixedContent(List<BaseNode> children)
    {
        var result = new List<BaseNode>();
        var i = 0;

        while (i < children.Count)
        {
            var current = children[i];

            // Check if this starts a mixed content sequence
            if (IsTextOrExpression(current) && i + 1 < children.Count && IsTextOrExpression(children[i + 1]))
            {
                // Collect consecutive text/expression children
                var mixedChildren = new List<BaseNode> { current };
                var j = i + 1;

                while (j < children.Count && IsTextOrExpression(children[j]))
                {
                    mixedChildren.Add(children[j]);
                    j++;
                }

                // Create mixed content node
                result.Add(new MixedContentNode { Children = mixedChildren });
                i = j;
            }
            else
            {
                result.Add(current);
                i++;
            }
        }

        return result;
    }

    private bool IsTextOrExpression(BaseNode node)
    {
        // ExpressionNode with structural properties should NOT be treated as text
        // They should be treated as structural nodes (like JSXElement)
        if (node is ExpressionNode expr)
        {
            // Loop expressions are structural
            if (expr.LoopTemplate != null) return false;

            // Conditional expressions are structural
            if (expr.IsConditional == true) return false;
        }

        return node is StaticTextNode ||
               node is TextTemplateNode ||
               node is ComplexTemplateNode;
    }

    private string GenerateMixedContent(MixedContentNode mixed)
    {
        // Build a single interpolated string from multiple text/expression children
        var parts = mixed.Children.Select(child => child switch
        {
            StaticTextNode text => EscapeStringForInterpolation(text.Content),
            TextTemplateNode template => ConvertTemplateForInterpolation(template.Template, template.Bindings),
            ComplexTemplateNode complex => GenerateComplexExpression(complex),
            _ => ""
        });

        var interpolatedString = string.Join("", parts);
        return $"new VText($\"{interpolatedString}\")";
    }

    #endregion

    #region Text Generation

    private string GenerateStaticText(StaticTextNode text)
    {
        var escaped = EscapeString(text.Content);
        return $"new VText(\"{escaped}\")";
    }

    private string GenerateTextTemplate(TextTemplateNode template)
    {
        // Convert "{0}" placeholders to C# string interpolation
        var csharpTemplate = ConvertTemplateToCSharp(template.Template, template.Bindings);
        return $"new VText($\"{csharpTemplate}\")";
    }

    private string GenerateComplexTemplate(ComplexTemplateNode complex)
    {
        var csharpExpr = GenerateComplexExpression(complex);
        return $"new VText($\"{{{csharpExpr}}}\")";
    }

    private string GenerateComplexExpression(ComplexTemplateNode complex)
    {
        // Evaluate expression tree
        if (complex.ExpressionTree != null)
        {
            return EvaluateExpressionTree(complex.ExpressionTree, complex.Bindings);
        }

        // Fallback to template
        return ConvertTemplateToCSharp(complex.Template, complex.Bindings);
    }

    #endregion

    #region Conditional and Loop Generation

    private string GenerateConditional(ConditionalTemplateNode conditional)
    {
        var condition = conditional.Condition;

        var consequent = conditional.Consequent != null
            ? GenerateVNode(conditional.Consequent)
            : "null";

        var alternate = conditional.Alternate != null
            ? GenerateVNode(conditional.Alternate)
            : "null";

        // For null branches, use empty VNode instead
        if (consequent == "null") consequent = "new VNode()";
        if (alternate == "null") alternate = "new VNode()";

        return $"({condition}) ? {consequent} : {alternate}";
    }

    private string GenerateLogicalExpression(ExpressionNode expr)
    {
        // Handle LogicalExpression with && operator
        // Example: {isAdmin && <div>Admin Panel</div>}
        // Generates: (isAdmin) ? <VNode> : null

        var op = expr.Operator ?? "&&"; // Default to && if operator is null

        if (op == "&&")
        {
            var condition = expr.Condition ?? "true";

            // Get the first branch (the consequent when condition is true)
            var consequent = expr.Branches != null && expr.Branches.Count > 0
                ? GenerateVNode(expr.Branches[0])
                : "null";

            // For && operator, if condition is false, result is null (nothing rendered)
            return $"({condition}) ? {consequent} : null";
        }
        else if (op == "||")
        {
            // Handle || operator
            // Example: {error || <div>No error</div>}
            // Generates: (error) ? null : <VNode>
            var condition = expr.Condition ?? "false";

            var alternate = expr.Branches != null && expr.Branches.Count > 0
                ? GenerateVNode(expr.Branches[0])
                : "null";

            return $"({condition}) ? null : {alternate}";
        }
        else
        {
            throw new NotImplementedException($"Logical operator '{op}' not supported");
        }
    }

    private string GenerateLoopFromExpression(ExpressionNode expr)
    {
        // Extract loop info from ExpressionNode.LoopTemplate
        var loopInfo = expr.LoopTemplate!;
        var collection = loopInfo.ArrayBinding;
        var itemParam = loopInfo.ItemVar;
        var body = loopInfo.Body != null ? GenerateVElement(loopInfo.Body) : "new VNode()";

        // Check if collection needs dynamic cast
        var needsCast = collection.Contains("?.") || collection.Contains("?");
        var castedCollection = needsCast ? $"((IEnumerable<dynamic>){collection})" : collection;

        return $"{castedCollection}.Select({itemParam} => {body}).ToArray()";
    }

    private string GenerateLoop(LoopTemplateNode loop)
    {
        // Generate: collection.Select(item => <VNode>).ToArray()
        var collection = loop.Binding;
        var itemParam = loop.ItemVar;
        var body = loop.Body != null ? GenerateVElement(loop.Body) : "new VNode()";

        // Check if collection needs dynamic cast
        var needsCast = collection.Contains("?.") || collection.Contains("?");
        var castedCollection = needsCast ? $"((IEnumerable<dynamic>){collection})" : collection;

        return $"{castedCollection}.Select({itemParam} => {body}).ToArray()";
    }

    private string GenerateFragment(List<BaseNode> children)
    {
        if (children == null || children.Count == 0)
        {
            return "new Fragment()";
        }

        var childCodes = children.Select(GenerateVNode);
        return $"new Fragment({string.Join(", ", childCodes)})";
    }

    #endregion

    #region Helper Methods

    private string ConvertTemplateToCSharp(string template, List<BindingNode> bindings)
    {
        // Convert "{0}" placeholders to "{binding}" for C# string interpolation
        // Example: "Count: {0}" + [{"path": "count"}] → "Count: {count}"
        var result = template;

        for (int i = 0; i < bindings.Count; i++)
        {
            var bindingPath = bindings[i].Path;
            result = result.Replace($"{{{i}}}", $"{{{bindingPath}}}");
        }

        return EscapeString(result);
    }

    private string EvaluateExpressionTree(ExpressionTreeNode expressionTree, List<BindingNode> bindings)
    {
        return expressionTree.Type switch
        {
            "Binding" when expressionTree.Slot.HasValue =>
                bindings[expressionTree.Slot.Value].Path,

            "Literal" when expressionTree.Raw != null =>
                expressionTree.Raw,

            "BinaryExpression" => EvaluateBinaryExpression(expressionTree, bindings),

            _ => "<complex>"
        };
    }

    private string EvaluateBinaryExpression(ExpressionTreeNode expr, List<BindingNode> bindings)
    {
        var left = expr.Left != null
            ? EvaluateExpressionTree(expr.Left, bindings)
            : "";

        var right = expr.Right != null
            ? EvaluateExpressionTree(expr.Right, bindings)
            : "";

        var op = expr.Operator ?? "+";

        return $"({left} {op} {right})";
    }

    private string ConvertStyleObjectToCss(object? styleObject)
    {
        // TODO: Implement style object to CSS string conversion
        // For now, return empty string
        return "";
    }

    private string EscapeString(string str)
    {
        return str
            .Replace("\\", "\\\\")
            .Replace("\"", "\\\"")
            .Replace("\n", "\\n")
            .Replace("\r", "\\r")
            .Replace("\t", "\\t");
    }

    /// <summary>
    /// Escape string for use in C# interpolated string ($"...") context
    /// Identical to EscapeString since braces aren't escaped
    /// </summary>
    private string EscapeStringForInterpolation(string str)
    {
        return EscapeString(str);
    }

    /// <summary>
    /// Convert template with bindings for use directly in interpolated string
    /// Example: "{0}" + [{"path": "count"}] → "{count}"
    /// </summary>
    private string ConvertTemplateForInterpolation(string template, List<BindingNode> bindings)
    {
        var result = template;

        for (int i = 0; i < bindings.Count; i++)
        {
            var bindingPath = bindings[i].Path;
            result = result.Replace($"{{{i}}}", $"{{{bindingPath}}}");
        }

        return EscapeString(result);
    }

    #endregion
}

#region Helper Node Classes

/// <summary>
/// Temporary node for mixed content (consecutive text/expression children)
/// </summary>
internal class MixedContentNode : BaseNode
{
    public List<BaseNode> Children { get; set; } = new();
    public override void Accept(INodeVisitor visitor) => throw new NotImplementedException();
}

#endregion
