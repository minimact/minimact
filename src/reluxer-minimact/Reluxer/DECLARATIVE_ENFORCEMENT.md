# Reluxer Declarative Enforcement Architecture

## The Problem

Reluxer provides a declarative pattern-matching DSL for AST transformation, but C# as the host language allows imperative escape hatches that break the model:

```csharp
[TokenPattern(@"\k""function"" (\i)")]
public void VisitFunction(string name)
{
    // ✅ Declarative - uses Reluxer's DSL
    Traverse(body, nameof(VisitNested));

    // ❌ Imperative escape - breaks the visitor pattern
    for (int i = 0; i < _tokens.Count; i++) {
        if (_tokens[i].Type == TokenType.Identifier) {
            // Manual traversal, bypasses pattern matching
        }
    }
}
```

This creates several problems:

1. **Inconsistent behavior**: Some visitors use patterns, others use loops
2. **Harder to reason about**: Can't guarantee traversal order
3. **Breaks composability**: Imperative code doesn't compose with `Traverse()`
4. **Testing nightmare**: Can't mock/intercept imperative token access
5. **Multi-output fragility**: Generators can't trust that visitors followed the model

---

## The Solution: Scoped Syntax Restrictions

Enforce that `[TokenPattern]` methods can ONLY use declarative constructs:

```csharp
[TokenPattern(@"\k""function"" (\i)")]
public void VisitFunction(string name)
{
    // ✅ Allowed - Reluxer API
    Traverse(body, nameof(VisitNested));
    var bodyTokens = ExtractFunctionBody();
    InsertAfter(token, Token.Identifier("injected"));
    Replace(match, newTokens);
    SkipBalanced("{", "}");

    // ❌ Compile error - REL001: Loop not allowed
    for (int i = 0; i < tokens.Count; i++) { }

    // ❌ Compile error - REL002: Direct indexing not allowed
    var token = _tokens[5];

    // ❌ Compile error - REL003: While loop not allowed
    while (condition) { }

    // ❌ Compile error - REL004: Field mutation not allowed
    _someField = value;
}
```

---

## Roslyn Analyzer Implementation

### Project Structure

```
Reluxer.Analyzers/
├── Reluxer.Analyzers.csproj
├── RestrictedScopeAnalyzer.cs
├── DiagnosticDescriptors.cs
├── RestrictedSyntaxWalker.cs
└── AllowedMethodsRegistry.cs
```

### 1. Diagnostic Descriptors

```csharp
// DiagnosticDescriptors.cs
namespace Reluxer.Analyzers;

public static class DiagnosticDescriptors
{
    public static readonly DiagnosticDescriptor LoopNotAllowed = new(
        id: "REL001",
        title: "Loop not allowed in token pattern visitor",
        messageFormat: "Imperative loops break the declarative visitor model. Use Traverse() or pattern matching instead.",
        category: "Reluxer.Declarative",
        defaultSeverity: DiagnosticSeverity.Error,
        isEnabledByDefault: true,
        description: "TokenPattern methods must be purely declarative. Loops indicate imperative token traversal which should be replaced with Traverse() calls or additional [TokenPattern] methods."
    );

    public static readonly DiagnosticDescriptor DirectTokenAccessNotAllowed = new(
        id: "REL002",
        title: "Direct token indexing not allowed",
        messageFormat: "Direct token array access bypasses pattern matching. Use captures from TokenMatch or ExtractBalanced() helpers.",
        category: "Reluxer.Declarative",
        defaultSeverity: DiagnosticSeverity.Error,
        isEnabledByDefault: true
    );

    public static readonly DiagnosticDescriptor FieldMutationNotAllowed = new(
        id: "REL003",
        title: "Field mutation not allowed in pattern visitor",
        messageFormat: "Mutating fields '{0}' in pattern visitors causes ordering issues. Store results in Context or return from method.",
        category: "Reluxer.Declarative",
        defaultSeverity: DiagnosticSeverity.Warning,
        isEnabledByDefault: true
    );

    public static readonly DiagnosticDescriptor UseTraverseInstead = new(
        id: "REL004",
        title: "Use Traverse() for nested visiting",
        messageFormat: "Manual iteration over tokens detected. Use Traverse(tokens, nameof(VisitorMethod)) for declarative nested visiting.",
        category: "Reluxer.Declarative",
        defaultSeverity: DiagnosticSeverity.Info,
        isEnabledByDefault: true
    );

    public static readonly DiagnosticDescriptor AvoidLinqOnTokens = new(
        id: "REL005",
        title: "Avoid LINQ iteration on raw tokens",
        messageFormat: "LINQ operations like '{0}' on token arrays bypass pattern matching. Consider using PatternMatcher or Traverse().",
        category: "Reluxer.Declarative",
        defaultSeverity: DiagnosticSeverity.Warning,
        isEnabledByDefault: true
    );

    public static readonly DiagnosticDescriptor PreferPatternOverManualParsing = new(
        id: "REL006",
        title: "Prefer pattern over manual parsing",
        messageFormat: "Manual token type checking detected. Create a [TokenPattern] method instead: {0}",
        category: "Reluxer.Declarative",
        defaultSeverity: DiagnosticSeverity.Info,
        isEnabledByDefault: true
    );
}
```

### 2. Allowed Methods Registry

```csharp
// AllowedMethodsRegistry.cs
namespace Reluxer.Analyzers;

/// <summary>
/// Defines which methods are allowed in [TokenPattern] visitor bodies.
/// These are the "vocabulary" of the declarative DSL.
/// </summary>
public static class AllowedMethodsRegistry
{
    /// <summary>
    /// Methods from TokenVisitor base class that are allowed.
    /// </summary>
    public static readonly HashSet<string> AllowedVisitorMethods = new()
    {
        // Traversal
        "Traverse",
        "Enter",

        // Extraction (balanced matching)
        "ExtractFunctionBody",
        "ExtractParenthesized",
        "ExtractBracketed",
        "ExtractBalanced",

        // Manipulation
        "InsertAfter",
        "InsertBefore",
        "InsertAt",
        "Replace",
        "ReplaceMatch",
        "ReplaceRange",
        "Remove",
        "RemoveMatch",

        // Navigation
        "SkipTo",
        "SkipToIndex",
        "SkipBalanced",

        // Output
        "GetModifiedTokens",
        "GetModifiedSource",

        // Context
        "Context.Get",
        "Context.Set",
        "Context.Remove",
    };

    /// <summary>
    /// Methods from PatternMatcher that are allowed for inline matching.
    /// </summary>
    public static readonly HashSet<string> AllowedPatternMethods = new()
    {
        "PatternMatcher.TryMatch",
        "PatternMatcher.MatchAll",
        "PatternMatcher.MatchAllJsxChildren",
    };

    /// <summary>
    /// Static helper methods that are safe.
    /// </summary>
    public static readonly HashSet<string> AllowedStaticMethods = new()
    {
        "Token.Keyword",
        "Token.Identifier",
        "Token.String",
        "Token.Number",
        "Token.Operator",
        "Token.Punctuation",
        "Token.Whitespace",
        "Token.Create",
        "string.Join",
        "string.IsNullOrEmpty",
        "string.IsNullOrWhiteSpace",
    };

    /// <summary>
    /// LINQ methods that are allowed (non-iterating).
    /// </summary>
    public static readonly HashSet<string> AllowedLinqMethods = new()
    {
        "FirstOrDefault",
        "First",
        "LastOrDefault",
        "Last",
        "Single",
        "SingleOrDefault",
        "Any",
        "All",
        "Count",
        "Length",
    };

    /// <summary>
    /// LINQ methods that suggest iteration (warning, not error).
    /// </summary>
    public static readonly HashSet<string> WarningLinqMethods = new()
    {
        "Where",
        "Select",
        "SelectMany",
        "ForEach",
        "Aggregate",
        "Take",
        "Skip",
        "TakeWhile",
        "SkipWhile",
    };
}
```

### 3. Main Analyzer

```csharp
// RestrictedScopeAnalyzer.cs
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;
using Microsoft.CodeAnalysis.Diagnostics;
using System.Collections.Immutable;

namespace Reluxer.Analyzers;

[DiagnosticAnalyzer(LanguageNames.CSharp)]
public class RestrictedScopeAnalyzer : DiagnosticAnalyzer
{
    public override ImmutableArray<DiagnosticDescriptor> SupportedDiagnostics =>
        ImmutableArray.Create(
            DiagnosticDescriptors.LoopNotAllowed,
            DiagnosticDescriptors.DirectTokenAccessNotAllowed,
            DiagnosticDescriptors.FieldMutationNotAllowed,
            DiagnosticDescriptors.UseTraverseInstead,
            DiagnosticDescriptors.AvoidLinqOnTokens,
            DiagnosticDescriptors.PreferPatternOverManualParsing
        );

    public override void Initialize(AnalysisContext context)
    {
        context.ConfigureGeneratedCodeAnalysis(GeneratedCodeAnalysisFlags.None);
        context.EnableConcurrentExecution();
        context.RegisterSyntaxNodeAction(AnalyzeMethod, SyntaxKind.MethodDeclaration);
    }

    private void AnalyzeMethod(SyntaxNodeAnalysisContext context)
    {
        var method = (MethodDeclarationSyntax)context.Node;

        // Check if method has [TokenPattern] attribute
        if (!HasTokenPatternAttribute(method))
            return;

        // Check for [AllowImperative] escape hatch (for migration)
        if (HasAllowImperativeAttribute(method))
            return;

        // Analyze the method body for violations
        if (method.Body != null)
        {
            var walker = new RestrictedSyntaxWalker(context);
            walker.Visit(method.Body);
        }

        // Also check expression-bodied members
        if (method.ExpressionBody != null)
        {
            var walker = new RestrictedSyntaxWalker(context);
            walker.Visit(method.ExpressionBody);
        }
    }

    private bool HasTokenPatternAttribute(MethodDeclarationSyntax method)
    {
        return method.AttributeLists
            .SelectMany(al => al.Attributes)
            .Any(attr =>
            {
                var name = attr.Name.ToString();
                return name == "TokenPattern" || name == "TokenPatternAttribute";
            });
    }

    private bool HasAllowImperativeAttribute(MethodDeclarationSyntax method)
    {
        return method.AttributeLists
            .SelectMany(al => al.Attributes)
            .Any(attr =>
            {
                var name = attr.Name.ToString();
                return name == "AllowImperative" || name == "AllowImperativeAttribute";
            });
    }
}
```

### 4. Syntax Walker

```csharp
// RestrictedSyntaxWalker.cs
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;
using Microsoft.CodeAnalysis.Diagnostics;

namespace Reluxer.Analyzers;

/// <summary>
/// Walks the syntax tree of a [TokenPattern] method body,
/// reporting diagnostics for imperative constructs.
/// </summary>
internal class RestrictedSyntaxWalker : CSharpSyntaxWalker
{
    private readonly SyntaxNodeAnalysisContext _context;
    private int _loopDepth = 0;

    public RestrictedSyntaxWalker(SyntaxNodeAnalysisContext context)
    {
        _context = context;
    }

    #region Loop Detection

    public override void VisitForStatement(ForStatementSyntax node)
    {
        ReportLoopViolation(node, "for");
        _loopDepth++;
        base.VisitForStatement(node);
        _loopDepth--;
    }

    public override void VisitForEachStatement(ForEachStatementSyntax node)
    {
        ReportLoopViolation(node, "foreach");
        _loopDepth++;
        base.VisitForEachStatement(node);
        _loopDepth--;
    }

    public override void VisitWhileStatement(WhileStatementSyntax node)
    {
        ReportLoopViolation(node, "while");
        _loopDepth++;
        base.VisitWhileStatement(node);
        _loopDepth--;
    }

    public override void VisitDoStatement(DoStatementSyntax node)
    {
        ReportLoopViolation(node, "do-while");
        _loopDepth++;
        base.VisitDoStatement(node);
        _loopDepth--;
    }

    private void ReportLoopViolation(SyntaxNode node, string loopType)
    {
        _context.ReportDiagnostic(Diagnostic.Create(
            DiagnosticDescriptors.LoopNotAllowed,
            node.GetLocation()
        ));
    }

    #endregion

    #region Direct Token Access Detection

    public override void VisitElementAccessExpression(ElementAccessExpressionSyntax node)
    {
        var expression = node.Expression.ToString();

        // Check for token array access patterns
        if (IsTokenArrayAccess(expression))
        {
            _context.ReportDiagnostic(Diagnostic.Create(
                DiagnosticDescriptors.DirectTokenAccessNotAllowed,
                node.GetLocation()
            ));
        }

        base.VisitElementAccessExpression(node);
    }

    private bool IsTokenArrayAccess(string expression)
    {
        // Common patterns for token array access
        var tokenPatterns = new[]
        {
            "_tokens",
            "tokens",
            "_componentBody",
            "componentBody",
            "match.MatchedTokens",
            "match.Captures"
        };

        return tokenPatterns.Any(p =>
            expression.Contains(p, StringComparison.OrdinalIgnoreCase));
    }

    #endregion

    #region LINQ on Tokens Detection

    public override void VisitInvocationExpression(InvocationExpressionSyntax node)
    {
        if (node.Expression is MemberAccessExpressionSyntax memberAccess)
        {
            var methodName = memberAccess.Name.Identifier.Text;
            var targetExpr = memberAccess.Expression.ToString();

            // Check if calling LINQ methods on token-like expressions
            if (IsTokenExpression(targetExpr))
            {
                if (AllowedMethodsRegistry.WarningLinqMethods.Contains(methodName))
                {
                    _context.ReportDiagnostic(Diagnostic.Create(
                        DiagnosticDescriptors.AvoidLinqOnTokens,
                        node.GetLocation(),
                        methodName
                    ));
                }
            }
        }

        base.VisitInvocationExpression(node);
    }

    private bool IsTokenExpression(string expression)
    {
        var tokenPatterns = new[]
        {
            "tokens",
            "_tokens",
            "match.MatchedTokens",
            "match.Captures",
            "bodyTokens",
            "paramTokens"
        };

        return tokenPatterns.Any(p =>
            expression.StartsWith(p, StringComparison.OrdinalIgnoreCase) ||
            expression.EndsWith(p, StringComparison.OrdinalIgnoreCase));
    }

    #endregion

    #region Manual Token Type Checking

    public override void VisitBinaryExpression(BinaryExpressionSyntax node)
    {
        // Detect: token.Type == TokenType.Identifier
        if (node.IsKind(SyntaxKind.EqualsExpression) ||
            node.IsKind(SyntaxKind.NotEqualsExpression))
        {
            var leftStr = node.Left.ToString();
            var rightStr = node.Right.ToString();

            if ((leftStr.Contains(".Type") && rightStr.Contains("TokenType")) ||
                (rightStr.Contains(".Type") && leftStr.Contains("TokenType")))
            {
                // Suggest a pattern instead
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

    private string ExtractTokenType(string expression)
    {
        var match = System.Text.RegularExpressions.Regex.Match(
            expression, @"TokenType\.(\w+)");
        return match.Success ? match.Groups[1].Value : "Unknown";
    }

    private string SuggestPattern(string tokenType)
    {
        return tokenType switch
        {
            "Identifier" => @"[TokenPattern(@""\i"")]",
            "Keyword" => @"[TokenPattern(@""\k""value"""")]",
            "String" => @"[TokenPattern(@""\s"")]",
            "Number" => @"[TokenPattern(@""\n"")]",
            "Operator" => @"[TokenPattern(@""\o""value"""")]",
            "JsxTagOpen" => @"[TokenPattern(@""\jo"")]",
            _ => $@"[TokenPattern(@""..."")]  // for TokenType.{tokenType}"
        };
    }

    #endregion

    #region Field Mutation Detection

    public override void VisitAssignmentExpression(AssignmentExpressionSyntax node)
    {
        var left = node.Left.ToString();

        // Check for field assignment (starts with _ or this.)
        if (left.StartsWith("_") || left.StartsWith("this."))
        {
            // Allow certain safe fields
            var safeFields = new[] { "_currentResult", "_currentPath" };
            if (!safeFields.Any(f => left.StartsWith(f)))
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

    #endregion
}
```

### 5. Escape Hatch Attribute

```csharp
// AllowImperativeAttribute.cs (in Reluxer.Attributes namespace)
namespace Reluxer.Attributes;

/// <summary>
/// Marks a [TokenPattern] method as allowed to use imperative constructs.
/// Use sparingly during migration or for edge cases.
/// </summary>
[AttributeUsage(AttributeTargets.Method)]
public class AllowImperativeAttribute : Attribute
{
    public string? Reason { get; set; }
}
```

---

## Integration with Multi-Output Generation

The declarative enforcement enables **trustworthy multi-output generation**:

### Before (Imperative Chaos)

```csharp
// Can't trust what this visitor does - might skip tokens, mutate state randomly
[TokenPattern(@"\k""function"" (\i)")]
public void VisitFunction(string name)
{
    for (int i = 0; i < _tokens.Count; i++) {
        // Who knows what's happening here?
        // Templates might miss elements
        // Hooks might be counted wrong
        // Structural changes might be incomplete
    }
}
```

### After (Declarative Guarantee)

```csharp
// Analyzer guarantees this only uses declarative constructs
// Generators can trust the ComponentModel is complete
[TokenPattern(@"\k""function"" (\i)")]
public void VisitFunction(string name)
{
    // Traversal is explicit and trackable
    Traverse(body, nameof(VisitUseState), nameof(VisitUseEffect));

    // Extraction is declarative
    var bodyTokens = ExtractFunctionBody();

    // Results stored in context (not mutable fields)
    Context.Set($"ComponentBody:{name}", bodyTokens);
}
```

### Generator Confidence

With declarative enforcement, generators can now make guarantees:

```csharp
public class HooksGenerator
{
    public string Generate(ComponentModel component)
    {
        // We KNOW component.StateFields is complete because:
        // 1. StateVisitor uses [TokenPattern] methods only
        // 2. Analyzer prevents manual token iteration
        // 3. All hooks were captured via pattern matching

        // Therefore, hooks.json is guaranteed correct
        return JsonSerializer.Serialize(new HooksOutput
        {
            Hooks = component.StateFields
                .Concat(component.EffectHooks)
                .Concat(component.RefHooks)
                .OrderBy(h => h.Index)
                .ToList()
        });
    }
}
```

---

## Migration Path

### Phase 1: Add Analyzer (Warnings Only)

```xml
<!-- Reluxer.Transformer.csproj -->
<ItemGroup>
    <PackageReference Include="Reluxer.Analyzers" Version="1.0.0" />
</ItemGroup>

<!-- Set as warnings initially -->
<PropertyGroup>
    <WarningsAsErrors>REL001;REL002</WarningsAsErrors>
</PropertyGroup>
```

### Phase 2: Fix Existing Visitors

```csharp
// Before
[TokenPattern(@"\k""const"" (\i)")]
public void VisitConst(string name)
{
    for (int i = 0; i < _tokens.Count; i++) {  // REL001 warning
        if (_tokens[i].Type == TokenType.Operator) {
            // manual parsing
        }
    }
}

// After
[TokenPattern(@"\k""const"" (\i) ""="" (.*?) "";""")]
public void VisitConst(string name, Token[] valueTokens)
{
    // Pattern captures the value directly - no loop needed
    Context.Set($"ConstValue:{name}", TokensToString(valueTokens));
}
```

### Phase 3: Enable Errors

```xml
<PropertyGroup>
    <TreatWarningsAsErrors>true</TreatWarningsAsErrors>
</PropertyGroup>
```

### Phase 4: Remove Escape Hatches

```csharp
// Find all [AllowImperative] usages
// Refactor each to use patterns
// Remove the attribute
```

---

## DSL Completeness Checklist

For the DSL to be truly complete, every imperative pattern needs a declarative equivalent:

| Imperative Pattern | Declarative Equivalent |
|-------------------|----------------------|
| `for` loop over tokens | `Traverse(tokens, nameof(Visitor))` |
| `foreach` over tokens | `PatternMatcher.MatchAll()` |
| `_tokens[i]` indexing | Capture groups in pattern |
| `if (token.Type == X)` | `[TokenPattern(@"\x")]` |
| `while` searching | `\Bc` (balanced until comma), `\Bs` (balanced until semicolon) |
| Manual depth tracking | `\Bp`, `\Bb`, `\Bk`, `\Ba` balanced matching |
| `token.Value == "x"` | `""x""` in pattern |
| Building result lists | `Context.Set()` / return from visitor |

---

## Benefits Summary

1. **Correctness**: Generators can trust visitor output is complete
2. **Composability**: All visitors work with `Traverse()` consistently
3. **Testability**: Can mock pattern matching, not arbitrary code
4. **Performance**: Pattern matcher can optimize (vs arbitrary loops)
5. **Documentation**: Patterns ARE documentation (self-describing)
6. **Refactoring**: Change pattern, not scattered loop logic
7. **Multi-output**: All 5 output files derived from same trusted model

---

## Example: Pure Declarative Visitor

```csharp
/// <summary>
/// Extracts all hooks from a component body.
/// 100% declarative - no loops, no indexing, no manual parsing.
/// </summary>
public class HookVisitor : TokenVisitor
{
    private readonly ComponentModel _component;

    public HookVisitor(ComponentModel component) => _component = component;

    public override void OnBegin(IReadOnlyList<Token> tokens)
    {
        var body = Context.Get<Token[]>($"ComponentBody:{_component.Name}");
        if (body != null)
        {
            Traverse(body,
                nameof(VisitUseState),
                nameof(VisitUseEffect),
                nameof(VisitUseRef),
                nameof(VisitUseMvcState));
        }
    }

    [TokenPattern(@"\k""const"" ""["" (\i) "","" (\i) ""]"" ""="" \i""useState"" ""("" (.*?) "")""")]
    public void VisitUseState(string name, string setter, Token[] initial)
    {
        _component.StateFields.Add(new StateField
        {
            Name = name,
            SetterName = setter,
            InitialValue = TokensToString(initial),
            HookIndex = _component.NextHookIndex++
        });
    }

    [TokenPattern(@"\i""useEffect"" ""("" (\Bp)? \fa (\Bb) "","" (\Bk) "")""")]
    public void VisitUseEffect(Token[]? params_, Token[] body, Token[] deps)
    {
        _component.EffectHooks.Add(new EffectHook
        {
            Index = _component.NextHookIndex++,
            Dependencies = ExtractIdentifiers(deps),
            HasCleanup = ContainsReturn(body)
        });
    }

    [TokenPattern(@"\k""const"" (\i) ""="" \i""useRef"" ""("" (.*?) "")""")]
    public void VisitUseRef(string name, Token[] initial)
    {
        _component.RefHooks.Add(new RefHook
        {
            Name = name,
            Index = _component.NextHookIndex++,
            InitialValue = TokensToString(initial)
        });
    }

    [TokenPattern(@"\k""const"" ""["" (\i) (?:"","" (\i))? ""]"" ""="" \i""useMvcState"" \go (\tn) \gc ""("" (\s)")]
    public void VisitUseMvcState(string name, string? setter, string type, string key)
    {
        _component.MvcStateFields.Add(new MvcStateField
        {
            LocalName = name,
            SetterName = setter ?? "",
            Type = type,
            ViewModelKey = key.Trim('"', '\''),
            HookIndex = _component.NextHookIndex++
        });
    }

    // Helper methods (no loops - use pattern matching internally)
    private List<string> ExtractIdentifiers(Token[] tokens) =>
        tokens.Where(t => t.Type == TokenType.Identifier)
              .Select(t => t.Value)
              .ToList();

    private bool ContainsReturn(Token[] tokens) =>
        tokens.Any(t => t.Type == TokenType.Keyword && t.Value == "return");

    private string TokensToString(Token[] tokens) =>
        string.Join("", tokens.Select(t => t.Value));
}
```

This visitor:
- ✅ Uses only `[TokenPattern]` for matching
- ✅ Uses only `Traverse()` for nested visiting
- ✅ Uses only LINQ for simple queries (no iteration side effects)
- ✅ Stores results in `_component` (the model)
- ❌ No loops
- ❌ No direct token indexing
- ❌ No manual type checking

The Roslyn analyzer would pass this with zero diagnostics.
