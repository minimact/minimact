using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;
using Microsoft.CodeAnalysis.Diagnostics;
using Microsoft.CodeAnalysis.Text;
using Reluxer.Analyzers;
using System.Collections.Immutable;
using Xunit;

namespace Reluxer.Analyzers.Tests;

public class LinqOnTokensAnalyzerTests
{
    [Fact]
    public void SelectInsideConsoleWriteLine_ShouldNotReport()
    {
        // This is the exact pattern from HandlerVisitor.cs line 66
        var code = @"
using System;
using System.Linq;

namespace Reluxer.Transformer.Visitors
{
    public class Token
    {
        public string Type { get; set; }
        public string Value { get; set; }
    }

    public class TestClass
    {
        public void TestMethod()
        {
            var bodyTokens = new Token[0];
            Console.WriteLine($""First 10 tokens: {string.Join("", "", bodyTokens.Take(10).Select(t => $""[{t.Type}]{t.Value}""))}"");
        }
    }
}
";
        var diagnostics = GetDiagnostics(code);

        // Debug output - print what we found
        foreach (var d in diagnostics)
        {
            Console.WriteLine($"Diagnostic: {d.Id} at {d.Location.GetLineSpan().StartLinePosition}: {d.GetMessage()}");
        }

        // Should not report REL005 because it's inside Console.WriteLine
        Assert.Empty(diagnostics.Where(d => d.Id == "REL005"));
    }

    [Fact]
    public void SelectOutsideConsoleWriteLine_ShouldReport()
    {
        var code = @"
using System;
using System.Linq;

namespace Reluxer.Transformer.Visitors
{
    public class Token
    {
        public string Type { get; set; }
        public string Value { get; set; }
    }

    public class TestClass
    {
        public void TestMethod()
        {
            var bodyTokens = new Token[0];
            // This is NOT inside Console.WriteLine, should trigger REL005
            var result = bodyTokens.Select(t => t.Value).ToArray();
        }
    }
}
";
        var diagnostics = GetDiagnostics(code);

        // Should report REL005 because it's NOT inside Console.WriteLine
        Assert.Contains(diagnostics, d => d.Id == "REL005");
    }

    [Fact]
    public void DebugParentChain()
    {
        // Parse the code and manually walk the parent chain to understand the structure
        var code = @"
using System;
using System.Linq;

namespace Reluxer.Transformer.Visitors
{
    public class Token
    {
        public string Type { get; set; }
        public string Value { get; set; }
    }

    public class TestClass
    {
        public void TestMethod()
        {
            var bodyTokens = new Token[0];
            Console.WriteLine($""First 10 tokens: {string.Join("", "", bodyTokens.Take(10).Select(t => $""[{t.Type}]{t.Value}""))}"");
        }
    }
}
";
        var tree = CSharpSyntaxTree.ParseText(code);
        var root = tree.GetRoot();

        // Find the Select invocation
        var selectInvocations = root.DescendantNodes()
            .OfType<InvocationExpressionSyntax>()
            .Where(i => i.Expression is MemberAccessExpressionSyntax ma && ma.Name.Identifier.Text == "Select")
            .ToList();

        Assert.Single(selectInvocations);
        var selectInvocation = selectInvocations[0];

        Console.WriteLine("=== Parent Chain from .Select() ===");
        int depth = 0;
        for (var node = selectInvocation.Parent; node != null; node = node.Parent)
        {
            var nodeType = node.GetType().Name;
            var preview = node.ToString();
            if (preview.Length > 80) preview = preview.Substring(0, 80) + "...";

            Console.WriteLine($"[{depth}] {nodeType}: {preview}");

            if (node is InvocationExpressionSyntax invocation)
            {
                if (invocation.Expression is MemberAccessExpressionSyntax memberAccess)
                {
                    var target = memberAccess.Expression.ToString();
                    var method = memberAccess.Name.Identifier.Text;
                    Console.WriteLine($"    -> MemberAccess: Target='{target}', Method='{method}'");

                    if (target == "Console" && (method == "Write" || method == "WriteLine"))
                    {
                        Console.WriteLine($"    -> FOUND Console.{method}!");
                    }
                }
            }

            depth++;
            if (node is MethodDeclarationSyntax)
                break;
        }
    }

    private static ImmutableArray<Diagnostic> GetDiagnostics(string code)
    {
        var tree = CSharpSyntaxTree.ParseText(code);

        var references = new[]
        {
            MetadataReference.CreateFromFile(typeof(object).Assembly.Location),
            MetadataReference.CreateFromFile(typeof(Console).Assembly.Location),
            MetadataReference.CreateFromFile(typeof(Enumerable).Assembly.Location),
            MetadataReference.CreateFromFile(typeof(System.Runtime.AssemblyTargetedPatchBandAttribute).Assembly.Location),
        };

        // Add runtime reference
        var runtimeDir = System.Runtime.InteropServices.RuntimeEnvironment.GetRuntimeDirectory();
        references = references.Concat(new[]
        {
            MetadataReference.CreateFromFile(Path.Combine(runtimeDir, "System.Runtime.dll")),
            MetadataReference.CreateFromFile(Path.Combine(runtimeDir, "System.Collections.dll")),
        }).ToArray();

        var compilation = CSharpCompilation.Create("TestAssembly",
            syntaxTrees: new[] { tree },
            references: references,
            options: new CSharpCompilationOptions(OutputKind.DynamicallyLinkedLibrary));

        var analyzer = new LinqOnTokensAnalyzer();
        var compilationWithAnalyzers = compilation.WithAnalyzers(ImmutableArray.Create<DiagnosticAnalyzer>(analyzer));

        return compilationWithAnalyzers.GetAnalyzerDiagnosticsAsync().Result;
    }
}
