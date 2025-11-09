using Minimact.AspNetCore.Core;
using Newtonsoft.Json;
using Xunit.Abstractions;

namespace Minimact.AspNetCore.Test;

/// <summary>
/// Test to reproduce the EXACT bug from production
/// </summary>
public class RustReconciliationRealBugTest
{
    private readonly ITestOutputHelper _output;

    public RustReconciliationRealBugTest(ITestOutputHelper output)
    {
        _output = output;
    }

    /// <summary>
    /// EXACT reproduction from production debug log
    /// Old: 2 options (Black, White)
    /// New: 3 options (Black, White, Red)
    /// Expected: 1 Create patch for Red option
    /// </summary>
    [Fact]
    public void ProductionBug_AddingRedOption_ShouldGenerateCreatePatch()
    {
        // Arrange: Old tree with 2 options (from production log)
        var oldTree = new VElement(
            "div",
            "",
            new Dictionary<string, string> { { "style", "padding: 20px; font-family: system-ui, sans-serif; max-width: 800px; margin: 0 auto" } },
            new VNode[]
            {
                // h1 with title
                new VElement(
                    "h1",
                    "10000000.10000000",
                    new Dictionary<string, string>(),
                    "Widget950040830"
                ),
                // VNull for false conditional
                new VNull("10000000.20000000"),
                // div with label and select
                new VElement(
                    "div",
                    "10000000.30000000",
                    new Dictionary<string, string> { { "style", "margin-bottom: 20px" } },
                    new VNode[]
                    {
                        new VElement(
                            "label",
                            "10000000.30000000.10000000",
                            new Dictionary<string, string> { { "style", "display: block; margin-bottom: 8px; font-weight: 500" } },
                            "Color1:"
                        ),
                        new VElement(
                            "select",
                            "10000000.30000000.20000000",
                            new Dictionary<string, string>
                            {
                                { "value", "Black" },
                                { "style", "padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 14px" },
                                { "onchange", "Handle0" }
                            },
                            new VNode[]
                            {
                                new VElement("option", "10000000.30000000.20000000.10000000", new Dictionary<string, string> { { "value", "Black" } }, "Black"),
                                new VElement("option", "10000000.30000000.20000000.20000000", new Dictionary<string, string> { { "value", "White" } }, "White")
                            }
                        )
                    }
                )
            }
        );

        // New tree with 3 options (from production log) - Red added
        var newTree = new VElement(
            "div",
            "",
            new Dictionary<string, string> { { "style", "padding: 20px; font-family: system-ui, sans-serif; max-width: 800px; margin: 0 auto" } },
            new VNode[]
            {
                // h1 with title
                new VElement(
                    "h1",
                    "10000000.10000000",
                    new Dictionary<string, string>(),
                    "Widget950040830"
                ),
                // VNull for false conditional
                new VNull("10000000.20000000"),
                // div with label and select
                new VElement(
                    "div",
                    "10000000.30000000",
                    new Dictionary<string, string> { { "style", "margin-bottom: 20px" } },
                    new VNode[]
                    {
                        new VElement(
                            "label",
                            "10000000.30000000.10000000",
                            new Dictionary<string, string> { { "style", "display: block; margin-bottom: 8px; font-weight: 500" } },
                            "Color1:"
                        ),
                        new VElement(
                            "select",
                            "10000000.30000000.20000000",
                            new Dictionary<string, string>
                            {
                                { "value", "Black" },
                                { "style", "padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 14px" },
                                { "onchange", "Handle0" }
                            },
                            new VNode[]
                            {
                                new VElement("option", "10000000.30000000.20000000.10000000", new Dictionary<string, string> { { "value", "Black" } }, "Black"),
                                new VElement("option", "10000000.30000000.20000000.20000000", new Dictionary<string, string> { { "value", "White" } }, "White"),
                                new VElement("option", "10000000.30000000.20000000.30000000", new Dictionary<string, string> { { "value", "Red" } }, "Red")
                            }
                        )
                    }
                )
            }
        );

        // Log
        _output.WriteLine("=== PRODUCTION BUG REPRODUCTION ===");
        _output.WriteLine("");
        _output.WriteLine("Old tree JSON:");
        _output.WriteLine(JsonConvert.SerializeObject(oldTree, Formatting.Indented));
        _output.WriteLine("");
        _output.WriteLine("New tree JSON:");
        _output.WriteLine(JsonConvert.SerializeObject(newTree, Formatting.Indented));
        _output.WriteLine("");

        // Act
        var patches = RustBridge.Reconcile(oldTree, newTree);

        // Log results
        _output.WriteLine($"=== Patches Returned: {patches.Count} ===");
        if (patches.Count == 0)
        {
            _output.WriteLine("❌ BUG REPRODUCED! Zero patches returned!");
            _output.WriteLine("");
            _output.WriteLine("Expected:");
            _output.WriteLine("  - Create patch for Red option at path 10000000.30000000.20000000.30000000");
        }
        else
        {
            _output.WriteLine("✅ Patches generated!");
            foreach (var patch in patches)
            {
                _output.WriteLine(JsonConvert.SerializeObject(patch, Formatting.Indented));
            }
        }

        // Assert
        Assert.NotEmpty(patches);
        _output.WriteLine("");
        _output.WriteLine($"✅ Test passed with {patches.Count} patch(es)");
    }

    /// <summary>
    /// TEST: Does adding a root path fix the bug?
    /// Same as above but with root path "10000000" instead of ""
    /// </summary>
    [Fact]
    public void ProductionBug_WithRootPath_ShouldGenerateCreatePatch()
    {
        // Arrange: Same tree but WITH root path
        var oldTree = new VElement(
            "div",
            "10000000",  // ← ROOT PATH ADDED
            new Dictionary<string, string> { { "style", "padding: 20px; font-family: system-ui, sans-serif; max-width: 800px; margin: 0 auto" } },
            new VNode[]
            {
                new VElement("h1", "10000000.10000000", new Dictionary<string, string>(), "Widget950040830"),
                new VNull("10000000.20000000"),
                new VElement(
                    "div",
                    "10000000.30000000",
                    new Dictionary<string, string> { { "style", "margin-bottom: 20px" } },
                    new VNode[]
                    {
                        new VElement("label", "10000000.30000000.10000000", new Dictionary<string, string> { { "style", "display: block; margin-bottom: 8px; font-weight: 500" } }, "Color1:"),
                        new VElement(
                            "select",
                            "10000000.30000000.20000000",
                            new Dictionary<string, string>
                            {
                                { "value", "Black" },
                                { "style", "padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 14px" },
                                { "onchange", "Handle0" }
                            },
                            new VNode[]
                            {
                                new VElement("option", "10000000.30000000.20000000.10000000", new Dictionary<string, string> { { "value", "Black" } }, "Black"),
                                new VElement("option", "10000000.30000000.20000000.20000000", new Dictionary<string, string> { { "value", "White" } }, "White")
                            }
                        )
                    }
                )
            }
        );

        var newTree = new VElement(
            "div",
            "10000000",  // ← ROOT PATH ADDED
            new Dictionary<string, string> { { "style", "padding: 20px; font-family: system-ui, sans-serif; max-width: 800px; margin: 0 auto" } },
            new VNode[]
            {
                new VElement("h1", "10000000.10000000", new Dictionary<string, string>(), "Widget950040830"),
                new VNull("10000000.20000000"),
                new VElement(
                    "div",
                    "10000000.30000000",
                    new Dictionary<string, string> { { "style", "margin-bottom: 20px" } },
                    new VNode[]
                    {
                        new VElement("label", "10000000.30000000.10000000", new Dictionary<string, string> { { "style", "display: block; margin-bottom: 8px; font-weight: 500" } }, "Color1:"),
                        new VElement(
                            "select",
                            "10000000.30000000.20000000",
                            new Dictionary<string, string>
                            {
                                { "value", "Black" },
                                { "style", "padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 14px" },
                                { "onchange", "Handle0" }
                            },
                            new VNode[]
                            {
                                new VElement("option", "10000000.30000000.20000000.10000000", new Dictionary<string, string> { { "value", "Black" } }, "Black"),
                                new VElement("option", "10000000.30000000.20000000.20000000", new Dictionary<string, string> { { "value", "White" } }, "White"),
                                new VElement("option", "10000000.30000000.20000000.30000000", new Dictionary<string, string> { { "value", "Red" } }, "Red")
                            }
                        )
                    }
                )
            }
        );

        // Log
        _output.WriteLine("=== TEST: With root path instead of empty path ===");
        _output.WriteLine("");

        // Act
        var patches = RustBridge.Reconcile(oldTree, newTree);

        // Log results
        _output.WriteLine($"=== Patches Returned: {patches.Count} ===");
        if (patches.Count == 0)
        {
            _output.WriteLine("❌ STILL BROKEN with root path!");
        }
        else
        {
            _output.WriteLine($"✅ FIXED! Root path resolves the issue - generated {patches.Count} patch(es)");
            foreach (var patch in patches)
            {
                _output.WriteLine(JsonConvert.SerializeObject(patch, Formatting.Indented));
            }
        }

        // Assert
        Assert.NotEmpty(patches);
    }
}
