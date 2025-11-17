using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Runtime.Loader;
using Minimact.AspNetCore.Core;

namespace CactusBrowser.Runtime;

public static class DynamicCompiler
{
    private static readonly string[] DefaultNamespaces = new[]
    {
        "System",
        "System.Collections.Generic",
        "System.Linq",
        "Minimact.AspNetCore.Core"
    };

    public static Assembly Compile(string source)
    {
        var fullSource = source;
        if (!source.Contains("using System;"))
        {
            var usings = string.Join("\n", DefaultNamespaces.Select(ns => $"using {ns};"));
            fullSource = usings + "\n\n" + source;
        }

        var syntaxTree = CSharpSyntaxTree.ParseText(fullSource);
        var references = GetMetadataReferences();

        var compilation = CSharpCompilation.Create(
            assemblyName: $"DynamicComponent_{Guid.NewGuid():N}",
            syntaxTrees: new[] { syntaxTree },
            references: references,
            options: new CSharpCompilationOptions(
                OutputKind.DynamicallyLinkedLibrary,
                optimizationLevel: OptimizationLevel.Release
            )
        );

        using var ms = new MemoryStream();
        var result = compilation.Emit(ms);

        if (!result.Success)
        {
            var errors = string.Join("\n", result.Diagnostics
                .Where(d => d.Severity == DiagnosticSeverity.Error)
                .Select(d => $"{d.Location.GetLineSpan().StartLinePosition}: {d.GetMessage()}"));

            throw new Exception($"Compilation failed:\n{errors}");
        }

        ms.Seek(0, SeekOrigin.Begin);
        return AssemblyLoadContext.Default.LoadFromStream(ms);
    }

    public static MinimactComponent CreateInstance(Assembly assembly)
    {
        var componentType = assembly.GetTypes()
            .FirstOrDefault(t => t.IsSubclassOf(typeof(MinimactComponent)));

        if (componentType == null)
        {
            throw new Exception("No MinimactComponent subclass found");
        }

        var instance = Activator.CreateInstance(componentType);
        if (instance == null)
        {
            throw new Exception($"Failed to create instance of {componentType.Name}");
        }

        return (MinimactComponent)instance;
    }

    private static List<MetadataReference> GetMetadataReferences()
    {
        var references = new List<MetadataReference>();

        references.Add(MetadataReference.CreateFromFile(typeof(object).Assembly.Location));
        references.Add(MetadataReference.CreateFromFile(typeof(Console).Assembly.Location));
        references.Add(MetadataReference.CreateFromFile(typeof(MinimactComponent).Assembly.Location));

        var systemAssemblies = new[]
        {
            "System.Runtime",
            "System.Collections",
            "System.Linq",
            "System.Private.CoreLib",
            "netstandard"
        };

        foreach (var name in systemAssemblies)
        {
            try
            {
                var assembly = Assembly.Load(name);
                references.Add(MetadataReference.CreateFromFile(assembly.Location));
            }
            catch { }
        }

        var minimactAssembly = typeof(MinimactComponent).Assembly;
        foreach (var refAssemblyName in minimactAssembly.GetReferencedAssemblies())
        {
            try
            {
                var refAssembly = Assembly.Load(refAssemblyName);
                references.Add(MetadataReference.CreateFromFile(refAssembly.Location));
            }
            catch { }
        }

        return references;
    }
}
