using System.Diagnostics;
using Reluxer.Lexer;
using Reluxer.Transformer;
using Reluxer.Transformer.Visitors;
using Reluxer.Transformer.Models;

namespace Reluxer.Transformer.Tests;

class Program
{
    static readonly string FixturesDir = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", "..", "fixtures"));
    static readonly string TestOutputDir = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", "..", "test-output-lexer"));

    // Colors for console output
    const string Reset = "\x1b[0m";
    const string Red = "\x1b[31m";
    const string Green = "\x1b[32m";
    const string Yellow = "\x1b[33m";
    const string Cyan = "\x1b[36m";

    static void Log(string message, string color = Reset) => Console.WriteLine($"{color}{message}{Reset}");

    static void Main(string[] args)
    {
        if (args.Length == 0)
        {
            Log("Usage: dotnet run -- <path-to-file.tsx>", Red);
            Log("Example: dotnet run -- Counter.tsx", Cyan);
            Log("Example: dotnet run -- ../test-tsx/01-ComplexTemplateLiterals.tsx", Cyan);
            return;
        }

        var inputPath = args[0];
        string tsxPath;

        if (Path.IsPathRooted(inputPath))
            tsxPath = inputPath;
        else if (inputPath.Contains('/') || inputPath.Contains('\\'))
            tsxPath = Path.GetFullPath(inputPath);
        else
            tsxPath = Path.Combine(FixturesDir, inputPath);

        if (!File.Exists(tsxPath))
        {
            Log($"Error: File not found: {tsxPath}", Red);
            return;
        }

        var source = File.ReadAllText(tsxPath);
        var filename = Path.GetFileName(tsxPath);

        Log($"\n╔═══════════════════════════════════════════════════╗", Cyan);
        Log($"║   Testing: {filename.PadRight(36)}║", Cyan);
        Log($"╚═══════════════════════════════════════════════════╝\n", Cyan);

        try
        {
            // Debug: Show tokens first
            Log("Tokenizing...", Yellow);
            var debugLexer = new Reluxer.Lexer.TsxLexer(source);
            var debugTokens = debugLexer.Tokenize();
            Log($"Token count: {debugTokens.Count}", Green);

            // Show JSX-related tokens
            var jsxTokens = debugTokens.Where(t =>
                t.Type.ToString().StartsWith("Jsx") ||
                t.Value == "<" ||
                t.Value == ">" ||
                t.Value == "/>" ||
                t.Value == "</" ||
                t.Value == "return").ToList();
            Log($"JSX-related tokens: {jsxTokens.Count}", Yellow);
            foreach (var t in jsxTokens.Take(20))
            {
                Log($"  [{t.Type}] \"{t.Value}\" at {t.Start}");
            }

            // Use the full transformer pipeline
            Log("\nTranspiling with Reluxer...", Yellow);

            var options = new TransformOptions
            {
                Namespace = "MinimactTest.Components",
                GeneratePartialClasses = true,
                IncludeUsings = true,
                GenerateTemplates = true
            };

            var transformer = new TsxTransformer(options);
            var result = transformer.Transform(source);

            if (result.Errors.Count > 0)
            {
                Log($"\n✗ Transformation errors:", Red);
                foreach (var error in result.Errors)
                    Log($"  - {error}", Red);
                return;
            }

            Log($"\n✓ Transpiled successfully\n", Green);

            // Display C# code
            Log($"Generated C# code:\n", Cyan);
            Log(new string('=', 80), Cyan);

            var lines = result.Code.Split('\n');
            for (int i = 0; i < lines.Length; i++)
            {
                var lineNum = (i + 1).ToString().PadLeft(4);
                Console.WriteLine($"{Yellow}{lineNum}{Reset} {lines[i]}");
            }

            Log(new string('=', 80) + "\n", Cyan);
            Log($"✓ Total lines: {lines.Length}", Green);

            // Write output files
            Directory.CreateDirectory(TestOutputDir);

            var csOutputPath = Path.Combine(TestOutputDir, Path.ChangeExtension(filename, ".cs"));
            File.WriteAllText(csOutputPath, result.Code);
            Log($"\n✓ Wrote C# output to: {csOutputPath}", Green);

            // Display and write template JSON
            if (!string.IsNullOrEmpty(result.TemplateJson))
            {
                Log($"\n{new string('━', 80)}", Cyan);
                Log($"\nGenerated Templates JSON:\n", Cyan);
                Log(new string('=', 80), Cyan);

                var jsonLines = result.TemplateJson.Split('\n');
                for (int i = 0; i < jsonLines.Length; i++)
                {
                    var lineNum = (i + 1).ToString().PadLeft(4);
                    Console.WriteLine($"{Yellow}{lineNum}{Reset} {jsonLines[i]}");
                }

                Log(new string('=', 80) + "\n", Cyan);

                var jsonOutputPath = Path.Combine(TestOutputDir, Path.ChangeExtension(filename, ".templates.json"));
                File.WriteAllText(jsonOutputPath, result.TemplateJson);
                Log($"✓ Wrote templates JSON to: {jsonOutputPath}", Green);

                // Count templates
                var templateCount = result.Components.Sum(c => c.Templates.Count);
                Log($"✓ Template count: {templateCount}", Green);
            }
            else
            {
                Log($"\n⚠ No templates JSON generated", Yellow);
            }

            // Show component summary
            Log($"\n{new string('━', 80)}", Cyan);
            Log($"\nComponent Summary:\n", Cyan);
            foreach (var component in result.Components)
            {
                Log($"  {component.Name}:", Green);
                Log($"    - State fields: {component.StateFields.Count}");
                Log($"    - Event handlers: {component.EventHandlers.Count}");
                Log($"    - Local variables: {component.LocalVariables.Count}");
                Log($"    - Has render tree: {component.RenderTree != null}");
                Log($"    - Templates: {component.Templates.Count}");
            }

            // Compile the C# code
            Log($"\n{new string('━', 80)}", Cyan);
            Log($"\nCompiling C# code...", Yellow);

            var csFilename = Path.ChangeExtension(filename, ".cs");
            var compileSuccess = CompileCSharp(TestOutputDir, csFilename);
            if (compileSuccess)
            {
                Log($"\n✓ C# compilation successful!", Green);
            }
            else
            {
                Log($"\n✗ C# compilation failed!", Red);
            }

            Log($"\n✓ Done!", Green);
        }
        catch (Exception ex)
        {
            Log($"\n✗ Failed: {ex.Message}", Red);
            Log(ex.StackTrace ?? "", Red);
        }
    }

    static bool CompileCSharp(string projectDir, string csFilename)
    {
        try
        {
            var psi = new ProcessStartInfo
            {
                FileName = "dotnet",
                Arguments = $"build -p:TestFile={csFilename}",
                WorkingDirectory = projectDir,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true
            };

            using var process = Process.Start(psi);
            if (process == null) return false;

            var stdout = process.StandardOutput.ReadToEnd();
            var stderr = process.StandardError.ReadToEnd();
            process.WaitForExit();

            if (process.ExitCode != 0)
            {
                // Show error output
                if (!string.IsNullOrEmpty(stdout))
                {
                    // Filter to show only error lines
                    var lines = stdout.Split('\n');
                    foreach (var line in lines)
                    {
                        if (line.Contains("error CS") || line.Contains("Build FAILED"))
                        {
                            Log(line.Trim(), Red);
                        }
                    }
                }
                if (!string.IsNullOrEmpty(stderr))
                {
                    Log(stderr, Red);
                }
                return false;
            }

            return true;
        }
        catch (Exception ex)
        {
            Log($"Compilation error: {ex.Message}", Red);
            return false;
        }
    }
}
