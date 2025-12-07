using System.Collections.Immutable;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;
using Microsoft.CodeAnalysis.Diagnostics;

namespace Reluxer.Analyzers;

/// <summary>
/// Roslyn analyzer that detects string manipulation patterns in generator classes.
///
/// Generators should emit pre-converted C# from tokens, not re-parse strings.
/// This analyzer flags:
/// - Regex usage (indicates re-parsing)
/// - String manipulation methods (Substring, IndexOf, Split, etc.)
/// - Manual bracket depth tracking (recreates lexer functionality)
/// - StringBuilder with character scanning (re-lexing)
///
/// The fix is to store Token[] in ComponentModel fields instead of raw strings,
/// then convert tokens to C# in visitors before the generator runs.
/// </summary>
[DiagnosticAnalyzer(LanguageNames.CSharp)]
public sealed class GeneratorStringManipulationAnalyzer : DiagnosticAnalyzer
{
    public override ImmutableArray<DiagnosticDescriptor> SupportedDiagnostics =>
        ImmutableArray.Create(
            DiagnosticDescriptors.RegexInGenerator,
            DiagnosticDescriptors.StringManipulationInGenerator,
            DiagnosticDescriptors.BracketDepthInGenerator,
            DiagnosticDescriptors.StringBuilderParsingInGenerator
        );

    public override void Initialize(AnalysisContext context)
    {
        context.ConfigureGeneratedCodeAnalysis(GeneratedCodeAnalysisFlags.None);
        context.EnableConcurrentExecution();

        // Analyze classes that are generators
        context.RegisterSyntaxNodeAction(AnalyzeClass, SyntaxKind.ClassDeclaration);
    }

    private void AnalyzeClass(SyntaxNodeAnalysisContext context)
    {
        var classDecl = (ClassDeclarationSyntax)context.Node;
        var className = classDecl.Identifier.Text;

        // Only analyze generator classes
        if (!IsGeneratorClass(className))
            return;

        // Walk all methods in the class
        foreach (var member in classDecl.Members)
        {
            if (member is MethodDeclarationSyntax method)
            {
                // Skip methods marked with [AllowStringManipulation]
                if (HasAllowStringManipulationAttribute(method))
                    continue;

                var walker = new GeneratorSyntaxWalker(context);
                walker.Visit(method);
            }
        }
    }

    private static bool IsGeneratorClass(string className)
    {
        // Match generator class naming patterns
        return className.EndsWith("Generator", StringComparison.Ordinal) ||
               className.EndsWith("Emitter", StringComparison.Ordinal) ||
               className.EndsWith("Writer", StringComparison.Ordinal) ||
               className == "CSharpGenerator" ||
               className == "CodeGenerator";
    }

    private static bool HasAllowStringManipulationAttribute(MethodDeclarationSyntax method)
    {
        return method.AttributeLists
            .SelectMany(al => al.Attributes)
            .Any(attr =>
            {
                var name = attr.Name.ToString();
                return name.EndsWith("AllowStringManipulation", StringComparison.Ordinal) ||
                       name.EndsWith("AllowStringManipulationAttribute", StringComparison.Ordinal);
            });
    }
}

/// <summary>
/// Walks generator method bodies looking for string manipulation patterns.
/// </summary>
internal sealed class GeneratorSyntaxWalker : CSharpSyntaxWalker
{
    private readonly SyntaxNodeAnalysisContext _context;
    private bool _hasStringBuilder = false;
    private bool _hasCharIndexing = false;

    public GeneratorSyntaxWalker(SyntaxNodeAnalysisContext context)
    {
        _context = context;
    }

    #region Regex Detection (REL010)

    public override void VisitInvocationExpression(InvocationExpressionSyntax node)
    {
        var expr = node.Expression.ToString();

        // Detect Regex usage
        if (expr.Contains("Regex.") ||
            expr.Contains("System.Text.RegularExpressions.Regex"))
        {
            var methodName = GetMethodName(expr);
            _context.ReportDiagnostic(Diagnostic.Create(
                DiagnosticDescriptors.RegexInGenerator,
                node.GetLocation(),
                $"Regex.{methodName}"
            ));
        }

        // Detect new Regex(...)
        if (node.Expression is ObjectCreationExpressionSyntax objCreation)
        {
            var typeName = objCreation.Type.ToString();
            if (typeName == "Regex" || typeName.EndsWith(".Regex"))
            {
                _context.ReportDiagnostic(Diagnostic.Create(
                    DiagnosticDescriptors.RegexInGenerator,
                    node.GetLocation(),
                    "new Regex(...)"
                ));
            }
        }

        base.VisitInvocationExpression(node);
    }

    public override void VisitObjectCreationExpression(ObjectCreationExpressionSyntax node)
    {
        var typeName = node.Type.ToString();

        // Detect new Regex(...)
        if (typeName == "Regex" ||
            typeName.EndsWith(".Regex") ||
            typeName == "System.Text.RegularExpressions.Regex")
        {
            _context.ReportDiagnostic(Diagnostic.Create(
                DiagnosticDescriptors.RegexInGenerator,
                node.GetLocation(),
                "new Regex(...)"
            ));
        }

        // Track StringBuilder creation for later analysis
        if (typeName == "StringBuilder" ||
            typeName == "System.Text.StringBuilder")
        {
            _hasStringBuilder = true;
        }

        base.VisitObjectCreationExpression(node);
    }

    #endregion

    #region String Manipulation Detection (REL011)

    public override void VisitMemberAccessExpression(MemberAccessExpressionSyntax node)
    {
        var methodName = node.Name.Identifier.Text;

        // Detect problematic string methods
        var problematicMethods = new[]
        {
            "Substring",
            "IndexOf",
            "LastIndexOf",
            "Split",
            "Replace",  // When used for parsing, not output formatting
        };

        if (problematicMethods.Contains(methodName))
        {
            // Check if this is on a string type (heuristic: check parent invocation)
            var parent = node.Parent;
            if (parent is InvocationExpressionSyntax)
            {
                _context.ReportDiagnostic(Diagnostic.Create(
                    DiagnosticDescriptors.StringManipulationInGenerator,
                    node.GetLocation(),
                    methodName
                ));
            }
        }

        base.VisitMemberAccessExpression(node);
    }

    #endregion

    #region Bracket Depth Detection (REL012)

    public override void VisitVariableDeclarator(VariableDeclaratorSyntax node)
    {
        var varName = node.Identifier.Text;

        // Detect depth tracking variables (for parsing, not formatting)
        // Exclude indent-related variables which are for output formatting
        var depthPatterns = new[]
        {
            "depth",
            "Depth",
            "parenDepth",
            "braceDepth",
            "bracketDepth",
            "nestedLevel",
            "nestingLevel",
        };

        // Don't flag indent-related variables - those are for output formatting
        if (varName.IndexOf("indent", StringComparison.OrdinalIgnoreCase) >= 0)
            return;

        if (depthPatterns.Any(p => varName.IndexOf(p, StringComparison.OrdinalIgnoreCase) >= 0))
        {
            _context.ReportDiagnostic(Diagnostic.Create(
                DiagnosticDescriptors.BracketDepthInGenerator,
                node.GetLocation(),
                varName
            ));
        }

        base.VisitVariableDeclarator(node);
    }

    public override void VisitAssignmentExpression(AssignmentExpressionSyntax node)
    {
        var left = node.Left.ToString();

        // Skip indent-related variables - those are for output formatting
        if (left.IndexOf("indent", StringComparison.OrdinalIgnoreCase) >= 0)
        {
            base.VisitAssignmentExpression(node);
            return;
        }

        // Detect depth++/depth-- patterns
        if (left.IndexOf("depth", StringComparison.OrdinalIgnoreCase) >= 0 ||
            left.IndexOf("level", StringComparison.OrdinalIgnoreCase) >= 0)
        {
            if (node.IsKind(SyntaxKind.AddAssignmentExpression) ||
                node.IsKind(SyntaxKind.SubtractAssignmentExpression))
            {
                _context.ReportDiagnostic(Diagnostic.Create(
                    DiagnosticDescriptors.BracketDepthInGenerator,
                    node.GetLocation(),
                    $"{left} += / -="
                ));
            }
        }

        base.VisitAssignmentExpression(node);
    }

    public override void VisitPrefixUnaryExpression(PrefixUnaryExpressionSyntax node)
    {
        if (node.IsKind(SyntaxKind.PreIncrementExpression) ||
            node.IsKind(SyntaxKind.PreDecrementExpression))
        {
            var operand = node.Operand.ToString();

            // Skip indent-related variables - those are for output formatting
            if (operand.IndexOf("indent", StringComparison.OrdinalIgnoreCase) >= 0)
            {
                base.VisitPrefixUnaryExpression(node);
                return;
            }

            if (operand.IndexOf("depth", StringComparison.OrdinalIgnoreCase) >= 0 ||
                operand.IndexOf("level", StringComparison.OrdinalIgnoreCase) >= 0)
            {
                _context.ReportDiagnostic(Diagnostic.Create(
                    DiagnosticDescriptors.BracketDepthInGenerator,
                    node.GetLocation(),
                    $"++/--{operand}"
                ));
            }
        }

        base.VisitPrefixUnaryExpression(node);
    }

    public override void VisitPostfixUnaryExpression(PostfixUnaryExpressionSyntax node)
    {
        if (node.IsKind(SyntaxKind.PostIncrementExpression) ||
            node.IsKind(SyntaxKind.PostDecrementExpression))
        {
            var operand = node.Operand.ToString();

            // Skip indent-related variables - those are for output formatting
            if (operand.IndexOf("indent", StringComparison.OrdinalIgnoreCase) >= 0)
            {
                base.VisitPostfixUnaryExpression(node);
                return;
            }

            if (operand.IndexOf("depth", StringComparison.OrdinalIgnoreCase) >= 0 ||
                operand.IndexOf("level", StringComparison.OrdinalIgnoreCase) >= 0)
            {
                _context.ReportDiagnostic(Diagnostic.Create(
                    DiagnosticDescriptors.BracketDepthInGenerator,
                    node.GetLocation(),
                    $"{operand}++/--"
                ));
            }
        }

        base.VisitPostfixUnaryExpression(node);
    }

    #endregion

    #region StringBuilder Parsing Detection (REL013)

    public override void VisitElementAccessExpression(ElementAccessExpressionSyntax node)
    {
        var expr = node.Expression.ToString();

        // Detect string[i] indexing which suggests character-by-character parsing
        // This is a heuristic - we check if the expression looks like a string being indexed
        if (_hasStringBuilder)
        {
            // If we have a StringBuilder and string indexing, this is likely parsing
            var argument = node.ArgumentList.Arguments.FirstOrDefault()?.ToString() ?? "";
            if (argument == "i" || argument == "j" || argument == "index" ||
                argument.StartsWith("i ", StringComparison.Ordinal) ||
                argument.StartsWith("j ", StringComparison.Ordinal))
            {
                _hasCharIndexing = true;
            }
        }

        base.VisitElementAccessExpression(node);
    }

    public override void VisitWhileStatement(WhileStatementSyntax node)
    {
        // If we have StringBuilder + char indexing + while loop, flag it
        if (_hasStringBuilder && _hasCharIndexing)
        {
            var condition = node.Condition.ToString();
            if (condition.Contains("i <") || condition.Contains("j <") ||
                condition.Contains("index <") || condition.Contains(".Length"))
            {
                _context.ReportDiagnostic(Diagnostic.Create(
                    DiagnosticDescriptors.StringBuilderParsingInGenerator,
                    node.GetLocation()
                ));
            }
        }

        base.VisitWhileStatement(node);
    }

    #endregion

    #region Helpers

    private static string GetMethodName(string expression)
    {
        var lastDot = expression.LastIndexOf('.');
        if (lastDot >= 0 && lastDot < expression.Length - 1)
        {
            return expression.Substring(lastDot + 1);
        }
        return expression;
    }

    #endregion
}
