using System.Collections.Generic;
using System.Linq;

namespace Minimact.AspNetCore.Core;

/// <summary>
/// Utilities for extracting null paths from VNode trees.
///
/// Note: Path adjustment is no longer needed! With the hex-based path system
/// and client-side null path tracking, paths don't need server-side adjustment.
/// The client handles null-skipping during DOM navigation using the null path map.
///
/// This class is kept for the ExtractNullPaths utility method, which is used
/// by the hot reload system to inform the client which paths are currently null.
/// </summary>
public static class PatchPathAdjuster
{

    /// <summary>
    /// Extract all null paths from a VNode tree
    /// Returns paths directly from VNull nodes
    /// Example: ["10000000.30000000", "10000000.50000000"]
    /// </summary>
    public static List<string> ExtractNullPaths(VNode rootVNode)
    {
        // Simple LINQ query - collect all VNull nodes and extract their paths
        return GetAllDescendants(rootVNode)
            .OfType<VNull>()
            .Select(n => n.Path)
            .ToList();
    }

    /// <summary>
    /// Get all descendant nodes (including the root) from a VNode tree
    /// </summary>
    private static IEnumerable<VNode> GetAllDescendants(VNode node)
    {
        // Yield the node itself
        yield return node;

        // Get children based on node type
        var children = node switch
        {
            VElement element => element.Children,
            Fragment fragment => fragment.Children,
            _ => null
        };

        // Recursively yield all descendants
        if (children != null)
        {
            foreach (var child in children)
            {
                if (child != null)
                {
                    foreach (var descendant in GetAllDescendants(child))
                    {
                        yield return descendant;
                    }
                }
            }
        }
    }
}
