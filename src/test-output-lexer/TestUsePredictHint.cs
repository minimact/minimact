using Minimact.AspNetCore.Core;
using Minimact.AspNetCore.Extensions;
using MinimactHelpers = Minimact.AspNetCore.Core.Minimact;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Minimact.Components;

[Component]
public partial class TestUsePredictHint : MinimactComponent
{
    [State]
    private string activeTab = "overview";

    [State]
    private bool isExpanded = false;

    [State]
    private List<dynamic> selectedItems = new List<object>();

    protected override VNode Render()
    {
        StateManager.SyncMembersToState(this);

        return new VElement("div", "1", new Dictionary<string, string> { ["class"] = "predict-hint-test" }, new VNode[]
        {
            new VElement("h2", "1.1", new Dictionary<string, string>(), "Predictive Hint Test"),
            new VElement("div", "1.2", new Dictionary<string, string> { ["class"] = "controls" }, new VNode[]
            {
                new VElement("button", "1.2.1", new Dictionary<string, string> { ["onclick"] = "handleReset" }, "Reset View"),
                new VElement("button", "1.2.2", new Dictionary<string, string> { ["onclick"] = "handleToggleExpand" }, new VNode[]
                {
                    new VText($"{(isExpanded?"Collapse":"Expand")}", "1.2.2.1")
                }),
                new VElement("div", "1.2.3", new Dictionary<string, string> { ["class"] = "view-toggle" }, new VNode[]
                {
                    new VElement("button", "1.2.3.1", new Dictionary<string, string> { ["onclick"] = "Handle0", ["class"] = $"{(viewMode == "grid"?"active":"")}" }, "Grid"),
                    new VElement("button", "1.2.3.2", new Dictionary<string, string> { ["onclick"] = "Handle1", ["class"] = $"{(viewMode == "list"?"active":"")}" }, "List")
                })
            }),
            new VElement("div", "1.3", new Dictionary<string, string> { ["class"] = "tabs" }, new VNode[]
            {
                new VElement("button", "1.3.1", new Dictionary<string, string> { ["onclick"] = "Handle2", ["class"] = $"{(activeTab == "overview"?"active":"")}" }, "Overview"),
                new VElement("button", "1.3.2", new Dictionary<string, string> { ["onclick"] = "Handle3", ["class"] = $"{(activeTab == "details"?"active":"")}" }, "Details"),
                new VElement("button", "1.3.3", new Dictionary<string, string> { ["onclick"] = "Handle4", ["class"] = $"{(activeTab == "reviews"?"active":"")}" }, "Reviews"),
                new VElement("button", "1.3.4", new Dictionary<string, string> { ["onclick"] = "Handle5", ["class"] = $"{(activeTab == "related"?"active":"")}" }, "Related")
            }),
            new VElement("div", "1.4", new Dictionary<string, string> { ["class"] = $"{($"content {isExpanded ? 'expanded' : ''} {viewMode}")}" }, new VNode[]
            {
                new VText($"{(activeTab == "overview" && (<divclassName= "tab-content overview"><h3>Product Overview</h3><p>This is the overview content.</p></div>))}{(activeTab == "details" && (<divclassName= "tab-content details"><h3>Product Details</h3><p>This is the details content.</p></div>))}{(activeTab == "reviews" && (<divclassName= "tab-content reviews"><h3>Customer Reviews</h3><p>This is the reviews content.</p></div>))}{(activeTab == "related" && (<divclassName= "tab-content related"><h3>Related Products</h3><p>This is the related products content.</p></div>))}", "1.4.1")
            }),
            new VElement("div", "1.5", new Dictionary<string, string> { ["class"] = "selection-info" }, $"Selected items:{(selectedItems.Count())}")
        });
    }

    public void handleTabChange()
    {
    }

    public void handleToggleExpand()
    {
    }

    public void handleViewModeChange()
    {
    }

    public void handleSelectItem()
    {
    }

    public void handleReset()
    {
    }

    public void Handle0()
    {
        handleViewModeChange("grid");
    }

    public void Handle1()
    {
        handleViewModeChange("list");
    }

    public void Handle2()
    {
        handleTabChange("overview");
    }

    public void Handle3()
    {
        handleTabChange("details");
    }

    public void Handle4()
    {
        handleTabChange("reviews");
    }

    public void Handle5()
    {
        handleTabChange("related");
    }

    /// <summary>
    /// Returns JavaScript event handlers for client-side execution
    /// These execute in the browser with bound hook context
    /// </summary>
    protected override Dictionary<string, string> GetClientHandlers()
    {
        return new Dictionary<string, string>
        {
            ["handleTabChange"] = @"function () {}",
            ["handleToggleExpand"] = @"function () {}",
            ["handleViewModeChange"] = @"function () {}",
            ["handleSelectItem"] = @"function () {}",
            ["handleReset"] = @"function () {}",
            ["Handle0"] = @"function () {\n  handleViewModeChange('grid');\n}",
            ["Handle1"] = @"function () {\n  handleViewModeChange('list');\n}",
            ["Handle2"] = @"function () {\n  handleTabChange('overview');\n}",
            ["Handle3"] = @"function () {\n  handleTabChange('details');\n}",
            ["Handle4"] = @"function () {\n  handleTabChange('reviews');\n}",
            ["Handle5"] = @"function () {\n  handleTabChange('related');\n}"
        };
    }

    // State setters
    private void setActiveTab(string value)
    {
        activeTab = value;
        SetState(nameof(activeTab), value);
    }

    private void setIsExpanded(bool value)
    {
        isExpanded = value;
        SetState(nameof(isExpanded), value);
    }

    private void setSelectedItems(List<dynamic> value)
    {
        selectedItems = value;
        SetState(nameof(selectedItems), value);
    }

}
