using System;
using System.Collections.Generic;
using System.Linq;

namespace Minimact.AspNetCore.Core;

/// <summary>
/// Converts hex paths to DOM index paths by tracking null nodes
/// </summary>
public class PathConverter
{
    private readonly HashSet<string> _nullPaths;
    private readonly Dictionary<string, List<string>> _childrenByParent;

    public PathConverter(VNode root)
    {
        _nullPaths = new HashSet<string>();
        _childrenByParent = new Dictionary<string, List<string>>();

        // Traverse the VNode tree to collect null paths and build hierarchy
        CollectNullPathsAndHierarchy(root);
    }

    /// <summary>
    /// Traverse VNode tree recursively to find all VNull nodes and build child hierarchy
    /// </summary>
    private void CollectNullPathsAndHierarchy(VNode node, string parentPath = "")
    {
        if (node is VNull)
        {
            _nullPaths.Add(node.Path);
            return; // VNull has no children
        }

        if (node is VElement element)
        {
            // Add this node to its parent's children list
            if (!string.IsNullOrEmpty(node.Path))
            {
                var pathSegments = node.Path.Split('.');
                var currentSegment = pathSegments[pathSegments.Length - 1];

                if (!_childrenByParent.ContainsKey(parentPath))
                {
                    _childrenByParent[parentPath] = new List<string>();
                }

                if (!_childrenByParent[parentPath].Contains(currentSegment))
                {
                    _childrenByParent[parentPath].Add(currentSegment);
                }
            }

            // Recursively process children
            foreach (var child in element.Children)
            {
                CollectNullPathsAndHierarchy(child, node.Path);
            }
        }
        else if (node is VText)
        {
            // Text nodes have no children, but add them to hierarchy
            if (!string.IsNullOrEmpty(node.Path))
            {
                var pathSegments = node.Path.Split('.');
                if (pathSegments.Length > 0)
                {
                    var currentSegment = pathSegments[pathSegments.Length - 1];

                    if (!_childrenByParent.ContainsKey(parentPath))
                    {
                        _childrenByParent[parentPath] = new List<string>();
                    }

                    if (!_childrenByParent[parentPath].Contains(currentSegment))
                    {
                        _childrenByParent[parentPath].Add(currentSegment);
                    }
                }
            }
        }
    }

    /// <summary>
    /// Convert a hex path to a DOM index path
    /// Example: "10000000.30000000.20000000" -> [0, 2, 0]
    /// </summary>
    public List<int> HexPathToDomPath(string hexPath)
    {
        if (string.IsNullOrEmpty(hexPath))
        {
            return new List<int>();
        }

        var segments = hexPath.Split('.');
        var domPath = new List<int>();
        var currentPath = "";

        for (int i = 0; i < segments.Length; i++)
        {
            var segment = segments[i];

            // Build the absolute path up to this segment
            currentPath = string.IsNullOrEmpty(currentPath) ? segment : $"{currentPath}.{segment}";

            // Get parent path (all segments before this one)
            var parentPath = i > 0 ? string.Join(".", segments.Take(i)) : "";

            // Get all children at this level from hierarchy
            if (!_childrenByParent.ContainsKey(parentPath))
            {
                Console.WriteLine($"[PathConverter] Warning: No children found for parent path '{parentPath}'");
                // If we don't have hierarchy info, fall back to simple parsing
                domPath.Add(0);
                continue;
            }

            var children = _childrenByParent[parentPath];

            // Sort children to ensure consistent ordering
            var sortedChildren = children.OrderBy(c => c).ToList();

            // Count non-null siblings before this segment
            int domIndex = 0;
            foreach (var childHex in sortedChildren)
            {
                var childPath = string.IsNullOrEmpty(parentPath) ? childHex : $"{parentPath}.{childHex}";

                if (childHex == segment)
                {
                    // Found our target
                    break;
                }

                // Only count this child if it's NOT null
                if (!_nullPaths.Contains(childPath))
                {
                    domIndex++;
                }
            }

            domPath.Add(domIndex);
        }

        return domPath;
    }

    /// <summary>
    /// Check if a path is null (for debugging)
    /// </summary>
    public bool IsPathNull(string path)
    {
        return _nullPaths.Contains(path);
    }

    /// <summary>
    /// Get all null paths (for debugging)
    /// </summary>
    public IReadOnlySet<string> GetNullPaths()
    {
        return _nullPaths;
    }
}
