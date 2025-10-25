using Minimact.CommandCenter.Core;

namespace Minimact.CommandCenter.Rangers;

/// <summary>
/// Base class for all Ranger tests
/// Each Ranger tests a specific aspect of Minimact
///
/// The Power Rangers theme is NOT just fun - it's functional:
/// - Memorable: "Red Ranger failed" is easier to remember than "Test_CoreFunctionality failed"
/// - Color coding: UI can show Rangers with actual colors
/// - Team metaphor: Each Ranger has a specialty
/// - Fun: Testing is boring. Rangers make it less boring.
/// </summary>
public abstract class RangerTest
{
    protected MockClient client = null!;
    protected TestReport report = new();

    /// <summary>
    /// Ranger name (e.g., "Red Ranger", "Blue Ranger")
    /// </summary>
    public abstract string Name { get; }

    /// <summary>
    /// What this Ranger tests
    /// </summary>
    public abstract string Description { get; }

    /// <summary>
    /// Run the test
    /// </summary>
    public abstract Task RunAsync();

    /// <summary>
    /// Setup - called before each test
    /// </summary>
    public virtual async Task SetupAsync()
    {
        client = new MockClient();
        report = new TestReport { RangerName = Name };

        Console.WriteLine($"\n{'='*60}");
        Console.WriteLine($"🦕 {Name} - ACTIVATE!");
        Console.WriteLine($"{'='*60}");
        Console.WriteLine($"Testing: {Description}\n");
    }

    /// <summary>
    /// Teardown - called after each test
    /// </summary>
    public virtual async Task TeardownAsync()
    {
        if (client != null)
        {
            await client.DisconnectAsync();
        }

        Console.WriteLine($"\n{'='*60}");
        if (report.Passed)
        {
            Console.WriteLine($"✅ {Name} - TEST PASSED!");
            Console.WriteLine($"   Assertions: {report.PassedAssertions}/{report.TotalAssertions}");
        }
        else
        {
            Console.WriteLine($"❌ {Name} - TEST FAILED!");
            Console.WriteLine($"   Failed assertion: {report.FailureMessage}");
        }
        Console.WriteLine($"{'='*60}\n");
    }
}

/// <summary>
/// Test report with results and metrics
/// </summary>
public class TestReport
{
    public string RangerName { get; set; } = string.Empty;
    public bool Passed { get; set; } = true;
    public int TotalAssertions { get; set; }
    public int PassedAssertions { get; set; }
    public string? FailureMessage { get; set; }
    public List<string> Steps { get; set; } = new();

    public void RecordStep(string step)
    {
        Steps.Add(step);
        Console.WriteLine($"  ▶ {step}");
    }

    public void Pass(string message)
    {
        Passed = true;
        Console.WriteLine($"\n  ✅ {message}");
    }

    public void Fail(string message)
    {
        Passed = false;
        FailureMessage = message;
        Console.WriteLine($"\n  ❌ {message}");
    }

    public void AssertEqual<T>(T expected, T actual, string message)
    {
        TotalAssertions++;
        if (EqualityComparer<T>.Default.Equals(expected, actual))
        {
            PassedAssertions++;
            Console.WriteLine($"  ✓ Assert: {message} (expected: {expected}, actual: {actual})");
        }
        else
        {
            Fail($"{message} - Expected: {expected}, Actual: {actual}");
            throw new AssertionException($"{message} - Expected: {expected}, Actual: {actual}");
        }
    }

    public void AssertNotNull<T>(T? value, string message)
    {
        TotalAssertions++;
        if (value != null)
        {
            PassedAssertions++;
            Console.WriteLine($"  ✓ Assert: {message} (not null)");
        }
        else
        {
            Fail($"{message} - Value was null");
            throw new AssertionException($"{message} - Value was null");
        }
    }

    public void AssertTrue(bool condition, string message)
    {
        TotalAssertions++;
        if (condition)
        {
            PassedAssertions++;
            Console.WriteLine($"  ✓ Assert: {message}");
        }
        else
        {
            Fail($"{message} - Expected true, got false");
            throw new AssertionException($"{message} - Expected true, got false");
        }
    }
}

public class AssertionException : Exception
{
    public AssertionException(string message) : base(message) { }
}
