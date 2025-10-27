using System;
using System.Collections.ObjectModel;
using System.Windows.Input;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using Minimact.CommandCenter.Models;
using Minimact.CommandCenter.Rangers;

namespace Minimact.CommandCenter.ViewModels;

/// <summary>
/// Main window view model - Command Center control panel
/// </summary>
public partial class MainViewModel : ObservableObject
{
    [ObservableProperty]
    private TestExecution? currentExecution;

    [ObservableProperty]
    private TestStep? selectedStep;

    [ObservableProperty]
    private bool isRunning;

    [ObservableProperty]
    private string statusMessage = "Ready";

    public ObservableCollection<RangerInfo> AvailableRangers { get; } = new();
    public ObservableCollection<TestExecution> TestHistory { get; } = new();

    public MainViewModel()
    {
        InitializeRangers();
    }

    private void InitializeRangers()
    {
        AvailableRangers.Add(new RangerInfo
        {
            Name = "Red Ranger",
            Description = "Core Minimact functionality test",
            Color = "#DC143C",
            Emoji = "🔴",
            TestType = typeof(RedRanger),
            IsEnabled = true
        });

        AvailableRangers.Add(new RangerInfo
        {
            Name = "Yellow Ranger",
            Description = "Hook simulators test",
            Color = "#FFD700",
            Emoji = "🟡",
            TestType = typeof(YellowRanger),
            IsEnabled = true
        });

        AvailableRangers.Add(new RangerInfo
        {
            Name = "Green Ranger",
            Description = "Worker algorithm parity test",
            Color = "#228B22",
            Emoji = "🟢",
            TestType = typeof(GreenRanger),
            IsEnabled = true
        });

        AvailableRangers.Add(new RangerInfo
        {
            Name = "Blue Ranger",
            Description = "Predictive rendering test",
            Color = "#1E90FF",
            Emoji = "🔵",
            TestType = typeof(BlueRanger),
            IsEnabled = true
        });

        AvailableRangers.Add(new RangerInfo
        {
            Name = "Pink Ranger",
            Description = "Performance stress test",
            Color = "#FF69B4",
            Emoji = "🩷",
            TestType = typeof(PinkRanger),
            IsEnabled = true
        });

        AvailableRangers.Add(new RangerInfo
        {
            Name = "Lavender Ranger",
            Description = "Minimact-Punch Extension (useDomElementState)",
            Color = "#E6E6FA",
            Emoji = "🪻",
            TestType = typeof(LavenderRanger),
            IsEnabled = true
        });

        AvailableRangers.Add(new RangerInfo
        {
            Name = "Turquoise Ranger",
            Description = "Minimact-Query Extension (useDomQuery - SQL for DOM)",
            Color = "#40E0D0",
            Emoji = "🩵",
            TestType = typeof(TurquoiseRanger),
            IsEnabled = true
        });

        AvailableRangers.Add(new RangerInfo
        {
            Name = "Diamond Ranger",
            Description = "Template Prediction System (All 9 Phases)",
            Color = "#B9F2FF",
            Emoji = "💎",
            TestType = typeof(DiamondRanger),
            IsEnabled = true
        });
    }

    [RelayCommand]
    private async Task RunRangerAsync(RangerInfo ranger)
    {
        if (IsRunning || ranger.TestType == null)
            return;

        try
        {
            IsRunning = true;
            StatusMessage = $"Running {ranger.Name}...";

            // Create new test execution
            var execution = new TestExecution
            {
                TestName = ranger.Name,
                RangerName = ranger.Name,
                Status = TestStatus.Running,
                StartTime = DateTime.UtcNow
            };

            CurrentExecution = execution;
            TestHistory.Insert(0, execution);

            // Create ranger test instance
            var rangerTest = (RangerTest)Activator.CreateInstance(ranger.TestType)!;

            // Attach event handlers for tracking
            AttachTestTracking(rangerTest, execution);

            // Run the test
            await rangerTest.SetupAsync();
            await rangerTest.RunAsync();
            await rangerTest.TeardownAsync();

            // Update execution status
            execution.EndTime = DateTime.UtcNow;
            execution.Status = execution.FailedAssertions > 0 ? TestStatus.Failed : TestStatus.Passed;

            StatusMessage = execution.Status == TestStatus.Passed
                ? $"✅ {ranger.Name} PASSED ({execution.PassedAssertions}/{execution.TotalAssertions})"
                : $"❌ {ranger.Name} FAILED ({execution.FailedAssertions}/{execution.TotalAssertions} failed)";
        }
        catch (Exception ex)
        {
            if (CurrentExecution != null)
            {
                CurrentExecution.Status = TestStatus.Error;
                CurrentExecution.EndTime = DateTime.UtcNow;
            }

            StatusMessage = $"❌ Error running {ranger.Name}: {ex.Message}";
        }
        finally
        {
            IsRunning = false;
        }
    }

    [RelayCommand]
    private async Task RunAllRangersAsync()
    {
        foreach (var ranger in AvailableRangers.Where(r => r.IsEnabled))
        {
            await RunRangerAsync(ranger);
            await Task.Delay(500); // Small delay between tests
        }
    }

    [RelayCommand]
    private void ClearHistory()
    {
        TestHistory.Clear();
        CurrentExecution = null;
        StatusMessage = "History cleared";
    }

    private void AttachTestTracking(RangerTest rangerTest, TestExecution execution)
    {
        // This will be implemented to hook into the test's events
        // For now, we'll track via the test report
        rangerTest.OnStepStarted += (step) =>
        {
            var testStep = new TestStep
            {
                StepNumber = execution.Steps.Count + 1,
                Description = step,
                Status = StepStatus.Running,
                Timestamp = DateTime.UtcNow
            };
            execution.Steps.Add(testStep);
            SelectedStep = testStep;
        };

        rangerTest.OnStepCompleted += (step) =>
        {
            var testStep = execution.Steps.LastOrDefault();
            if (testStep != null)
            {
                testStep.Status = StepStatus.Completed;
            }
        };

        rangerTest.OnAssertion += (description, expected, actual, passed) =>
        {
            var assertion = new TestAssertion
            {
                Description = description,
                ExpectedValue = expected,
                ActualValue = actual,
                Passed = passed,
                Timestamp = DateTime.UtcNow,
                ErrorMessage = passed ? null : $"Expected: {expected}, Actual: {actual}"
            };

            execution.Assertions.Add(assertion);
            execution.TotalAssertions++;

            if (passed)
                execution.PassedAssertions++;
            else
                execution.FailedAssertions++;
        };

        rangerTest.OnPatchReceived += (patch, source) =>
        {
            var currentStep = execution.Steps.LastOrDefault();
            if (currentStep != null)
            {
                var patchRecord = new DOMPatchRecord
                {
                    Source = source == "expected" ? PatchSource.Expected : PatchSource.Actual,
                    PatchType = patch.Type,
                    Path = string.Join(",", patch.Path ?? Array.Empty<string>()),
                    Key = patch.Key,
                    Value = patch.Value,
                    Index = patch.Index,
                    ElementId = patch.ElementId,
                    TagName = patch.TagName,
                    Timestamp = DateTime.UtcNow
                };

                currentStep.Patches.Add(patchRecord);
            }
        };

        rangerTest.OnSignalRMessage += (direction, method, componentId, args, source) =>
        {
            var currentStep = execution.Steps.LastOrDefault();
            if (currentStep != null)
            {
                var message = new SignalRMessage
                {
                    Direction = direction == "client-to-server"
                        ? MessageDirection.ClientToServer
                        : MessageDirection.ServerToClient,
                    Source = source == "expected" ? MessageSource.Expected : MessageSource.Actual,
                    MethodName = method,
                    ComponentId = componentId,
                    Arguments = args,
                    Timestamp = DateTime.UtcNow
                };

                currentStep.Messages.Add(message);
            }
        };
    }
}

/// <summary>
/// Information about a ranger test
/// </summary>
public partial class RangerInfo : ObservableObject
{
    [ObservableProperty]
    private string name = string.Empty;

    [ObservableProperty]
    private string description = string.Empty;

    [ObservableProperty]
    private string color = "#FFFFFF";

    [ObservableProperty]
    private string emoji = string.Empty;

    [ObservableProperty]
    private Type? testType;

    [ObservableProperty]
    private bool isEnabled;

    [ObservableProperty]
    private TestStatus lastRunStatus = TestStatus.NotStarted;
}
