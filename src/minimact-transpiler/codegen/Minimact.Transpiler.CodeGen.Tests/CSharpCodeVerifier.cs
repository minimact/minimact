using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;
using System.Linq;

namespace Minimact.Transpiler.CodeGen.Tests;

/// <summary>
/// Uses Roslyn to verify generated C# code structure
/// </summary>
public class CSharpCodeVerifier
{
    private readonly SyntaxTree _syntaxTree;
    private readonly CompilationUnitSyntax _root;

    public CSharpCodeVerifier(string csharpCode)
    {
        _syntaxTree = CSharpSyntaxTree.ParseText(csharpCode);
        _root = _syntaxTree.GetCompilationUnitRoot();
    }

    /// <summary>
    /// Check if a class exists with the given name
    /// </summary>
    public bool HasClass(string className)
    {
        return _root.DescendantNodes()
            .OfType<ClassDeclarationSyntax>()
            .Any(c => c.Identifier.Text == className);
    }

    /// <summary>
    /// Check if a method exists with the given name
    /// </summary>
    public bool HasMethod(string methodName)
    {
        return _root.DescendantNodes()
            .OfType<MethodDeclarationSyntax>()
            .Any(m => m.Identifier.Text == methodName);
    }

    /// <summary>
    /// Check if a method exists with specific signature
    /// </summary>
    public bool HasMethod(string methodName, string returnType, params string[] parameterTypes)
    {
        var methods = _root.DescendantNodes()
            .OfType<MethodDeclarationSyntax>()
            .Where(m => m.Identifier.Text == methodName);

        foreach (var method in methods)
        {
            // Check return type
            var actualReturnType = method.ReturnType.ToString();
            if (actualReturnType != returnType)
                continue;

            // Check parameter count
            var parameters = method.ParameterList.Parameters;
            if (parameters.Count != parameterTypes.Length)
                continue;

            // Check parameter types
            bool parametersMatch = true;
            for (int i = 0; i < parameterTypes.Length; i++)
            {
                if (parameters[i].Type?.ToString() != parameterTypes[i])
                {
                    parametersMatch = false;
                    break;
                }
            }

            if (parametersMatch)
                return true;
        }

        return false;
    }

    /// <summary>
    /// Check if a field exists with the given name
    /// </summary>
    public bool HasField(string fieldName)
    {
        return _root.DescendantNodes()
            .OfType<FieldDeclarationSyntax>()
            .Any(f => f.Declaration.Variables.Any(v => v.Identifier.Text == fieldName));
    }

    /// <summary>
    /// Check if a property exists with the given name
    /// </summary>
    public bool HasProperty(string propertyName)
    {
        return _root.DescendantNodes()
            .OfType<PropertyDeclarationSyntax>()
            .Any(p => p.Identifier.Text == propertyName);
    }

    /// <summary>
    /// Check if a field has a specific attribute
    /// </summary>
    public bool FieldHasAttribute(string fieldName, string attributeName)
    {
        var fields = _root.DescendantNodes()
            .OfType<FieldDeclarationSyntax>()
            .Where(f => f.Declaration.Variables.Any(v => v.Identifier.Text == fieldName));

        foreach (var field in fields)
        {
            var hasAttribute = field.AttributeLists
                .SelectMany(al => al.Attributes)
                .Any(a => a.Name.ToString() == attributeName ||
                         a.Name.ToString() == attributeName.Replace("Attribute", ""));

            if (hasAttribute)
                return true;
        }

        return false;
    }

    /// <summary>
    /// Get all method names in the class
    /// </summary>
    public List<string> GetAllMethodNames()
    {
        return _root.DescendantNodes()
            .OfType<MethodDeclarationSyntax>()
            .Select(m => m.Identifier.Text)
            .ToList();
    }

    /// <summary>
    /// Get all field names in the class
    /// </summary>
    public List<string> GetAllFieldNames()
    {
        return _root.DescendantNodes()
            .OfType<FieldDeclarationSyntax>()
            .SelectMany(f => f.Declaration.Variables.Select(v => v.Identifier.Text))
            .ToList();
    }

    /// <summary>
    /// Get method body as string
    /// </summary>
    public string? GetMethodBody(string methodName)
    {
        var method = _root.DescendantNodes()
            .OfType<MethodDeclarationSyntax>()
            .FirstOrDefault(m => m.Identifier.Text == methodName);

        return method?.Body?.ToString();
    }

    /// <summary>
    /// Check if method body contains a specific string
    /// </summary>
    public bool MethodBodyContains(string methodName, string searchString)
    {
        var body = GetMethodBody(methodName);
        return body?.Contains(searchString) ?? false;
    }

    /// <summary>
    /// Check if the Render method returns a VNode
    /// </summary>
    public bool RenderMethodReturnsVNode()
    {
        var renderMethod = _root.DescendantNodes()
            .OfType<MethodDeclarationSyntax>()
            .FirstOrDefault(m => m.Identifier.Text == "Render");

        if (renderMethod == null)
            return false;

        var returnType = renderMethod.ReturnType.ToString();
        return returnType == "VNode" || returnType.Contains("VNode");
    }

    /// <summary>
    /// Check if Render method calls StateManager.SyncMembersToState
    /// </summary>
    public bool RenderMethodCallsSyncMembersToState()
    {
        return MethodBodyContains("Render", "StateManager.SyncMembersToState");
    }

    /// <summary>
    /// Count how many VElement constructor calls are in Render method
    /// </summary>
    public int CountVElementsInRender()
    {
        var body = GetMethodBody("Render");
        if (body == null)
            return 0;

        var count = 0;
        var index = 0;
        while ((index = body.IndexOf("new VElement(", index)) != -1)
        {
            count++;
            index += 13; // Length of "new VElement("
        }

        return count;
    }

    /// <summary>
    /// Get diagnostic errors (syntax errors)
    /// </summary>
    public List<string> GetDiagnosticErrors()
    {
        return _syntaxTree.GetDiagnostics()
            .Where(d => d.Severity == DiagnosticSeverity.Error)
            .Select(d => d.GetMessage())
            .ToList();
    }

    /// <summary>
    /// Check if code has any syntax errors
    /// </summary>
    public bool HasSyntaxErrors()
    {
        return _syntaxTree.GetDiagnostics()
            .Any(d => d.Severity == DiagnosticSeverity.Error);
    }

    /// <summary>
    /// Check if class inherits from MinimactComponent
    /// </summary>
    public bool InheritsFromMinimactComponent(string className)
    {
        var classDecl = _root.DescendantNodes()
            .OfType<ClassDeclarationSyntax>()
            .FirstOrDefault(c => c.Identifier.Text == className);

        if (classDecl?.BaseList == null)
            return false;

        return classDecl.BaseList.Types
            .Any(t => t.Type.ToString() == "MinimactComponent");
    }

    /// <summary>
    /// Check if class has [Component] attribute
    /// </summary>
    public bool HasComponentAttribute(string className)
    {
        var classDecl = _root.DescendantNodes()
            .OfType<ClassDeclarationSyntax>()
            .FirstOrDefault(c => c.Identifier.Text == className);

        if (classDecl == null)
            return false;

        return classDecl.AttributeLists
            .SelectMany(al => al.Attributes)
            .Any(a => a.Name.ToString() == "Component");
    }

    /// <summary>
    /// Get a detailed summary of the generated code structure
    /// </summary>
    public CodeStructureSummary GetStructureSummary()
    {
        var summary = new CodeStructureSummary
        {
            Classes = _root.DescendantNodes()
                .OfType<ClassDeclarationSyntax>()
                .Select(c => c.Identifier.Text)
                .ToList(),

            Methods = GetAllMethodNames(),
            Fields = GetAllFieldNames(),

            Properties = _root.DescendantNodes()
                .OfType<PropertyDeclarationSyntax>()
                .Select(p => p.Identifier.Text)
                .ToList(),

            HasSyntaxErrors = HasSyntaxErrors(),
            DiagnosticErrors = GetDiagnosticErrors()
        };

        return summary;
    }
}

public class CodeStructureSummary
{
    public List<string> Classes { get; set; } = new();
    public List<string> Methods { get; set; } = new();
    public List<string> Fields { get; set; } = new();
    public List<string> Properties { get; set; } = new();
    public bool HasSyntaxErrors { get; set; }
    public List<string> DiagnosticErrors { get; set; } = new();

    public override string ToString()
    {
        var summary = new System.Text.StringBuilder();
        summary.AppendLine($"Classes: {string.Join(", ", Classes)}");
        summary.AppendLine($"Methods: {string.Join(", ", Methods)}");
        summary.AppendLine($"Fields: {string.Join(", ", Fields)}");
        summary.AppendLine($"Properties: {string.Join(", ", Properties)}");
        summary.AppendLine($"Has Syntax Errors: {HasSyntaxErrors}");

        if (DiagnosticErrors.Any())
        {
            summary.AppendLine($"Errors:");
            foreach (var error in DiagnosticErrors)
            {
                summary.AppendLine($"  - {error}");
            }
        }

        return summary.ToString();
    }
}
