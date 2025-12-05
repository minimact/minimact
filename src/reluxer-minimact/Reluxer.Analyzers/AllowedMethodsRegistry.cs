namespace Reluxer.Analyzers;

/// <summary>
/// Defines which methods are allowed in [TokenPattern] visitor bodies.
/// These methods form the "vocabulary" of the declarative DSL.
///
/// Methods not in these lists will trigger warnings or errors when called
/// from within a [TokenPattern] method (unless [AllowImperative] is applied).
/// </summary>
public static class AllowedMethodsRegistry
{
    /// <summary>
    /// Methods from TokenVisitor base class that are allowed.
    /// These are the core traversal and manipulation primitives.
    /// </summary>
    public static readonly HashSet<string> AllowedVisitorMethods = new(StringComparer.Ordinal)
    {
        // === Traversal ===
        "Traverse",           // Traverse(tokens, nameof(Visitor1), nameof(Visitor2))
        "Enter",              // Enter a new traversal scope

        // === Balanced Extraction ===
        "ExtractFunctionBody",    // Extract { } body of a function
        "ExtractParenthesized",   // Extract ( ) content
        "ExtractBracketed",       // Extract [ ] content
        "ExtractBalanced",        // Generic balanced extraction

        // === Token Manipulation ===
        "InsertAfter",        // Insert tokens after a position
        "InsertBefore",       // Insert tokens before a position
        "InsertAt",           // Insert tokens at specific index
        "Replace",            // Replace tokens
        "ReplaceMatch",       // Replace matched tokens
        "ReplaceRange",       // Replace token range
        "Remove",             // Remove tokens
        "RemoveMatch",        // Remove matched tokens

        // === Navigation ===
        "SkipTo",             // Skip to a token
        "SkipToIndex",        // Skip to index
        "SkipBalanced",       // Skip balanced delimiters
        "SkipUntil",          // Skip until condition

        // === Output ===
        "GetModifiedTokens",  // Get resulting tokens
        "GetModifiedSource",  // Get resulting source string

        // === Utilities ===
        "TokensToString",     // Convert Token[] to string
    };

    /// <summary>
    /// Context methods for cross-visitor communication.
    /// </summary>
    public static readonly HashSet<string> AllowedContextMethods = new(StringComparer.Ordinal)
    {
        "Get",      // Context.Get<T>(key)
        "Set",      // Context.Set(key, value)
        "Remove",   // Context.Remove(key)
        "Has",      // Context.Has(key)
        "TryGet",   // Context.TryGet<T>(key, out value)
    };

    /// <summary>
    /// Methods from PatternMatcher that are allowed for inline matching.
    /// </summary>
    public static readonly HashSet<string> AllowedPatternMatcherMethods = new(StringComparer.Ordinal)
    {
        "TryMatch",               // PatternMatcher.TryMatch(tokens, start, out match)
        "Match",                  // PatternMatcher.Match(tokens)
        "MatchAll",               // PatternMatcher.MatchAll(tokens)
        "MatchAllJsxChildren",    // PatternMatcher.MatchAllJsxChildren(tokens)
    };

    /// <summary>
    /// Static Token factory methods that are safe.
    /// </summary>
    public static readonly HashSet<string> AllowedTokenFactoryMethods = new(StringComparer.Ordinal)
    {
        "Keyword",
        "Identifier",
        "String",
        "Number",
        "Operator",
        "Punctuation",
        "Whitespace",
        "Comment",
        "Create",
    };

    /// <summary>
    /// Common string methods that are safe.
    /// </summary>
    public static readonly HashSet<string> AllowedStringMethods = new(StringComparer.Ordinal)
    {
        "Join",
        "Concat",
        "IsNullOrEmpty",
        "IsNullOrWhiteSpace",
        "Format",
        "Trim",
        "TrimStart",
        "TrimEnd",
        "StartsWith",
        "EndsWith",
        "Contains",
        "Replace",
        "Substring",
        "Split",
        "ToLower",
        "ToUpper",
        "ToLowerInvariant",
        "ToUpperInvariant",
    };

    /// <summary>
    /// LINQ methods that are allowed (non-iterating, single-result).
    /// These don't imply manual iteration over tokens.
    /// </summary>
    public static readonly HashSet<string> AllowedLinqMethods = new(StringComparer.Ordinal)
    {
        // Single result
        "First",
        "FirstOrDefault",
        "Last",
        "LastOrDefault",
        "Single",
        "SingleOrDefault",
        "ElementAt",
        "ElementAtOrDefault",

        // Predicates
        "Any",
        "All",
        "Contains",

        // Counts
        "Count",
        "LongCount",

        // Conversion (terminal)
        "ToArray",
        "ToList",
        "ToDictionary",
        "ToHashSet",
    };

    /// <summary>
    /// LINQ methods that suggest iteration (warning, not error).
    /// These are allowed but discouraged - prefer pattern matching.
    /// </summary>
    public static readonly HashSet<string> WarningLinqMethods = new(StringComparer.Ordinal)
    {
        // Transformation (iteration implied)
        "Where",
        "Select",
        "SelectMany",

        // Side effects
        "ForEach",

        // Aggregation (iteration implied)
        "Aggregate",
        "Sum",
        "Average",
        "Min",
        "Max",

        // Partitioning
        "Take",
        "TakeWhile",
        "Skip",
        "SkipWhile",

        // Ordering
        "OrderBy",
        "OrderByDescending",
        "ThenBy",
        "ThenByDescending",

        // Grouping
        "GroupBy",
        "GroupJoin",

        // Set operations
        "Distinct",
        "Union",
        "Intersect",
        "Except",
        "Concat",

        // Joining
        "Join",
        "Zip",
    };

    /// <summary>
    /// Fields that are safe to read (but not mutate) in visitor methods.
    /// </summary>
    public static readonly HashSet<string> SafeReadOnlyFields = new(StringComparer.Ordinal)
    {
        "_component",         // The component model being built
        "_currentResult",     // Current result being constructed
        "_currentPath",       // Current HexPath
        "Context",            // Visitor context
    };

    /// <summary>
    /// Model properties that can be mutated (adding to collections).
    /// </summary>
    public static readonly HashSet<string> AllowedModelMutations = new(StringComparer.Ordinal)
    {
        // ComponentModel collections
        "StateFields",
        "MvcStateFields",
        "Props",
        "EventHandlers",
        "LocalVariables",
        "HelperFunctions",
        "LiftedStateReads",
        "EffectHooks",
        "RefHooks",
        "Templates",
        "ConditionalElements",

        // VNode model
        "Children",
        "Attributes",
        "InitialState",
    };

    /// <summary>
    /// Checks if a method name is in any of the allowed categories.
    /// </summary>
    public static bool IsAllowedMethod(string methodName)
    {
        return AllowedVisitorMethods.Contains(methodName)
            || AllowedContextMethods.Contains(methodName)
            || AllowedPatternMatcherMethods.Contains(methodName)
            || AllowedTokenFactoryMethods.Contains(methodName)
            || AllowedStringMethods.Contains(methodName)
            || AllowedLinqMethods.Contains(methodName);
    }

    /// <summary>
    /// Checks if a LINQ method should trigger a warning.
    /// </summary>
    public static bool IsWarningLinqMethod(string methodName)
    {
        return WarningLinqMethods.Contains(methodName);
    }

    /// <summary>
    /// Checks if a field is safe to read.
    /// </summary>
    public static bool IsSafeReadOnlyField(string fieldName)
    {
        return SafeReadOnlyFields.Contains(fieldName);
    }

    /// <summary>
    /// Checks if a collection mutation is allowed (e.g., adding to StateFields).
    /// </summary>
    public static bool IsAllowedModelMutation(string propertyName)
    {
        return AllowedModelMutations.Contains(propertyName);
    }
}
