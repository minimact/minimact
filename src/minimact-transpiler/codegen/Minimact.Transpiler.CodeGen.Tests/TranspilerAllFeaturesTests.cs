using System.Diagnostics;
using System.Text.Json;
using Minimact.Transpiler.CodeGen.Generators;
using Minimact.Transpiler.CodeGen.Nodes;
using Minimact.Transpiler.CodeGen.Visitors;
using Xunit.Abstractions;

namespace Minimact.Transpiler.CodeGen.Tests;

/// <summary>
/// Tests the C# code generator against test-features-all directory
/// These are more comprehensive real-world component tests
/// </summary>
public class TranspilerAllFeaturesTests
{
    private readonly ITestOutputHelper _output;
    private readonly string _testFeaturesAllDir;
    private readonly string _outputDir;

    public TranspilerAllFeaturesTests(ITestOutputHelper output)
    {
        _output = output;

        // Navigate to test-features-all directory
        var baseDir = AppContext.BaseDirectory;
        var minimactRoot = Path.GetFullPath(Path.Combine(baseDir, "..", "..", "..", "..", "..", "..", ".."));
        _testFeaturesAllDir = Path.Combine(minimactRoot, "src", "minimact-transpiler", "babel", "test-features-all");
        _outputDir = Path.Combine(_testFeaturesAllDir, "output");

        _output.WriteLine($"Test Features All Dir: {_testFeaturesAllDir}");
        _output.WriteLine($"Output Dir: {_outputDir}");
    }

    [Theory]
    [InlineData(8, "ProductDetailsPage")]  // 08-ProductDetailsPage.tsx
    public async Task CSharpCodeGenerator_ShouldGenerateValidCode_AllFeatures(int testNumber, string componentName)
    {
        // Arrange
        _output.WriteLine($"\n{'='.ToString().PadRight(70, '=')}");
        _output.WriteLine($"Testing: {testNumber:D2}-* → {componentName}");
        _output.WriteLine($"{'='.ToString().PadRight(70, '=')}");

        // Step 1: Run babel transpiler to generate JSON IR
        _output.WriteLine($"\n[1/4] Running babel transpiler...");
        await RunBabelTranspiler(testNumber);
        _output.WriteLine("✓ Babel transpiler completed");

        // Step 2: Load the generated JSON IR
        _output.WriteLine($"\n[2/4] Loading JSON IR...");

        var jsonPath = Path.Combine(_outputDir, $"{componentName}.json");

        if (!File.Exists(jsonPath))
        {
            throw new FileNotFoundException($"JSON IR not found: {componentName}.json in {_outputDir}");
        }

        var jsonContent = await File.ReadAllTextAsync(jsonPath);
        _output.WriteLine($"✓ Loaded JSON IR: {jsonContent.Length} chars");
        _output.WriteLine($"  Path: {jsonPath}");

        // Display JSON structure
        var jsonDoc = JsonDocument.Parse(jsonContent);
        _output.WriteLine($"\n  JSON Structure:");
        _output.WriteLine($"    Type: {jsonDoc.RootElement.GetProperty("type").GetString()}");

        if (jsonDoc.RootElement.TryGetProperty("componentName", out var compName))
        {
            _output.WriteLine($"    Component: {compName.GetString()}");
        }

        if (jsonDoc.RootElement.TryGetProperty("renderMethod", out var renderMethod))
        {
            if (renderMethod.TryGetProperty("children", out var children))
            {
                _output.WriteLine($"    Children Count: {children.GetArrayLength()}");
            }
        }

        // Step 3: Run C# code generator
        _output.WriteLine($"\n[3/4] Running C# code generator...");
        var component = JsonSerializer.Deserialize<ComponentNode>(jsonContent)
            ?? throw new InvalidOperationException("Failed to deserialize JSON IR");

        var generator = new CSharpCodeGenerator();
        component.Accept(generator);
        var csharpCode = generator.GetOutput();

        _output.WriteLine($"✓ Generated C# code: {csharpCode.Length} chars");
        _output.WriteLine($"\n  Preview (first 30 lines):");

        var previewLines = csharpCode.Split('\n').Take(30);
        foreach (var line in previewLines)
        {
            _output.WriteLine($"    {line}");
        }

        // Save C# output
        var csharpOutputPath = Path.Combine(_outputDir, $"{componentName}.generated.cs");
        await File.WriteAllTextAsync(csharpOutputPath, csharpCode);
        _output.WriteLine($"\n  Saved to: {csharpOutputPath}");

        // Generate templates.json
        var templateGenerator = new TemplateJsonGenerator();
        var templatesJson = templateGenerator.GenerateFromComponent(component);
        var templatesOutputPath = Path.Combine(_outputDir, $"{componentName}.templates.json");
        await File.WriteAllTextAsync(templatesOutputPath, templatesJson);
        _output.WriteLine($"  Saved templates: {templatesOutputPath}");

        // Parse and display template count
        var templatesDoc = JsonDocument.Parse(templatesJson);
        if (templatesDoc.RootElement.TryGetProperty("templates", out var templates))
        {
            var templateCount = templates.EnumerateObject().Count();
            _output.WriteLine($"  Template count: {templateCount}");

            // Display first few templates
            _output.WriteLine($"\n  Sample templates:");
            var sampleTemplates = templates.EnumerateObject().Take(5);
            foreach (var template in sampleTemplates)
            {
                _output.WriteLine($"    {template.Name}:");
                if (template.Value.TryGetProperty("template", out var templateStr))
                {
                    _output.WriteLine($"      template: {templateStr.GetString()}");
                }
                if (template.Value.TryGetProperty("type", out var typeStr))
                {
                    _output.WriteLine($"      type: {typeStr.GetString()}");
                }
                if (template.Value.TryGetProperty("bindings", out var bindings))
                {
                    var bindingsList = bindings.EnumerateArray().Select(b => b.GetString()).ToList();
                    _output.WriteLine($"      bindings: [{string.Join(", ", bindingsList)}]");
                }
            }
        }

        // Step 4: Verify output using Roslyn syntax tree analysis
        _output.WriteLine($"\n[4/4] Verifying C# output using Roslyn...");

        var verifier = new CSharpCodeVerifier(csharpCode);

        // Get structure summary
        var summary = verifier.GetStructureSummary();
        _output.WriteLine($"\n  Generated Code Structure:");
        _output.WriteLine($"    Classes: {string.Join(", ", summary.Classes)}");
        _output.WriteLine($"    Methods: {summary.Methods.Count}");
        _output.WriteLine($"    Fields: {summary.Fields.Count}");
        _output.WriteLine($"    Properties: {summary.Properties.Count}");
        _output.WriteLine($"    Syntax Errors: {summary.HasSyntaxErrors}");

        // Display methods
        if (summary.Methods.Count > 0)
        {
            _output.WriteLine($"\n  Methods:");
            foreach (var method in summary.Methods.Take(10))
            {
                _output.WriteLine($"    - {method}");
            }
        }

        // Verify no syntax errors
        Assert.False(summary.HasSyntaxErrors, $"Generated code has syntax errors:\n{string.Join("\n", summary.DiagnosticErrors)}");

        // Verify essential structure
        Assert.True(verifier.HasClass(componentName), $"Missing class: {componentName}");
        Assert.True(verifier.HasMethod("Render"), "Missing Render() method");
        Assert.True(verifier.InheritsFromMinimactComponent(componentName), $"Class {componentName} does not inherit from MinimactComponent");
        Assert.True(verifier.HasComponentAttribute(componentName), $"Class {componentName} missing [Component] attribute");

        // Verify Render method structure
        Assert.True(verifier.RenderMethodCallsSyncMembersToState(), "Render() method does not call StateManager.SyncMembersToState");

        var vElementCount = verifier.CountVElementsInRender();
        _output.WriteLine($"    VElement count in Render(): {vElementCount}");
        Assert.True(vElementCount > 0, "Render() method does not generate any VElements");

        _output.WriteLine("\n✓ All Roslyn verifications passed!");
        _output.WriteLine($"\n{'='.ToString().PadRight(70, '=')}");
        _output.WriteLine("✅ TEST PASSED");
        _output.WriteLine($"{'='.ToString().PadRight(70, '=')}");
    }

    /// <summary>
    /// Run the babel transpiler using run-test.js
    /// </summary>
    private async Task RunBabelTranspiler(int testNumber)
    {
        var runTestPath = Path.Combine(_testFeaturesAllDir, "run-test.js");

        if (!File.Exists(runTestPath))
        {
            throw new FileNotFoundException($"run-test.js not found: {runTestPath}");
        }

        var startInfo = new ProcessStartInfo
        {
            FileName = "node",
            Arguments = $"\"{runTestPath}\" {testNumber}",
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
            CreateNoWindow = true,
            WorkingDirectory = _testFeaturesAllDir
        };

        using var process = Process.Start(startInfo)
            ?? throw new InvalidOperationException("Failed to start node process");

        var outputTask = process.StandardOutput.ReadToEndAsync();
        var errorTask = process.StandardError.ReadToEndAsync();

        await process.WaitForExitAsync();

        var output = await outputTask;
        var error = await errorTask;

        if (process.ExitCode != 0)
        {
            _output.WriteLine("❌ Babel transpiler failed:");
            _output.WriteLine(output);
            _output.WriteLine(error);
            throw new Exception($"Babel transpiler failed with exit code {process.ExitCode}");
        }

        // Log babel output for debugging
        _output.WriteLine("  Babel output:");
        foreach (var line in output.Split('\n').Take(10))
        {
            if (!string.IsNullOrWhiteSpace(line))
            {
                _output.WriteLine($"    {line.Trim()}");
            }
        }
    }
}
