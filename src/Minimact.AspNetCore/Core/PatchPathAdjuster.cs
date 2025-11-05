namespace Minimact.AspNetCore.Core;

/// <summary>
/// Adjusts VNode paths to DOM paths by accounting for null children.
///
/// With hex-based paths (e.g., "10000000.20000000.30000000"), the paths are stable
/// and don't require renumbering when JSX structure changes. However, we still need
/// to adjust VNode-based hex paths to DOM-based hex paths because null children
/// aren't rendered in the DOM.
///
/// Example:
/// - VNode tree: [null, &lt;Header/&gt;, &lt;Main/&gt;]
/// - VNode hex path for Header: "20000000" (index 1)
/// - DOM hex path for Header: "10000000" (DOM index 0, after skipping null)
/// </summary>
public static class PatchPathAdjuster
{
    /// <summary>
    /// Convert VNode path to DOM path by skipping null children
    /// </summary>
    /// <param name="vnodePath">Path in VNode tree (from Babel/reconciler)</param>
    /// <param name="rootVNode">Root VNode to walk for null counting</param>
    /// <returns>Adjusted path for DOM traversal</returns>
    /// <exception cref="InvalidOperationException">If path navigates through a null child</exception>
    public static int[] VNodePathToDomPath(int[] vnodePath, VNode rootVNode)
    {
        if (vnodePath == null || vnodePath.Length == 0)
        {
            return vnodePath ?? Array.Empty<int>();
        }

        var domPath = new List<int>(vnodePath.Length);
        var currentVNode = rootVNode;

        for (int depth = 0; depth < vnodePath.Length; depth++)
        {
            int vnodeIndex = vnodePath[depth];

            // Get children list
            List<VNode>? children = null;
            if (currentVNode is VElement element)
            {
                children = element.Children;
            }
            else if (currentVNode is Fragment fragment)
            {
                children = fragment.Children;
            }

            // Validate index is within bounds
            if (children == null || vnodeIndex >= children.Count)
            {
                throw new InvalidOperationException(
                    $"VNode path index {vnodeIndex} out of bounds at depth {depth}. " +
                    $"VNode has {children?.Count ?? 0} children. " +
                    $"Path: [{string.Join(", ", vnodePath)}]");
            }

            // Count how many null children come before this index
            int nullsBefore = 0;
            for (int i = 0; i < vnodeIndex; i++)
            {
                if (children[i] == null)
                {
                    nullsBefore++;
                }
            }

            // DOM index = VNode index - nulls that aren't rendered
            int domIndex = vnodeIndex - nullsBefore;
            domPath.Add(domIndex);

            // Navigate to child for next depth level
            if (depth < vnodePath.Length - 1)
            {
                currentVNode = children[vnodeIndex];

                // Path cannot navigate through a null node
                if (currentVNode == null)
                {
                    throw new InvalidOperationException(
                        $"Cannot navigate VNode path [{string.Join(", ", vnodePath)}] - " +
                        $"encountered null at depth {depth}, index {vnodeIndex}. " +
                        $"This likely indicates a patch targeting a conditionally-rendered element that is not currently visible.");
                }
            }
        }

        return domPath.ToArray();
    }

    /// <summary>
    /// Convert VNode hex path to DOM hex path by skipping null children
    /// </summary>
    /// <param name="vnodeHexPath">Hex path in VNode tree (e.g., "20000000.10000000")</param>
    /// <param name="rootVNode">Root VNode to walk for null counting</param>
    /// <returns>Adjusted hex path for DOM traversal (e.g., "10000000.10000000")</returns>
    public static string VNodeHexPathToDomHexPath(string vnodeHexPath, VNode rootVNode)
    {
        if (string.IsNullOrEmpty(vnodeHexPath))
        {
            return vnodeHexPath ?? string.Empty;
        }

        // Parse hex path to indices
        var hexSegments = vnodeHexPath.Split('.');
        var vnodeIndices = new List<int>();

        foreach (var segment in hexSegments)
        {
            if (uint.TryParse(segment, System.Globalization.NumberStyles.HexNumber, null, out uint hexValue))
            {
                // Convert hex value back to index: (hex / 0x10000000) - 1
                int index = (int)(hexValue / 0x10000000) - 1;
                vnodeIndices.Add(index);
            }
            else
            {
                throw new ArgumentException($"Invalid hex segment in path: {segment}");
            }
        }

        // Adjust indices for null children
        var domIndices = VNodePathToDomPath(vnodeIndices.ToArray(), rootVNode);

        // Convert back to hex path
        var domHexSegments = new List<string>();
        foreach (var domIndex in domIndices)
        {
            // Convert DOM index to hex: (index + 1) * 0x10000000
            uint hexValue = (uint)(domIndex + 1) * 0x10000000;
            domHexSegments.Add(hexValue.ToString("x8"));
        }

        return string.Join(".", domHexSegments);
    }

    /// <summary>
    /// Adjust patch path in-place (for mutable patch objects)
    /// </summary>
    public static void AdjustPatchPath(Patch patch, VNode rootVNode)
    {
        patch.Path = VNodeHexPathToDomHexPath(patch.Path, rootVNode);
    }

    /// <summary>
    /// Adjust multiple patches in batch
    /// </summary>
    public static void AdjustPatchPaths(IEnumerable<Patch> patches, VNode rootVNode)
    {
        foreach (var patch in patches)
        {
            AdjustPatchPath(patch, rootVNode);
        }
    }

    /// <summary>
    /// Convert VNode path to DOM path with debug logging
    /// </summary>
    public static int[] VNodePathToDomPath(int[] vnodePath, VNode rootVNode, bool debug)
    {
        if (debug)
        {
            Console.WriteLine($"[PathAdjuster] Input VNode path: [{string.Join(", ", vnodePath ?? Array.Empty<int>())}]");
        }

        var domPath = VNodePathToDomPath(vnodePath, rootVNode);

        if (debug)
        {
            Console.WriteLine($"[PathAdjuster] Output DOM path: [{string.Join(", ", domPath)}]");
        }

        return domPath;
    }

    /// <summary>
    /// Print VNode tree structure for debugging
    /// </summary>
    public static void PrintVNodeTree(VNode node, int depth = 0)
    {
        var indent = new string(' ', depth * 2);

        // Get tag and children based on node type
        string tag = node switch
        {
            VElement element => element.Tag,
            Fragment => "Fragment",
            VText text => $"Text(\"{text.Content}\")",
            _ => node.GetType().Name
        };

        List<VNode>? children = node switch
        {
            VElement element => element.Children,
            Fragment fragment => fragment.Children,
            _ => null
        };

        Console.WriteLine($"{indent}{tag} (children: {children?.Count ?? 0})");

        if (children != null)
        {
            for (int i = 0; i < children.Count; i++)
            {
                var child = children[i];
                Console.WriteLine($"{indent}  [{i}] {(child == null ? "NULL" : "")}");
                if (child != null)
                {
                    PrintVNodeTree(child, depth + 1);
                }
            }
        }
    }
}
