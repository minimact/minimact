using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.Extensions.Logging;
using System.Reflection;
using System.Runtime.Loader;

namespace Minimact.AspNetCore.HotReload;

/// <summary>
/// Dynamically compiles C# files at runtime using Roslyn
/// Loads compiled types into a new AssemblyLoadContext for hot reload
/// </summary>
public class DynamicRoslynCompiler
{
    private readonly ILogger<DynamicRoslynCompiler> _logger;
    private readonly Dictionary<string, AssemblyLoadContext> _loadContexts = new();
    private readonly HashSet<string> _loadedAssemblies = new();
    private int _contextCounter = 0;

    public DynamicRoslynCompiler(ILogger<DynamicRoslynCompiler> logger)
    {
        _logger = logger;

        // Pre-load common assemblies used by Minimact components
        LoadCommonReferences();
    }

    /// <summary>
    /// Load common assembly references needed for compilation
    /// Scans all loaded assemblies in the current AppDomain
    /// </summary>
    private void LoadCommonReferences()
    {
        // Get all currently loaded assemblies
        var loadedAssemblies = AppDomain.CurrentDomain.GetAssemblies()
            .Where(a => !a.IsDynamic && !string.IsNullOrEmpty(a.Location))
            .ToList();

        foreach (var assembly in loadedAssemblies)
        {
            try
            {
                _loadedAssemblies.Add(assembly.Location);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "[Roslyn Compiler] Failed to add assembly reference: {Assembly}", assembly.FullName);
            }
        }

        // ⚠️ CRITICAL: Ensure Microsoft.CSharp is loaded (required for dynamic keyword)
        try
        {
            var csharpAssembly = Assembly.Load("Microsoft.CSharp");
            if (!string.IsNullOrEmpty(csharpAssembly.Location))
            {
                _loadedAssemblies.Add(csharpAssembly.Location);
                _logger.LogDebug("[Roslyn Compiler] Added Microsoft.CSharp reference for dynamic support");
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "[Roslyn Compiler] Failed to load Microsoft.CSharp assembly");
        }

        _logger.LogInformation("[Roslyn Compiler] Loaded {Count} assembly references for compilation", _loadedAssemblies.Count);
    }

    /// <summary>
    /// Compile a C# source file and return the compiled Type
    /// </summary>
    public Type? CompileAndLoadType(string csFilePath, string typeName)
    {
        try
        {
            _logger.LogInformation("[Roslyn Compiler] 🔨 Compiling {FileName}...", Path.GetFileName(csFilePath));

            // Read source code
            var sourceCode = File.ReadAllText(csFilePath);

            // Parse syntax tree
            var syntaxTree = CSharpSyntaxTree.ParseText(sourceCode, path: csFilePath);

            // Check for parse errors
            var diagnostics = syntaxTree.GetDiagnostics();
            if (diagnostics.Any(d => d.Severity == DiagnosticSeverity.Error))
            {
                foreach (var diagnostic in diagnostics.Where(d => d.Severity == DiagnosticSeverity.Error))
                {
                    _logger.LogError("[Roslyn Compiler] Parse error: {Message}", diagnostic.ToString());
                }
                return null;
            }

            // Create compilation references
            var references = _loadedAssemblies.Select(path => MetadataReference.CreateFromFile(path)).ToList();

            // Create compilation
            var assemblyName = $"Minimact.Dynamic.{typeName}.{_contextCounter++}";
            var compilation = CSharpCompilation.Create(
                assemblyName,
                new[] { syntaxTree },
                references,
                new CSharpCompilationOptions(OutputKind.DynamicallyLinkedLibrary)
                    .WithOptimizationLevel(OptimizationLevel.Debug)
                    .WithPlatform(Platform.AnyCpu)
            );

            // Compile to memory
            using var ms = new MemoryStream();
            var emitResult = compilation.Emit(ms);

            if (!emitResult.Success)
            {
                _logger.LogError("[Roslyn Compiler] ❌ Compilation failed for {FileName}", Path.GetFileName(csFilePath));

                foreach (var diagnostic in emitResult.Diagnostics.Where(d => d.Severity == DiagnosticSeverity.Error))
                {
                    _logger.LogError("[Roslyn Compiler] {Message}", diagnostic.ToString());
                }

                return null;
            }

            // Load assembly into new context
            ms.Seek(0, SeekOrigin.Begin);
            var context = new AssemblyLoadContext($"MinimactDynamic_{assemblyName}", isCollectible: true);
            var assembly = context.LoadFromStream(ms);

            _loadContexts[typeName] = context;

            // Find and return the type
            var type = assembly.GetTypes().FirstOrDefault(t => t.Name == typeName);

            if (type == null)
            {
                _logger.LogError("[Roslyn Compiler] ❌ Type {TypeName} not found in compiled assembly", typeName);
                return null;
            }

            _logger.LogInformation("[Roslyn Compiler] ✅ Successfully compiled and loaded {TypeName}", typeName);
            return type;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[Roslyn Compiler] ❌ Failed to compile {FileName}", Path.GetFileName(csFilePath));
            return null;
        }
    }

    /// <summary>
    /// Unload a previously loaded type's assembly context
    /// </summary>
    public void UnloadType(string typeName)
    {
        if (_loadContexts.TryGetValue(typeName, out var context))
        {
            try
            {
                context.Unload();
                _loadContexts.Remove(typeName);
                _logger.LogDebug("[Roslyn Compiler] Unloaded assembly context for {TypeName}", typeName);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "[Roslyn Compiler] Failed to unload context for {TypeName}", typeName);
            }
        }
    }

    /// <summary>
    /// Get all loaded type names
    /// </summary>
    public IEnumerable<string> GetLoadedTypes()
    {
        return _loadContexts.Keys;
    }
}
