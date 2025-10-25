using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;
using System.Text;

namespace Minimact.Transpiler.Core;

/// <summary>
/// Roslyn-based C# to TypeScript transpiler
///
/// Converts C# worker classes to equivalent TypeScript while maintaining
/// identical algorithm behavior for MockClient testing compatibility.
/// </summary>
public class CSharpToTypeScriptTranspiler
{
    private readonly TypeScriptGenerator _generator;

    public CSharpToTypeScriptTranspiler()
    {
        _generator = new TypeScriptGenerator();
    }

    /// <summary>
    /// Transpile all C# files in input directory to TypeScript
    /// </summary>
    public async Task TranspileAsync(DirectoryInfo inputDir, DirectoryInfo outputDir)
    {
        Console.WriteLine($"Transpiling C# files from {inputDir.FullName} to {outputDir.FullName}");

        if (!outputDir.Exists)
        {
            outputDir.Create();
        }

        var csharpFiles = inputDir.GetFiles("*.cs", SearchOption.AllDirectories);
        var compilation = await CreateCompilationAsync(csharpFiles);

        foreach (var file in csharpFiles)
        {
            await TranspileFileAsync(file, outputDir, compilation);
        }

        Console.WriteLine($"Transpiled {csharpFiles.Length} files successfully");
    }

    /// <summary>
    /// Watch for file changes and auto-regenerate
    /// </summary>
    public async Task WatchAndTranspileAsync(DirectoryInfo inputDir, DirectoryInfo outputDir)
    {
        Console.WriteLine($"Watching {inputDir.FullName} for changes...");

        // Initial transpilation
        await TranspileAsync(inputDir, outputDir);

        // Set up file watcher
        using var watcher = new FileSystemWatcher(inputDir.FullName, "*.cs")
        {
            IncludeSubdirectories = true,
            EnableRaisingEvents = true
        };

        watcher.Changed += async (s, e) =>
        {
            try
            {
                Console.WriteLine($"File changed: {e.Name}");
                await Task.Delay(100); // Debounce
                await TranspileAsync(inputDir, outputDir);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error during auto-transpilation: {ex.Message}");
            }
        };

        Console.WriteLine("Press Ctrl+C to stop watching...");
        await Task.Delay(Timeout.Infinite);
    }

    /// <summary>
    /// Create Roslyn compilation from C# files
    /// </summary>
    private async Task<Compilation> CreateCompilationAsync(FileInfo[] files)
    {
        var syntaxTrees = new List<SyntaxTree>();

        foreach (var file in files)
        {
            var sourceCode = await File.ReadAllTextAsync(file.FullName);
            var syntaxTree = CSharpSyntaxTree.ParseText(sourceCode, path: file.FullName);
            syntaxTrees.Add(syntaxTree);
        }

        // Add required references for semantic analysis
        var references = new[]
        {
            MetadataReference.CreateFromFile(typeof(object).Assembly.Location),
            MetadataReference.CreateFromFile(typeof(Math).Assembly.Location),
            MetadataReference.CreateFromFile(typeof(Console).Assembly.Location),
            MetadataReference.CreateFromFile(typeof(System.Collections.Generic.Dictionary<,>).Assembly.Location)
        };

        return CSharpCompilation.Create(
            assemblyName: "MinimactWorkers",
            syntaxTrees: syntaxTrees,
            references: references,
            options: new CSharpCompilationOptions(OutputKind.DynamicallyLinkedLibrary));
    }

    /// <summary>
    /// Transpile a single C# file to TypeScript
    /// </summary>
    private async Task TranspileFileAsync(FileInfo inputFile, DirectoryInfo outputDir, Compilation compilation)
    {
        // Find the syntax tree for this file in the compilation
        var syntaxTree = compilation.SyntaxTrees.FirstOrDefault(st =>
            st.FilePath?.Equals(inputFile.FullName, StringComparison.OrdinalIgnoreCase) == true);

        if (syntaxTree == null)
        {
            Console.WriteLine($"Warning: Could not find syntax tree for {inputFile.Name}");
            return;
        }

        var semanticModel = compilation.GetSemanticModel(syntaxTree);
        var root = await syntaxTree.GetRootAsync();

        // Check for compilation errors
        var diagnostics = compilation.GetDiagnostics();
        var errors = diagnostics.Where(d => d.Severity == DiagnosticSeverity.Error);
        if (errors.Any())
        {
            Console.WriteLine($"Compilation errors for {inputFile.Name}:");
            foreach (var error in errors)
            {
                Console.WriteLine($"  {error}");
            }
        }

        // Generate TypeScript from C# syntax tree
        var typescript = _generator.Generate(root, semanticModel);

        // Output file path (.cs -> .ts)
        var outputFileName = Path.ChangeExtension(inputFile.Name, ".ts");
        var outputPath = Path.Combine(outputDir.FullName, outputFileName);

        await File.WriteAllTextAsync(outputPath, typescript);
        Console.WriteLine($"Generated: {outputFileName}");
    }
}