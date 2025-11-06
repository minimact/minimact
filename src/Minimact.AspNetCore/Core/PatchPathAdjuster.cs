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
    /// Returns paths with ".null" suffix for null children
    /// Example: ["10000000.30000000.null", "10000000.50000000.null"]
    /// </summary>
    public static List<string> ExtractNullPaths(VNode rootVNode)
    {
        var nullPaths = new List<string>();
        ExtractNullPathsRecursive(rootVNode, new List<int>(), nullPaths);
        return nullPaths;
    }

    private static void ExtractNullPathsRecursive(VNode node, List<int> currentPath, List<string> nullPaths)
    {
        // Get children based on node type
        List<VNode>? children = node switch
        {
            VElement element => element.Children,
            Fragment fragment => fragment.Children,
            _ => null
        };

        if (children == null) return;

        for (int i = 0; i < children.Count; i++)
        {
            var child = children[i];

            if (child == null)
            {
                // Generate hex path for this null child
                var pathWithNull = new List<int>(currentPath) { i };
                var hexPath = ConvertPathToHex(pathWithNull);
                nullPaths.Add($"{hexPath}.null");
            }
            else
            {
                // Recurse into non-null children
                var childPath = new List<int>(currentPath) { i };
                ExtractNullPathsRecursive(child, childPath, nullPaths);
            }
        }
    }

    private static string ConvertPathToHex(List<int> path)
    {
        if (path.Count == 0) return string.Empty;

        var hexSegments = new List<string>();
        foreach (var index in path)
        {
            // Convert index to hex: (index + 1) * 0x10000000
            uint hexValue = (uint)(index + 1) * 0x10000000;
            hexSegments.Add(hexValue.ToString("x8"));
        }

        return string.Join(".", hexSegments);
    }
}
