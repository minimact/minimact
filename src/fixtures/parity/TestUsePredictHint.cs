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
    private List<double> selectedItems = new List<dynamic> {  };

    [State]
    private dynamic viewMode = "grid";

    // usePredictHint: "tab-overview"
    private string _hintId_0 = "tab-overview";

    // usePredictHint: "tab-details"
    private string _hintId_1 = "tab-details";

    // usePredictHint: "tab-reviews"
    private string _hintId_2 = "tab-reviews";

    // usePredictHint: "tab-related"
    private string _hintId_3 = "tab-related";

    // usePredictHint: "expanded"
    private string _hintId_4 = "expanded";

    // usePredictHint: "collapsed"
    private string _hintId_5 = "collapsed";

    // usePredictHint: "view-grid"
    private string _hintId_6 = "view-grid";

    // usePredictHint: "view-list"
    private string _hintId_7 = "view-list";

    // usePredictHint: "reset-view"
    private string _hintId_8 = "reset-view";

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
                    new VText($"{((new MObject(isExpanded)) ? "Collapse" : "Expand")}", "1.2.2.1")
                }),
                new VElement("div", "1.2.3", new Dictionary<string, string> { ["class"] = "view-toggle" }, new VNode[]
                {
                    MinimactHelpers.createElement("button", new { className = (viewMode == "grid") ? "active" : "" }, "Grid"),
                    MinimactHelpers.createElement("button", new { className = (viewMode == "list") ? "active" : "" }, "List")
                })
            }),
            new VElement("div", "1.3", new Dictionary<string, string> { ["class"] = "tabs" }, new VNode[]
            {
                MinimactHelpers.createElement("button", new { className = (activeTab == "overview") ? "active" : "" }, "Overview"),
                MinimactHelpers.createElement("button", new { className = (activeTab == "details") ? "active" : "" }, "Details"),
                MinimactHelpers.createElement("button", new { className = (activeTab == "reviews") ? "active" : "" }, "Reviews"),
                MinimactHelpers.createElement("button", new { className = (activeTab == "related") ? "active" : "" }, "Related")
            }),
            MinimactHelpers.createElement("div", new { className = $"content {((isExpanded) ? "expanded" : "")} {viewMode}" }, (activeTab == "overview") ? new VElement("div", "1.4.1.1", new Dictionary<string, string> { ["class"] = "tab-content overview" }, new VNode[]
                {
                    new VElement("h3", "1.4.1.1.1", new Dictionary<string, string>(), "Product Overview"),
                    new VElement("p", "1.4.1.1.2", new Dictionary<string, string>(), "This is the overview content.")
                }) : new VNull("1.4.1"), (activeTab == "details") ? new VElement("div", "1.4.2.1", new Dictionary<string, string> { ["class"] = "tab-content details" }, new VNode[]
                {
                    new VElement("h3", "1.4.2.1.1", new Dictionary<string, string>(), "Product Details"),
                    new VElement("p", "1.4.2.1.2", new Dictionary<string, string>(), "This is the details content.")
                }) : new VNull("1.4.2"), (activeTab == "reviews") ? new VElement("div", "1.4.3.1", new Dictionary<string, string> { ["class"] = "tab-content reviews" }, new VNode[]
                {
                    new VElement("h3", "1.4.3.1.1", new Dictionary<string, string>(), "Customer Reviews"),
                    new VElement("p", "1.4.3.1.2", new Dictionary<string, string>(), "This is the reviews content.")
                }) : new VNull("1.4.3"), (activeTab == "related") ? new VElement("div", "1.4.4.1", new Dictionary<string, string> { ["class"] = "tab-content related" }, new VNode[]
                {
                    new VElement("h3", "1.4.4.1.1", new Dictionary<string, string>(), "Related Products"),
                    new VElement("p", "1.4.4.1.2", new Dictionary<string, string>(), "This is the related products content.")
                }) : new VNull("1.4.4")),
            new VElement("div", "1.5", new Dictionary<string, string> { ["class"] = "selection-info" }, $"Selected items:{(MinimactHelpers.GetLength(selectedItems))}")
        });
    }

    public void handleTabChange(dynamic tab)
    {
        SetState(nameof(activeTab), tab);
    }

    public void handleToggleExpand()
    {
        SetState(nameof(isExpanded), !isExpanded);
    }

    public void handleViewModeChange(dynamic mode)
    {
        SetState(nameof(viewMode), mode);
    }

    public void handleSelectItem(dynamic id)
    {
        SetState(nameof(selectedItems), prev => (prev.Contains(id)) ? prev.Where(i => i != id).ToList() : prev.Concat(new[] { id }).ToList());
    }

    public void handleReset()
    {
        SetState(nameof(activeTab), "overview");
        SetState(nameof(isExpanded), false);
        SetState(nameof(viewMode), "grid");
        SetState(nameof(selectedItems), new List<dynamic> {  });
    }
}
