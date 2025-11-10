namespace Minimact.AspNetCore.Core;

/// <summary>
/// Marks a method to be called only once when the component is first mounted
/// Used with useEffect(() => { ... }, []) hook in JSX/TSX (empty dependency array)
/// </summary>
[AttributeUsage(AttributeTargets.Method, AllowMultiple = false)]
public class OnMountedAttribute : Attribute
{
}
