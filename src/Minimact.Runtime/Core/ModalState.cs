namespace Minimact.Runtime.Core;

/// <summary>
/// Represents modal state with open/close functionality
/// </summary>
public class ModalState
{
    /// <summary>
    /// Whether the modal is currently open
    /// </summary>
    public bool IsOpen { get; private set; }

    /// <summary>
    /// Open the modal
    /// </summary>
    public void Open()
    {
        IsOpen = true;
    }

    /// <summary>
    /// Close the modal
    /// </summary>
    public void Close()
    {
        IsOpen = false;
    }

    /// <summary>
    /// Toggle the modal state
    /// </summary>
    public void Toggle()
    {
        IsOpen = !IsOpen;
    }

    // Property aliases for JSX compatibility
    public bool isOpen => IsOpen;
    public Action open => Open;
    public Action close => Close;
    public Action toggle => Toggle;
}
