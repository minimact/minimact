using System.Collections.Immutable;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;
using Microsoft.CodeAnalysis.Diagnostics;

namespace Reluxer.Analyzers;

/// <summary>
/// Roslyn analyzer that enforces declarative patterns in Reluxer token visitors.
///
/// Methods decorated with [TokenPattern] must be purely declarative:
/// - No loops (for, foreach, while, do)
/// - No direct token array indexing
/// - No goto statements
/// - Prefer pattern matching over manual type checks
/// - Use Context for cross-visitor state instead of mutable fields
///
/// Use [AllowImperative] to opt-out during migration or for edge cases.
/// </summary>
[DiagnosticAnalyzer(LanguageNames.CSharp)]
public sealed class RestrictedScopeAnalyzer : DiagnosticAnalyzer
{
    /// <summary>
    /// Attribute name that marks methods for analysis.
    /// </summary>
    private const string TokenPatternAttributeName = "TokenPattern";
    private const string TokenPatternAttributeFullName = "TokenPatternAttribute";

    /// <summary>
    /// Attribute name that allows opting out of restrictions.
    /// </summary>
    private const string AllowImperativeAttributeName = "AllowImperative";
    private const string AllowImperativeAttributeFullName = "AllowImperativeAttribute";

    public override ImmutableArray<DiagnosticDescriptor> SupportedDiagnostics =>
        ImmutableArray.Create(
            DiagnosticDescriptors.LoopNotAllowed,
            DiagnosticDescriptors.DirectTokenAccessNotAllowed,
            DiagnosticDescriptors.FieldMutationNotAllowed,
            DiagnosticDescriptors.UseTraverseInstead,
            DiagnosticDescriptors.AvoidLinqOnTokens,
            DiagnosticDescriptors.PreferPatternOverManualParsing,
            DiagnosticDescriptors.WhileLoopNotAllowed,
            DiagnosticDescriptors.GotoNotAllowed,
            DiagnosticDescriptors.RecursiveCallWithoutTraverse
        );

    public override void Initialize(AnalysisContext context)
    {
        // Configure for performance
        context.ConfigureGeneratedCodeAnalysis(GeneratedCodeAnalysisFlags.None);
        context.EnableConcurrentExecution();

        // Register for method analysis
        context.RegisterSyntaxNodeAction(AnalyzeMethod, SyntaxKind.MethodDeclaration);
    }

    private void AnalyzeMethod(SyntaxNodeAnalysisContext context)
    {
        var method = (MethodDeclarationSyntax)context.Node;

        // Check if method has [TokenPattern] attribute
        if (!HasTokenPatternAttribute(method))
            return;

        // Check for [AllowImperative] escape hatch
        if (HasAllowImperativeAttribute(method))
            return;

        // Get the method name for recursive call detection
        var methodName = method.Identifier.Text;

        // Analyze the method body for violations
        if (method.Body != null)
        {
            var walker = new RestrictedSyntaxWalker(context, methodName);
            walker.Visit(method.Body);
        }

        // Also check expression-bodied members (=> expr)
        if (method.ExpressionBody != null)
        {
            var walker = new RestrictedSyntaxWalker(context, methodName);
            walker.Visit(method.ExpressionBody);
        }
    }

    /// <summary>
    /// Checks if a method has the [TokenPattern] attribute.
    /// </summary>
    private static bool HasTokenPatternAttribute(MethodDeclarationSyntax method)
    {
        return method.AttributeLists
            .SelectMany(al => al.Attributes)
            .Any(attr => IsTokenPatternAttribute(attr));
    }

    private static bool IsTokenPatternAttribute(AttributeSyntax attr)
    {
        var name = attr.Name.ToString();

        // Handle various forms:
        // - [TokenPattern]
        // - [TokenPatternAttribute]
        // - [Reluxer.Attributes.TokenPattern]
        // - [global::Reluxer.Attributes.TokenPatternAttribute]

        if (name.EndsWith(TokenPatternAttributeName, StringComparison.Ordinal) ||
            name.EndsWith(TokenPatternAttributeFullName, StringComparison.Ordinal))
        {
            return true;
        }

        // Also check simple name part for qualified names
        if (attr.Name is QualifiedNameSyntax qualified)
        {
            var simpleName = qualified.Right.Identifier.Text;
            return simpleName == TokenPatternAttributeName ||
                   simpleName == TokenPatternAttributeFullName;
        }

        if (attr.Name is AliasQualifiedNameSyntax aliasQualified)
        {
            var simpleName = aliasQualified.Name.Identifier.Text;
            return simpleName == TokenPatternAttributeName ||
                   simpleName == TokenPatternAttributeFullName;
        }

        return false;
    }

    /// <summary>
    /// Checks if a method has the [AllowImperative] attribute.
    /// </summary>
    private static bool HasAllowImperativeAttribute(MethodDeclarationSyntax method)
    {
        return method.AttributeLists
            .SelectMany(al => al.Attributes)
            .Any(attr => IsAllowImperativeAttribute(attr));
    }

    private static bool IsAllowImperativeAttribute(AttributeSyntax attr)
    {
        var name = attr.Name.ToString();

        if (name.EndsWith(AllowImperativeAttributeName, StringComparison.Ordinal) ||
            name.EndsWith(AllowImperativeAttributeFullName, StringComparison.Ordinal))
        {
            return true;
        }

        if (attr.Name is QualifiedNameSyntax qualified)
        {
            var simpleName = qualified.Right.Identifier.Text;
            return simpleName == AllowImperativeAttributeName ||
                   simpleName == AllowImperativeAttributeFullName;
        }

        return false;
    }
}
