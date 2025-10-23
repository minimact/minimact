using System.Reflection;
using System.Text;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Minimact.AspNetCore.Core;

namespace Minimact.Playground.Services;

/// <summary>
/// Service to compile C# code at runtime
/// </summary>
public class CompilationService
{
    private readonly ILogger<CompilationService> _logger;

    public CompilationService(ILogger<CompilationService> logger)
    {
        _logger = logger;
    }

    /// <summary>
    /// Compile C# code to an assembly and instantiate a MinimactComponent
    /// </summary>
    public async Task<(MinimactComponent Component, Type ComponentType)> CompileAndInstantiateAsync(
        string csharpCode,
        CancellationToken cancellationToken = default)
    {
        try
        {
            // 1. Parse the code
            var tree = CSharpSyntaxTree.ParseText(csharpCode);

            // 2. Get required assemblies
            var references = GetRequiredReferences();

            // 3. Create compilation
            var compilation = CSharpCompilation.Create("DynamicComponent")
                .AddSyntaxTrees(tree)
                .AddReferences(references)
                .WithOptions(new CSharpCompilationOptions(OutputKind.DynamicallyLinkedLibrary));

            // 4. Emit to memory
            using var ms = new MemoryStream();
            var result = compilation.Emit(ms, cancellationToken: cancellationToken);

            if (!result.Success)
            {
                var errors = string.Join("\n", result.Diagnostics
                    .Where(d => d.IsWarningAsError || d.Severity == DiagnosticSeverity.Error)
                    .Select(d => $"{d.GetMessage()} at {d.Location}"));

                _logger.LogError("Compilation failed: {Errors}", errors);
                throw new CompilationException($"Compilation failed:\n{errors}");
            }

            // 5. Load assembly
            ms.Seek(0, SeekOrigin.Begin);
            var assembly = Assembly.Load(ms.ToArray());

            // 6. Find MinimactComponent type
            var componentType = assembly.GetTypes()
                .FirstOrDefault(t => typeof(MinimactComponent).IsAssignableFrom(t) && !t.IsAbstract);

            if (componentType == null)
            {
                _logger.LogError("No MinimactComponent found in compiled assembly");
                throw new CompilationException("No MinimactComponent subclass found in code");
            }

            // 7. Instantiate
            var component = (MinimactComponent?)Activator.CreateInstance(componentType)
                ?? throw new CompilationException($"Failed to instantiate {componentType.Name}");

            _logger.LogInformation("Successfully compiled and instantiated {ComponentType}", componentType.Name);

            return (component, componentType);
        }
        catch (CompilationException)
        {
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error during compilation");
            throw new CompilationException($"Compilation error: {ex.Message}", ex);
        }
    }

    /// <summary>
    /// Get references to required assemblies
    /// </summary>
    private static MetadataReference[] GetRequiredReferences()
    {
        var assemblies = new[]
        {
            typeof(object).Assembly, // System.Private.CoreLib
            typeof(Enumerable).Assembly, // System.Linq
            typeof(MinimactComponent).Assembly, // Minimact.AspNetCore
            Assembly.Load("System.Runtime"),
            Assembly.Load("System.Collections"),
            Assembly.Load("System.Linq.Expressions"),
        };

        return assemblies
            .Select(a => MetadataReference.CreateFromFile(a.Location))
            .ToArray();
    }
}

/// <summary>
/// Exception thrown when compilation fails
/// </summary>
public class CompilationException : Exception
{
    public CompilationException(string message) : base(message) { }
    public CompilationException(string message, Exception innerException) : base(message, innerException) { }
}
