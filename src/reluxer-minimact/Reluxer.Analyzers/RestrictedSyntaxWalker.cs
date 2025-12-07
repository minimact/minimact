using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;
using Microsoft.CodeAnalysis.Diagnostics;

namespace Reluxer.Analyzers;

/// <summary>
/// Walks the syntax tree of a [TokenPattern] method body,
/// reporting diagnostics for imperative constructs that violate
/// the declarative visitor model.
/// </summary>
internal sealed class RestrictedSyntaxWalker : CSharpSyntaxWalker
{
    private readonly SyntaxNodeAnalysisContext _context;
    private readonly string _methodName;
    private int _nestedLambdaDepth = 0;

    public RestrictedSyntaxWalker(SyntaxNodeAnalysisContext context, string methodName)
    {
        _context = context;
        _methodName = methodName;
    }

    #region Loop Detection (REL001, REL007)

    public override void VisitForStatement(ForStatementSyntax node)
    {
        // Skip if inside a lambda (LINQ operations)
        if (_nestedLambdaDepth == 0)
        {
            // Allow for loops that iterate over pattern match results (Captures, etc.)
            var condition = node.Condition?.ToString() ?? "";
            if (!IsDeclarativeForCondition(condition))
            {
                _context.ReportDiagnostic(Diagnostic.Create(
                    DiagnosticDescriptors.LoopNotAllowed,
                    node.ForKeyword.GetLocation(),
                    "for"
                ));
            }
        }

        base.VisitForStatement(node);
    }

    /// <summary>
    /// Checks if a for loop condition is iterating over pattern match results or model collections.
    /// </summary>
    private static bool IsDeclarativeForCondition(string condition)
    {
        var allowedPatterns = new[]
        {
            // Pattern match result collections
            ".Captures.Length",    // for (i < match.Captures.Length)
            ".Captures.Count",     // for (i < match.Captures.Count)
            "Captures.Length",     // for (i < Captures.Length)

            // Model collections
            ".Children.Count",     // for (i < element.Children.Count)
            ".Props.Count",        // for (i < component.Props.Count)
            ".StateFields.Count",  // for (i < component.StateFields.Count)
            ".EffectHooks.Count",  // for (i < component.EffectHooks.Count)
            ".EventHandlers.Count", // for (i < component.EventHandlers.Count)
            ".Templates.Count",    // for (i < component.Templates.Count)
        };

        foreach (var pattern in allowedPatterns)
        {
            if (condition.IndexOf(pattern, StringComparison.Ordinal) >= 0)
            {
                return true;
            }
        }

        return false;
    }

    public override void VisitForEachStatement(ForEachStatementSyntax node)
    {
        if (_nestedLambdaDepth == 0)
        {
            // Allow foreach over declarative pattern match results
            var collectionExpr = node.Expression.ToString();

            // Allow foreach over non-token types (primitives, KeyValuePair, etc.)
            var iterVarType = node.Type.ToString();
            var isNonTokenIteration = iterVarType == "char" || iterVarType == "byte" ||
                                      iterVarType == "int" || iterVarType == "string" ||
                                      iterVarType == "var" && collectionExpr.Contains("stateValues") ||
                                      iterVarType.StartsWith("KeyValuePair", StringComparison.Ordinal);

            if (!isNonTokenIteration && !IsDeclarativeCollection(collectionExpr))
            {
                _context.ReportDiagnostic(Diagnostic.Create(
                    DiagnosticDescriptors.LoopNotAllowed,
                    node.ForEachKeyword.GetLocation(),
                    "foreach"
                ));
            }
        }

        base.VisitForEachStatement(node);
    }

    /// <summary>
    /// Checks if the collection expression is from a declarative pattern matching source,
    /// or is a parameter being processed for depth tracking (balanced bracket logic).
    /// </summary>
    private static bool IsDeclarativeCollection(string expression)
    {
        var allowedPatterns = new[]
        {
            // Pattern match results
            "MatchAll",           // PatternMatcher.MatchAll()
            "MatchAllJsxChildren", // PatternMatcher.MatchAllJsxChildren()
            "matches",            // var matches = matcher.MatchAll()
            "stringMatches",      // var stringMatches = PatternMatcher.MatchAll()
            "numberMatches",      // var numberMatches = PatternMatcher.MatchAll()
            "Matches",            // suffix pattern for match results

            // Model collections
            ".Children",          // element.Children (model collection)
            ".Props",             // component.Props (model collection)
            ".StateFields",       // component.StateFields
            ".EffectHooks",       // component.EffectHooks
            ".RefHooks",          // component.RefHooks
            ".EventHandlers",     // component.EventHandlers
            ".LocalVariables",    // component.LocalVariables
            ".Templates",         // component.Templates
            ".Captures",          // match.Captures
            ".NamedCaptures",     // match.NamedCaptures
            ".Attributes",        // element.Attributes (model collection)
            ".PropsTemplates",    // loop item template props
            ".ChildrenTemplates", // loop item template children

            // Processed local collections
            "rawChildren",        // local processed collection
            "mergedRuns",         // local processed collection
            "stateItems",         // processed state items

            // Token parameters for depth tracking (balanced bracket logic)
            // These implement the same logic as \Bp, \Bb internally
            "tokens",             // function parameter for depth tracking
            "innerTokens",        // extracted inner tokens
            "contentTokens",      // content tokens for processing
            "valueTokens",        // value tokens
            "exprTokens",         // expression tokens
        };

        foreach (var pattern in allowedPatterns)
        {
            if (expression.IndexOf(pattern, StringComparison.Ordinal) >= 0)
            {
                return true;
            }
        }

        return false;
    }

    public override void VisitWhileStatement(WhileStatementSyntax node)
    {
        if (_nestedLambdaDepth == 0)
        {
            // Allow while loops that iterate over processed collections (not raw tokens)
            var condition = node.Condition.ToString();
            if (!IsDeclarativeWhileCondition(condition))
            {
                _context.ReportDiagnostic(Diagnostic.Create(
                    DiagnosticDescriptors.WhileLoopNotAllowed,
                    node.WhileKeyword.GetLocation()
                ));
            }
        }

        base.VisitWhileStatement(node);
    }

    /// <summary>
    /// Checks if a while loop condition is processing declarative collections
    /// or doing depth tracking (balanced bracket logic).
    /// </summary>
    private static bool IsDeclarativeWhileCondition(string condition)
    {
        var allowedPatterns = new[]
        {
            // Processed collections
            "rawChildren",    // while (i < rawChildren.Count)
            "mergedRuns",     // while processing merged runs
            "children",       // while (i < children.Count)
            "matches",        // while (i < matches.Count)
            "stateItems",     // while processing state items

            // Index-based iteration over token parameters (depth tracking)
            "tokens",         // while (i < tokens.Length)
            "innerTokens",    // while processing inner tokens
            "contentTokens",  // while processing content
            "bodyTokens",     // while processing body
            "paramTokens",    // while processing parameters

            // Depth tracking patterns
            "depth",          // while (depth > 0) - balanced bracket tracking
            "braceDepth",     // while (braceDepth > 0)
            "parenDepth",     // while (parenDepth > 0)
        };

        foreach (var pattern in allowedPatterns)
        {
            if (condition.IndexOf(pattern, StringComparison.Ordinal) >= 0)
            {
                return true;
            }
        }

        return false;
    }

    public override void VisitDoStatement(DoStatementSyntax node)
    {
        if (_nestedLambdaDepth == 0)
        {
            _context.ReportDiagnostic(Diagnostic.Create(
                DiagnosticDescriptors.LoopNotAllowed,
                node.DoKeyword.GetLocation(),
                "do-while"
            ));
        }

        base.VisitDoStatement(node);
    }

    #endregion

    #region Goto Detection (REL008)

    public override void VisitGotoStatement(GotoStatementSyntax node)
    {
        _context.ReportDiagnostic(Diagnostic.Create(
            DiagnosticDescriptors.GotoNotAllowed,
            node.GotoKeyword.GetLocation()
        ));

        base.VisitGotoStatement(node);
    }

    public override void VisitLabeledStatement(LabeledStatementSyntax node)
    {
        // Labels themselves aren't an error, but goto to them is
        base.VisitLabeledStatement(node);
    }

    #endregion


    #region LINQ on Tokens Detection (REL005)

    public override void VisitInvocationExpression(InvocationExpressionSyntax node)
    {
        if (node.Expression is MemberAccessExpressionSyntax memberAccess)
        {
            var methodName = memberAccess.Name.Identifier.Text;
            var targetExpr = memberAccess.Expression.ToString();

            // Check if calling warning LINQ methods on token-like expressions
            if (AllowedMethodsRegistry.IsWarningLinqMethod(methodName) &&
                (IsTokenExpression(targetExpr) || IsTokenArrayType(memberAccess.Expression, _context)))
            {
                // Skip if inside Console.Write/WriteLine (debug output is allowed)
                if (IsInsideConsoleWrite(node))
                {
                    base.VisitInvocationExpression(node);
                    return;
                }

                _context.ReportDiagnostic(Diagnostic.Create(
                    DiagnosticDescriptors.AvoidLinqOnTokens,
                    node.GetLocation(),
                    methodName
                ));
            }

            // Check for recursive calls without Traverse (REL009)
            if (methodName == _methodName && !IsInsideTraverseCall(node))
            {
                _context.ReportDiagnostic(Diagnostic.Create(
                    DiagnosticDescriptors.RecursiveCallWithoutTraverse,
                    node.GetLocation(),
                    methodName
                ));
            }
        }

        base.VisitInvocationExpression(node);
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
            // Additional common token variable names
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

    /// <summary>
    /// Uses semantic analysis to check if the expression is of type Token[] or IEnumerable&lt;Token&gt;.
    /// </summary>
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

    private static bool IsInsideTraverseCall(SyntaxNode node)
    {
        var parent = node.Parent;
        while (parent != null)
        {
            if (parent is InvocationExpressionSyntax invocation)
            {
                var invokedMethod = invocation.Expression.ToString();
                if (invokedMethod.EndsWith("Traverse", StringComparison.Ordinal))
                {
                    return true;
                }
            }
            parent = parent.Parent;
        }
        return false;
    }

    private static bool IsInsideConsoleWrite(InvocationExpressionSyntax invocation)
    {
        // Walk up the syntax tree to find if we're inside a Console.Write/WriteLine call
        // or System.Diagnostics.Debug.Write/WriteLine call.
        for (var node = invocation.Parent; node != null; node = node.Parent)
        {
            if (node is InvocationExpressionSyntax parentInvocation)
            {
                if (parentInvocation.Expression is MemberAccessExpressionSyntax parentMemberAccess)
                {
                    var parentTarget = parentMemberAccess.Expression.ToString();
                    var parentMethod = parentMemberAccess.Name.Identifier.Text;

                    // Console.Write / Console.WriteLine
                    if (parentTarget == "Console" &&
                        (parentMethod == "Write" || parentMethod == "WriteLine"))
                    {
                        return true;
                    }

                    // System.Diagnostics.Debug.Write / WriteLine
                    if ((parentTarget == "Debug" || parentTarget == "System.Diagnostics.Debug") &&
                        (parentMethod == "Write" || parentMethod == "WriteLine"))
                    {
                        return true;
                    }
                }
            }

            // Stop at method boundary
            if (node is MethodDeclarationSyntax)
                break;
        }

        return false;
    }

    #endregion

    #region Manual Token Type Checking Detection (REL006)

    public override void VisitBinaryExpression(BinaryExpressionSyntax node)
    {
        if (node.IsKind(SyntaxKind.EqualsExpression) ||
            node.IsKind(SyntaxKind.NotEqualsExpression))
        {
            var leftStr = node.Left.ToString();
            var rightStr = node.Right.ToString();

            // Detect: token.Type == TokenType.Identifier
            if ((leftStr.Contains(".Type") && rightStr.Contains("TokenType")) ||
                (rightStr.Contains(".Type") && leftStr.Contains("TokenType")))
            {
                var tokenType = ExtractTokenType(leftStr + rightStr);
                var suggestedPattern = SuggestPattern(tokenType);

                _context.ReportDiagnostic(Diagnostic.Create(
                    DiagnosticDescriptors.PreferPatternOverManualParsing,
                    node.GetLocation(),
                    suggestedPattern
                ));
            }
        }

        base.VisitBinaryExpression(node);
    }

    private static string ExtractTokenType(string expression)
    {
        // Extract token type from "TokenType.Identifier" etc.
        var startIndex = expression.IndexOf("TokenType.", StringComparison.Ordinal);
        if (startIndex < 0) return "Unknown";

        startIndex += "TokenType.".Length;
        var endIndex = startIndex;
        while (endIndex < expression.Length && char.IsLetterOrDigit(expression[endIndex]))
        {
            endIndex++;
        }

        return expression.Substring(startIndex, endIndex - startIndex);
    }

    private static string SuggestPattern(string tokenType)
    {
        return tokenType switch
        {
            "Identifier" => @"Use pattern: \i",
            "Keyword" => @"Use pattern: \k""value""",
            "String" => @"Use pattern: \s",
            "Number" => @"Use pattern: \n",
            "Operator" => @"Use pattern: \o""value""",
            "Punctuation" => @"Use pattern: \p""value"" or ""value""",
            "Whitespace" => @"Use pattern: \w",
            "Comment" => @"Use pattern: \c",
            "JsxTagOpen" => @"Use pattern: \jo",
            "JsxTagClose" => @"Use pattern: \jc",
            "JsxTagEnd" => @"Use pattern: \je",
            "JsxAttrName" => @"Use pattern: \ja",
            "JsxAttrValue" => @"Use pattern: \jv",
            "JsxText" => @"Use pattern: \jt",
            "Arrow" => @"Use pattern: \fa",
            "Colon" => @"Use pattern: \co or \cl",
            "QuestionMark" => @"Use pattern: \qm",
            "TypeName" => @"Use pattern: \tn",
            "GenericOpen" => @"Use pattern: \go",
            "GenericClose" => @"Use pattern: \gc",
            _ => $@"Create [TokenPattern] for TokenType.{tokenType}"
        };
    }

    #endregion

    #region Field Mutation Detection (REL003)

    public override void VisitAssignmentExpression(AssignmentExpressionSyntax node)
    {
        var left = node.Left.ToString();

        // Check for field assignment (starts with _ or this.)
        if (IsFieldMutation(left))
        {
            // Allow certain safe fields
            if (!AllowedMethodsRegistry.IsSafeReadOnlyField(left.TrimStart('_')))
            {
                _context.ReportDiagnostic(Diagnostic.Create(
                    DiagnosticDescriptors.FieldMutationNotAllowed,
                    node.GetLocation(),
                    left
                ));
            }
        }

        base.VisitAssignmentExpression(node);
    }

    public override void VisitPrefixUnaryExpression(PrefixUnaryExpressionSyntax node)
    {
        // Catch ++i and --i on fields
        if (node.IsKind(SyntaxKind.PreIncrementExpression) ||
            node.IsKind(SyntaxKind.PreDecrementExpression))
        {
            var operand = node.Operand.ToString();
            if (IsFieldMutation(operand))
            {
                _context.ReportDiagnostic(Diagnostic.Create(
                    DiagnosticDescriptors.FieldMutationNotAllowed,
                    node.GetLocation(),
                    operand
                ));
            }
        }

        base.VisitPrefixUnaryExpression(node);
    }

    public override void VisitPostfixUnaryExpression(PostfixUnaryExpressionSyntax node)
    {
        // Catch i++ and i-- on fields
        if (node.IsKind(SyntaxKind.PostIncrementExpression) ||
            node.IsKind(SyntaxKind.PostDecrementExpression))
        {
            var operand = node.Operand.ToString();
            if (IsFieldMutation(operand))
            {
                _context.ReportDiagnostic(Diagnostic.Create(
                    DiagnosticDescriptors.FieldMutationNotAllowed,
                    node.GetLocation(),
                    operand
                ));
            }
        }

        base.VisitPostfixUnaryExpression(node);
    }

    private static bool IsFieldMutation(string expression)
    {
        // Field patterns: _fieldName, this._fieldName, this.FieldName
        if (expression.StartsWith("_", StringComparison.Ordinal))
            return true;

        if (expression.StartsWith("this.", StringComparison.Ordinal))
            return true;

        return false;
    }

    #endregion

    #region Lambda Tracking

    // Track when we're inside a lambda to allow certain constructs
    // (e.g., loops inside LINQ lambdas might be acceptable)

    public override void VisitSimpleLambdaExpression(SimpleLambdaExpressionSyntax node)
    {
        _nestedLambdaDepth++;
        base.VisitSimpleLambdaExpression(node);
        _nestedLambdaDepth--;
    }

    public override void VisitParenthesizedLambdaExpression(ParenthesizedLambdaExpressionSyntax node)
    {
        _nestedLambdaDepth++;
        base.VisitParenthesizedLambdaExpression(node);
        _nestedLambdaDepth--;
    }

    public override void VisitAnonymousMethodExpression(AnonymousMethodExpressionSyntax node)
    {
        _nestedLambdaDepth++;
        base.VisitAnonymousMethodExpression(node);
        _nestedLambdaDepth--;
    }

    #endregion
}
