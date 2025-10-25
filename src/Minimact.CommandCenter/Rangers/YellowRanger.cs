using Minimact.CommandCenter.Core;
using FluentAssertions;
using Xunit;

namespace Minimact.CommandCenter.Rangers;

/// <summary>
/// Yellow Ranger - Hook Simulators Test
///
/// Tests:
/// - useState hook simulation
/// - useEffect hook simulation
/// - useRef hook simulation
/// - useDomElementState hook simulation (Minimact Punch)
/// - Hook state persistence across renders
/// - Hook call order enforcement
///
/// This demonstrates how to use HookContext for testing components
/// that use Minimact hooks in the browser.
/// </summary>
public class YellowRanger : RangerTest
{
    public override string Name => "Yellow Ranger";
    public override string Description => "Hook Simulators Test";

    [Fact]
    public async Task TestUseStateHook()
    {
        // Arrange: Set up MockClient and component context
        var client = new MockClient();
        var context = client.InitializeComponent("TestComponent", "test-root");
        var dom = client.DOM;
        var hooks = new HookContext(context, dom);

        // Act: Simulate first render with useState
        hooks.Reset(); // Always reset before render
        var (count, setCount) = hooks.UseState(0);

        // Assert: Initial value
        count.Should().Be(0);

        Console.WriteLine($"[YellowRanger] ✓ useState initialized with value: {count}");

        // Act: Update state
        setCount(1);

        // Assert: State updated in context
        context.State["state_0"].Should().Be(1);

        // Act: Simulate second render (hook call order must match!)
        hooks.Reset();
        var (count2, setCount2) = hooks.UseState(0);

        // Assert: State persisted across renders
        count2.Should().Be(1); // Not 0! State persisted!

        Console.WriteLine($"[YellowRanger] ✓ useState persisted across renders: {count2}");

        // Act: Test function updater
        Func<int, int> increment = prev => prev + 1;
        setCount2(increment);

        // Assert: Function updater worked
        hooks.Reset();
        var (count3, _) = hooks.UseState(0);
        count3.Should().Be(2);

        Console.WriteLine($"[YellowRanger] ✓ useState function updater worked: {count3}");
    }

    [Fact]
    public async Task TestUseEffectHook()
    {
        // Arrange
        var client = new MockClient();
        var context = client.InitializeComponent("TestComponent", "test-root");
        var dom = client.DOM;
        var hooks = new HookContext(context, dom);

        int effectRunCount = 0;
        int cleanupRunCount = 0;

        // Act: First render with useEffect (no dependencies = run every render)
        hooks.Reset();
        hooks.UseEffect(() =>
        {
            effectRunCount++;
            return () => cleanupRunCount++; // Cleanup function
        });

        // Assert: Effect ran on mount
        effectRunCount.Should().Be(1);
        cleanupRunCount.Should().Be(0);

        Console.WriteLine($"[YellowRanger] ✓ useEffect ran on mount: effectRunCount={effectRunCount}");

        // Act: Second render
        hooks.Reset();
        hooks.UseEffect(() =>
        {
            effectRunCount++;
            return () => cleanupRunCount++;
        });

        // Assert: Effect ran again (no deps = run every render)
        //         Cleanup ran from previous effect
        effectRunCount.Should().Be(2);
        cleanupRunCount.Should().Be(1);

        Console.WriteLine($"[YellowRanger] ✓ useEffect ran on re-render and cleanup executed");

        // Act: Third render with dependency array
        int effectWithDepsCount = 0;
        var (count, setCount) = hooks.UseState(0);

        hooks.Reset();
        hooks.UseState(0); // Call useState again (same order!)
        hooks.UseEffect(() =>
        {
            effectWithDepsCount++;
            return null;
        }, new object[] { count });

        // Assert: Effect with deps ran
        effectWithDepsCount.Should().Be(1);

        // Act: Re-render with same dependency
        hooks.Reset();
        var (count2, _) = hooks.UseState(0);
        hooks.UseEffect(() =>
        {
            effectWithDepsCount++;
            return null;
        }, new object[] { count2 });

        // Assert: Effect did NOT run (deps unchanged)
        effectWithDepsCount.Should().Be(1);

        Console.WriteLine($"[YellowRanger] ✓ useEffect with dependencies works correctly");

        // Act: Update dependency and re-render
        setCount(1);
        hooks.Reset();
        var (count3, _) = hooks.UseState(0);
        hooks.UseEffect(() =>
        {
            effectWithDepsCount++;
            return null;
        }, new object[] { count3 });

        // Assert: Effect ran (deps changed)
        effectWithDepsCount.Should().Be(2);

        Console.WriteLine($"[YellowRanger] ✓ useEffect re-ran when dependencies changed");
    }

    [Fact]
    public async Task TestUseRefHook()
    {
        // Arrange
        var client = new MockClient();
        var context = client.InitializeComponent("TestComponent", "test-root");
        var dom = client.DOM;
        var hooks = new HookContext(context, dom);

        // Act: First render with useRef
        hooks.Reset();
        var countRef = hooks.UseRef(0);

        // Assert: Initial value
        countRef.Current.Should().Be(0);

        Console.WriteLine($"[YellowRanger] ✓ useRef initialized with value: {countRef.Current}");

        // Act: Mutate ref
        countRef.Current = 42;

        // Assert: Ref updated
        countRef.Current.Should().Be(42);

        // Act: Second render
        hooks.Reset();
        var countRef2 = hooks.UseRef(0);

        // Assert: Ref persisted (same object!)
        countRef2.Should().BeSameAs(countRef);
        countRef2.Current.Should().Be(42); // Not 0! Ref persisted!

        Console.WriteLine($"[YellowRanger] ✓ useRef persisted across renders: {countRef2.Current}");
    }

    [Fact]
    public async Task TestUseDomElementStateHook()
    {
        // Arrange
        var client = new MockClient();
        var context = client.InitializeComponent("TestComponent", "test-root");
        var dom = client.DOM;

        // Add a child element to track
        var childElement = new MockElement
        {
            Id = "tracked-element",
            TagName = "div",
            Attributes = new Dictionary<string, string>
            {
                ["class"] = "foo bar",
                ["data-test"] = "value"
            },
            BoundingBox = new Models.Rect { Top = 0, Left = 0, Right = 100, Bottom = 100 }
        };
        context.Element.Children.Add(childElement);

        var hooks = new HookContext(context, dom);

        // Act: Use useDomElementState
        hooks.Reset();
        var domState = hooks.UseDomElementState("#tracked-element");

        // Assert: Initial state
        domState.Exists.Should().BeTrue();
        domState.ChildrenCount.Should().Be(0);
        domState.Attributes.Should().ContainKey("data-test");
        domState.ClassList.Should().Contain("foo");
        domState.ClassList.Should().Contain("bar");

        Console.WriteLine($"[YellowRanger] ✓ useDomElementState tracked element state");

        // Act: Simulate DOM change (add child)
        childElement.Children.Add(new MockElement
        {
            Id = "child",
            TagName = "span"
        });

        // Trigger DOM element state update
        hooks.TriggerDomElementStateChanges();

        // Assert: State updated
        domState.ChildrenCount.Should().Be(1);

        Console.WriteLine($"[YellowRanger] ✓ useDomElementState detected DOM changes");
    }

    [Fact]
    public async Task TestHookCallOrderEnforcement()
    {
        // Arrange
        var client = new MockClient();
        var context = client.InitializeComponent("TestComponent", "test-root");
        var dom = client.DOM;
        var hooks = new HookContext(context, dom);

        // Act: First render - call hooks in order
        hooks.Reset();
        var (count, setCount) = hooks.UseState(0);
        var nameRef = hooks.UseRef("initial");
        hooks.UseEffect(() => Console.WriteLine("Effect!"), Array.Empty<object>());

        // Assert: All hooks created
        context.State.Should().ContainKey("state_0");
        context.Refs.Should().ContainKey("ref_0");
        context.Effects.Should().HaveCount(1);

        // Act: Second render - MUST call hooks in SAME order
        hooks.Reset();
        var (count2, setCount2) = hooks.UseState(0);
        var nameRef2 = hooks.UseRef("initial");
        hooks.UseEffect(() => Console.WriteLine("Effect!"), Array.Empty<object>());

        // Assert: Same hooks returned
        count2.Should().Be(count);
        nameRef2.Should().BeSameAs(nameRef);

        Console.WriteLine($"[YellowRanger] ✓ Hook call order enforcement works correctly");
    }

    public override async Task RunAsync()
    {
        Console.WriteLine($"[{Name}] {Description}");
        Console.WriteLine($"[{Name}] Running hook simulator tests...\n");

        // Run all test methods
        await TestUseStateHook();
        Console.WriteLine();

        await TestUseEffectHook();
        Console.WriteLine();

        await TestUseRefHook();
        Console.WriteLine();

        await TestUseDomElementStateHook();
        Console.WriteLine();

        await TestHookCallOrderEnforcement();
        Console.WriteLine();

        Console.WriteLine($"[{Name}] ✅ All hook simulator tests passed!");
    }
}
