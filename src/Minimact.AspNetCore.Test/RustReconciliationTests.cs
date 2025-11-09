using Minimact.AspNetCore.Core;
using Newtonsoft.Json;
using Xunit.Abstractions;

namespace Minimact.AspNetCore.Test;

/// <summary>
/// Tests for Rust reconciliation to diagnose zero patch issue
/// </summary>
public class RustReconciliationTests
{
    private readonly ITestOutputHelper _output;

    public RustReconciliationTests(ITestOutputHelper output)
    {
        _output = output;
    }

    /// <summary>
    /// Test 1: REAL SCENARIO - Adding "RR" option to color select
    /// This matches the exact structure from the user's Render() method
    /// </summary>
    [Fact]
    public void RealScenario_AddingRROptionToColorSelect_ShouldGeneratePatches()
    {
        // Arrange: Old select with 4 color options (Black, White, Magenta, Red)
        var oldTree = new VElement(
            tag: "select",
            path: "1.3.2",
            props: new Dictionary<string, string>
            {
                { "value", "Black" },
                { "style", "padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 14px" },
                { "onchange", "Handle0" }
            },
            children: new VNode[]
            {
                new VElement("option", "1.3.2.1", new Dictionary<string, string> { { "value", "Black" } }, "Black"),
                new VElement("option", "1.3.2.2", new Dictionary<string, string> { { "value", "White" } }, "White"),
                new VElement("option", "1.3.2.3", new Dictionary<string, string> { { "value", "Magenta" } }, "Magenta"),
                new VElement("option", "1.3.2.4", new Dictionary<string, string> { { "value", "Red" } }, "Red")
            }
        );

        // New select with 5 color options (added "RR" at the end)
        var newTree = new VElement(
            tag: "select",
            path: "1.3.2",
            props: new Dictionary<string, string>
            {
                { "value", "Black" },
                { "style", "padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 14px" },
                { "onchange", "Handle0" }
            },
            children: new VNode[]
            {
                new VElement("option", "1.3.2.1", new Dictionary<string, string> { { "value", "Black" } }, "Black"),
                new VElement("option", "1.3.2.2", new Dictionary<string, string> { { "value", "White" } }, "White"),
                new VElement("option", "1.3.2.3", new Dictionary<string, string> { { "value", "Magenta" } }, "Magenta"),
                new VElement("option", "1.3.2.4", new Dictionary<string, string> { { "value", "Red" } }, "Red"),
                new VElement("option", "1.3.2.5", new Dictionary<string, string> { { "value", "RR" } }, "RR")
            }
        );

        // Log
        _output.WriteLine("=== REAL SCENARIO: Adding RR option ===");
        _output.WriteLine("");
        _output.WriteLine("=== Old VNode (4 options: Black, White, Magenta, Red) ===");
        _output.WriteLine(JsonConvert.SerializeObject(oldTree, Formatting.Indented));
        _output.WriteLine("");
        _output.WriteLine("=== New VNode (5 options: Black, White, Magenta, Red, RR) ===");
        _output.WriteLine(JsonConvert.SerializeObject(newTree, Formatting.Indented));
        _output.WriteLine("");

        // Act
        var patches = RustBridge.Reconcile(oldTree, newTree);

        // Log results
        _output.WriteLine($"=== Patches Returned: {patches.Count} ===");
        if (patches.Count == 0)
        {
            _output.WriteLine("❌ ZERO PATCHES! This is the bug we're investigating.");
            _output.WriteLine("");
            _output.WriteLine("Expected patches:");
            _output.WriteLine("  - Insert <option value=\"RR\">RR</option> at path 1.3.2.5");
            _output.WriteLine("");
            _output.WriteLine("Possible causes:");
            _output.WriteLine("  1. Rust reconciliation bug - not detecting new child");
            _output.WriteLine("  2. Path comparison issue - not recognizing different paths");
            _output.WriteLine("  3. JSON serialization issue - VNode not serializing correctly");
        }
        else
        {
            _output.WriteLine("✅ Patches generated successfully!");
            foreach (var patch in patches)
            {
                _output.WriteLine(JsonConvert.SerializeObject(patch, Formatting.Indented));
            }
        }

        // Assert
        Assert.NotEmpty(patches);
        _output.WriteLine("");
        _output.WriteLine($"✅ Generated {patches.Count} patch(es) for adding RR option");
    }

    /// <summary>
    /// Test 2: Simple text change - should generate 1 patch
    /// </summary>
    [Fact]
    public void SimpleTextChange_ShouldGenerateOnePatch()
    {
        // Arrange
        var oldTree = new VElement("div", "10000000", new Dictionary<string, string>(), "Hello");
        var newTree = new VElement("div", "10000000", new Dictionary<string, string>(), "World");

        // Log the JSON being sent to Rust
        var oldJson = JsonConvert.SerializeObject(oldTree, Formatting.Indented);
        var newJson = JsonConvert.SerializeObject(newTree, Formatting.Indented);

        _output.WriteLine("=== Old VNode JSON ===");
        _output.WriteLine(oldJson);
        _output.WriteLine("");
        _output.WriteLine("=== New VNode JSON ===");
        _output.WriteLine(newJson);
        _output.WriteLine("");

        // Act
        var patches = RustBridge.Reconcile(oldTree, newTree);

        // Log results
        _output.WriteLine($"=== Patches Returned: {patches.Count} ===");
        foreach (var patch in patches)
        {
            var patchJson = JsonConvert.SerializeObject(patch, Formatting.Indented);
            _output.WriteLine(patchJson);
        }

        // Assert
        Assert.NotEmpty(patches);
        Assert.Single(patches);
    }

    /// <summary>
    /// Test 3: Element added - should generate Insert patch
    /// </summary>
    [Fact]
    public void ElementAdded_ShouldGenerateInsertPatch()
    {
        // Arrange
        var oldTree = new VElement(
            "div",
            "10000000",
            new Dictionary<string, string>(),
            new VNode[]
            {
                new VElement("span", "10000000.10000000", new Dictionary<string, string>())
            }
        );

        var newTree = new VElement(
            "div",
            "10000000",
            new Dictionary<string, string>(),
            new VNode[]
            {
                new VElement("span", "10000000.10000000", new Dictionary<string, string>()),
                new VElement("button", "10000000.20000000", new Dictionary<string, string>())
            }
        );

        // Log
        _output.WriteLine("=== Old VNode ===");
        _output.WriteLine(JsonConvert.SerializeObject(oldTree, Formatting.Indented));
        _output.WriteLine("");
        _output.WriteLine("=== New VNode ===");
        _output.WriteLine(JsonConvert.SerializeObject(newTree, Formatting.Indented));
        _output.WriteLine("");

        // Act
        var patches = RustBridge.Reconcile(oldTree, newTree);

        // Log results
        _output.WriteLine($"=== Patches Returned: {patches.Count} ===");
        foreach (var patch in patches)
        {
            _output.WriteLine(JsonConvert.SerializeObject(patch, Formatting.Indented));
        }

        // Assert
        Assert.NotEmpty(patches);
    }

    /// <summary>
    /// Test 4: Identical trees - should generate zero patches
    /// </summary>
    [Fact]
    public void IdenticalTrees_ShouldGenerateZeroPatches()
    {
        // Arrange
        var tree = new VElement("div", "10000000", new Dictionary<string, string>(), "Hello");

        // Log
        _output.WriteLine("=== VNode JSON ===");
        _output.WriteLine(JsonConvert.SerializeObject(tree, Formatting.Indented));
        _output.WriteLine("");

        // Act
        var patches = RustBridge.Reconcile(tree, tree);

        // Log results
        _output.WriteLine($"=== Patches Returned: {patches.Count} ===");

        // Assert
        Assert.Empty(patches);
    }

    /// <summary>
    /// Test 5: Attribute change - should generate SetAttribute patch
    /// </summary>
    [Fact]
    public void AttributeChange_ShouldGenerateSetAttributePatch()
    {
        // Arrange
        var oldTree = new VElement(
            "button",
            "10000000",
            new Dictionary<string, string> { { "class", "btn" } }
        );

        var newTree = new VElement(
            "button",
            "10000000",
            new Dictionary<string, string> { { "class", "btn btn-primary" } }
        );

        // Log
        _output.WriteLine("=== Old VNode ===");
        _output.WriteLine(JsonConvert.SerializeObject(oldTree, Formatting.Indented));
        _output.WriteLine("");
        _output.WriteLine("=== New VNode ===");
        _output.WriteLine(JsonConvert.SerializeObject(newTree, Formatting.Indented));
        _output.WriteLine("");

        // Act
        var patches = RustBridge.Reconcile(oldTree, newTree);

        // Log results
        _output.WriteLine($"=== Patches Returned: {patches.Count} ===");
        foreach (var patch in patches)
        {
            _output.WriteLine(JsonConvert.SerializeObject(patch, Formatting.Indented));
        }

        // Assert
        Assert.NotEmpty(patches);
    }
}
