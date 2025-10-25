using Minimact.CommandCenter.Models;

namespace Minimact.CommandCenter.Core;

/// <summary>
/// DOM patcher - applies patches to MockDOM
/// Simulates how browser applies patches from server
/// </summary>
public class DOMPatcher
{
    private readonly MockDOM _dom;

    public DOMPatcher(MockDOM dom)
    {
        _dom = dom;
    }

    /// <summary>
    /// Apply a list of patches to the DOM
    /// </summary>
    public void ApplyPatches(MockElement rootElement, List<DOMPatch> patches)
    {
        Console.WriteLine($"[DOMPatcher] Applying {patches.Count} patches");

        foreach (var patch in patches)
        {
            ApplyPatch(patch);
        }
    }

    /// <summary>
    /// Apply a single patch
    /// </summary>
    private void ApplyPatch(DOMPatch patch)
    {
        switch (patch.Type)
        {
            case PatchType.SetAttribute:
                ApplySetAttribute(patch);
                break;

            case PatchType.SetText:
                ApplySetText(patch);
                break;

            case PatchType.InsertChild:
                ApplyInsertChild(patch);
                break;

            case PatchType.RemoveChild:
                ApplyRemoveChild(patch);
                break;

            case PatchType.ReplaceChild:
                ApplyReplaceChild(patch);
                break;
        }
    }

    private void ApplySetAttribute(DOMPatch patch)
    {
        var element = _dom.GetElementByPath(patch.Path);
        if (element != null && patch.Key != null)
        {
            element.SetAttribute(patch.Key, patch.Value?.ToString() ?? "");
            Console.WriteLine($"  • Set {patch.Key}=\"{patch.Value}\" on {element.Id}");
        }
    }

    private void ApplySetText(DOMPatch patch)
    {
        var element = _dom.GetElementByPath(patch.Path);
        if (element != null)
        {
            element.TextContent = patch.Value?.ToString();
            Console.WriteLine($"  • Set text \"{patch.Value}\" on {element.Id}");
        }
    }

    private void ApplyInsertChild(DOMPatch patch)
    {
        var parent = _dom.GetElementByPath(patch.Path);
        if (parent != null)
        {
            var newChild = CreateElementFromPatch(patch);
            parent.Children.Insert(patch.Index, newChild);
            newChild.Parent = parent;
            Console.WriteLine($"  • Inserted {newChild.TagName} into {parent.Id}");
        }
    }

    private void ApplyRemoveChild(DOMPatch patch)
    {
        var parent = _dom.GetElementByPath(patch.Path);
        if (parent != null && patch.Index < parent.Children.Count)
        {
            var removed = parent.Children[patch.Index];
            parent.Children.RemoveAt(patch.Index);
            Console.WriteLine($"  • Removed {removed.TagName} from {parent.Id}");
        }
    }

    private void ApplyReplaceChild(DOMPatch patch)
    {
        var parent = _dom.GetElementByPath(patch.Path);
        if (parent != null && patch.Index < parent.Children.Count)
        {
            var newElement = CreateElementFromPatch(patch);
            parent.Children[patch.Index] = newElement;
            newElement.Parent = parent;
            Console.WriteLine($"  • Replaced child at index {patch.Index} in {parent.Id}");
        }
    }

    private MockElement CreateElementFromPatch(DOMPatch patch)
    {
        return new MockElement
        {
            Id = patch.ElementId ?? "",
            TagName = patch.TagName ?? "div",
            Attributes = patch.Attributes ?? new Dictionary<string, string>(),
            Children = new List<MockElement>()
        };
    }
}
