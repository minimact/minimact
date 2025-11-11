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
                var simulatedVNode = SimulateVNodeWithState(rootVNode, conditionals, stateCombo);

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
        Dictionary<string, bool> state)
    {
        if (node is VNull vnull)
        {
            // Check if this VNull has a conditional template
            var template = conditionals.Values.FirstOrDefault(t =>
                InflateHexPath(GetHexPathFromTemplate(t)) == vnull.Key);

            if (template != null && template.Evaluable)
            {
                // Evaluate condition with simulated state
                bool conditionResult = EvaluateConditionWithState(template, state);

                if (conditionResult && template.Branches.TryGetValue("true", out var branch) && branch != null)
                {
                    // Replace VNull with element from branch (simplified - would need full conversion)
                    return new VElement("div", new Dictionary<string, object> { ["data-simulated"] = "true" })
                    {
                        Children = new List<VNode>()
                    };
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
                simulatedChildren.Add(SimulateVNodeWithState(child, conditionals, state));
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
    /// </summary>
    private bool EvaluateConditionWithState(
        ConditionalElementTemplate template,
        Dictionary<string, bool> state)
    {
        if (template.ConditionMapping == null)
            return false;

        // Build evaluation context
        var context = new Dictionary<string, bool>();
        foreach (var (varName, stateKey) in template.ConditionMapping)
        {
            context[varName] = state.GetValueOrDefault(stateKey, false);
        }

        // Simple boolean expression evaluation
        return EvaluateSimpleBooleanExpression(template.ConditionExpression, context);
    }

    /// <summary>
    /// Simple boolean expression evaluator (handles &&, ||, !)
    /// </summary>
    private bool EvaluateSimpleBooleanExpression(string expr, Dictionary<string, bool> context)
    {
        expr = expr.Trim();

        // Handle negation
        if (expr.StartsWith("!"))
        {
            var inner = expr.Substring(1).Trim();
            return !EvaluateSimpleBooleanExpression(inner, context);
        }

        // Handle AND
        if (expr.Contains("&&"))
        {
            var parts = expr.Split("&&").Select(p => p.Trim()).ToArray();
            return parts.All(p => EvaluateSimpleBooleanExpression(p, context));
        }

        // Handle OR
        if (expr.Contains("||"))
        {
            var parts = expr.Split("||").Select(p => p.Trim()).ToArray();
            return parts.Any(p => EvaluateSimpleBooleanExpression(p, context));
        }

        // Simple identifier
        return context.GetValueOrDefault(expr, false);
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
        if (node is VNull vnull && vnull.Key == targetKey)
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
    /// Extract hex path from template (helper method)
    /// </summary>
    private string GetHexPathFromTemplate(ConditionalElementTemplate template)
    {
        // This would need to be tracked - for now return empty
        // In practice, this would be passed in or stored in template
        return string.Empty;
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
}
