using Minimact.AspNetCore.Attributes;

namespace MyMvcApp.ViewModels;

public class ProductViewModel
{
    // ❌ IMMUTABLE - Server authority (security, business logic)
    public string ProductName { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public bool IsAdminRole { get; set; }
    public string UserEmail { get; set; } = string.Empty;

    // ✅ MUTABLE - Client can modify (UI state, form inputs)
    [Mutable]
    public int InitialQuantity { get; set; }

    [Mutable]
    public string InitialSelectedColor { get; set; } = "Black";

    [Mutable]
    public bool InitialIsExpanded { get; set; }
}
