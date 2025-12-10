using Minimact;
using System;
using System.Collections.Generic;

// hookClassGenerator.cjs generates this [Hook] class from the custom hook
[Hook]
public class UsePaginationHook : MinimactComponent
{
    // Constructor parameters (from hook function parameters)
    private double pageSize;

    // State fields (from useState calls)
    [State]
    private double currentPage = 1;

    [State]
    private double totalPages = 0;

    [State]
    private bool isLoading = false;

    // Constructor
    public UsePaginationHook(double pageSize)
    {
        this.pageSize = pageSize;
    }

    // Public accessors for state (return values)
    public double CurrentPage => currentPage;
    public double TotalPages => totalPages;
    public bool IsLoading => isLoading;

    // Methods (from function declarations in hook body)
    public void goToPage(double page)
    {
        if (page >= 1 && page <= totalPages)
        {
            currentPage = page;
            SetState(nameof(currentPage), currentPage);
        }
    }

    public void nextPage()
    {
        goToPage(currentPage + 1);
    }

    public void prevPage()
    {
        goToPage(currentPage - 1);
    }

    public void setTotal(double total)
    {
        totalPages = Math.Ceiling(total / pageSize);
        SetState(nameof(totalPages), totalPages);
    }

    // Event handlers for JSX
    private void Handle_prevPage()
    {
        prevPage();
    }

    private void Handle_nextPage()
    {
        nextPage();
    }

    // Render method (from JSX in hook return)
    protected override VNode Render()
    {
        return new VElement("div", "1", new Dictionary<string, string> { ["class"] = "pagination" }, new VNode[]
        {
            new VElement("button", "1.1", new Dictionary<string, string>
            {
                ["onclick"] = "Handle_prevPage",
                ["disabled"] = $"{(currentPage <= 1)}"
            }, "Prev"),
            new VElement("span", "1.2", new Dictionary<string, string>(),
                new VText($"{currentPage} / {totalPages}", "1.2.1")),
            new VElement("button", "1.3", new Dictionary<string, string>
            {
                ["onclick"] = "Handle_nextPage",
                ["disabled"] = $"{(currentPage >= totalPages)}"
            }, "Next")
        });
    }
}

// Component using the hook
[Component]
public partial class HookClassGeneratorExample : MinimactComponent
{
    // Hook instance
    private UsePaginationHook products_pagination;

    public HookClassGeneratorExample()
    {
        products_pagination = new UsePaginationHook(10);
    }

    protected override VNode Render()
    {
        return new VElement("div", "1", new Dictionary<string, string>(), new VNode[]
        {
            new VElement("h1", "1.1", new Dictionary<string, string>(),
                new VText($"Products (Page {products_pagination.CurrentPage})", "1.1.1")),
            products_pagination.Render()
        });
    }
}

// hookClassGenerator.cjs generateHookClass(hookAnalysis, context) produces:
//
// 1. [Hook] class attribute
// 2. Private fields for constructor parameters
// 3. [State] fields from useState in hook
// 4. Constructor accepting hook parameters
// 5. Public read-only accessors for state (return values)
// 6. Public methods from hook's function declarations
// 7. Private event handlers for JSX events
// 8. Render() method if hook returns JSX
//
// Return value mapping:
//   Array return: [a, b, c, ui] → properties A, B, C + Render()
//   Object return: { a, b, fn } → properties A, B + method Fn()
