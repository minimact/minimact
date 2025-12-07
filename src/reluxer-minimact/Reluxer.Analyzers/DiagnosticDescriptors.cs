using Microsoft.CodeAnalysis;

namespace Reluxer.Analyzers;

/// <summary>
/// Diagnostic descriptors for Reluxer declarative enforcement.
/// These diagnostics ensure [TokenPattern] visitor methods remain purely declarative.
/// </summary>
public static class DiagnosticDescriptors
{
    private const string Category = "Reluxer.Declarative";

    /// <summary>
    /// REL001: Loop not allowed in token pattern visitor.
    /// Severity: Error
    /// </summary>
    public static readonly DiagnosticDescriptor LoopNotAllowed = new(
        id: "REL001",
        title: "Loop not allowed in token pattern visitor",
        messageFormat: "Imperative '{0}' loop breaks the declarative visitor model. Use Traverse() or pattern matching instead.",
        category: Category,
        defaultSeverity: DiagnosticSeverity.Error,
        isEnabledByDefault: true,
        description: "TokenPattern methods must be purely declarative. Loops indicate imperative token traversal which should be replaced with Traverse() calls or additional [TokenPattern] methods.",
        helpLinkUri: "https://github.com/anthropics/minimact/blob/main/src/reluxer-minimact/Reluxer/DECLARATIVE_ENFORCEMENT.md#loop-detection"
    );

    /// <summary>
    /// REL002: Direct token indexing not allowed.
    /// Severity: Error
    /// </summary>
    public static readonly DiagnosticDescriptor DirectTokenAccessNotAllowed = new(
        id: "REL002",
        title: "Direct token indexing not allowed",
        messageFormat: "Direct token array access '{0}' bypasses pattern matching. Use captures from TokenMatch or ExtractBalanced() helpers.",
        category: Category,
        defaultSeverity: DiagnosticSeverity.Error,
        isEnabledByDefault: true,
        description: "Accessing tokens by index circumvents the pattern matching system. Use pattern captures or declarative extraction methods instead.",
        helpLinkUri: "https://github.com/anthropics/minimact/blob/main/src/reluxer-minimact/Reluxer/DECLARATIVE_ENFORCEMENT.md#direct-token-access-detection"
    );

    /// <summary>
    /// REL003: Field mutation not allowed in pattern visitor.
    /// Severity: Warning
    /// </summary>
    public static readonly DiagnosticDescriptor FieldMutationNotAllowed = new(
        id: "REL003",
        title: "Field mutation not allowed in pattern visitor",
        messageFormat: "Mutating field '{0}' in pattern visitors causes ordering issues. Store results in Context.Set() or the component model.",
        category: Category,
        defaultSeverity: DiagnosticSeverity.Warning,
        isEnabledByDefault: true,
        description: "Mutable state in visitors makes behavior dependent on visitation order. Use Context for cross-visitor communication or store results directly in the ComponentModel.",
        helpLinkUri: "https://github.com/anthropics/minimact/blob/main/src/reluxer-minimact/Reluxer/DECLARATIVE_ENFORCEMENT.md#field-mutation-detection"
    );

    /// <summary>
    /// REL004: Use Traverse() for nested visiting.
    /// Severity: Info
    /// </summary>
    public static readonly DiagnosticDescriptor UseTraverseInstead = new(
        id: "REL004",
        title: "Use Traverse() for nested visiting",
        messageFormat: "Manual iteration over tokens detected. Use Traverse(tokens, nameof(VisitorMethod)) for declarative nested visiting.",
        category: Category,
        defaultSeverity: DiagnosticSeverity.Info,
        isEnabledByDefault: true,
        description: "The Traverse() method provides declarative nested visiting with automatic pattern matching. It's preferred over manual iteration.",
        helpLinkUri: "https://github.com/anthropics/minimact/blob/main/src/reluxer-minimact/Reluxer/DECLARATIVE_ENFORCEMENT.md#dsl-completeness-checklist"
    );

    /// <summary>
    /// REL005: Avoid LINQ iteration on raw tokens.
    /// Severity: Warning
    /// </summary>
    public static readonly DiagnosticDescriptor AvoidLinqOnTokens = new(
        id: "REL005",
        title: "Avoid LINQ iteration on raw tokens",
        messageFormat: "LINQ method '{0}' on token array may bypass pattern matching. Consider using PatternMatcher.MatchAll() or Traverse().",
        category: Category,
        defaultSeverity: DiagnosticSeverity.Warning,
        isEnabledByDefault: true,
        description: "While some LINQ operations are allowed, iteration methods like Where(), Select(), and ForEach() suggest imperative processing that should use pattern matching instead.",
        helpLinkUri: "https://github.com/anthropics/minimact/blob/main/src/reluxer-minimact/Reluxer/DECLARATIVE_ENFORCEMENT.md#linq-on-tokens-detection"
    );

    /// <summary>
    /// REL006: Prefer pattern over manual parsing.
    /// Severity: Info
    /// </summary>
    public static readonly DiagnosticDescriptor PreferPatternOverManualParsing = new(
        id: "REL006",
        title: "Prefer pattern over manual parsing",
        messageFormat: "Manual token type checking detected. Create a [TokenPattern] method instead: {0}",
        category: Category,
        defaultSeverity: DiagnosticSeverity.Info,
        isEnabledByDefault: true,
        description: "Checking token.Type == TokenType.X should be replaced with a pattern that matches that token type directly.",
        helpLinkUri: "https://github.com/anthropics/minimact/blob/main/src/reluxer-minimact/Reluxer/DECLARATIVE_ENFORCEMENT.md#manual-token-type-checking"
    );

    /// <summary>
    /// REL007: While loop not allowed.
    /// Severity: Error
    /// </summary>
    public static readonly DiagnosticDescriptor WhileLoopNotAllowed = new(
        id: "REL007",
        title: "While loop not allowed in token pattern visitor",
        messageFormat: "Imperative 'while' loop breaks the declarative visitor model. Use balanced matchers (\\Bp, \\Bb, \\Bk) or Traverse() instead.",
        category: Category,
        defaultSeverity: DiagnosticSeverity.Error,
        isEnabledByDefault: true,
        description: "While loops often indicate searching for balanced delimiters. Use \\Bp (parentheses), \\Bb (braces), \\Bk (brackets) patterns instead."
    );

    /// <summary>
    /// REL008: Goto/label not allowed.
    /// Severity: Error
    /// </summary>
    public static readonly DiagnosticDescriptor GotoNotAllowed = new(
        id: "REL008",
        title: "Goto statement not allowed in token pattern visitor",
        messageFormat: "Goto statements are not allowed in declarative visitors. Restructure logic using pattern composition.",
        category: Category,
        defaultSeverity: DiagnosticSeverity.Error,
        isEnabledByDefault: true,
        description: "Control flow via goto breaks the declarative model and makes behavior unpredictable."
    );

    /// <summary>
    /// REL009: Recursive call without Traverse.
    /// Severity: Warning
    /// </summary>
    public static readonly DiagnosticDescriptor RecursiveCallWithoutTraverse = new(
        id: "REL009",
        title: "Recursive call should use Traverse()",
        messageFormat: "Direct recursive call to '{0}' detected. Use Traverse(tokens, nameof({0})) for proper pattern matching.",
        category: Category,
        defaultSeverity: DiagnosticSeverity.Warning,
        isEnabledByDefault: true,
        description: "Calling visitor methods directly bypasses the pattern matcher. Use Traverse() to ensure patterns are matched correctly."
    );

    /// <summary>
    /// REL010: Regex usage in generator.
    /// Severity: Error
    /// </summary>
    public static readonly DiagnosticDescriptor RegexInGenerator = new(
        id: "REL010",
        title: "Regex not allowed in generator",
        messageFormat: "Regex usage '{0}' in generator indicates re-parsing. Store tokens in ComponentModel and use token-based conversion instead.",
        category: Category,
        defaultSeverity: DiagnosticSeverity.Error,
        isEnabledByDefault: true,
        description: "Generators should emit pre-converted C# from tokens. If regex is needed to parse expressions, the conversion should happen in visitors where tokens are available.",
        helpLinkUri: "https://github.com/anthropics/minimact/blob/main/src/reluxer-minimact/Reluxer/DECLARATIVE_ENFORCEMENT.md#generator-string-manipulation"
    );

    /// <summary>
    /// REL011: String manipulation in generator.
    /// Severity: Error
    /// </summary>
    public static readonly DiagnosticDescriptor StringManipulationInGenerator = new(
        id: "REL011",
        title: "String manipulation in generator indicates re-parsing",
        messageFormat: "String method '{0}' in generator indicates re-parsing. Store tokens in ComponentModel instead of raw strings.",
        category: Category,
        defaultSeverity: DiagnosticSeverity.Error,
        isEnabledByDefault: true,
        description: "Methods like Substring, IndexOf, Split indicate the generator is parsing strings that should have been tokenized. Store Token[] in model fields.",
        helpLinkUri: "https://github.com/anthropics/minimact/blob/main/src/reluxer-minimact/Reluxer/DECLARATIVE_ENFORCEMENT.md#generator-string-manipulation"
    );

    /// <summary>
    /// REL012: Manual bracket depth tracking in generator.
    /// Severity: Error
    /// </summary>
    public static readonly DiagnosticDescriptor BracketDepthInGenerator = new(
        id: "REL012",
        title: "Manual bracket depth tracking in generator",
        messageFormat: "Manual depth tracking ('{0}') in generator indicates re-lexing. Use balanced bracket patterns (\\Bp, \\Bb, \\Bk) in visitors instead.",
        category: Category,
        defaultSeverity: DiagnosticSeverity.Error,
        isEnabledByDefault: true,
        description: "Tracking bracket depth manually recreates lexer functionality. The lexer already handles balanced brackets - use \\Bp, \\Bb, \\Bk patterns in visitors.",
        helpLinkUri: "https://github.com/anthropics/minimact/blob/main/src/reluxer-minimact/Reluxer/DECLARATIVE_ENFORCEMENT.md#generator-string-manipulation"
    );

    /// <summary>
    /// REL013: StringBuilder for parsing in generator.
    /// Severity: Error
    /// </summary>
    public static readonly DiagnosticDescriptor StringBuilderParsingInGenerator = new(
        id: "REL013",
        title: "StringBuilder parsing pattern in generator",
        messageFormat: "StringBuilder with character-by-character processing indicates re-lexing. Store tokens in ComponentModel instead.",
        category: Category,
        defaultSeverity: DiagnosticSeverity.Error,
        isEnabledByDefault: true,
        description: "Building strings character-by-character while scanning is effectively re-implementing a lexer. The token stream should already be available.",
        helpLinkUri: "https://github.com/anthropics/minimact/blob/main/src/reluxer-minimact/Reluxer/DECLARATIVE_ENFORCEMENT.md#generator-string-manipulation"
    );

    /// <summary>
    /// REL014: TokensToString not allowed in declarative visitors.
    /// Severity: Error
    /// </summary>
    public static readonly DiagnosticDescriptor TokensToStringNotAllowed = new(
        id: "REL014",
        title: "TokensToString not allowed in declarative visitors",
        messageFormat: "TokensToString() bypasses declarative token processing. Use PatternMatcher.TryMatch() or token patterns instead.",
        category: Category,
        defaultSeverity: DiagnosticSeverity.Error,
        isEnabledByDefault: true,
        description: "Converting tokens to strings for parsing is not declarative. Use PatternMatcher to match token patterns directly, or store processed results in the model."
    );
}
