using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Json.Serialization;
using Reluxer.Transformer.Models;

namespace Reluxer.Transformer;

/// <summary>
/// Generates .structural-changes.json files from VNode render trees.
/// These files describe VNode tree structure for initial render and hot reload.
/// Used by StructuralChangeManager on the server to apply JSX changes without full page reload.
/// </summary>
public class StructuralChangesGenerator
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        WriteIndented = true,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
        Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping
    };

    /// <summary>
    /// Generates structural changes JSON for a single component.
    /// This generates "insert" operations for the entire tree (initial render).
    /// </summary>
    public string Generate(ComponentModel component, string? sourceFile = null)
    {
        var output = new StructuralChangesOutput
        {
            ComponentName = component.Name,
            Timestamp = DateTime.UtcNow.ToString("O"),
            SourceFile = sourceFile
        };

        if (component.RenderTree != null)
        {
            GenerateInsertOperations(component.RenderTree, output.Changes);
        }

        return JsonSerializer.Serialize(output, JsonOptions);
    }

    /// <summary>
    /// Generates structural changes by comparing old vs new render trees (for hot reload).
    /// </summary>
    public string GenerateWithDiff(
        ComponentModel component,
        VNodeModel? previousTree,
        string? sourceFile = null)
    {
        var output = new StructuralChangesOutput
        {
            ComponentName = component.Name,
            Timestamp = DateTime.UtcNow.ToString("O"),
            SourceFile = sourceFile
        };

        if (previousTree == null)
        {
            // No previous tree - all inserts
            if (component.RenderTree != null)
            {
                GenerateInsertOperations(component.RenderTree, output.Changes);
            }
        }
        else
        {
            // Diff trees to find changes
            DiffTrees(previousTree, component.RenderTree, output.Changes);
        }

        return JsonSerializer.Serialize(output, JsonOptions);
    }

    /// <summary>
    /// Generates insert operations for the entire VNode tree.
    /// </summary>
    private void GenerateInsertOperations(VNodeModel node, List<StructuralChange> changes)
    {
        var vnodeJson = ConvertToVNodeJson(node);
        changes.Add(new StructuralChange
        {
            Type = "insert",
            Path = node.HexPath,
            VNode = vnodeJson
        });

        // Recursively process children
        if (node is VElementModel element)
        {
            foreach (var child in element.Children)
            {
                GenerateInsertOperations(child, changes);
            }
        }
        else if (node is VConditionalModel conditional)
        {
            if (conditional.TrueNode != null)
            {
                GenerateInsertOperations(conditional.TrueNode, changes);
            }
            if (conditional.FalseNode != null)
            {
                GenerateInsertOperations(conditional.FalseNode, changes);
            }
        }
        else if (node is VListModel list)
        {
            if (list.ItemTemplate != null)
            {
                GenerateInsertOperations(list.ItemTemplate, changes);
            }
        }
    }

    /// <summary>
    /// Diffs two VNode trees to generate structural changes.
    /// </summary>
    private void DiffTrees(VNodeModel? oldNode, VNodeModel? newNode, List<StructuralChange> changes)
    {
        // Node removed
        if (oldNode != null && newNode == null)
        {
            changes.Add(new StructuralChange
            {
                Type = "delete",
                Path = oldNode.HexPath
            });
            return;
        }

        // Node added
        if (oldNode == null && newNode != null)
        {
            changes.Add(new StructuralChange
            {
                Type = "insert",
                Path = newNode.HexPath,
                VNode = ConvertToVNodeJson(newNode)
            });
            return;
        }

        // Both null - nothing to do
        if (oldNode == null || newNode == null) return;

        // Check if node type changed
        if (oldNode.GetType() != newNode.GetType())
        {
            changes.Add(new StructuralChange
            {
                Type = "delete",
                Path = oldNode.HexPath
            });
            changes.Add(new StructuralChange
            {
                Type = "insert",
                Path = newNode.HexPath,
                VNode = ConvertToVNodeJson(newNode)
            });
            return;
        }

        // Same type - check for updates
        if (oldNode is VElementModel oldElem && newNode is VElementModel newElem)
        {
            DiffElements(oldElem, newElem, changes);
        }
        else if (oldNode is VTextModel oldText && newNode is VTextModel newText)
        {
            if (oldText.Text != newText.Text || oldText.IsDynamic != newText.IsDynamic)
            {
                changes.Add(new StructuralChange
                {
                    Type = "update",
                    Path = newText.HexPath,
                    VNode = ConvertToVNodeJson(newText)
                });
            }
        }
    }

    /// <summary>
    /// Diffs two VElement nodes.
    /// </summary>
    private void DiffElements(VElementModel oldElem, VElementModel newElem, List<StructuralChange> changes)
    {
        // Check if tag changed
        if (oldElem.TagName != newElem.TagName)
        {
            changes.Add(new StructuralChange
            {
                Type = "update",
                Path = newElem.HexPath,
                VNode = ConvertToVNodeJson(newElem)
            });
            return;
        }

        // Check attributes for changes (simplified - could be more granular)
        var attrsChanged = !AttributesEqual(oldElem.Attributes, newElem.Attributes);
        if (attrsChanged)
        {
            changes.Add(new StructuralChange
            {
                Type = "update",
                Path = newElem.HexPath,
                VNode = ConvertToVNodeJson(newElem)
            });
        }

        // Diff children
        var maxChildren = Math.Max(oldElem.Children.Count, newElem.Children.Count);
        for (int i = 0; i < maxChildren; i++)
        {
            var oldChild = i < oldElem.Children.Count ? oldElem.Children[i] : null;
            var newChild = i < newElem.Children.Count ? newElem.Children[i] : null;
            DiffTrees(oldChild, newChild, changes);
        }
    }

    /// <summary>
    /// Compares two attribute dictionaries for equality.
    /// </summary>
    private bool AttributesEqual(
        Dictionary<string, AttributeValue> a,
        Dictionary<string, AttributeValue> b)
    {
        if (a.Count != b.Count) return false;

        foreach (var kvp in a)
        {
            if (!b.TryGetValue(kvp.Key, out var bValue)) return false;
            if (kvp.Value.RawValue != bValue.RawValue) return false;
            if (kvp.Value.IsDynamic != bValue.IsDynamic) return false;
        }

        return true;
    }

    /// <summary>
    /// Converts a VNodeModel to JSON representation.
    /// </summary>
    private VNodeJson ConvertToVNodeJson(VNodeModel node)
    {
        return node switch
        {
            VElementModel e => ConvertElementToJson(e),
            VTextModel t => new VNodeJson
            {
                Type = t.IsDynamic ? "expression" : "text",
                Path = t.HexPath,
                Value = t.IsDynamic ? "__DYNAMIC__" : t.Text
            },
            VConditionalModel c => new VNodeJson
            {
                Type = "conditional",
                Path = c.HexPath,
                Condition = c.Condition
            },
            VListModel l => new VNodeJson
            {
                Type = "list",
                Path = l.HexPath,
                ArrayBinding = l.ArrayExpression
            },
            VComponentWrapperModel w => new VNodeJson
            {
                Type = "component",
                Path = w.HexPath,
                ComponentName = w.ComponentName
            },
            VNullModel => new VNodeJson
            {
                Type = "null",
                Path = node.HexPath
            },
            _ => new VNodeJson
            {
                Type = "unknown",
                Path = node.HexPath
            }
        };
    }

    /// <summary>
    /// Converts a VElementModel to JSON with full details.
    /// </summary>
    private VNodeJson ConvertElementToJson(VElementModel element)
    {
        var json = new VNodeJson
        {
            Type = "element",
            Tag = element.TagName,
            Path = element.HexPath,
            Attributes = new Dictionary<string, string>()
        };

        // Convert attributes
        foreach (var attr in element.Attributes)
        {
            if (attr.Value.IsEventHandler)
            {
                json.Attributes[attr.Key] = "__DYNAMIC__";
            }
            else if (attr.Value.IsDynamic)
            {
                json.Attributes[attr.Key] = "__DYNAMIC__";
            }
            else
            {
                // Convert "class" back to "className" for JSON output
                var attrName = attr.Key == "class" ? "className" : attr.Key;
                json.Attributes[attrName] = attr.Value.RawValue;
            }
        }

        // Add children summaries
        if (element.Children.Count > 0)
        {
            json.Children = element.Children
                .Select(c => ConvertToVNodeJsonSummary(c))
                .ToList();
        }

        return json;
    }

    /// <summary>
    /// Converts a VNodeModel to a lightweight summary (for children arrays).
    /// </summary>
    private VNodeJson ConvertToVNodeJsonSummary(VNodeModel node)
    {
        return node switch
        {
            VElementModel e => new VNodeJson
            {
                Type = "element",
                Path = e.HexPath,
                Tag = e.TagName
            },
            VTextModel t => new VNodeJson
            {
                Type = t.IsDynamic ? "expression" : "text",
                Path = t.HexPath
            },
            VConditionalModel => new VNodeJson
            {
                Type = "conditional",
                Path = node.HexPath
            },
            VListModel => new VNodeJson
            {
                Type = "list",
                Path = node.HexPath
            },
            VComponentWrapperModel w => new VNodeJson
            {
                Type = "component",
                Path = w.HexPath,
                ComponentName = w.ComponentName
            },
            _ => new VNodeJson
            {
                Type = "unknown",
                Path = node.HexPath
            }
        };
    }
}

#region JSON Output Models

internal class StructuralChangesOutput
{
    public string ComponentName { get; set; } = "";
    public string Timestamp { get; set; } = "";

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? SourceFile { get; set; }

    public List<StructuralChange> Changes { get; } = new();
}

internal class StructuralChange
{
    /// <summary>
    /// Type of change: "insert", "delete", "update", "move"
    /// </summary>
    public string Type { get; set; } = "";

    /// <summary>
    /// HexPath of the affected node.
    /// </summary>
    public string Path { get; set; } = "";

    /// <summary>
    /// VNode data (for insert/update operations).
    /// </summary>
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public VNodeJson? VNode { get; set; }
}

internal class VNodeJson
{
    /// <summary>
    /// Node type: "element", "text", "expression", "conditional", "list", "component", "null"
    /// </summary>
    public string Type { get; set; } = "";

    /// <summary>
    /// HexPath of the node.
    /// </summary>
    public string Path { get; set; } = "";

    /// <summary>
    /// Tag name (for elements only).
    /// </summary>
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? Tag { get; set; }

    /// <summary>
    /// Text value (for text nodes) or "__DYNAMIC__" for expressions.
    /// </summary>
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? Value { get; set; }

    /// <summary>
    /// Attributes dictionary (for elements).
    /// </summary>
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public Dictionary<string, string>? Attributes { get; set; }

    /// <summary>
    /// Child nodes (summaries).
    /// </summary>
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public List<VNodeJson>? Children { get; set; }

    /// <summary>
    /// Condition expression (for conditional nodes).
    /// </summary>
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? Condition { get; set; }

    /// <summary>
    /// Array binding expression (for list nodes).
    /// </summary>
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? ArrayBinding { get; set; }

    /// <summary>
    /// Component name (for component wrappers).
    /// </summary>
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? ComponentName { get; set; }
}

#endregion
