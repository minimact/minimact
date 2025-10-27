using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Minimact.AspNetCore.Core;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Reflection;

namespace Minimact.CommandCenter.Core;

/// <summary>
/// Dynamically compiles C# component code and creates instances
/// </summary>
public class DynamicComponentCompiler
{
    /// <summary>
    /// Compile C# code and create a component instance
    /// </summary>
    /// <param name="csharpCode">Generated C# code from Babel</param>
    /// <param name="componentClassName">Name of the component class to instantiate</param>
    /// <returns>Instance of the compiled component</returns>
    public MinimactComponent CompileAndInstantiate(string csharpCode, string componentClassName)
    {
        Console.WriteLine($"[DynamicCompiler] Compiling component: {componentClassName}");

        // Parse the code
        var syntaxTree = CSharpSyntaxTree.ParseText(csharpCode);

        // Get references to assemblies
        var references = new List<MetadataReference>
        {
            // System assemblies
            MetadataReference.CreateFromFile(typeof(object).Assembly.Location),
            MetadataReference.CreateFromFile(typeof(Console).Assembly.Location),
            MetadataReference.CreateFromFile(typeof(System.Linq.Enumerable).Assembly.Location),
            MetadataReference.CreateFromFile(Assembly.Load("System.Runtime").Location),
            MetadataReference.CreateFromFile(Assembly.Load("System.Collections").Location),
            MetadataReference.CreateFromFile(Assembly.Load("netstandard").Location),

            // Minimact assemblies
            MetadataReference.CreateFromFile(typeof(MinimactComponent).Assembly.Location),
            MetadataReference.CreateFromFile(typeof(VNode).Assembly.Location),
        };

        // Add reference to mscorlib
        var mscorlibPath = Path.Combine(
            Path.GetDirectoryName(typeof(object).Assembly.Location)!,
            "mscorlib.dll");
        if (File.Exists(mscorlibPath))
        {
            references.Add(MetadataReference.CreateFromFile(mscorlibPath));
        }

        // Create compilation
        var assemblyName = $"DynamicComponent_{Guid.NewGuid():N}";
        var compilation = CSharpCompilation.Create(
            assemblyName,
            new[] { syntaxTree },
            references,
            new CSharpCompilationOptions(
                OutputKind.DynamicallyLinkedLibrary,
                optimizationLevel: OptimizationLevel.Debug
            )
        );

        // Compile to memory
        using var ms = new MemoryStream();
        var result = compilation.Emit(ms);

        if (!result.Success)
        {
            var errors = result.Diagnostics
                .Where(d => d.Severity == DiagnosticSeverity.Error)
                .Select(d => $"{d.Location.GetLineSpan().StartLinePosition}: {d.GetMessage()}")
                .ToArray();

            throw new InvalidOperationException(
                $"Compilation failed:\n{string.Join("\n", errors)}");
        }

        // Load the compiled assembly
        ms.Seek(0, SeekOrigin.Begin);
        var assembly = Assembly.Load(ms.ToArray());

        // Find the component class
        var componentType = assembly.GetTypes()
            .FirstOrDefault(t => t.Name == componentClassName && typeof(MinimactComponent).IsAssignableFrom(t));

        if (componentType == null)
        {
            var availableTypes = string.Join(", ", assembly.GetTypes().Select(t => t.Name));
            throw new InvalidOperationException(
                $"Component class '{componentClassName}' not found in compiled assembly. " +
                $"Available types: {availableTypes}");
        }

        // Create instance
        var instance = Activator.CreateInstance(componentType) as MinimactComponent;
        if (instance == null)
        {
            throw new InvalidOperationException($"Failed to create instance of {componentClassName}");
        }

        Console.WriteLine($"[DynamicCompiler] ✓ Compiled and instantiated {componentClassName}");

        return instance;
    }
}
