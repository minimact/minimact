using Reluxer.Tokens;

namespace Reluxer.Pattern;

/// <summary>
/// Base class for pattern AST nodes.
/// </summary>
public abstract class PatternNode
{
    public abstract PatternNodeType NodeType { get; }
}

public enum PatternNodeType
{
    Sequence,       // A sequence of patterns
    TokenMatch,     // Match a specific token type/value
    Any,            // Match any token (.)
    Quantifier,     // *, +, ?, {n,m}
    Group,          // Capture group
    Alternation,    // [a|b|c]
    Literal,        // Exact value match
    Backreference,  // \1, \2, etc. - reference to captured group
    BalancedMatch,  // Depth-aware matching for nested structures
    BalancedUntil,  // Match until separator at depth 0 (\Bc for comma)
    JsxElementComplete, // \Je - matches any complete JSX element with depth tracking
    JsxElement,     // High-level JSX element matching with depth tracking
    BalancedJsxContent, // \Bj - matches JSX content between > and </tag>
    JsxCloseBackref, // </\1> - closing tag that matches a captured opening tag
    Lookahead,      // (?=...) positive or (?!...) negative lookahead
    Lookbehind,     // (?<=...) positive or (?<!...) negative lookbehind
    NamedBackref    // \k<name> - reference to named capture group
}

/// <summary>
/// Represents a sequence of patterns that must match in order.
/// </summary>
public class SequenceNode : PatternNode
{
    public override PatternNodeType NodeType => PatternNodeType.Sequence;
    public List<PatternNode> Children { get; } = new();

    public SequenceNode() { }
    public SequenceNode(IEnumerable<PatternNode> children) => Children.AddRange(children);
}

/// <summary>
/// Matches a specific token type, optionally with a specific value.
/// Example: \k matches any keyword, \k"const" matches keyword "const"
/// </summary>
public class TokenMatchNode : PatternNode
{
    public override PatternNodeType NodeType => PatternNodeType.TokenMatch;
    public TokenType TokenType { get; set; }
    public string? Value { get; set; }

    public TokenMatchNode(TokenType type, string? value = null)
    {
        TokenType = type;
        Value = value;
    }
}

/// <summary>
/// Matches any single token (.)
/// </summary>
public class AnyNode : PatternNode
{
    public override PatternNodeType NodeType => PatternNodeType.Any;
    public static AnyNode Instance { get; } = new();
}

/// <summary>
/// Applies a quantifier to a child pattern.
/// </summary>
public class QuantifierNode : PatternNode
{
    public override PatternNodeType NodeType => PatternNodeType.Quantifier;
    public PatternNode Child { get; set; }
    public int Min { get; set; }
    public int Max { get; set; } // -1 means unlimited
    public bool Greedy { get; set; } = true;

    /// <summary>
    /// When true, captures inside this quantifier will collect each repetition
    /// into the Repetitions list of TokenCapture.
    /// Enabled by default for quantifiers that can match multiple times (+ and *).
    /// </summary>
    public bool CollectRepetitions { get; set; } = false;

    public QuantifierNode(PatternNode child, int min, int max, bool greedy = true, bool collectRepetitions = false)
    {
        Child = child;
        Min = min;
        Max = max;
        Greedy = greedy;
        CollectRepetitions = collectRepetitions;
    }

    // Factory methods
    public static QuantifierNode ZeroOrMore(PatternNode child, bool greedy = true, bool collectRepetitions = false) => new(child, 0, -1, greedy, collectRepetitions);
    public static QuantifierNode OneOrMore(PatternNode child, bool greedy = true, bool collectRepetitions = false) => new(child, 1, -1, greedy, collectRepetitions);
    public static QuantifierNode ZeroOrOne(PatternNode child, bool greedy = true) => new(child, 0, 1, greedy);
    public static QuantifierNode Exactly(PatternNode child, int n) => new(child, n, n);
    public static QuantifierNode AtLeast(PatternNode child, int n, bool greedy = true, bool collectRepetitions = false) => new(child, n, -1, greedy, collectRepetitions);
    public static QuantifierNode Between(PatternNode child, int min, int max, bool greedy = true, bool collectRepetitions = false) => new(child, min, max, greedy, collectRepetitions);
}

/// <summary>
/// Capture group that stores matched tokens.
/// </summary>
public class GroupNode : PatternNode
{
    public override PatternNodeType NodeType => PatternNodeType.Group;
    public PatternNode Child { get; set; }
    public int Index { get; set; }
    public string? Name { get; set; }
    public bool Capturing { get; set; } = true;

    public GroupNode(PatternNode child, int index, string? name = null, bool capturing = true)
    {
        Child = child;
        Index = index;
        Name = name;
        Capturing = capturing;
    }
}

/// <summary>
/// Alternation: matches one of several alternatives.
/// Example: [\k|\i] matches keyword OR identifier
/// </summary>
public class AlternationNode : PatternNode
{
    public override PatternNodeType NodeType => PatternNodeType.Alternation;
    public List<PatternNode> Alternatives { get; } = new();

    public AlternationNode() { }
    public AlternationNode(IEnumerable<PatternNode> alternatives) => Alternatives.AddRange(alternatives);
}

/// <summary>
/// Matches an exact literal value (any token with that value).
/// Example: "function" matches any token with value "function"
/// </summary>
public class LiteralNode : PatternNode
{
    public override PatternNodeType NodeType => PatternNodeType.Literal;
    public string Value { get; set; }

    public LiteralNode(string value) => Value = value;
}

/// <summary>
/// Backreference to a previously captured group.
/// Example: \1 matches the same value as capture group 1
/// </summary>
public class BackreferenceNode : PatternNode
{
    public override PatternNodeType NodeType => PatternNodeType.Backreference;

    /// <summary>
    /// The capture group index to reference (1-based)
    /// </summary>
    public int GroupIndex { get; set; }

    /// <summary>
    /// Optional depth constraint: @0 means "at depth 0", @+1 means "one level deeper"
    /// null means no depth constraint
    /// </summary>
    public DepthConstraint? Depth { get; set; }

    public BackreferenceNode(int groupIndex, DepthConstraint? depth = null)
    {
        GroupIndex = groupIndex;
        Depth = depth;
    }
}

/// <summary>
/// Represents a depth constraint for balanced matching.
/// </summary>
public class DepthConstraint
{
    /// <summary>
    /// The target depth (absolute or relative based on IsRelative)
    /// </summary>
    public int Value { get; set; }

    /// <summary>
    /// If true, Value is relative to the opening tag's depth (+1, -1, etc.)
    /// If false, Value is an absolute depth (0 = root level)
    /// </summary>
    public bool IsRelative { get; set; }

    public DepthConstraint(int value, bool isRelative = false)
    {
        Value = value;
        IsRelative = isRelative;
    }

    public static DepthConstraint Absolute(int depth) => new(depth, false);
    public static DepthConstraint Relative(int offset) => new(offset, true);
    public static DepthConstraint SameLevel => new(0, true);
    public static DepthConstraint RootLevel => new(0, false);
}

/// <summary>
/// Matches balanced/nested content between open and close markers.
/// Tracks depth to ensure proper matching of nested structures.
/// Example: Match everything between matching JSX tags
/// </summary>
public class BalancedMatchNode : PatternNode
{
    public override PatternNodeType NodeType => PatternNodeType.BalancedMatch;

    /// <summary>
    /// Pattern that opens a nested level (increases depth)
    /// </summary>
    public PatternNode OpenPattern { get; set; }

    /// <summary>
    /// Pattern that closes a nested level (decreases depth)
    /// </summary>
    public PatternNode ClosePattern { get; set; }

    /// <summary>
    /// Pattern to match for content inside (typically .*)
    /// </summary>
    public PatternNode? ContentPattern { get; set; }

    /// <summary>
    /// If true, the close pattern must match a backreference (e.g., tag name)
    /// </summary>
    public int? CloseBackref { get; set; }

    /// <summary>
    /// If true, captures the content between open and close (excluding delimiters)
    /// </summary>
    public bool CaptureContent { get; set; }

    /// <summary>
    /// Capture group index for the content (if CaptureContent is true)
    /// </summary>
    public int CaptureIndex { get; set; } = -1;

    public BalancedMatchNode(PatternNode open, PatternNode close, PatternNode? content = null, int? closeBackref = null)
    {
        OpenPattern = open;
        ClosePattern = close;
        ContentPattern = content;
        CloseBackref = closeBackref;
    }
}

/// <summary>
/// Matches content until a separator is found at depth 0.
/// Tracks bracket depth for (, ), {, }, [, ].
/// Used for \Bc (balanced until comma) - matches value in key: value, pairs.
/// </summary>
public class BalancedUntilNode : PatternNode
{
    public override PatternNodeType NodeType => PatternNodeType.BalancedUntil;

    /// <summary>
    /// The separator pattern to stop at (when at depth 0).
    /// Typically a comma for object literals.
    /// </summary>
    public PatternNode SeparatorPattern { get; set; }

    /// <summary>
    /// Additional terminator patterns that also stop matching (when at depth 0).
    /// For example, } to stop at end of object literal.
    /// </summary>
    public PatternNode[] TerminatorPatterns { get; set; }

    /// <summary>
    /// If true, captures the matched content
    /// </summary>
    public bool CaptureContent { get; set; }

    /// <summary>
    /// Capture group index for the content (if CaptureContent is true)
    /// </summary>
    public int CaptureIndex { get; set; } = -1;

    public BalancedUntilNode(PatternNode separator, params PatternNode[] terminators)
    {
        SeparatorPattern = separator;
        TerminatorPatterns = terminators;
    }
}

/// <summary>
/// Simple node for matching any complete JSX element with depth tracking.
/// Used by \Je macro - matches from opening tag to matching closing tag.
/// Handles both regular elements and self-closing elements.
/// </summary>
public class JsxElementCompleteNode : PatternNode
{
    public override PatternNodeType NodeType => PatternNodeType.JsxElementComplete;

    /// <summary>
    /// If true, captures the entire element content
    /// </summary>
    public bool CaptureContent { get; set; }

    /// <summary>
    /// Capture group index for the content (if CaptureContent is true)
    /// </summary>
    public int CaptureIndex { get; set; } = -1;
}

/// <summary>
/// Matches JSX content between > (tag end) and the matching closing tag.
/// Tracks JSX depth to find the correct closing tag.
/// Used by \Bj macro - starts after JsxTagEnd and captures until closing tag.
/// </summary>
public class BalancedJsxContentNode : PatternNode
{
    public override PatternNodeType NodeType => PatternNodeType.BalancedJsxContent;

    /// <summary>
    /// If true, captures the matched content (excluding the closing tag)
    /// </summary>
    public bool CaptureContent { get; set; }

    /// <summary>
    /// Capture group index for the content (if CaptureContent is true)
    /// </summary>
    public int CaptureIndex { get; set; } = -1;
}

/// <summary>
/// High-level node for matching complete JSX elements with depth tracking.
/// Handles: &lt;tag attrs&gt;children&lt;/tag&gt; or &lt;tag attrs /&gt;
/// </summary>
public class JsxElementNode : PatternNode
{
    public override PatternNodeType NodeType => PatternNodeType.JsxElement;

    /// <summary>
    /// Capture group index for the tag name (or -1 for any tag)
    /// </summary>
    public int TagNameCaptureIndex { get; set; }

    /// <summary>
    /// Pattern for matching attributes (null = skip attributes)
    /// </summary>
    public PatternNode? AttributesPattern { get; set; }

    /// <summary>
    /// Pattern for matching children/content (null = skip content)
    /// </summary>
    public PatternNode? ChildrenPattern { get; set; }

    /// <summary>
    /// If true, captures children as a group
    /// </summary>
    public bool CaptureChildren { get; set; }

    /// <summary>
    /// Capture index for children if CaptureChildren is true
    /// </summary>
    public int ChildrenCaptureIndex { get; set; }

    public JsxElementNode(int tagNameCaptureIndex = -1)
    {
        TagNameCaptureIndex = tagNameCaptureIndex;
    }
}

/// <summary>
/// Matches a JSX closing tag that references a captured opening tag.
/// Example: &lt;/\1&gt; matches closing tag whose name equals capture group 1
/// Example: &lt;/\1@0&gt; matches only when depth returns to 0
/// </summary>
public class JsxCloseBackrefNode : PatternNode
{
    public override PatternNodeType NodeType => PatternNodeType.JsxCloseBackref;

    /// <summary>
    /// The backreference containing group index and depth constraint
    /// </summary>
    public BackreferenceNode Backref { get; set; }

    public JsxCloseBackrefNode(BackreferenceNode backref)
    {
        Backref = backref;
    }

    /// <summary>
    /// The capture group index to match against (1-based)
    /// </summary>
    public int GroupIndex => Backref.GroupIndex;

    /// <summary>
    /// Optional depth constraint
    /// </summary>
    public DepthConstraint? Depth => Backref.Depth;
}

/// <summary>
/// Lookahead assertion: matches if the child pattern matches ahead without consuming input.
/// (?=...) - positive lookahead: succeeds if pattern matches
/// (?!...) - negative lookahead: succeeds if pattern does NOT match
/// </summary>
public class LookaheadNode : PatternNode
{
    public override PatternNodeType NodeType => PatternNodeType.Lookahead;

    /// <summary>
    /// The pattern to look ahead for.
    /// </summary>
    public PatternNode Child { get; set; }

    /// <summary>
    /// If true, this is a positive lookahead (pattern must match).
    /// If false, this is a negative lookahead (pattern must NOT match).
    /// </summary>
    public bool Positive { get; set; }

    public LookaheadNode(PatternNode child, bool positive = true)
    {
        Child = child;
        Positive = positive;
    }
}

/// <summary>
/// Lookbehind assertion: matches if the child pattern matches behind without consuming input.
/// (?&lt;=...) - positive lookbehind: succeeds if pattern matches
/// (?&lt;!...) - negative lookbehind: succeeds if pattern does NOT match
/// </summary>
public class LookbehindNode : PatternNode
{
    public override PatternNodeType NodeType => PatternNodeType.Lookbehind;

    /// <summary>
    /// The pattern to look behind for.
    /// </summary>
    public PatternNode Child { get; set; }

    /// <summary>
    /// If true, this is a positive lookbehind (pattern must match).
    /// If false, this is a negative lookbehind (pattern must NOT match).
    /// </summary>
    public bool Positive { get; set; }

    public LookbehindNode(PatternNode child, bool positive = true)
    {
        Child = child;
        Positive = positive;
    }
}

/// <summary>
/// Named backreference: \k&lt;name&gt; references a named capture group.
/// </summary>
public class NamedBackreferenceNode : PatternNode
{
    public override PatternNodeType NodeType => PatternNodeType.NamedBackref;

    /// <summary>
    /// The name of the capture group to reference.
    /// </summary>
    public string Name { get; set; }

    public NamedBackreferenceNode(string name)
    {
        Name = name;
    }
}
