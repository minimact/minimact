using System.Text;

namespace Minimact.Testing.Core;

/// <summary>
/// Mock DOM - simulates browser Document Object Model
/// Maintains the virtual DOM tree for testing
/// </summary>
public class MockDOM
{
    private readonly List<MockElement> _rootElements = new();
    private readonly Dictionary<string, MockElement> _elementCache = new();

    /// <summary>
    /// Add a root element to the DOM
    /// </summary>
    public void AddRootElement(MockElement element)
    {
        _rootElements.Add(element);
        CacheElement(element);
    }

    /// <summary>
    /// Remove a root element from the DOM
    /// </summary>
    public void RemoveRootElement(MockElement element)
    {
        _rootElements.Remove(element);
        UncacheElement(element);
    }

    /// <summary>
    /// Replace a root element with a new one
    /// Used for re-rendering in tests
    /// </summary>
    public void ReplaceRootElement(MockElement oldElement, MockElement newElement)
    {
        var index = _rootElements.IndexOf(oldElement);
        if (index >= 0)
        {
            _rootElements[index] = newElement;
            UncacheElement(oldElement);
            CacheElement(newElement);
        }
    }

    /// <summary>
    /// Get element by ID (searches entire DOM)
    /// </summary>
    public MockElement? GetElementById(string id)
    {
        // Try cache first for O(1) lookup
        if (_elementCache.TryGetValue(id, out var cached))
            return cached;

        // Fallback to tree search
        foreach (var root in _rootElements)
        {
            var found = root.GetElementById(id);
            if (found != null)
            {
                // Cache for next time
                _elementCache[id] = found;
                return found;
            }
        }

        return null;
    }

    /// <summary>
    /// Query selector (searches entire DOM)
    /// </summary>
    public MockElement? QuerySelector(string selector)
    {
        foreach (var root in _rootElements)
        {
            var found = root.QuerySelector(selector);
            if (found != null)
                return found;
        }

        return null;
    }

    /// <summary>
    /// Get element by path (for patch application)
    /// Path is an array of indices: [0, 2, 1] means root[0].children[2].children[1]
    /// </summary>
    public MockElement? GetElementByPath(string[] path)
    {
        if (path.Length == 0)
            return null;

        // Parse root index
        if (!int.TryParse(path[0], out var rootIndex) || rootIndex >= _rootElements.Count)
            return null;

        var current = _rootElements[rootIndex];

        // Traverse path
        for (int i = 1; i < path.Length; i++)
        {
            if (!int.TryParse(path[i], out var childIndex) || childIndex >= current.Children.Count)
                return null;

            current = current.Children[childIndex];
        }

        return current;
    }

    /// <summary>
    /// Get all elements (flattened tree)
    /// </summary>
    public IEnumerable<MockElement> GetAllElements()
    {
        foreach (var root in _rootElements)
        {
            yield return root;
            foreach (var descendant in GetDescendants(root))
            {
                yield return descendant;
            }
        }
    }

    private IEnumerable<MockElement> GetDescendants(MockElement element)
    {
        foreach (var child in element.Children)
        {
            yield return child;
            foreach (var descendant in GetDescendants(child))
            {
                yield return descendant;
            }
        }
    }

    /// <summary>
    /// Render entire DOM as HTML string (for visualization/debugging)
    /// </summary>
    public string ToHTML()
    {
        var sb = new StringBuilder();
        sb.AppendLine("<html>");
        sb.AppendLine("<body>");

        foreach (var root in _rootElements)
        {
            sb.AppendLine(root.ToHTML(indent: 1));
        }

        sb.AppendLine("</body>");
        sb.AppendLine("</html>");
        return sb.ToString();
    }

    /// <summary>
    /// Clear the entire DOM
    /// </summary>
    public void Clear()
    {
        _rootElements.Clear();
        _elementCache.Clear();
    }

    /// <summary>
    /// Cache element and all descendants by ID
    /// </summary>
    private void CacheElement(MockElement element)
    {
        if (!string.IsNullOrEmpty(element.Id))
        {
            _elementCache[element.Id] = element;
        }

        foreach (var child in element.Children)
        {
            CacheElement(child);
        }
    }

    /// <summary>
    /// Remove element and all descendants from cache
    /// </summary>
    private void UncacheElement(MockElement element)
    {
        if (!string.IsNullOrEmpty(element.Id))
        {
            _elementCache.Remove(element.Id);
        }

        foreach (var child in element.Children)
        {
            UncacheElement(child);
        }
    }

    public List<MockElement> GetRootElements() => _rootElements;
}
