using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Text.Json;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.Emit;
using Minimact.AspNetCore.Core;
using Minimact.Transpiler.CodeGen.Nodes;
using Minimact.Transpiler.CodeGen.Visitors;
using Minimact.Transpiler.CodeGen.Generators;

namespace Minimact.AspNetCore.Runtime;

/// <summary>
/// Loads Minimact components from JSON at runtime using Roslyn compilation.
/// This eliminates the need for pre-generated .cs files and enables hot reload.
/// </summary>
public class ComponentLoader
{
    private readonly string _componentsPath;
    private readonly List<MetadataReference> _references;
    private readonly Dictionary<string, (Assembly Assembly, Type ComponentType)> _cache;
    private readonly JsonSerializerOptions _jsonOptions;

    public ComponentLoader(string componentsPath)
    {
        _componentsPath = componentsPath;
        _cache = new Dictionary<string, (Assembly, Type)>();

        // Set up JSON deserialization options
        _jsonOptions = new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true,
            AllowTrailingCommas = true
        };

        // Set up metadata references for Roslyn compilation
        _references = new List<MetadataReference>
        {
            MetadataReference.CreateFromFile(typeof(object).Assembly.Location),
            MetadataReference.CreateFromFile(typeof(Console).Assembly.Location),
            MetadataReference.CreateFromFile(typeof(System.Linq.Enumerable).Assembly.Location),
            MetadataReference.CreateFromFile(typeof(System.Linq.Expressions.Expression).Assembly.Location),
            MetadataReference.CreateFromFile(typeof(MinimactComponent).Assembly.Location),
            MetadataReference.CreateFromFile(typeof(ComponentNode).Assembly.Location), // Minimact.Transpiler.CodeGen (has attributes)
            MetadataReference.CreateFromFile(typeof(System.Dynamic.DynamicObject).Assembly.Location),
            MetadataReference.CreateFromFile(typeof(Microsoft.CSharp.RuntimeBinder.CSharpArgumentInfo).Assembly.Location),
            MetadataReference.CreateFromFile(Assembly.Load("System.Runtime").Location),
            MetadataReference.CreateFromFile(Assembly.Load("System.Collections").Location),
            MetadataReference.CreateFromFile(Assembly.Load("System.Dynamic.Runtime").Location),
            MetadataReference.CreateFromFile(Assembly.Load("System.Linq.Expressions").Location),
            MetadataReference.CreateFromFile(Assembly.Load("netstandard").Location),
        };
    }

    /// <summary>
    /// Load a component from JSON, optionally pairing with a user-written C# codebehind.
    /// </summary>
    /// <param name="componentName">Name of the component (e.g., "Counter")</param>
    /// <param name="forceReload">If true, bypasses cache and recompiles</param>
    /// <returns>A compiled component instance</returns>
    public MinimactComponent Load(string componentName, bool forceReload = false)
    {
        if (!forceReload && _cache.TryGetValue(componentName, out var cached))
        {
            return (MinimactComponent)Activator.CreateInstance(cached.ComponentType)!;
        }

        var jsonPath = Path.Combine(_componentsPath, $"{componentName}.json");
        if (!File.Exists(jsonPath))
        {
            throw new FileNotFoundException($"Component JSON not found: {jsonPath}");
        }

        // 1. Read and deserialize JSON
        var json = File.ReadAllText(jsonPath);
        var componentNode = JsonSerializer.Deserialize<ComponentNode>(json, _jsonOptions);

        if (componentNode == null)
        {
            throw new InvalidOperationException($"Failed to deserialize component JSON: {jsonPath}");
        }

        // 2. Generate C# code from JSON using the visitor
        var codeGenerator = new CSharpCodeGenerator();
        componentNode.Accept(codeGenerator);
        var generatedCode = codeGenerator.GetGeneratedCode();

        // 3. Check for user-written codebehind
        var codebehindPath = Path.Combine(_componentsPath, $"{componentName}.cs");
        var syntaxTrees = new List<SyntaxTree>
        {
            CSharpSyntaxTree.ParseText(generatedCode, path: $"{componentName}.Generated.cs")
        };

        if (File.Exists(codebehindPath))
        {
            var codebehindCode = File.ReadAllText(codebehindPath);
            syntaxTrees.Add(CSharpSyntaxTree.ParseText(codebehindCode, path: $"{componentName}.cs"));
        }

        // 4. Compile with Roslyn
        var compilation = CSharpCompilation.Create(
            assemblyName: $"MinimactComponent_{componentName}_{Guid.NewGuid():N}",
            syntaxTrees: syntaxTrees,
            references: _references,
            options: new CSharpCompilationOptions(OutputKind.DynamicallyLinkedLibrary)
        );

        // 5. Emit to memory stream
        using var ms = new MemoryStream();
        var emitResult = compilation.Emit(ms);

        if (!emitResult.Success)
        {
            var errors = string.Join("\n", emitResult.Diagnostics
                .Where(d => d.Severity == DiagnosticSeverity.Error)
                .Select(d => $"{d.Id}: {d.GetMessage()}"));

            throw new InvalidOperationException(
                $"Component compilation failed for {componentName}:\n{errors}\n\nGenerated Code:\n{generatedCode}");
        }

        // 6. Load assembly and find component type
        ms.Seek(0, SeekOrigin.Begin);
        var assembly = Assembly.Load(ms.ToArray());

        var componentType = assembly.GetTypes()
            .FirstOrDefault(t => typeof(MinimactComponent).IsAssignableFrom(t) && !t.IsAbstract);

        if (componentType == null)
        {
            throw new InvalidOperationException(
                $"No valid component type found in compiled assembly for {componentName}");
        }

        // 7. Cache the result
        _cache[componentName] = (assembly, componentType);

        // 8. Create and return instance
        return (MinimactComponent)Activator.CreateInstance(componentType)!;
    }

    /// <summary>
    /// Clear the cache for a specific component (for hot reload)
    /// </summary>
    public void InvalidateCache(string componentName)
    {
        _cache.Remove(componentName);
    }

    /// <summary>
    /// Clear all cached components
    /// </summary>
    public void InvalidateAllCache()
    {
        _cache.Clear();
    }

    /// <summary>
    /// Get all available component names from the components directory
    /// </summary>
    public IEnumerable<string> GetAvailableComponents()
    {
        if (!Directory.Exists(_componentsPath))
        {
            return Enumerable.Empty<string>();
        }

        return Directory.GetFiles(_componentsPath, "*.json")
            .Select(Path.GetFileNameWithoutExtension)
            .Where(name => !string.IsNullOrEmpty(name))!;
    }
}
