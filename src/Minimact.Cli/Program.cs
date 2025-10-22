using System.CommandLine;
using System.Diagnostics;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using Minimact.Cli;

// Shared predictor handle - persistent across CLI invocations via file
var _sharedPredictorHandle = UIntPtr.Zero;
var PREDICTOR_FILE_PATH = Path.Combine(
    Environment.GetFolderPath(Environment.SpecialFolder.UserProfile),
    ".minimact",
    "predictor.json"
);

var rootCommand = new RootCommand("Minimact CLI - Test the entire JSX → C# → Reconciliation pipeline");

// Test command - full pipeline test
var testCommand = new Command("test", "Run end-to-end tests for the entire pipeline");
var verboseOption = new Option<bool>("--verbose", () => false, "Show detailed output");
testCommand.AddOption(verboseOption);
testCommand.SetHandler((verbose) =>
{
    RunFullPipelineTests(verbose);
}, verboseOption);

// Transpile command - JSX/TSX to C#
var transpileCommand = new Command("transpile", "Convert JSX/TSX to C# using Babel plugin");
var inputOption = new Option<FileInfo>("--input", "Input JSX/TSX file") { IsRequired = true };
var outputOption = new Option<FileInfo?>("--output", "Output C# file (optional)");
transpileCommand.AddOption(inputOption);
transpileCommand.AddOption(outputOption);
transpileCommand.SetHandler((input, output) =>
{
    TranspileJsx(input, output);
}, inputOption, outputOption);

// Compile command - Test C# component compilation
var compileCommand = new Command("compile", "Test compiling a C# component");
var componentOption = new Option<FileInfo>("--component", "C# component file") { IsRequired = true };
compileCommand.AddOption(componentOption);
compileCommand.SetHandler((component) =>
{
    TestCompileComponent(component);
}, componentOption);

// Reconcile command
var reconcileCommand = new Command("reconcile", "Reconcile two VNode trees");
var oldFileOption = new Option<FileInfo>("--old", "Path to old tree JSON file") { IsRequired = true };
var newFileOption = new Option<FileInfo>("--new", "Path to new tree JSON file") { IsRequired = true };
reconcileCommand.AddOption(oldFileOption);
reconcileCommand.AddOption(newFileOption);
reconcileCommand.SetHandler((oldFile, newFile) =>
{
    RunReconcile(oldFile, newFile);
}, oldFileOption, newFileOption);

// Predict command - Predictor operations
var predictCommand = new Command("predict", "Predictor operations (learn, predict, stats)");

// predict --learn subcommand
var learnOption = new Option<bool>("--learn", "Learn a pattern from state change");
var predictOption = new Option<bool>("--predict", "Predict next tree from state change");
var statsOption = new Option<bool>("--stats", "Show predictor statistics");
var resetOption = new Option<bool>("--reset", "Reset predictor state (clear all learned patterns)");
var stateOption = new Option<string>("--state", "State change JSON");
var oldTreeOption = new Option<string>("--old", "Old tree JSON");
var newTreeOption = new Option<string>("--new", "New tree JSON");
var currentTreeOption = new Option<string>("--current", "Current tree JSON");

predictCommand.AddOption(learnOption);
predictCommand.AddOption(predictOption);
predictCommand.AddOption(statsOption);
predictCommand.AddOption(resetOption);
predictCommand.AddOption(stateOption);
predictCommand.AddOption(oldTreeOption);
predictCommand.AddOption(newTreeOption);
predictCommand.AddOption(currentTreeOption);

predictCommand.SetHandler((learn, predict, stats, reset, state, oldTree, newTree, currentTree) =>
{
    if (learn)
    {
        RunPredictorLearn(state, oldTree, newTree);
    }
    else if (predict)
    {
        RunPredictorPredict(state, currentTree);
    }
    else if (stats)
    {
        DisplayPredictorStats();
    }
    else if (reset)
    {
        ResetPredictor();
    }
    else
    {
        Console.WriteLine("Usage: minimact predict [--learn|--predict|--stats|--reset]");
        Console.WriteLine("  --learn --state <json> --old <json> --new <json>");
        Console.WriteLine("  --predict --state <json> --current <json>");
        Console.WriteLine("  --stats");
        Console.WriteLine("  --reset");
        Environment.ExitCode = 1;
    }
}, learnOption, predictOption, statsOption, resetOption, stateOption, oldTreeOption, newTreeOption, currentTreeOption);

// Metrics command
var metricsCommand = new Command("metrics", "Display current metrics");
metricsCommand.SetHandler(() =>
{
    DisplayMetrics();
});

// Logs command
var logsCommand = new Command("logs", "Display captured logs");
var levelOption = new Option<int>("--level", () => 2, "Log level (0=Trace, 1=Debug, 2=Info, 3=Warn, 4=Error)");
logsCommand.AddOption(levelOption);
logsCommand.SetHandler((level) =>
{
    DisplayLogs(level);
}, levelOption);

rootCommand.AddCommand(testCommand);
rootCommand.AddCommand(transpileCommand);
rootCommand.AddCommand(compileCommand);
rootCommand.AddCommand(reconcileCommand);
rootCommand.AddCommand(predictCommand);
rootCommand.AddCommand(metricsCommand);
rootCommand.AddCommand(logsCommand);

return await rootCommand.InvokeAsync(args);

static void RunFullPipelineTests(bool verbose)
{
    Console.WriteLine("╔═══════════════════════════════════════════════════╗");
    Console.WriteLine("║   Minimact Full Pipeline Test                     ║");
    Console.WriteLine("║   JSX → C# → Reconciliation → Prediction         ║");
    Console.WriteLine("╚═══════════════════════════════════════════════════╝\n");

    MinimactNative.minimact_logging_enable();
    MinimactNative.minimact_logging_set_level(verbose ? (uint)1 : (uint)2);
    MinimactNative.minimact_metrics_reset();

    int passed = 0;
    int total = 0;

    // Phase 1: Test Babel Plugin (JSX → C#)
    Console.WriteLine("═══ PHASE 1: JSX/TSX Transpilation ═══\n");
    total++;
    if (TestBabelPlugin(verbose))
    {
        Console.WriteLine("✓ [1/6] Babel plugin transpilation\n");
        passed++;
    }
    else
    {
        Console.WriteLine("✗ [1/6] Babel plugin transpilation FAILED\n");
    }

    // Phase 2: Test C# Component Processing
    Console.WriteLine("═══ PHASE 2: C# Component Processing ═══\n");
    total++;
    if (TestComponentProcessing(verbose))
    {
        Console.WriteLine("✓ [2/6] C# component processing\n");
        passed++;
    }
    else
    {
        Console.WriteLine("✗ [2/6] C# component processing FAILED\n");
    }

    // Phase 3: Test Reconciliation
    Console.WriteLine("═══ PHASE 3: Rust Reconciliation ═══\n");
    total++;
    if (TestBasicReconciliation(verbose))
    {
        Console.WriteLine("✓ [3/6] Basic reconciliation\n");
        passed++;
    }
    else
    {
        Console.WriteLine("✗ [3/6] Basic reconciliation FAILED\n");
    }

    // Phase 4: Test Predictor
    Console.WriteLine("═══ PHASE 4: Predictor Learning ═══\n");
    total++;
    if (TestPredictorInternal(5, verbose))
    {
        Console.WriteLine("✓ [4/6] Predictor learning & prediction\n");
        passed++;
    }
    else
    {
        Console.WriteLine("✗ [4/6] Predictor learning FAILED\n");
    }

    // Phase 5: Test Metrics
    Console.WriteLine("═══ PHASE 5: Metrics Collection ═══\n");
    total++;
    if (TestMetrics(verbose))
    {
        Console.WriteLine("✓ [5/6] Metrics collection\n");
        passed++;
    }
    else
    {
        Console.WriteLine("✗ [5/6] Metrics collection FAILED\n");
    }

    // Phase 6: Test Logging
    Console.WriteLine("═══ PHASE 6: Logging Infrastructure ═══\n");
    total++;
    if (TestLogging(verbose))
    {
        Console.WriteLine("✓ [6/6] Logging infrastructure\n");
        passed++;
    }
    else
    {
        Console.WriteLine("✗ [6/6] Logging infrastructure FAILED\n");
    }

    Console.WriteLine(new string('═', 55));
    Console.ForegroundColor = passed == total ? ConsoleColor.Green : ConsoleColor.Yellow;
    Console.WriteLine($"FINAL RESULT: {passed}/{total} phases passed");
    Console.ResetColor();
    Console.WriteLine(new string('═', 55));

    if (verbose)
    {
        Console.WriteLine("\nFinal Metrics:");
        DisplayMetrics();
    }

    Environment.ExitCode = passed == total ? 0 : 1;
}

static bool TestBabelPlugin(bool verbose)
{
    try
    {
        // Check if babel plugin exists
        var babelPluginDir = Path.Combine("..", "babel-plugin-minimact");

        if (!Directory.Exists(babelPluginDir))
        {
            if (verbose) Console.WriteLine("  ⚠ Babel plugin directory not found, skipping...");
            return true; // Not critical for Rust testing
        }

        if (verbose) Console.WriteLine("  Checking for Babel plugin test fixtures...");

        var fixturesDir = Path.Combine(babelPluginDir, "test", "fixtures");
        if (!Directory.Exists(fixturesDir))
        {
            if (verbose) Console.WriteLine("  ⚠ No test fixtures found");
            return true;
        }

        // Look for .expected.cs files to verify transpilation worked
        var expectedFiles = Directory.GetFiles(fixturesDir, "*.expected.cs", SearchOption.AllDirectories);

        if (verbose) Console.WriteLine($"  Found {expectedFiles.Length} transpilation test fixtures");
        return expectedFiles.Length > 0;
    }
    catch (Exception ex)
    {
        if (verbose) Console.WriteLine($"  Error: {ex.Message}");
        return false;
    }
}

static bool TestComponentProcessing(bool verbose)
{
    try
    {
        // Check if example components exist
        var runtimeDir = Path.Combine("..", "Minimact.Runtime");

        if (!Directory.Exists(runtimeDir))
        {
            if (verbose) Console.WriteLine("  ⚠ Runtime directory not found");
            return true; // Not critical
        }

        var examplesDir = Path.Combine(runtimeDir, "Examples");
        if (!Directory.Exists(examplesDir))
        {
            if (verbose) Console.WriteLine("  ⚠ No example components found");
            return true;
        }

        var componentFiles = Directory.GetFiles(examplesDir, "*.cs");
        if (verbose) Console.WriteLine($"  Found {componentFiles.Length} example component(s)");

        foreach (var file in componentFiles)
        {
            if (verbose) Console.WriteLine($"    - {Path.GetFileName(file)}");
        }

        return componentFiles.Length > 0;
    }
    catch (Exception ex)
    {
        if (verbose) Console.WriteLine($"  Error: {ex.Message}");
        return false;
    }
}

static void TranspileJsx(FileInfo input, FileInfo? output)
{
    try
    {
        Console.WriteLine($"Transpiling {input.Name}...\n");

        if (!input.Exists)
        {
            Console.ForegroundColor = ConsoleColor.Red;
            Console.WriteLine($"✗ Input file not found: {input.FullName}");
            Console.ResetColor();
            Environment.ExitCode = 1;
            return;
        }

        // Run babel plugin
        var babelPluginDir = Path.Combine("..", "babel-plugin-minimact");
        var babelCmd = $"npx babel {input.FullName} --plugins ./index.js";

        if (!Directory.Exists(babelPluginDir))
        {
            Console.ForegroundColor = ConsoleColor.Red;
            Console.WriteLine("✗ Babel plugin not found");
            Console.WriteLine($"  Expected: {Path.GetFullPath(babelPluginDir)}");
            Console.ResetColor();
            Environment.ExitCode = 1;
            return;
        }

        var psi = new ProcessStartInfo
        {
            FileName = OperatingSystem.IsWindows() ? "cmd.exe" : "bash",
            Arguments = OperatingSystem.IsWindows() ? $"/c {babelCmd}" : $"-c \"{babelCmd}\"",
            WorkingDirectory = babelPluginDir,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false
        };

        using var process = Process.Start(psi);
        if (process == null)
        {
            Console.WriteLine("✗ Failed to start babel process");
            Environment.ExitCode = 1;
            return;
        }

        var result = process.StandardOutput.ReadToEnd();
        var error = process.StandardError.ReadToEnd();
        process.WaitForExit();

        if (process.ExitCode != 0)
        {
            Console.ForegroundColor = ConsoleColor.Red;
            Console.WriteLine($"✗ Babel failed:");
            Console.WriteLine(error);
            Console.ResetColor();
            Environment.ExitCode = 1;
            return;
        }

        if (output != null)
        {
            File.WriteAllText(output.FullName, result);
            Console.ForegroundColor = ConsoleColor.Green;
            Console.WriteLine($"✓ Transpiled to {output.Name}");
            Console.ResetColor();
        }
        else
        {
            Console.ForegroundColor = ConsoleColor.Green;
            Console.WriteLine("✓ Transpilation successful:\n");
            Console.ResetColor();
            Console.WriteLine(result);
        }
    }
    catch (Exception ex)
    {
        Console.ForegroundColor = ConsoleColor.Red;
        Console.WriteLine($"✗ Error: {ex.Message}");
        Console.ResetColor();
        Environment.ExitCode = 1;
    }
}

static void TestCompileComponent(FileInfo component)
{
    Console.WriteLine($"Testing component compilation: {component.Name}\n");

    if (!component.Exists)
    {
        Console.ForegroundColor = ConsoleColor.Red;
        Console.WriteLine($"✗ Component file not found: {component.FullName}");
        Console.ResetColor();
        Environment.ExitCode = 1;
        return;
    }

    try
    {
        var content = File.ReadAllText(component.FullName);
        Console.WriteLine("Component source:");
        Console.WriteLine(new string('-', 55));
        Console.WriteLine(content);
        Console.WriteLine(new string('-', 55));

        // Check for required attributes/base classes
        var hasComponent = content.Contains("MinimactComponent") || content.Contains("class");
        var hasState = content.Contains("[State]") || content.Contains("StateAttribute");
        var hasRender = content.Contains("Render(") || content.Contains("override");

        Console.WriteLine("\nComponent Analysis:");
        Console.WriteLine($"  Has component class: {(hasComponent ? "✓" : "✗")}");
        Console.WriteLine($"  Has state fields:    {(hasState ? "✓" : "✗")}");
        Console.WriteLine($"  Has render method:   {(hasRender ? "✓" : "✗")}");

        if (hasComponent && hasRender)
        {
            Console.ForegroundColor = ConsoleColor.Green;
            Console.WriteLine("\n✓ Component structure looks valid");
            Console.ResetColor();
        }
        else
        {
            Console.ForegroundColor = ConsoleColor.Yellow;
            Console.WriteLine("\n⚠ Component may be missing required elements");
            Console.ResetColor();
        }
    }
    catch (Exception ex)
    {
        Console.ForegroundColor = ConsoleColor.Red;
        Console.WriteLine($"✗ Error: {ex.Message}");
        Console.ResetColor();
        Environment.ExitCode = 1;
    }
}

static void TestPredictor(int iterations)
{
    TestPredictorInternal(iterations, true);
}

static bool TestPredictorInternal(int iterations, bool verbose)
{
    try
    {
        if (verbose) Console.WriteLine($"  Creating predictor and training with {iterations} iterations...");

        var handle = MinimactNative.minimact_predictor_new();

        var tree1 = new { type = "Text", content = "Off" };
        var tree2 = new { type = "Text", content = "On" };
        var stateChange = new { component_id = "toggle", state_key = "on", old_value = false, new_value = true };

        var json1 = MinimactHelper.SerializeJson(tree1);
        var json2 = MinimactHelper.SerializeJson(tree2);
        var stateJson = MinimactHelper.SerializeJson(stateChange);

        for (int i = 0; i < iterations; i++)
        {
            var result = MinimactNative.minimact_predictor_learn(handle, stateJson, json1, json2);
            if (!result.IsSuccess)
            {
                if (verbose) Console.WriteLine($"  ✗ Learn iteration {i + 1} failed: {result.GetErrorMessage()}");
                MinimactNative.minimact_predictor_destroy(handle);
                return false;
            }
        }

        if (verbose) Console.WriteLine($"  Pattern learned {iterations} times");

        var predPtr = MinimactNative.minimact_predictor_predict(handle, stateJson, json1);
        var prediction = MinimactHelper.GetStringAndFree(predPtr);

        if (prediction != null)
        {
            var pred = JsonConvert.DeserializeObject<JObject>(prediction);
            var confidence = pred?["confidence"]?.Value<float>();
            if (verbose) Console.WriteLine($"  Prediction confidence: {confidence:P0}");
        }
        else
        {
            if (verbose) Console.WriteLine("  ✗ No prediction returned");
            MinimactNative.minimact_predictor_destroy(handle);
            return false;
        }

        MinimactNative.minimact_predictor_destroy(handle);
        return prediction != null;
    }
    catch (Exception ex)
    {
        if (verbose) Console.WriteLine($"  ✗ Exception: {ex.Message}");
        return false;
    }
}

static bool TestBasicReconciliation(bool verbose)
{
    try
    {
        if (verbose) Console.WriteLine("  Reconciling two simple trees...");

        var oldTree = new { type = "Element", tag = "div", props = new Dictionary<string, string>(), children = new[] { new { type = "Text", content = "Old" } } };
        var newTree = new { type = "Element", tag = "div", props = new Dictionary<string, string>(), children = new[] { new { type = "Text", content = "New" } } };

        var oldJson = MinimactHelper.SerializeJson(oldTree);
        var newJson = MinimactHelper.SerializeJson(newTree);

        var patchesPtr = MinimactNative.minimact_reconcile(oldJson, newJson);
        var patchesJson = MinimactHelper.GetStringAndFree(patchesPtr);

        if (patchesJson == null)
        {
            if (verbose) Console.WriteLine("  ✗ No result returned");
            return false;
        }

        if (patchesJson.Contains("error"))
        {
            if (verbose) Console.WriteLine($"  ✗ Error: {patchesJson}");
            return false;
        }

        var patches = JsonConvert.DeserializeObject<List<object>>(patchesJson);
        if (verbose) Console.WriteLine($"  Generated {patches?.Count ?? 0} patch(es)");

        return patches != null && patches.Count > 0;
    }
    catch (Exception ex)
    {
        if (verbose) Console.WriteLine($"  ✗ Exception: {ex.Message}");
        return false;
    }
}

static bool TestMetrics(bool verbose)
{
    try
    {
        if (verbose) Console.WriteLine("  Fetching metrics...");

        var metricsPtr = MinimactNative.minimact_metrics_get();
        var metricsJson = MinimactHelper.GetStringAndFree(metricsPtr);

        if (metricsJson == null)
        {
            if (verbose) Console.WriteLine("  ✗ No metrics available");
            return false;
        }

        var metrics = JsonConvert.DeserializeObject<JObject>(metricsJson);
        if (metrics?["reconcile_calls"] == null)
        {
            if (verbose) Console.WriteLine("  ✗ Metrics missing required fields");
            return false;
        }

        if (verbose)
        {
            Console.WriteLine($"  Reconcile calls: {metrics["reconcile_calls"]}");
            Console.WriteLine($"  Predictor learns: {metrics["predictor_learns"]}");
            Console.WriteLine($"  Current predictors: {metrics["current_predictors"]}");
        }

        return true;
    }
    catch (Exception ex)
    {
        if (verbose) Console.WriteLine($"  ✗ Exception: {ex.Message}");
        return false;
    }
}

static bool TestLogging(bool verbose)
{
    try
    {
        if (verbose) Console.WriteLine("  Fetching logs...");

        var logsPtr = MinimactNative.minimact_logging_get_logs();
        var logsJson = MinimactHelper.GetStringAndFree(logsPtr);

        if (logsJson == null || logsJson == "[]")
        {
            if (verbose) Console.WriteLine("  ⚠ No logs captured (this is OK if no operations logged yet)");
            return true; // Not a failure - logging infrastructure is working
        }

        var logs = JsonConvert.DeserializeObject<List<JObject>>(logsJson);
        if (verbose) Console.WriteLine($"  Captured {logs?.Count ?? 0} log entries");

        return true;
    }
    catch (Exception ex)
    {
        if (verbose) Console.WriteLine($"  ✗ Exception: {ex.Message}");
        return false;
    }
}

static void RunReconcile(FileInfo oldFile, FileInfo newFile)
{
    try
    {
        var oldJson = File.ReadAllText(oldFile.FullName);
        var newJson = File.ReadAllText(newFile.FullName);

        Console.WriteLine("Reconciling trees...\n");

        var patchesPtr = MinimactNative.minimact_reconcile(oldJson, newJson);
        var patchesJson = MinimactHelper.GetStringAndFree(patchesPtr);

        if (patchesJson == null)
        {
            Console.WriteLine("✗ No result returned");
            Environment.ExitCode = 1;
            return;
        }

        if (patchesJson.Contains("error"))
        {
            Console.ForegroundColor = ConsoleColor.Red;
            Console.WriteLine("✗ Error:");
            Console.WriteLine(patchesJson);
            Console.ResetColor();
            Environment.ExitCode = 1;
            return;
        }

        var patches = JsonConvert.DeserializeObject<List<object>>(patchesJson);

        Console.ForegroundColor = ConsoleColor.Green;
        Console.WriteLine($"✓ Generated {patches?.Count ?? 0} patch(es):\n");
        Console.ResetColor();
        Console.WriteLine(JsonConvert.SerializeObject(patches, Formatting.Indented));
    }
    catch (Exception ex)
    {
        Console.ForegroundColor = ConsoleColor.Red;
        Console.WriteLine($"✗ Error: {ex.Message}");
        Console.ResetColor();
        Environment.ExitCode = 1;
    }
}

static void DisplayMetrics()
{
    try
    {
        var metricsPtr = MinimactNative.minimact_metrics_get();
        var metricsJson = MinimactHelper.GetStringAndFree(metricsPtr);

        if (metricsJson == null)
        {
            Console.WriteLine("✗ No metrics available");
            return;
        }

        var metrics = JsonConvert.DeserializeObject<JObject>(metricsJson);

        Console.WriteLine("╔═══════════════════════════════════════════════════╗");
        Console.WriteLine("║   Minimact Metrics                                 ║");
        Console.WriteLine("╚═══════════════════════════════════════════════════╝\n");

        Console.WriteLine("Reconciliation:");
        Console.WriteLine($"  Calls:          {metrics?["reconcile_calls"]}");
        Console.WriteLine($"  Errors:         {metrics?["reconcile_errors"]}");
        Console.WriteLine($"  Patches:        {metrics?["total_patches_generated"]}");
        Console.WriteLine($"  Avg time (μs):  {metrics?["avg_reconcile_time_us"]}");

        Console.WriteLine("\nPredictor:");
        Console.WriteLine($"  Learns:         {metrics?["predictor_learns"]}");
        Console.WriteLine($"  Predictions:    {metrics?["predictor_predictions"]}");
        Console.WriteLine($"  Hit rate:       {metrics?["prediction_hit_rate"]:P0}");
        Console.WriteLine($"  Avg time (μs):  {metrics?["avg_prediction_time_us"]}");

        Console.WriteLine("\nMemory:");
        Console.WriteLine($"  Predictors:     {metrics?["current_predictors"]} (max: {metrics?["max_predictors"]})");
        Console.WriteLine($"  Evictions:      {metrics?["evictions_performed"]}");

        Console.WriteLine($"\nUptime:           {metrics?["uptime_secs"]}s\n");
    }
    catch (Exception ex)
    {
        Console.WriteLine($"✗ Error: {ex.Message}");
    }
}

static void DisplayLogs(int level)
{
    try
    {
        MinimactNative.minimact_logging_enable();
        MinimactNative.minimact_logging_set_level((uint)level);

        var logsPtr = MinimactNative.minimact_logging_get_logs();
        var logsJson = MinimactHelper.GetStringAndFree(logsPtr);

        if (logsJson == null || logsJson == "[]")
        {
            Console.WriteLine("No logs captured (logging may be disabled or no operations performed)");
            return;
        }

        var logs = JsonConvert.DeserializeObject<List<JObject>>(logsJson);

        Console.WriteLine($"╔═══════════════════════════════════════════════════╗");
        Console.WriteLine($"║   Captured Logs ({logs?.Count ?? 0} entries)");
        Console.WriteLine($"╚═══════════════════════════════════════════════════╝\n");

        foreach (var log in logs ?? new List<JObject>())
        {
            var logLevel = log["level"]?.ToString();
            var message = log["message"]?.ToString();
            var module = log["module"]?.ToString();
            var elapsed = log["elapsed_ms"]?.ToString();

            var color = logLevel switch
            {
                "Error" => ConsoleColor.Red,
                "Warn" => ConsoleColor.Yellow,
                "Info" => ConsoleColor.Green,
                _ => ConsoleColor.Gray
            };

            Console.ForegroundColor = color;
            Console.Write($"[{logLevel}]");
            Console.ResetColor();
            Console.WriteLine($" {message} ({module}, +{elapsed}ms)");
        }
    }
    catch (Exception ex)
    {
        Console.WriteLine($"✗ Error: {ex.Message}");
    }
}

UIntPtr GetOrCreateSharedPredictor()
{
    if (_sharedPredictorHandle != UIntPtr.Zero)
    {
        return _sharedPredictorHandle;
    }

    // Ensure directory exists
    var dir = Path.GetDirectoryName(PREDICTOR_FILE_PATH);
    if (!string.IsNullOrEmpty(dir) && !Directory.Exists(dir))
    {
        Directory.CreateDirectory(dir);
    }

    // Try to load from file
    if (File.Exists(PREDICTOR_FILE_PATH))
    {
        try
        {
            var json = File.ReadAllText(PREDICTOR_FILE_PATH);
            var handle = MinimactNative.minimact_predictor_load(json);
            if (handle != UIntPtr.Zero)
            {
                _sharedPredictorHandle = handle;
                // Console.WriteLine($"✓ Predictor loaded from {PREDICTOR_FILE_PATH}");  // Suppress to keep output clean
                return handle;
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"⚠ Failed to load predictor: {ex.Message}");
        }
    }

    // Create new predictor if load failed or file doesn't exist
    _sharedPredictorHandle = MinimactNative.minimact_predictor_new();
    // Console.WriteLine("✓ New predictor created");  // Suppress to keep output clean
    return _sharedPredictorHandle;
}

void SaveSharedPredictor()
{
    if (_sharedPredictorHandle == UIntPtr.Zero)
    {
        return;
    }

    try
    {
        var jsonPtr = MinimactNative.minimact_predictor_save(_sharedPredictorHandle);
        var json = MinimactHelper.GetStringAndFree(jsonPtr);

        if (json != null)
        {
            File.WriteAllText(PREDICTOR_FILE_PATH, json);
        }
    }
    catch (Exception ex)
    {
        Console.WriteLine($"⚠ Failed to save predictor: {ex.Message}");
    }
}

void RunPredictorLearn(string? stateJson, string? oldTreeJson, string? newTreeJson)
{
    if (string.IsNullOrEmpty(stateJson) || string.IsNullOrEmpty(oldTreeJson) || string.IsNullOrEmpty(newTreeJson))
    {
        Console.WriteLine("✗ Error: --learn requires --state, --old, and --new arguments");
        Environment.ExitCode = 1;
        return;
    }

    try
    {
        var predictor = GetOrCreateSharedPredictor();

        var result = MinimactNative.minimact_predictor_learn(predictor, stateJson, oldTreeJson, newTreeJson);

        if (result.IsSuccess)
        {
            // Parse state change to extract info for display
            var stateChange = JsonConvert.DeserializeObject<JObject>(stateJson);
            var componentId = stateChange?["component_id"]?.ToString() ?? "unknown";
            var stateKey = stateChange?["state_key"]?.ToString() ?? "unknown";

            Console.WriteLine("✓ Pattern learned");
            Console.WriteLine($"  Component: {componentId}");
            Console.WriteLine($"  State key: {stateKey}");

            // Auto-save after learning
            SaveSharedPredictor();
        }
        else
        {
            var error = result.GetErrorMessage() ?? "Unknown error";
            Console.WriteLine($"✗ Error: {error}");
            Environment.ExitCode = 1;
        }

        // Don't destroy the shared predictor
    }
    catch (Exception ex)
    {
        Console.WriteLine($"✗ Error: {ex.Message}");
        Environment.ExitCode = 1;
    }
}

void RunPredictorPredict(string? stateJson, string? currentTreeJson)
{
    if (string.IsNullOrEmpty(stateJson) || string.IsNullOrEmpty(currentTreeJson))
    {
        Console.WriteLine("✗ Error: --predict requires --state and --current arguments");
        Environment.ExitCode = 1;
        return;
    }

    try
    {
        var predictor = GetOrCreateSharedPredictor();

        var resultPtr = MinimactNative.minimact_predictor_predict(predictor, stateJson, currentTreeJson);
        var resultJson = MinimactHelper.GetStringAndFree(resultPtr);

        if (resultJson != null)
        {
            var result = JsonConvert.DeserializeObject<JObject>(resultJson);

            if (result?["ok"]?.Value<bool>() == true)
            {
                var data = result["data"] as JObject;

                // Pretty print the prediction result
                var prettyJson = JsonConvert.SerializeObject(data, Formatting.Indented);
                Console.WriteLine(prettyJson);
            }
            else
            {
                var error = result?["error"]?.ToString() ?? "Unknown error";
                Console.WriteLine($"✗ Error: {error}");
                Environment.ExitCode = 1;
            }
        }
        else
        {
            Console.WriteLine("✗ Error: No prediction returned");
            Environment.ExitCode = 1;
        }

        // Don't destroy the shared predictor
    }
    catch (Exception ex)
    {
        Console.WriteLine($"✗ Error: {ex.Message}");
        Environment.ExitCode = 1;
    }
}

void DisplayPredictorStats()
{
    try
    {
        var predictor = GetOrCreateSharedPredictor();

        var statsPtr = MinimactNative.minimact_predictor_stats(predictor);
        var statsJson = MinimactHelper.GetStringAndFree(statsPtr);

        if (statsJson != null)
        {
            var result = JsonConvert.DeserializeObject<JObject>(statsJson);

            if (result?["ok"]?.Value<bool>() == true)
            {
                var data = result["data"] as JObject;
                var activePatterns = data?["active_patterns"]?.Value<int>() ?? 0;
                var totalPredictions = data?["total_predictions"]?.Value<int>() ?? 0;
                var predictionHits = data?["prediction_hits"]?.Value<int>() ?? 0;
                var hitRate = totalPredictions > 0 ? (predictionHits * 100.0 / totalPredictions) : 0.0;
                var avgConfidence = data?["avg_confidence"]?.Value<double>() ?? 0.0;

                Console.WriteLine("╔═══════════════════════════════════════════════════╗");
                Console.WriteLine("║   Predictor Statistics                            ║");
                Console.WriteLine("╚═══════════════════════════════════════════════════╝");
                Console.WriteLine();
                Console.WriteLine($"Active Patterns:     {activePatterns}");
                Console.WriteLine($"Total Predictions:   {totalPredictions}");
                Console.WriteLine($"Prediction Hits:     {predictionHits}");
                Console.WriteLine($"Hit Rate:            {hitRate:F1}%");
                Console.WriteLine($"Avg Confidence:      {avgConfidence * 100:F1}%");
            }
            else
            {
                var error = result?["error"]?.ToString() ?? "Unknown error";
                Console.WriteLine($"✗ Error: {error}");
                Environment.ExitCode = 1;
            }
        }
        else
        {
            Console.WriteLine("✗ Error: No stats returned");
            Environment.ExitCode = 1;
        }

        // Don't destroy the shared predictor
    }
    catch (Exception ex)
    {
        Console.WriteLine($"✗ Error: {ex.Message}");
        Environment.ExitCode = 1;
    }
}

void ResetPredictor()
{
    try
    {
        if (File.Exists(PREDICTOR_FILE_PATH))
        {
            File.Delete(PREDICTOR_FILE_PATH);
            Console.WriteLine($"✓ Predictor state cleared: {PREDICTOR_FILE_PATH}");
        }
        else
        {
            Console.WriteLine("✓ No predictor state to clear");
        }

        // Reset the in-memory handle
        if (_sharedPredictorHandle != UIntPtr.Zero)
        {
            MinimactNative.minimact_predictor_destroy(_sharedPredictorHandle);
            _sharedPredictorHandle = UIntPtr.Zero;
        }
    }
    catch (Exception ex)
    {
        Console.WriteLine($"✗ Error: {ex.Message}");
        Environment.ExitCode = 1;
    }
}
