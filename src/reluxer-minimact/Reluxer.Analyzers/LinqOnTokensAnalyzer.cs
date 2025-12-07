using System.Collections.Immutable;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;
using Microsoft.CodeAnalysis.Diagnostics;

namespace Reluxer.Analyzers;

/// <summary>
/// Roslyn analyzer that detects LINQ iteration methods on Token[] in Reluxer.Transformer.
///
/// This analyzer runs on ALL files in the Reluxer.Transformer namespace, regardless of
/// whether they have [TokenPattern] attributes. It only checks for REL005 violations
/// (LINQ methods like Aggregate, TakeWhile, Select on Token[]).
///
/// Use [AllowImperative] on methods to opt out.
/// </summary>
[DiagnosticAnalyzer(LanguageNames.CSharp)]
public sealed class LinqOnTokensAnalyzer : DiagnosticAnalyzer
{
    private const string AllowImperativeAttributeName = "AllowImperative";
    private const string AllowImperativeAttributeFullName = "AllowImperativeAttribute";

    public override ImmutableArray<DiagnosticDescriptor> SupportedDiagnostics =>
        ImmutableArray.Create(DiagnosticDescriptors.AvoidLinqOnTokens);

    public override void Initialize(AnalysisContext context)
    {
        context.ConfigureGeneratedCodeAnalysis(GeneratedCodeAnalysisFlags.None);
        context.EnableConcurrentExecution();

        // Register for invocation expressions (method calls)
        context.RegisterSyntaxNodeAction(AnalyzeInvocation, SyntaxKind.InvocationExpression);
    }

    private void AnalyzeInvocation(SyntaxNodeAnalysisContext context)
    {
        var invocation = (InvocationExpressionSyntax)context.Node;

        // Only analyze if in Reluxer.Transformer namespace
        if (!IsInTransformerNamespace(invocation, context))
            return;

        // Check if method has [AllowImperative]
        if (IsInAllowImperativeMethod(invocation))
            return;

        // Check for member access like tokens.Aggregate(...)
        if (invocation.Expression is not MemberAccessExpressionSyntax memberAccess)
            return;

        var methodName = memberAccess.Name.Identifier.Text;

        // Only check warning LINQ methods
        if (!AllowedMethodsRegistry.IsWarningLinqMethod(methodName))
            return;

        var targetExpr = memberAccess.Expression.ToString();

        // Check if called on token-like expression or Token[] type
        if (IsTokenExpression(targetExpr) || IsTokenArrayType(memberAccess.Expression, context))
        {
            context.ReportDiagnostic(Diagnostic.Create(
                DiagnosticDescriptors.AvoidLinqOnTokens,
                invocation.GetLocation(),
                methodName
            ));
        }
    }

    private static bool IsInTransformerNamespace(SyntaxNode node, SyntaxNodeAnalysisContext context)
    {
        // Get the containing type symbol
        var containingType = context.SemanticModel.GetEnclosingSymbol(node.SpanStart)?.ContainingType;
        if (containingType == null)
            return false;

        // Check namespace
        var ns = containingType.ContainingNamespace?.ToDisplayString();
        return ns != null && ns.StartsWith("Reluxer.Transformer", StringComparison.Ordinal);
    }

    private static bool IsInAllowImperativeMethod(SyntaxNode node)
    {
        // Walk up to find containing method
        var method = node.FirstAncestorOrSelf<MethodDeclarationSyntax>();
        if (method == null)
            return false;

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

    private static bool IsTokenExpression(string expression)
    {
        var tokenIndicators = new[]
        {
            "tokens",
            "Tokens",
            "body",
            "Body",
            "content",
            "Content",
            "match.Captures",
            "match.MatchedTokens",
            "innerTokens",
            "valueTokens",
            "exprTokens",
            "contentTokens",
            "bodyTokens",
            "paramTokens",
            "argTokens",
        };

        foreach (var indicator in tokenIndicators)
        {
            if (expression.IndexOf(indicator, StringComparison.Ordinal) >= 0)
            {
                return true;
            }
        }

        return false;
    }

    private static bool IsTokenArrayType(ExpressionSyntax expression, SyntaxNodeAnalysisContext context)
    {
        var typeInfo = context.SemanticModel.GetTypeInfo(expression);
        var type = typeInfo.Type;

        if (type == null)
            return false;

        // Check for Token[] array
        if (type is IArrayTypeSymbol arrayType)
        {
            var elementName = arrayType.ElementType.Name;
            if (elementName == "Token")
                return true;
        }

        // Check for IEnumerable<Token>, List<Token>, etc.
        if (type is INamedTypeSymbol namedType)
        {
            // Check if it's a generic type with Token as type argument
            foreach (var typeArg in namedType.TypeArguments)
            {
                if (typeArg.Name == "Token")
                    return true;
            }

            // Check interfaces (e.g., Token[] implements IEnumerable<Token>)
            foreach (var iface in namedType.AllInterfaces)
            {
                foreach (var typeArg in iface.TypeArguments)
                {
                    if (typeArg.Name == "Token")
                        return true;
                }
            }
        }

        return false;
    }
}
