using Minimact;
using System.Collections.Generic;

[Component]
public partial class PathAssignmentExample : MinimactComponent
{
    [State]
    private int count = 0;

    private void Handle0()
    {
        count = count + 1;
        SetState(nameof(count), count);
    }

    protected override VNode Render()
    {
        // All VNode constructors receive their assigned path as second parameter
        return new VElement("div", "1", new Dictionary<string, string>(), new VNode[]
        {
            new VElement("span", "1.1", new Dictionary<string, string>(),
                new VText($"{count}", "1.1.1")),  // Expression path: "1.1.1"
            new VElement("button", "1.2", new Dictionary<string, string> { ["onclick"] = "Handle0" },
                new VText("+", "1.2.1"))  // Text path: "1.2.1"
        });
    }
}

// pathAssignment.cjs provides:
//
// assignPathsToJSX(node, parentPath, pathGen, t, prevKeys, newKeys, changes, isHotReload):
//   - Recursively walks JSX tree
//   - Assigns __minimactPath to each JSXElement, JSXText, JSXExpressionContainer
//   - Uses HexPathGenerator for sequential numbering
//   - Tracks structural changes for hot reload (insertions/deletions)
//
// getPathFromNode(node):
//   - Returns the __minimactPath from a JSX AST node
//   - Returns "" if not assigned
//
// getPathSegmentsFromNode(node):
//   - Returns path as array: "1.2.3" → ["1", "2", "3"]
//
// In hot reload mode:
//   - Compares current paths with previous .tsx.keys file
//   - Detects insertions (new paths not in previous)
//   - Records changes in structuralChanges array
//
// Path is used by:
//   - jsx.cjs: Pass to VElement/VText constructors
//   - templates.cjs: Key template bindings by path
//   - runtimeHelpers.cjs: Pass to RuntimeHelpers.CreateElement
