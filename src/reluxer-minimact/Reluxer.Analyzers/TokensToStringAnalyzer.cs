using System.Collections.Immutable;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;
using Microsoft.CodeAnalysis.Diagnostics;

namespace Reluxer.Analyzers;

/// <summary>
/// Analyzer that flags all TokensToString() calls in the Reluxer.Transformer namespace.
/// </summary>
[DiagnosticAnalyzer(LanguageNames.CSharp)]
public sealed class TokensToStringAnalyzer : DiagnosticAnalyzer
{
    public override ImmutableArray<DiagnosticDescriptor> SupportedDiagnostics =>
        ImmutableArray.Create(DiagnosticDescriptors.TokensToStringNotAllowed);

    public override void Initialize(AnalysisContext context)
    {
        context.ConfigureGeneratedCodeAnalysis(GeneratedCodeAnalysisFlags.None);
        context.EnableConcurrentExecution();
        context.RegisterSyntaxNodeAction(AnalyzeInvocation, SyntaxKind.InvocationExpression);
    }

    private void AnalyzeInvocation(SyntaxNodeAnalysisContext context)
    {
        var invocation = (InvocationExpressionSyntax)context.Node;

        // Check if it's a TokensToString or TransformToString call
        string? methodName = invocation.Expression switch
        {
            MemberAccessExpressionSyntax memberAccess => memberAccess.Name.Identifier.Text,
            IdentifierNameSyntax identifier => identifier.Identifier.Text,
            _ => null
        };

        if (methodName == null)
            return;

        // Flag TokensToString variants and TransformToString
        bool isFlagged = methodName.StartsWith("TokensToString", StringComparison.Ordinal) ||
                         methodName == "TransformToString";
        if (!isFlagged)
            return;

        // Check if in Reluxer.Transformer namespace
        if (!IsInTransformerNamespace(invocation))
            return;

        context.ReportDiagnostic(Diagnostic.Create(
            DiagnosticDescriptors.TokensToStringNotAllowed,
            invocation.GetLocation()
        ));
    }

    private static bool IsInTransformerNamespace(SyntaxNode node)
    {
        SyntaxNode? current = node;
        while (current != null)
        {
            if (current is NamespaceDeclarationSyntax ns)
                return ns.Name.ToString().StartsWith("Reluxer.Transformer", StringComparison.Ordinal);
            if (current is FileScopedNamespaceDeclarationSyntax fileNs)
                return fileNs.Name.ToString().StartsWith("Reluxer.Transformer", StringComparison.Ordinal);
            current = current.Parent;
        }
        return false;
    }
}
