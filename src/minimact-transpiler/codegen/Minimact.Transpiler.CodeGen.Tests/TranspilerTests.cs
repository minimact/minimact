using System.Diagnostics;
using System.Text.Json;
using System.Text.RegularExpressions;
using Minimact.Transpiler.CodeGen.Nodes;
using Minimact.Transpiler.CodeGen.Visitors;
using Xunit.Abstractions;

namespace Minimact.Transpiler.CodeGen.Tests;

/// <summary>
/// Tests the C# code generator by:
/// 1. Running the babel transpiler to generate JSON IR
/// 2. Feeding the JSON IR to the C# code generator
/// 3. Verifying the output compiles and looks correct
/// </summary>
public class TranspilerTests
{
    private readonly ITestOutputHelper _output;
    private readonly string _testFeaturesDir;
    private readonly string _outputDir;

    public TranspilerTests(ITestOutputHelper output)
    {
        _output = output;

        // Navigate to test-features directory
        var baseDir = AppContext.BaseDirectory;
        var minimactRoot = Path.GetFullPath(Path.Combine(baseDir, "..", "..", "..", "..", "..", "..", ".."));
        _testFeaturesDir = Path.Combine(minimactRoot, "src", "minimact-transpiler", "babel", "test-features");
        _outputDir = Path.Combine(_testFeaturesDir, "output");

        _output.WriteLine($"Test Features Dir: {_testFeaturesDir}");
        _output.WriteLine($"Output Dir: {_outputDir}");
    }

    [Theory]
    [InlineData(3, "ConditionalRenderingTest")]     // 03-conditional-rendering.tsx
    [InlineData(5, "EventHandlersTest")]            // 05-event-handlers.tsx
    [InlineData(7, "NestedTemplatesTest")]          // 07-nested-templates.tsx
    [InlineData(10, "NestedLoopsTest")]             // 10-nested-loops.tsx
    [InlineData(15, "BlockStatementHandlersTest")]  // 15-block-statement-handlers.tsx
    [InlineData(18, "SimpleTest")]                  // 18-simple-test.tsx
    public async Task CSharpCodeGenerator_ShouldGenerateValidCode(int testNumber, string componentName)
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

        // Try with "Test" suffix first, then without
        var jsonPath = Path.Combine(_outputDir, $"{componentName}Test.json");
        if (!File.Exists(jsonPath))
        {
            jsonPath = Path.Combine(_outputDir, $"{componentName}.json");
        }

        if (!File.Exists(jsonPath))
        {
            throw new FileNotFoundException($"JSON IR not found: {componentName}.json or {componentName}Test.json in {_outputDir}");
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
        _output.WriteLine($"\n  Preview (first 20 lines):");

        var previewLines = csharpCode.Split('\n').Take(20);
        foreach (var line in previewLines)
        {
            _output.WriteLine($"    {line}");
        }

        // Save output
        var csharpOutputPath = Path.Combine(_outputDir, $"{componentName}.generated.cs");
        await File.WriteAllTextAsync(csharpOutputPath, csharpCode);
        _output.WriteLine($"\n  Saved to: {csharpOutputPath}");

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
        var runTestPath = Path.Combine(_testFeaturesDir, "run-test.js");

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
            WorkingDirectory = _testFeaturesDir
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

    [Fact]
    public void CSharpCodeGenerator_ShouldHandleEmptyComponent()
    {
        // Arrange
        var component = new ComponentNode
        {
            ComponentName = "EmptyComponent",
            RenderMethod = new RenderMethodNode
            {
                Children = new List<BaseNode>()
            }
        };

        // Act
        var generator = new CSharpCodeGenerator();
        component.Accept(generator);
        var output = generator.GetOutput();

        // Assert
        _output.WriteLine("Generated code:");
        _output.WriteLine(output);

        Assert.Contains("class EmptyComponent", output);
        Assert.Contains("protected override VNode Render()", output);
        Assert.Contains("return new VNode()", output);
    }

    [Fact]
    public void CSharpCodeGenerator_ShouldHandleSimpleElement()
    {
        // Arrange
        var component = new ComponentNode
        {
            ComponentName = "SimpleElement",
            RenderMethod = new RenderMethodNode
            {
                Children = new List<BaseNode>
                {
                    new JSXElementNode
                    {
                        Tag = "div",
                        Attributes = new List<AttributeTemplateNode>(),
                        Children = new List<BaseNode>
                        {
                            new StaticTextNode { Content = "Hello World" }
                        }
                    }
                }
            }
        };

        // Act
        var generator = new CSharpCodeGenerator();
        component.Accept(generator);
        var output = generator.GetOutput();

        // Assert
        _output.WriteLine("Generated code:");
        _output.WriteLine(output);

        Assert.Contains("new VElement(\"div\"", output);
        Assert.Contains("Hello World", output);
    }
}
