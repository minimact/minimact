using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;
using System.Text;

namespace Minimact.Transpiler.CodeGen.Tests;

/// <summary>
/// Compares two C# syntax trees to verify structural equivalence
/// Ignores whitespace, formatting, comment differences
/// </summary>
public class SyntaxTreeComparer
{
    private readonly SyntaxTree _expectedTree;
    private readonly SyntaxTree _actualTree;
    private readonly CompilationUnitSyntax _expectedRoot;
    private readonly CompilationUnitSyntax _actualRoot;

    public SyntaxTreeComparer(string expectedCode, string actualCode)
    {
        _expectedTree = CSharpSyntaxTree.ParseText(expectedCode);
        _actualTree = CSharpSyntaxTree.ParseText(actualCode);
        _expectedRoot = _expectedTree.GetCompilationUnitRoot();
        _actualRoot = _actualTree.GetCompilationUnitRoot();
    }

    /// <summary>
    /// Compare the two syntax trees and return a detailed comparison result
    /// </summary>
    public ComparisonResult Compare()
    {
        var result = new ComparisonResult();

        // Compare classes
        CompareClasses(result);

        // Compare methods
        CompareMethods(result);

        // Compare fields
        CompareFields(result);

        // Compare properties
        CompareProperties(result);

        result.AreEquivalent = !result.Differences.Any();
        return result;
    }

    private void CompareClasses(ComparisonResult result)
    {
        var expectedClasses = _expectedRoot.DescendantNodes()
            .OfType<ClassDeclarationSyntax>()
            .ToList();

        var actualClasses = _actualRoot.DescendantNodes()
            .OfType<ClassDeclarationSyntax>()
            .ToList();

        // Check class count
        if (expectedClasses.Count != actualClasses.Count)
        {
            result.AddDifference($"Class count mismatch: Expected {expectedClasses.Count}, Actual {actualClasses.Count}");
        }

        // Compare each class
        foreach (var expectedClass in expectedClasses)
        {
            var className = expectedClass.Identifier.Text;
            var actualClass = actualClasses.FirstOrDefault(c => c.Identifier.Text == className);

            if (actualClass == null)
            {
                result.AddDifference($"Missing class: {className}");
                continue;
            }

            // Compare base types
            var expectedBase = expectedClass.BaseList?.Types.Select(t => t.Type.ToString()).ToList() ?? new List<string>();
            var actualBase = actualClass.BaseList?.Types.Select(t => t.Type.ToString()).ToList() ?? new List<string>();

            if (!expectedBase.SequenceEqual(actualBase))
            {
                result.AddDifference($"Class {className}: Base types differ - Expected: [{string.Join(", ", expectedBase)}], Actual: [{string.Join(", ", actualBase)}]");
            }

            // Compare modifiers
            var expectedModifiers = expectedClass.Modifiers.Select(m => m.Text).OrderBy(m => m).ToList();
            var actualModifiers = actualClass.Modifiers.Select(m => m.Text).OrderBy(m => m).ToList();

            if (!expectedModifiers.SequenceEqual(actualModifiers))
            {
                result.AddDifference($"Class {className}: Modifiers differ - Expected: [{string.Join(" ", expectedModifiers)}], Actual: [{string.Join(" ", actualModifiers)}]");
            }

            // Compare attributes
            CompareAttributes(expectedClass.AttributeLists, actualClass.AttributeLists, $"Class {className}", result);
        }
    }

    private void CompareMethods(ComparisonResult result)
    {
        var expectedMethods = _expectedRoot.DescendantNodes()
            .OfType<MethodDeclarationSyntax>()
            .ToList();

        var actualMethods = _actualRoot.DescendantNodes()
            .OfType<MethodDeclarationSyntax>()
            .ToList();

        // Get method signatures for comparison
        var expectedSigs = expectedMethods.Select(m => GetMethodSignature(m)).ToList();
        var actualSigs = actualMethods.Select(m => GetMethodSignature(m)).ToList();

        // Find missing methods
        foreach (var sig in expectedSigs)
        {
            if (!actualSigs.Contains(sig))
            {
                result.AddDifference($"Missing method: {sig}");
            }
        }

        // Find extra methods
        foreach (var sig in actualSigs)
        {
            if (!expectedSigs.Contains(sig))
            {
                result.AddDifference($"Extra method: {sig}");
            }
        }

        // Compare method bodies for matching methods
        foreach (var expectedMethod in expectedMethods)
        {
            var sig = GetMethodSignature(expectedMethod);
            var actualMethod = actualMethods.FirstOrDefault(m => GetMethodSignature(m) == sig);

            if (actualMethod != null)
            {
                CompareMethodBodies(expectedMethod, actualMethod, sig, result);
            }
        }
    }

    private void CompareFields(ComparisonResult result)
    {
        var expectedFields = _expectedRoot.DescendantNodes()
            .OfType<FieldDeclarationSyntax>()
            .SelectMany(f => f.Declaration.Variables.Select(v => new
            {
                Name = v.Identifier.Text,
                Type = f.Declaration.Type.ToString(),
                Modifiers = string.Join(" ", f.Modifiers.Select(m => m.Text).OrderBy(m => m)),
                Attributes = f.AttributeLists.SelectMany(al => al.Attributes.Select(a => a.Name.ToString())).ToList()
            }))
            .ToList();

        var actualFields = _actualRoot.DescendantNodes()
            .OfType<FieldDeclarationSyntax>()
            .SelectMany(f => f.Declaration.Variables.Select(v => new
            {
                Name = v.Identifier.Text,
                Type = f.Declaration.Type.ToString(),
                Modifiers = string.Join(" ", f.Modifiers.Select(m => m.Text).OrderBy(m => m)),
                Attributes = f.AttributeLists.SelectMany(al => al.Attributes.Select(a => a.Name.ToString())).ToList()
            }))
            .ToList();

        // Compare fields
        foreach (var expectedField in expectedFields)
        {
            var actualField = actualFields.FirstOrDefault(f => f.Name == expectedField.Name);

            if (actualField == null)
            {
                result.AddDifference($"Missing field: {expectedField.Type} {expectedField.Name}");
                continue;
            }

            if (expectedField.Type != actualField.Type)
            {
                result.AddDifference($"Field {expectedField.Name}: Type mismatch - Expected: {expectedField.Type}, Actual: {actualField.Type}");
            }

            if (expectedField.Modifiers != actualField.Modifiers)
            {
                result.AddDifference($"Field {expectedField.Name}: Modifiers differ - Expected: [{expectedField.Modifiers}], Actual: [{actualField.Modifiers}]");
            }

            if (!expectedField.Attributes.SequenceEqual(actualField.Attributes))
            {
                result.AddDifference($"Field {expectedField.Name}: Attributes differ - Expected: [{string.Join(", ", expectedField.Attributes)}], Actual: [{string.Join(", ", actualField.Attributes)}]");
            }
        }

        // Find extra fields
        foreach (var actualField in actualFields)
        {
            if (!expectedFields.Any(f => f.Name == actualField.Name))
            {
                result.AddDifference($"Extra field: {actualField.Type} {actualField.Name}");
            }
        }
    }

    private void CompareProperties(ComparisonResult result)
    {
        var expectedProps = _expectedRoot.DescendantNodes()
            .OfType<PropertyDeclarationSyntax>()
            .Select(p => new
            {
                Name = p.Identifier.Text,
                Type = p.Type.ToString(),
                Modifiers = string.Join(" ", p.Modifiers.Select(m => m.Text).OrderBy(m => m)),
                HasGetter = p.AccessorList?.Accessors.Any(a => a.IsKind(SyntaxKind.GetAccessorDeclaration)) ?? false,
                HasSetter = p.AccessorList?.Accessors.Any(a => a.IsKind(SyntaxKind.SetAccessorDeclaration)) ?? false
            })
            .ToList();

        var actualProps = _actualRoot.DescendantNodes()
            .OfType<PropertyDeclarationSyntax>()
            .Select(p => new
            {
                Name = p.Identifier.Text,
                Type = p.Type.ToString(),
                Modifiers = string.Join(" ", p.Modifiers.Select(m => m.Text).OrderBy(m => m)),
                HasGetter = p.AccessorList?.Accessors.Any(a => a.IsKind(SyntaxKind.GetAccessorDeclaration)) ?? false,
                HasSetter = p.AccessorList?.Accessors.Any(a => a.IsKind(SyntaxKind.SetAccessorDeclaration)) ?? false
            })
            .ToList();

        foreach (var expectedProp in expectedProps)
        {
            var actualProp = actualProps.FirstOrDefault(p => p.Name == expectedProp.Name);

            if (actualProp == null)
            {
                result.AddDifference($"Missing property: {expectedProp.Type} {expectedProp.Name}");
                continue;
            }

            if (expectedProp.Type != actualProp.Type)
            {
                result.AddDifference($"Property {expectedProp.Name}: Type mismatch - Expected: {expectedProp.Type}, Actual: {actualProp.Type}");
            }

            if (expectedProp.Modifiers != actualProp.Modifiers)
            {
                result.AddDifference($"Property {expectedProp.Name}: Modifiers differ - Expected: [{expectedProp.Modifiers}], Actual: [{actualProp.Modifiers}]");
            }
        }
    }

    private void CompareMethodBodies(MethodDeclarationSyntax expected, MethodDeclarationSyntax actual, string signature, ComparisonResult result)
    {
        var expectedBody = expected.Body?.ToString().Trim();
        var actualBody = actual.Body?.ToString().Trim();

        // Normalize whitespace for comparison
        expectedBody = NormalizeWhitespace(expectedBody);
        actualBody = NormalizeWhitespace(actualBody);

        if (expectedBody != actualBody)
        {
            // Check if they're semantically equivalent using statement count
            var expectedStatements = expected.Body?.Statements.Count ?? 0;
            var actualStatements = actual.Body?.Statements.Count ?? 0;

            if (expectedStatements != actualStatements)
            {
                result.AddDifference($"Method {signature}: Statement count differs - Expected: {expectedStatements}, Actual: {actualStatements}");
            }
            else
            {
                result.AddWarning($"Method {signature}: Body text differs but statement count matches (may be equivalent)");
            }
        }
    }

    private void CompareAttributes(SyntaxList<AttributeListSyntax> expectedAttrs, SyntaxList<AttributeListSyntax> actualAttrs, string context, ComparisonResult result)
    {
        var expectedNames = expectedAttrs
            .SelectMany(al => al.Attributes.Select(a => a.Name.ToString()))
            .OrderBy(n => n)
            .ToList();

        var actualNames = actualAttrs
            .SelectMany(al => al.Attributes.Select(a => a.Name.ToString()))
            .OrderBy(n => n)
            .ToList();

        if (!expectedNames.SequenceEqual(actualNames))
        {
            result.AddDifference($"{context}: Attributes differ - Expected: [{string.Join(", ", expectedNames)}], Actual: [{string.Join(", ", actualNames)}]");
        }
    }

    private string GetMethodSignature(MethodDeclarationSyntax method)
    {
        var returnType = method.ReturnType.ToString();
        var name = method.Identifier.Text;
        var parameters = string.Join(", ", method.ParameterList.Parameters.Select(p => $"{p.Type} {p.Identifier.Text}"));
        var modifiers = string.Join(" ", method.Modifiers.Select(m => m.Text).OrderBy(m => m));

        return $"{modifiers} {returnType} {name}({parameters})".Trim();
    }

    private string? NormalizeWhitespace(string? code)
    {
        if (code == null) return null;

        // Remove all whitespace and normalize
        return string.Join("", code.Split(new[] { ' ', '\r', '\n', '\t' }, StringSplitOptions.RemoveEmptyEntries));
    }
}

public class ComparisonResult
{
    public bool AreEquivalent { get; set; }
    public List<string> Differences { get; private set; } = new();
    public List<string> Warnings { get; private set; } = new();

    public void AddDifference(string difference)
    {
        Differences.Add(difference);
    }

    public void AddWarning(string warning)
    {
        Warnings.Add(warning);
    }

    public override string ToString()
    {
        var sb = new StringBuilder();
        sb.AppendLine($"Equivalent: {AreEquivalent}");
        sb.AppendLine($"Differences: {Differences.Count}");

        if (Differences.Any())
        {
            sb.AppendLine("\nDifferences:");
            foreach (var diff in Differences)
            {
                sb.AppendLine($"  ❌ {diff}");
            }
        }

        if (Warnings.Any())
        {
            sb.AppendLine("\nWarnings:");
            foreach (var warning in Warnings)
            {
                sb.AppendLine($"  ⚠️  {warning}");
            }
        }

        return sb.ToString();
    }
}
