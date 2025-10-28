using Minimact.Testing;
using Xunit;

namespace Minimact.CommandCenter.Rangers;

/// <summary>
/// 🟠 Orange Ranger - Demonstrates the public Minimact.Testing API
///
/// This is the FUTURE of Minimact testing - clean, simple, and elegant.
/// Compare this to Red Ranger's complexity to see the power of the public API.
///
/// What this tests:
/// - Component rendering using MinimactTestContext
/// - Direct method invocation (no SignalR overhead)
/// - DOM assertions using fluent API
/// - State verification
///
/// Key differences from Red Ranger:
/// - ✅ No SignalR setup
/// - ✅ No Mock/Real client abstraction
/// - ✅ No manual DOM construction
/// - ✅ Uses REAL Rust reconciler automatically
/// - ✅ Clean fluent API
/// - ✅ Tests ACTUAL components from your app (not test-specific code)
///
/// This is what external developers will use!
///
/// NOTE: This references TestCounterComponent from RedRanger.cs
/// In a real app, you'd reference your actual app components like:
/// - ctx.Render<ShoppingCart>()
/// - ctx.Render<UserProfile>()
/// - ctx.Render<Dashboard>()
/// </summary>
public class OrangeRanger
{
    [Fact]
    public void Test_CoreFunctionality_WithPublicAPI()
    {
        // 🎯 SIMPLIFIED: Just one line to create test context
        using var ctx = new MinimactTestContext(new MinimactTestOptions
        {
            EnableDebugLogging = true
        });

        // 🎯 SIMPLIFIED: Render existing component in one line
        // This is the SAME component Red Ranger uses, but with 95% less code!
        var test = ctx.Render<TestCounterComponent>();

        // ✅ Assert initial render
        test.AssertText("#counter-value", "0");
        test.AssertExists("#increment-btn");

        // 🎯 SIMPLIFIED: Click button directly (no SignalR, no manual setup)
        // This calls the component's IncrementCounter() method and re-renders
        test.Click("#increment-btn");

        // ✅ Assert state updated
        test.AssertText("#counter-value", "1");

        // 🎉 That's it! Clean, simple, elegant.
        // Compare this to Red Ranger's 300+ lines of setup!
    }

    [Fact]
    public void Test_MultipleClicks()
    {
        using var ctx = new MinimactTestContext();
        var test = ctx.Render<TestCounterComponent>();

        // Click 5 times
        for (int i = 0; i < 5; i++)
        {
            test.Click("#increment-btn");
        }

        // Verify final count
        test.AssertText("#counter-value", "5");
    }

    [Fact]
    public void Test_ComponentDebugOutput()
    {
        using var ctx = new MinimactTestContext();
        var test = ctx.Render<TestCounterComponent>();

        // Print current HTML for debugging
        test.Debug();

        // Print component state
        test.DebugState();

        test.Click("#increment-btn");

        // Print after click
        test.Debug();
    }

    [Fact]
    public void Test_ElementQueries()
    {
        using var ctx = new MinimactTestContext();
        var test = ctx.Render<TestCounterComponent>();

        // Query elements
        var span = test.Query("#counter-value");
        Assert.NotNull(span);
        Assert.Equal("0", span.TextContent);

        var button = test.Query("#increment-btn");
        Assert.NotNull(button);
        Assert.Equal("Increment", button.TextContent);

        // TryQuery returns null if not found
        var missing = test.TryQuery(".not-found");
        Assert.Null(missing);
    }

    [Fact]
    public void Test_AssertNotExists()
    {
        using var ctx = new MinimactTestContext();
        var test = ctx.Render<TestCounterComponent>();

        // Assert element doesn't exist
        test.AssertNotExists(".hidden-element");

        // This would throw if element exists
        // test.AssertNotExists("#increment-btn"); // ❌ Would fail
    }

    [Fact]
    public void Test_DirectComponentAccess()
    {
        using var ctx = new MinimactTestContext();
        var test = ctx.Render<TestCounterComponent>();

        // Access the component directly for advanced assertions
        var component = test.Component;
        Assert.Equal(0, component.Count);

        test.Click("#increment-btn");

        Assert.Equal(1, component.Count);
    }
}
