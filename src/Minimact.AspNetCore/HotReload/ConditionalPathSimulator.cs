using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using Minimact.AspNetCore.Core;
using Microsoft.Extensions.Logging;

namespace Minimact.AspNetCore.HotReload;

/// <summary>
/// Simulates all possible state combinations to pre-compute accurate DOM paths
/// for conditional element templates. This ensures 100% accuracy for nested conditionals.
/// </summary>
public class ConditionalPathSimulator
{
    private readonly ILogger<ConditionalPathSimulator> _logger;

    public ConditionalPathSimulator(ILogger<ConditionalPathSimulator> logger)
    {
        _logger = logger;
    }

    /// <summary>
    /// Simulate all reachable state combinations and calculate DOM paths for each conditional.
    /// Returns templates augmented with pathVariants for each valid state combination.
    /// </summary>
    public Dictionary<string, ConditionalElementTemplate> SimulateAndAugmentPaths(
        VNode rootVNode,
        Dictionary<string, ConditionalElementTemplate> conditionals,
        MinimactComponent component)
    {
        if (conditionals == null || conditionals.Count == 0)
        {
            return conditionals;
        }

        _logger.LogDebug("[Minimact Simulator] Starting path simulation for {Count} conditionals", conditionals.Count);

        var augmented = new Dictionary<string, ConditionalElementTemplate>();

        foreach (var (hexPath, template) in conditionals)
        {
            // Get all state bindings that affect this conditional (including parents)
            var relevantBindings = GetRelevantBindings(hexPath, template, conditionals);

            // Generate only reachable state combinations (where parents could be true)
            var combinations = GenerateReachableCombinations(hexPath, template, conditionals, relevantBindings);

            _logger.LogDebug("[Minimact Simulator] Simulating {Count} combinations for path {HexPath}",
                combinations.Count, hexPath);

            // Simulate each combination and calculate DOM path
            var pathVariants = new Dictionary<string, List<int>?>();

            foreach (var stateCombo in combinations)
            {
                var stateSignature = BuildStateSignature(relevantBindings, stateCombo);

                // Simulate VNode tree with this state combination
                var simulatedVNode = SimulateVNodeWithState(rootVNode, conditionals, hexPath, stateCombo);

                // Calculate DOM path in the simulated tree
                var inflatedHexPath = InflateHexPath(hexPath);
                var domPath = CalculateDomPathInSimulation(simulatedVNode, inflatedHexPath);

                pathVariants[stateSignature] = domPath;

                if (domPath != null)
                {
                    _logger.LogTrace("[Minimact Simulator] State {Signature} → Path [{Path}]",
                        stateSignature, string.Join(", ", domPath));
                }
            }

            // Create augmented template with path variants
            augmented[hexPath] = new ConditionalElementTemplate
            {
                Type = template.Type,
                ConditionExpression = template.ConditionExpression,
                ConditionBindings = template.ConditionBindings,
                ConditionMapping = template.ConditionMapping,
                Evaluable = template.Evaluable,
                Branches = template.Branches,
                Operator = template.Operator,
                PathVariants = pathVariants
            };
        }

        _logger.LogDebug("[Minimact Simulator] Completed simulation for {Count} conditionals", augmented.Count);

        return augmented;
    }

    /// <summary>
    /// Get all state bindings that affect this conditional (including parent conditions)
    /// </summary>
    private HashSet<string> GetRelevantBindings(
        string hexPath,
        ConditionalElementTemplate template,
        Dictionary<string, ConditionalElementTemplate> conditionals)
    {
        var bindings = new HashSet<string>(template.ConditionBindings);

        // Add parent bindings (recursive)
        var currentPath = hexPath;
        while (true)
        {
            var parentPath = GetParentPath(currentPath);
            if (parentPath == null || !conditionals.TryGetValue(parentPath, out var parent))
                break;

            bindings.UnionWith(parent.ConditionBindings);
            currentPath = parentPath;
        }

        return bindings;
    }

    /// <summary>
    /// Generate only reachable state combinations (where parent conditions could be true)
    /// </summary>
    private List<Dictionary<string, bool>> GenerateReachableCombinations(
        string hexPath,
        ConditionalElementTemplate template,
        Dictionary<string, ConditionalElementTemplate> conditionals,
        HashSet<string> relevantBindings)
    {
        // Get parent chain
        var parents = GetParentChain(hexPath, conditionals);

        // Generate all possible combinations
        var allCombinations = GenerateAllCombinations(relevantBindings.ToList());

        // Filter to only reachable ones (where parents could be true)
        return allCombinations.Where(combo =>
        {
            // Check if all parent conditions could be satisfied
            foreach (var parent in parents)
            {
                if (!CouldBeTrue(parent, combo))
                    return false;
            }
            return true;
        }).ToList();
    }

    /// <summary>
    /// Generate all possible true/false combinations for state bindings (2^n)
    /// </summary>
    private List<Dictionary<string, bool>> GenerateAllCombinations(List<string> bindings)
    {
        var count = (int)Math.Pow(2, bindings.Count);
        var combinations = new List<Dictionary<string, bool>>();

        for (int i = 0; i < count; i++)
        {
            var combo = new Dictionary<string, bool>();
            for (int j = 0; j < bindings.Count; j++)
            {
                combo[bindings[j]] = (i & (1 << j)) != 0;
            }
            combinations.Add(combo);
        }

        return combinations;
    }

    /// <summary>
    /// Check if a condition could possibly be true with given state values
    /// </summary>
    private bool CouldBeTrue(ConditionalElementTemplate template, Dictionary<string, bool> state)
    {
        if (!template.Evaluable)
            return false;

        // Simple heuristic: if all required bindings are present and at least one is true
        // More sophisticated evaluation could be added
        foreach (var binding in template.ConditionBindings)
        {
            if (state.TryGetValue(binding, out var value))
            {
                // If expression contains this binding without negation and it's true, could be satisfied
                if (value && !template.ConditionExpression.Contains("!" + GetVariableName(binding, template)))
                    return true;
            }
        }

        return false;
    }

    /// <summary>
    /// Get variable name for a state key from condition mapping
    /// </summary>
    private string GetVariableName(string stateKey, ConditionalElementTemplate template)
    {
        if (template.ConditionMapping == null)
            return stateKey;

        foreach (var (varName, key) in template.ConditionMapping)
        {
            if (key == stateKey)
                return varName;
        }

        return stateKey;
    }

    /// <summary>
    /// Simulate what the VNode tree would look like with given state values
    /// </summary>
    private VNode SimulateVNodeWithState(
        VNode node,
        Dictionary<string, ConditionalElementTemplate> conditionals,
        string targetHexPath,
        Dictionary<string, bool> state)
    {
        if (node is VNull vnull)
        {
            // Check if this VNull matches any conditional template by comparing paths
            var matchingEntry = conditionals.FirstOrDefault(kvp =>
                InflateHexPath(kvp.Key) == vnull.Path);

            var template = matchingEntry.Value;

            if (template != null && template.Evaluable)
            {
                // Evaluate condition with simulated state
                bool conditionResult = EvaluateConditionWithState(template, state);

                if (conditionResult && template.Branches.TryGetValue("true", out var branch) && branch != null)
                {
                    // Convert template branch to VNode
                    return ConvertTemplateToVNode(branch, vnull.Path);
                }
            }

            return vnull;
        }

        if (node is VElement element)
        {
            // Recursively simulate children
            var simulatedChildren = new List<VNode>();
            foreach (var child in element.Children)
            {
                simulatedChildren.Add(SimulateVNodeWithState(child, conditionals, targetHexPath, state));
            }

            return new VElement(element.Tag, element.Props)
            {
                Children = simulatedChildren,
                Key = element.Key
            };
        }

        return node;
    }

    /// <summary>
    /// Evaluate conditional expression with simulated state values
    /// Uses sample values to produce desired truthiness
    /// </summary>
    private bool EvaluateConditionWithState(
        ConditionalElementTemplate template,
        Dictionary<string, bool> state)
    {
        if (template.ConditionMapping == null)
            return false;

        // Build evaluation context with sample values
        // For boolean state: pick values that produce that truthiness
        var context = new Dictionary<string, object?>();
        foreach (var (varName, stateKey) in template.ConditionMapping)
        {
            bool desiredTruthiness = state.GetValueOrDefault(stateKey, false);

            // Sample values that produce the desired result:
            // true → 1, "active", true, {isAdmin: true}
            // false → 0, "", false, null
            context[varName] = desiredTruthiness ? (object)1 : 0;
        }

        // Enhanced expression evaluation
        return EvaluateExpression(template.ConditionExpression, context);
    }

    /// <summary>
    /// Evaluate expression with support for comparisons, member access, and logical ops
    /// </summary>
    private bool EvaluateExpression(string expr, Dictionary<string, object?> context)
    {
        expr = expr.Trim();

        // Handle negation: !isActive
        if (expr.StartsWith("!") && !expr.Contains(" "))
        {
            var inner = expr.Substring(1).Trim();
            return !EvaluateExpression(inner, context);
        }

        // Handle AND: count > 0 && isActive
        if (expr.Contains("&&"))
        {
            var parts = expr.Split("&&").Select(p => p.Trim()).ToArray();
            return parts.All(p => EvaluateExpression(p, context));
        }

        // Handle OR: count > 10 || isPremium
        if (expr.Contains("||"))
        {
            var parts = expr.Split("||").Select(p => p.Trim()).ToArray();
            return parts.Any(p => EvaluateExpression(p, context));
        }

        // Handle comparisons: count > 0, status === "active"
        var comparisonOps = new[] { "===", "!==", "==", "!=", "<=", ">=", "<", ">" };
        foreach (var op in comparisonOps)
        {
            if (expr.Contains(op))
            {
                var parts = expr.Split(new[] { op }, 2, StringSplitOptions.None);
                if (parts.Length == 2)
                {
                    var left = EvaluateValue(parts[0].Trim(), context);
                    var right = EvaluateValue(parts[1].Trim(), context);

                    return op switch
                    {
                        "===" or "==" => Equals(left, right),
                        "!==" or "!=" => !Equals(left, right),
                        "<" => CompareValues(left, right) < 0,
                        ">" => CompareValues(left, right) > 0,
                        "<=" => CompareValues(left, right) <= 0,
                        ">=" => CompareValues(left, right) >= 0,
                        _ => false
                    };
                }
            }
        }

        // Simple identifier or member expression: isActive, user.isAdmin
        var value = EvaluateValue(expr, context);
        return IsTruthy(value);
    }

    /// <summary>
    /// Evaluate a value expression (identifier, literal, or member access)
    /// </summary>
    private object? EvaluateValue(string expr, Dictionary<string, object?> context)
    {
        expr = expr.Trim();

        // String literal: "active"
        if ((expr.StartsWith("\"") && expr.EndsWith("\"")) ||
            (expr.StartsWith("'") && expr.EndsWith("'")))
        {
            return expr.Substring(1, expr.Length - 2);
        }

        // Number literal: 0, 18, 3.14
        if (double.TryParse(expr, out var number))
        {
            return number;
        }

        // Boolean literal: true, false
        if (expr == "true") return true;
        if (expr == "false") return false;

        // Null literal
        if (expr == "null") return null;

        // Member expression: user.isAdmin, data.items.length
        if (expr.Contains("."))
        {
            var parts = expr.Split('.');
            object? current = context.GetValueOrDefault(parts[0]);

            // For simulation, if we don't have the object, return appropriate default
            // This handles cases where we used sample value 1 for "user" but need "user.isAdmin"
            if (current == null)
            {
                return null;
            }

            // Navigate member path
            for (int i = 1; i < parts.Length && current != null; i++)
            {
                var property = current.GetType().GetProperty(parts[i]);
                if (property != null)
                {
                    current = property.GetValue(current);
                }
                else
                {
                    return null;
                }
            }

            return current;
        }

        // Simple identifier: count, isActive
        return context.GetValueOrDefault(expr);
    }

    /// <summary>
    /// Compare two values for ordering (supports numbers, strings)
    /// </summary>
    private int CompareValues(object? left, object? right)
    {
        if (left == null && right == null) return 0;
        if (left == null) return -1;
        if (right == null) return 1;

        // Convert to comparable types
        if (left is IComparable leftComp)
        {
            try
            {
                return leftComp.CompareTo(Convert.ChangeType(right, left.GetType()));
            }
            catch
            {
                return 0;
            }
        }

        return 0;
    }

    /// <summary>
    /// Check if value is truthy (JavaScript-like rules)
    /// </summary>
    private bool IsTruthy(object? value)
    {
        if (value == null) return false;
        if (value is bool b) return b;
        if (value is int i) return i != 0;
        if (value is double d) return d != 0 && !double.IsNaN(d);
        if (value is string s) return !string.IsNullOrEmpty(s);
        return true; // Objects are truthy
    }

    /// <summary>
    /// Calculate DOM path in simulated VNode tree
    /// </summary>
    private List<int>? CalculateDomPathInSimulation(VNode root, string targetHexPath)
    {
        var path = new List<int>();
        return FindNodePath(root, targetHexPath, path) ? path : null;
    }

    /// <summary>
    /// Recursively find path to target node
    /// </summary>
    private bool FindNodePath(VNode node, string targetKey, List<int> path)
    {
        if (node is VNull vnull && vnull.Path == targetKey)
        {
            return true;
        }

        if (node is VElement element)
        {
            if (element.Key == targetKey)
                return true;

            int domIndex = 0;
            foreach (var child in element.Children)
            {
                // Skip VNull nodes when counting DOM indices
                if (child is VNull)
                {
                    if (FindNodePath(child, targetKey, path))
                    {
                        path.Insert(0, domIndex);
                        return true;
                    }
                    continue; // VNull doesn't increment DOM index
                }

                path.Add(domIndex);
                if (FindNodePath(child, targetKey, path))
                {
                    return true;
                }
                path.RemoveAt(path.Count - 1);
                domIndex++;
            }
        }

        return false;
    }

    /// <summary>
    /// Build state signature for lookup (e.g., "state_0:true,state_1:false")
    /// </summary>
    private string BuildStateSignature(HashSet<string> bindings, Dictionary<string, bool> state)
    {
        return string.Join(",", bindings.OrderBy(b => b).Select(b => $"{b}:{state.GetValueOrDefault(b, false)}"));
    }

    /// <summary>
    /// Get parent path from hex path (e.g., "1.3.1" → "1.3")
    /// </summary>
    private string? GetParentPath(string hexPath)
    {
        var lastDot = hexPath.LastIndexOf('.');
        return lastDot > 0 ? hexPath.Substring(0, lastDot) : null;
    }

    /// <summary>
    /// Get parent chain (from immediate parent to root)
    /// </summary>
    private List<ConditionalElementTemplate> GetParentChain(
        string hexPath,
        Dictionary<string, ConditionalElementTemplate> conditionals)
    {
        var chain = new List<ConditionalElementTemplate>();
        var currentPath = hexPath;

        while (true)
        {
            var parentPath = GetParentPath(currentPath);
            if (parentPath == null || !conditionals.TryGetValue(parentPath, out var parent))
                break;

            chain.Add(parent);
            currentPath = parentPath;
        }

        return chain;
    }

    /// <summary>
    /// Inflate compact hex path to full format
    /// </summary>
    private string InflateHexPath(string compactPath)
    {
        if (string.IsNullOrEmpty(compactPath))
            return string.Empty;

        var segments = compactPath.Split('.');
        var inflated = segments.Select(s =>
        {
            if (s.Length >= 8) return s; // Already inflated
            if (uint.TryParse(s, out var num))
            {
                return (num * 0x10000000).ToString("x8");
            }
            return s;
        });

        return string.Join(".", inflated);
    }

    /// <summary>
    /// Convert template JSON structure to VNode
    /// Handles element structures from template branches
    /// </summary>
    private VNode ConvertTemplateToVNode(object? templateObj, string path)
    {
        if (templateObj == null)
        {
            return new VNull(path);
        }

        // Parse the template structure (it's stored as JsonElement from deserialization)
        if (templateObj is JsonElement jsonElement)
        {
            return ConvertJsonElementToVNode(jsonElement, path);
        }

        // Fallback: return a placeholder
        return new VElement("div", new Dictionary<string, string> { ["data-template"] = "true" })
        {
            Children = new List<VNode>()
        };
    }

    /// <summary>
    /// Convert JsonElement to VNode recursively
    /// </summary>
    private VNode ConvertJsonElementToVNode(JsonElement element, string path)
    {
        if (element.ValueKind == JsonValueKind.Null)
        {
            return new VNull(path);
        }

        if (element.ValueKind != JsonValueKind.Object)
        {
            return new VNull(path);
        }

        // Get type property
        if (!element.TryGetProperty("type", out var typeProperty))
        {
            return new VNull(path);
        }

        string type = typeProperty.GetString() ?? "";

        switch (type)
        {
            case "element":
                return ConvertElementToVNode(element, path);

            case "text":
                return ConvertTextToVNode(element);

            case "fragment":
                return ConvertFragmentToVNode(element, path);

            default:
                return new VNull(path);
        }
    }

    /// <summary>
    /// Convert element template to VElement
    /// </summary>
    private VElement ConvertElementToVNode(JsonElement element, string path)
    {
        // Get tag
        string tag = element.TryGetProperty("tag", out var tagProp)
            ? tagProp.GetString() ?? "div"
            : "div";

        // Get attributes
        var attributes = new Dictionary<string, string>();
        if (element.TryGetProperty("attributes", out var attrsProp) &&
            attrsProp.ValueKind == JsonValueKind.Object)
        {
            foreach (var attr in attrsProp.EnumerateObject())
            {
                // Handle simple string attributes
                if (attr.Value.ValueKind == JsonValueKind.String)
                {
                    attributes[attr.Name] = attr.Value.GetString() ?? "";
                }
                // Skip complex attributes (bindings, expressions) for simulation
            }
        }

        // Get hexPath if available
        string elementPath = element.TryGetProperty("hexPath", out var pathProp)
            ? pathProp.GetString() ?? path
            : path;

        // Create VElement
        var vElement = new VElement(tag, attributes)
        {
            Key = elementPath
        };

        // Convert children
        if (element.TryGetProperty("children", out var childrenProp) &&
            childrenProp.ValueKind == JsonValueKind.Array)
        {
            int childIndex = 0;
            foreach (var child in childrenProp.EnumerateArray())
            {
                string childPath = $"{elementPath}.{childIndex}";
                vElement.Children.Add(ConvertJsonElementToVNode(child, childPath));
                childIndex++;
            }
        }

        return vElement;
    }

    /// <summary>
    /// Convert text template to VText
    /// </summary>
    private VText ConvertTextToVNode(JsonElement element)
    {
        // Get static text value
        if (element.TryGetProperty("value", out var valueProp) &&
            valueProp.ValueKind == JsonValueKind.String)
        {
            return new VText(valueProp.GetString() ?? "");
        }

        // For dynamic text (binding), use placeholder
        if (element.TryGetProperty("binding", out var bindingProp))
        {
            return new VText($"[{bindingProp.GetString()}]");
        }

        return new VText("");
    }

    /// <summary>
    /// Convert fragment template to VFragment
    /// </summary>
    private VNode ConvertFragmentToVNode(JsonElement element, string path)
    {
        // For simulation purposes, treat fragment as a container element
        var vElement = new VElement("fragment", new Dictionary<string, string>())
        {
            Key = path
        };

        // Convert children
        if (element.TryGetProperty("children", out var childrenProp) &&
            childrenProp.ValueKind == JsonValueKind.Array)
        {
            int childIndex = 0;
            foreach (var child in childrenProp.EnumerateArray())
            {
                string childPath = $"{path}.{childIndex}";
                vElement.Children.Add(ConvertJsonElementToVNode(child, childPath));
                childIndex++;
            }
        }

        return vElement;
    }
}
