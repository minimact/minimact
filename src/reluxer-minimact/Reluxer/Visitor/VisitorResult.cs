using Reluxer.Matching;

namespace Reluxer.Visitor;

/// <summary>
/// Shared context for passing arbitrary state between visitors.
/// Injected as a method parameter.
/// </summary>
public class VisitorContext
{
    private readonly Dictionary<string, object?> _data = new();

    /// <summary>
    /// Sets a value in the context.
    /// </summary>
    public void Set<T>(string key, T value)
    {
        _data[key] = value;
    }

    /// <summary>
    /// Gets a value from the context.
    /// </summary>
    public T? Get<T>(string key)
    {
        if (_data.TryGetValue(key, out var value) && value is T typed)
            return typed;
        return default;
    }

    /// <summary>
    /// Gets a value or default.
    /// </summary>
    public T GetOrDefault<T>(string key, T defaultValue)
    {
        if (_data.TryGetValue(key, out var value) && value is T typed)
            return typed;
        return defaultValue;
    }

    /// <summary>
    /// Checks if a key exists.
    /// </summary>
    public bool Has(string key) => _data.ContainsKey(key);

    /// <summary>
    /// Removes a key from the context.
    /// </summary>
    public bool Remove(string key) => _data.Remove(key);

    /// <summary>
    /// Clears all context data.
    /// </summary>
    public void Clear() => _data.Clear();

    /// <summary>
    /// Gets or adds a value.
    /// </summary>
    public T GetOrAdd<T>(string key, Func<T> factory)
    {
        if (_data.TryGetValue(key, out var value) && value is T typed)
            return typed;
        var newValue = factory();
        _data[key] = newValue;
        return newValue;
    }

    /// <summary>
    /// Adds to a list stored in the context.
    /// </summary>
    public void AddToList<T>(string key, T item)
    {
        var list = GetOrAdd(key, () => new List<T>());
        list.Add(item);
    }

    /// <summary>
    /// Gets a list from the context.
    /// </summary>
    public IReadOnlyList<T> GetList<T>(string key)
    {
        if (_data.TryGetValue(key, out var value) && value is List<T> list)
            return list;
        return Array.Empty<T>();
    }
}

/// <summary>
/// Internal storage for visitor results.
/// </summary>
internal class VisitorResultStore
{
    // Results by visitor method name
    private readonly Dictionary<string, List<object>> _resultsByVisitor = new();

    // All results in order
    private readonly List<(string VisitorName, object Value)> _allResults = new();

    public void Add(string visitorName, object value)
    {
        if (!_resultsByVisitor.TryGetValue(visitorName, out var list))
        {
            list = new List<object>();
            _resultsByVisitor[visitorName] = list;
        }
        list.Add(value);
        _allResults.Add((visitorName, value));
    }

    /// <summary>
    /// Gets the last result of type T from a specific visitor.
    /// </summary>
    public T? GetLast<T>(string visitorName)
    {
        if (_resultsByVisitor.TryGetValue(visitorName, out var list))
        {
            for (int i = list.Count - 1; i >= 0; i--)
            {
                if (list[i] is T typed)
                    return typed;
            }
        }
        return default;
    }

    /// <summary>
    /// Gets the last result of type T from any visitor.
    /// </summary>
    public T? GetLastOfType<T>()
    {
        for (int i = _allResults.Count - 1; i >= 0; i--)
        {
            if (_allResults[i].Value is T typed)
                return typed;
        }
        return default;
    }

    /// <summary>
    /// Gets all results of type T from a specific visitor.
    /// </summary>
    public List<T> GetAll<T>(string visitorName)
    {
        var results = new List<T>();
        if (_resultsByVisitor.TryGetValue(visitorName, out var list))
        {
            foreach (var item in list)
            {
                if (item is T typed)
                    results.Add(typed);
            }
        }
        return results;
    }

    /// <summary>
    /// Gets all results of type T from any visitor.
    /// </summary>
    public List<T> GetAllOfType<T>()
    {
        var results = new List<T>();
        foreach (var (_, value) in _allResults)
        {
            if (value is T typed)
                results.Add(typed);
        }
        return results;
    }

    public void Clear()
    {
        _resultsByVisitor.Clear();
        _allResults.Clear();
    }
}
