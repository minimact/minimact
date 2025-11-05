using System.Diagnostics;
using System.Text.Json;
using System.Text.RegularExpressions;
using Minimact.Transpiler.CodeGen.Nodes;
using Minimact.Transpiler.CodeGen.Visitors;
using Xunit.Abstractions;

namespace Minimact.Transpiler.CodeGen.Tests;

/// <summary>
/// Tests that compare the new C# transpiler output with the original babel-plugin-minimact output
/// </summary>
public class TranspilerComparisonTests
{
    private readonly ITestOutputHelper _output;
    private readonly string _srcDir;
    private readonly string _fixturesDir;

    public TranspilerComparisonTests(ITestOutputHelper output)
    {
        _output = output;
        _srcDir = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", "..", ".."));
        _fixturesDir = Path.Combine(_srcDir, "fixtures");
    }

    [Theory]
    [InlineData("Counter.jsx")]
    [InlineData("TodoList.jsx")]
    [InlineData("EventHandlers.jsx")]
    [InlineData("ConditionalRendering.jsx")]
    [InlineData("UseStateTest.jsx")]
    public async Task Transpiler_ShouldMatchBabelPluginOutput(string fixtureFilename)
    {
        // Arrange
        var fixturePath = Path.Combine(_fixturesDir, fixtureFilename);
        if (!File.Exists(fixturePath))
        {
            throw new FileNotFoundException($"Fixture not found: {fixturePath}");
        }

        _output.WriteLine($"Testing: {fixtureFilename}");
        _output.WriteLine($"Fixture path: {fixturePath}");
        _output.WriteLine("");

        // Act 1: Get original babel plugin output
        _output.WriteLine("Running original babel plugin...");
        var babelOutput = await RunBabelPlugin(fixturePath);
        _output.WriteLine($"✓ Babel plugin output: {babelOutput.CSharpCode.Length} chars");

        // Act 2: Get JSON IR from babel plugin
        _output.WriteLine("Getting JSON IR from babel plugin...");
        var jsonIR = await GetJsonIRFromBabel(fixturePath);
        _output.WriteLine($"✓ JSON IR received: {jsonIR.Length} chars");

        // Act 3: Run new C# transpiler on JSON IR
        _output.WriteLine("Running new C# transpiler...");
        var newTranspilerOutput = TranspileFromJsonIR(jsonIR);
        _output.WriteLine($"✓ New transpiler output: {newTranspilerOutput.Length} chars");

        // Assert: Compare outputs
        _output.WriteLine("");
        _output.WriteLine("Comparing outputs...");

        // Normalize both outputs for comparison (remove whitespace differences, etc.)
        var normalizedBabel = NormalizeCode(babelOutput.CSharpCode);
        var normalizedNew = NormalizeCode(newTranspilerOutput);

        // Write comparison files for debugging
        var outputDir = Path.Combine(_srcDir, "test-output", "comparison");
        Directory.CreateDirectory(outputDir);

        var babelOutputPath = Path.Combine(outputDir, $"{fixtureFilename}.babel.cs");
        var newOutputPath = Path.Combine(outputDir, $"{fixtureFilename}.new.cs");
        var diffOutputPath = Path.Combine(outputDir, $"{fixtureFilename}.diff.txt");

        File.WriteAllText(babelOutputPath, babelOutput.CSharpCode);
        File.WriteAllText(newOutputPath, newTranspilerOutput);

        _output.WriteLine($"Wrote comparison files:");
        _output.WriteLine($"  Babel: {babelOutputPath}");
        _output.WriteLine($"  New:   {newOutputPath}");

        // Generate diff
        var diff = GenerateDiff(normalizedBabel, normalizedNew);
        File.WriteAllText(diffOutputPath, diff);
        _output.WriteLine($"  Diff:  {diffOutputPath}");
        _output.WriteLine("");

        if (normalizedBabel != normalizedNew)
        {
            _output.WriteLine("❌ DIFFERENCES FOUND:");
            _output.WriteLine(diff);
            _output.WriteLine("");

            // Show first difference for quick debugging
            var firstDiff = FindFirstDifference(normalizedBabel, normalizedNew);
            _output.WriteLine($"First difference at position {firstDiff.Position}:");
            _output.WriteLine($"  Babel: ...{firstDiff.BabelContext}...");
            _output.WriteLine($"  New:   ...{firstDiff.NewContext}...");
        }
        else
        {
            _output.WriteLine("✓ Outputs match!");
        }

        Assert.Equal(normalizedBabel, normalizedNew);
    }

    /// <summary>
    /// Run the original babel plugin using test-single.js
    /// </summary>
    private async Task<BabelPluginOutput> RunBabelPlugin(string jsxPath)
    {
        var testSinglePath = Path.Combine(_srcDir, "test-single.js");

        var startInfo = new ProcessStartInfo
        {
            FileName = "node",
            Arguments = $"\"{testSinglePath}\" \"{jsxPath}\"",
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
            CreateNoWindow = true,
            WorkingDirectory = _srcDir
        };

        using var process = Process.Start(startInfo)
            ?? throw new InvalidOperationException("Failed to start node process");

        var output = await process.StandardOutput.ReadToEndAsync();
        var error = await process.StandardError.ReadToEndAsync();

        await process.WaitForExitAsync();

        if (process.ExitCode != 0)
        {
            throw new Exception($"Babel plugin failed: {error}");
        }

        // Parse the output - test-single.js outputs JSON
        // We need to extract just the C# code portion
        // Look for the lines between "Generated C# code:" and the next section

        var lines = output.Split('\n');
        var csharpLines = new List<string>();
        var inCSharpSection = false;
        var foundStart = false;

        foreach (var line in lines)
        {
            if (line.Contains("Generated C# code:"))
            {
                inCSharpSection = true;
                continue;
            }

            if (inCSharpSection && line.Contains("===") && !foundStart)
            {
                foundStart = true;
                continue;
            }

            if (inCSharpSection && foundStart)
            {
                if (line.Contains("==="))
                {
                    break;
                }

                // Remove line numbers (format: "  123 code")
                var cleaned = Regex.Replace(line, @"^\s*\d+\s+", "");
                csharpLines.Add(cleaned);
            }
        }

        var csharpCode = string.Join("\n", csharpLines);

        return new BabelPluginOutput
        {
            CSharpCode = csharpCode,
            TemplatesJson = null // TODO: Parse templates if needed
        };
    }

    /// <summary>
    /// Get JSON IR from babel plugin
    /// TODO: Implement this - need to modify babel plugin to output JSON IR
    /// </summary>
    private async Task<string> GetJsonIRFromBabel(string jsxPath)
    {
        // For now, return a placeholder
        // In reality, we need the babel plugin to output the JSON IR
        return "{}";
    }

    /// <summary>
    /// Transpile from JSON IR using the new C# transpiler
    /// </summary>
    private string TranspileFromJsonIR(string jsonIR)
    {
        if (jsonIR == "{}")
        {
            // Placeholder - can't actually transpile without real JSON IR
            return "";
        }

        var component = JsonSerializer.Deserialize<ComponentNode>(jsonIR)
            ?? throw new InvalidOperationException("Failed to deserialize JSON IR");

        var generator = new CSharpCodeGenerator();
        component.Accept(generator);

        return generator.GetOutput();
    }

    /// <summary>
    /// Normalize C# code for comparison (remove whitespace differences, etc.)
    /// </summary>
    private string NormalizeCode(string code)
    {
        if (string.IsNullOrWhiteSpace(code))
        {
            return "";
        }

        // Remove leading/trailing whitespace
        code = code.Trim();

        // Normalize line endings
        code = code.Replace("\r\n", "\n");

        // Remove multiple consecutive blank lines
        code = Regex.Replace(code, @"\n\n+", "\n\n");

        // Normalize indentation (convert to 4 spaces)
        var lines = code.Split('\n');
        var normalized = new List<string>();

        foreach (var line in lines)
        {
            // Count leading whitespace
            var leadingWhitespace = line.Length - line.TrimStart().Length;
            var indentLevel = leadingWhitespace / 4;
            var normalizedLine = new string(' ', indentLevel * 4) + line.TrimStart();
            normalized.Add(normalizedLine);
        }

        return string.Join("\n", normalized);
    }

    /// <summary>
    /// Generate a diff between two code strings
    /// </summary>
    private string GenerateDiff(string code1, string code2)
    {
        var lines1 = code1.Split('\n');
        var lines2 = code2.Split('\n');

        var diff = new System.Text.StringBuilder();
        var maxLines = Math.Max(lines1.Length, lines2.Length);

        diff.AppendLine("Line-by-line comparison:");
        diff.AppendLine("");

        for (int i = 0; i < maxLines; i++)
        {
            var line1 = i < lines1.Length ? lines1[i] : "<missing>";
            var line2 = i < lines2.Length ? lines2[i] : "<missing>";

            if (line1 != line2)
            {
                diff.AppendLine($"Line {i + 1}:");
                diff.AppendLine($"  Babel: {line1}");
                diff.AppendLine($"  New:   {line2}");
                diff.AppendLine("");
            }
        }

        return diff.ToString();
    }

    /// <summary>
    /// Find the first difference between two strings
    /// </summary>
    private (int Position, string BabelContext, string NewContext) FindFirstDifference(string code1, string code2)
    {
        var minLength = Math.Min(code1.Length, code2.Length);

        for (int i = 0; i < minLength; i++)
        {
            if (code1[i] != code2[i])
            {
                var contextStart = Math.Max(0, i - 20);
                var contextEnd = Math.Min(minLength, i + 20);

                var babelContext = code1.Substring(contextStart, contextEnd - contextStart);
                var newContext = code2.Substring(contextStart, Math.Min(code2.Length, contextEnd) - contextStart);

                return (i, babelContext, newContext);
            }
        }

        // Different lengths
        if (code1.Length != code2.Length)
        {
            var pos = minLength;
            var babelContext = code1.Length > minLength ? code1.Substring(Math.Max(0, pos - 20), Math.Min(40, code1.Length - pos + 20)) : "<end>";
            var newContext = code2.Length > minLength ? code2.Substring(Math.Max(0, pos - 20), Math.Min(40, code2.Length - pos + 20)) : "<end>";

            return (pos, babelContext, newContext);
        }

        return (-1, "", "");
    }

    private class BabelPluginOutput
    {
        public string CSharpCode { get; set; } = "";
        public object? TemplatesJson { get; set; }
    }
}
