namespace Minimact.Runtime.Core;

/// <summary>
/// Represents dropdown state with items and selection
/// </summary>
/// <typeparam name="T">Type of items in the dropdown</typeparam>
public class DropdownState<T> where T : class
{
    private T? _selectedItem;

    /// <summary>
    /// List of items in the dropdown
    /// </summary>
    public List<T> Items { get; set; } = new List<T>();

    /// <summary>
    /// Currently selected item
    /// </summary>
    public T? SelectedItem
    {
        get => _selectedItem;
        set
        {
            _selectedItem = value;
            OnSelectionChanged?.Invoke(value);
        }
    }

    /// <summary>
    /// Event fired when selection changes
    /// </summary>
    public event Action<T?>? OnSelectionChanged;

    /// <summary>
    /// Props to be spread onto the select element
    /// </summary>
    public Dictionary<string, string> Props => new Dictionary<string, string>
    {
        ["data-dropdown"] = "true"
    };

    /// <summary>
    /// Select an item by index
    /// </summary>
    public void SelectByIndex(int index)
    {
        if (index >= 0 && index < Items.Count)
        {
            SelectedItem = Items[index];
        }
    }

    /// <summary>
    /// Clear selection
    /// </summary>
    public void ClearSelection()
    {
        SelectedItem = null;
    }

    // Property aliases for JSX compatibility
    public List<T> items => Items;
    public T? selectedItem => SelectedItem;
    public Dictionary<string, string> props => Props;
}

/// <summary>
/// Non-generic dropdown state for dynamic usage
/// </summary>
public class DropdownState : DropdownState<dynamic>
{
}
