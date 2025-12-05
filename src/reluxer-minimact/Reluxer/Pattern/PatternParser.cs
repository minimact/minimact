using Reluxer.Tokens;

namespace Reluxer.Pattern;

/// <summary>
/// Parses the token pattern DSL into a pattern AST.
///
/// Grammar:
///   pattern     = sequence
///   sequence    = element+
///   element     = (group | alternation | atom) quantifier?
///   group       = '(' pattern ')' | '(?:' pattern ')'
///   alternation = '[' pattern ('|' pattern)* ']'
///   atom        = tokenType | any | literal
///   tokenType   = '\' char literal?
///   any         = '.'
///   literal     = '"' chars '"'
///   quantifier  = '*' | '+' | '?' | '{' n '}' | '{' n ',' '}' | '{' n ',' m '}'
/// </summary>
public class PatternParser
{
    private readonly string _pattern;
    private int _position;
    private int _captureIndex;

    // Single-character token type shorthands
    private static readonly Dictionary<char, TokenType> ShorthandMap = new()
    {
        ['k'] = TokenType.Keyword,
        ['i'] = TokenType.Identifier,
        ['s'] = TokenType.String,
        ['n'] = TokenType.Number,
        ['o'] = TokenType.Operator,
        ['p'] = TokenType.Punctuation,
        ['c'] = TokenType.Comment,
        ['w'] = TokenType.Whitespace,
        ['t'] = TokenType.TemplateString,
    };

    // Two-character token type shorthands for TypeScript types
    // Note: Avoid conflicts with pattern macros (la, fc, ty, ex, te, etc.)
    private static readonly Dictionary<string, TokenType> TwoCharShorthandMap = new()
    {
        ["tn"] = TokenType.TypeName,      // \tn - type names (string, number, MyClass)
        ["cl"] = TokenType.Colon,          // \cl - : (type annotation colon)
        ["go"] = TokenType.GenericOpen,    // \go - < (generic open)
        ["gc"] = TokenType.GenericClose,   // \gc - > (generic close)
        ["qm"] = TokenType.QuestionMark,   // \qm - ? (optional marker)
        ["co"] = TokenType.Colon,          // \co - : (colon, alias for \cl)
        ["fa"] = TokenType.Arrow,          // \fa - => (function arrow in types)
        ["op"] = TokenType.TypeOperator,   // \op - typeof, keyof, infer, readonly
        ["xt"] = TokenType.Extends,        // \xt - extends (conditional types) - 'x-tends'
        ["tl"] = TokenType.TupleOpen,      // \tl - [ (tuple left bracket)
        ["tr"] = TokenType.TupleClose,     // \tr - ] (tuple right bracket)
        ["mn"] = TokenType.MappedIn,       // \mn - in (mapped types) - 'mapped in'
        ["ac"] = TokenType.AsConst,        // \ac - as const (const assertion)
        ["dc"] = TokenType.Decorator,      // \dc - @decorator

        // JSX token types
        ["jo"] = TokenType.JsxTagOpen,     // \jo - <tagName (JSX opening tag)
        ["jc"] = TokenType.JsxTagClose,    // \jc - </tagName> (JSX closing tag)
        ["js"] = TokenType.JsxTagSelfClose,// \js - /> (JSX self-closing)
        ["je"] = TokenType.JsxTagEnd,      // \je - > (JSX tag end)
        ["ja"] = TokenType.JsxAttrName,    // \ja - attribute name in JSX
        ["jv"] = TokenType.JsxAttrValue,   // \jv - attribute value in JSX
        ["jt"] = TokenType.JsxText,        // \jt - text content inside JSX
        ["jx"] = TokenType.JsxExprStart,   // \jx - { (JSX expression start)
        ["jy"] = TokenType.JsxExprEnd,     // \jy - } (JSX expression end)
    };

    // Multi-character pattern macros that expand to full patterns
    // These represent common compound structures
    // Note: Use [...|...] for alternation, (?:...) for non-capturing groups
    private static readonly Dictionary<string, string> PatternMacros = new()
    {
        // Lambda/Arrow function: () => or (params) => or x =>
        ["la"] = @"[""("" .*? "")"" | \i] ""=>""",
        ["lambda"] = @"[""("" .*? "")"" | \i] ""=>""",

        // Type annotation: : Type or : Type<Generic>
        ["ty"] = @""":"" \i (?:""<"" .*? "">"")?",
        ["type"] = @""":"" \i (?:""<"" .*? "">"")?",

        // Generic type parameters: <T> or <T, U>
        ["ge"] = @"""<"" \i (?:"","" \i)* "">""",
        ["generic"] = @"""<"" \i (?:"","" \i)* "">""",

        // Function call: name(args)
        ["fc"] = @"\i ""("" .*? "")""",
        ["call"] = @"\i ""("" .*? "")""",

        // Array access: [index]
        ["ax"] = @"""["" .*? ""]""",
        ["array"] = @"""["" .*? ""]""",

        // Object/block: { ... }
        ["bl"] = @"""{"" .*? ""}""",
        ["block"] = @"""{"" .*? ""}""",

        // Parenthesized expression: ( ... )
        ["pa"] = @"""("" .*? "")""",
        ["parens"] = @"""("" .*? "")""",

        // Decorator/Attribute: @name or @name(args)
        ["de"] = @"""@"" \i (?:""("" .*? "")"")?",
        ["decorator"] = @"""@"" \i (?:""("" .*? "")"")?",

        // Property access chain: .name or .name.name
        ["pr"] = @"(?:""."" \i)+",
        ["prop"] = @"(?:""."" \i)+",

        // Optional chaining: ?.name
        ["oc"] = @"""?."" \i",
        ["optchain"] = @"""?."" \i",

        // Spread: ...expr
        ["sp"] = @"""..."" \i",
        ["spread"] = @"""..."" \i",

        // Destructuring array: [a, b, c]
        ["da"] = @"""["" \i (?:"","" \i)* ""]""",
        ["destarray"] = @"""["" \i (?:"","" \i)* ""]""",

        // Destructuring object: {a, b, c}
        ["do"] = @"""{"" \i (?:"","" \i)* ""}""",
        ["destobj"] = @"""{"" \i (?:"","" \i)* ""}""",

        // Ternary: ? expr : expr
        ["te"] = @"""?"" .*? "":""",
        ["ternary"] = @"""?"" .*? "":""",

        // Import statement: import X from "Y"
        ["im"] = @"\k""import"" .*? \k""from"" \s",
        ["import"] = @"\k""import"" .*? \k""from"" \s",

        // Export: export (default)?
        ["ex"] = @"\k""export"" (?:\k""default"")?",
        ["export"] = @"\k""export"" (?:\k""default"")?",

        // Async function: async function or async () =>
        ["af"] = @"\k""async"" [\k""function"" | [""("" .*? "")"" | \i] ""=>""]",
        ["async"] = @"\k""async"" [\k""function"" | [""("" .*? "")"" | \i] ""=>""]",

        // Await expression: await expr
        ["aw"] = @"\k""await"" [\fc | \i]",
        ["await"] = @"\k""await"" [\fc | \i]",

        // Balanced bracket matching macros - use \B prefix with bracket type
        // These match balanced pairs including nested content
        // \Bp - balanced parentheses: ( ... )
        // \Bb - balanced braces: { ... }
        // \Bk - balanced brackets: [ ... ]
        // \Ba - balanced angle brackets: < ... >
        // \Bc - balanced until comma (at depth 0)
        // \Bs - balanced until semicolon (at depth 0)
        // \Bj - balanced JSX content (between > and </tag)
    };

    public PatternParser(string pattern)
    {
        _pattern = ExpandMacros(pattern);
        _position = 0;
        _captureIndex = 0;
    }

    /// <summary>
    /// Expands pattern macros like \la, \ty, \ge into their full patterns.
    /// </summary>
    private static string ExpandMacros(string pattern)
    {
        // Keep expanding until no more macros are found (handles nested macros like \aw using \fc)
        string result = pattern;
        int maxIterations = 10; // Prevent infinite loops

        for (int i = 0; i < maxIterations; i++)
        {
            string expanded = ExpandMacrosOnce(result);
            if (expanded == result) break;
            result = expanded;
        }

        return result;
    }

    private static string ExpandMacrosOnce(string pattern)
    {
        var result = new System.Text.StringBuilder();
        int i = 0;

        while (i < pattern.Length)
        {
            if (pattern[i] == '\\' && i + 1 < pattern.Length)
            {
                // Check for multi-character macro
                int macroStart = i + 1;
                int macroEnd = macroStart;

                // Read identifier characters
                while (macroEnd < pattern.Length && char.IsLetter(pattern[macroEnd]))
                {
                    macroEnd++;
                }

                string macroName = pattern[macroStart..macroEnd];

                // Check if it's a known macro (and not a single-char shorthand)
                if (macroName.Length > 1 && PatternMacros.TryGetValue(macroName, out var expansion))
                {
                    result.Append("(?:");
                    result.Append(expansion);
                    result.Append(')');
                    i = macroEnd;
                    continue;
                }
            }

            result.Append(pattern[i]);
            i++;
        }

        return result.ToString();
    }

    /// <summary>
    /// Parses the pattern string and returns the AST root.
    /// </summary>
    public PatternNode Parse()
    {
        var result = ParseSequence();
        if (!IsAtEnd())
        {
            throw new PatternParseException($"Unexpected character at position {_position}: '{Peek()}'");
        }
        return result;
    }

    private PatternNode ParseSequence()
    {
        var nodes = new List<PatternNode>();

        while (!IsAtEnd() && Peek() != ')' && Peek() != ']' && Peek() != '|')
        {
            SkipWhitespace();
            if (IsAtEnd() || Peek() == ')' || Peek() == ']' || Peek() == '|') break;

            var element = ParseElement();
            if (element != null)
            {
                nodes.Add(element);
            }
        }

        return nodes.Count == 1 ? nodes[0] : new SequenceNode(nodes);
    }

    private PatternNode? ParseElement()
    {
        PatternNode? node = null;

        char c = Peek();

        if (c == '(')
        {
            node = ParseGroup();
        }
        else if (c == '[')
        {
            node = ParseAlternation();
        }
        else
        {
            node = ParseAtom();
        }

        if (node != null)
        {
            node = TryParseQuantifier(node);
        }

        return node;
    }

    private PatternNode ParseGroup()
    {
        Expect('(');

        bool capturing = true;
        string? name = null;

        // Check for non-capturing (?:...), named (?<name>...), or assertions
        if (Peek() == '?')
        {
            Advance();
            char next = Peek();

            if (next == ':')
            {
                // Non-capturing group: (?:...)
                Advance();
                capturing = false;
            }
            else if (next == '=')
            {
                // Positive lookahead: (?=...)
                Advance();
                var inner = ParseSequence();
                Expect(')');
                return new LookaheadNode(inner, positive: true);
            }
            else if (next == '!')
            {
                // Negative lookahead: (?!...)
                Advance();
                var inner = ParseSequence();
                Expect(')');
                return new LookaheadNode(inner, positive: false);
            }
            else if (next == '<')
            {
                Advance();
                char afterLt = Peek();

                if (afterLt == '=')
                {
                    // Positive lookbehind: (?<=...)
                    Advance();
                    var inner = ParseSequence();
                    Expect(')');
                    return new LookbehindNode(inner, positive: true);
                }
                else if (afterLt == '!')
                {
                    // Negative lookbehind: (?<!...)
                    Advance();
                    var inner = ParseSequence();
                    Expect(')');
                    return new LookbehindNode(inner, positive: false);
                }
                else
                {
                    // Named capture group: (?<name>...)
                    name = ReadUntil('>');
                    Expect('>');
                }
            }
        }

        var innerPattern = ParseSequence();

        Expect(')');

        if (capturing)
        {
            var captureIndex = _captureIndex++;

            // Special handling: if the inner pattern is a balanced/JSX node,
            // set up capturing on the node itself rather than wrapping it.
            // This allows (\Bp), (\Bj), (\Je), etc. to capture content directly.
            if (innerPattern is BalancedMatchNode balanced)
            {
                balanced.CaptureContent = true;
                balanced.CaptureIndex = captureIndex;
                return balanced;
            }

            if (innerPattern is BalancedUntilNode balancedUntil)
            {
                balancedUntil.CaptureContent = true;
                balancedUntil.CaptureIndex = captureIndex;
                return balancedUntil;
            }

            if (innerPattern is BalancedJsxContentNode balancedJsx)
            {
                balancedJsx.CaptureContent = true;
                balancedJsx.CaptureIndex = captureIndex;
                return balancedJsx;
            }

            if (innerPattern is JsxElementCompleteNode jsxComplete)
            {
                jsxComplete.CaptureContent = true;
                jsxComplete.CaptureIndex = captureIndex;
                return jsxComplete;
            }

            return new GroupNode(innerPattern, captureIndex, name);
        }
        else
        {
            return innerPattern; // Non-capturing, just return the inner pattern
        }
    }

    private PatternNode ParseAlternation()
    {
        Expect('[');

        var alternatives = new List<PatternNode>();
        alternatives.Add(ParseSequence());

        while (Peek() == '|')
        {
            Advance();
            alternatives.Add(ParseSequence());
        }

        Expect(']');

        return new AlternationNode(alternatives);
    }

    private PatternNode? ParseAtom()
    {
        char c = Peek();

        // Token type shorthand: \k, \i, \s, etc. OR two-char: \tn, \co, etc. OR backreference: \1, \2 OR named backref: \k<name>
        if (c == '\\')
        {
            Advance();
            char typeChar = Peek();

            // Backreference: \1, \2, etc.
            if (char.IsDigit(typeChar))
            {
                return ParseBackreference();
            }

            // Named backreference: \k<name>
            if (typeChar == 'k' && _position + 1 < _pattern.Length && _pattern[_position + 1] == '<')
            {
                Advance(); // consume 'k'
                Advance(); // consume '<'
                var name = ReadUntil('>');
                Expect('>');
                return new NamedBackreferenceNode(name);
            }

            // JSX Element Complete: \Je - matches any complete JSX element
            if (typeChar == 'J' && _position + 1 < _pattern.Length && _pattern[_position + 1] == 'e')
            {
                Advance(); // consume 'J'
                Advance(); // consume 'e'
                return new JsxElementCompleteNode();
            }

            // Balanced bracket matching: \Bp, \Bb, \Bk, \Ba
            // Balanced until separator: \Bc (comma), \Bs (semicolon)
            if (typeChar == 'B' && _position + 1 < _pattern.Length)
            {
                Advance(); // consume 'B'
                char bracketType = Peek();
                Advance(); // consume bracket type

                return bracketType switch
                {
                    'p' => new BalancedMatchNode(
                        new LiteralNode("("),
                        new LiteralNode(")"),
                        AnyNode.Instance),
                    'b' => new BalancedMatchNode(
                        new LiteralNode("{"),
                        new LiteralNode("}"),
                        AnyNode.Instance),
                    'k' => new BalancedMatchNode(
                        new LiteralNode("["),
                        new LiteralNode("]"),
                        AnyNode.Instance),
                    'a' => new BalancedMatchNode(
                        new LiteralNode("<"),
                        new LiteralNode(">"),
                        AnyNode.Instance),
                    // Balanced until separator - matches content until separator at depth 0
                    'c' => new BalancedUntilNode(
                        new LiteralNode(","),
                        new LiteralNode("}"), new LiteralNode("]"), new LiteralNode(")")),
                    's' => new BalancedUntilNode(
                        new LiteralNode(";"),
                        new LiteralNode("}")),
                    // Balanced JSX content - matches content between > and </tag
                    'j' => new BalancedJsxContentNode(),
                    _ => throw new PatternParseException($"Unknown balanced type: \\B{bracketType}. Use p, b, k, a, c, s, or j.")
                };
            }

            // Check for two-character shorthands first: \tn, \co, \go, \gc, \qm, \ar
            if (_position + 1 < _pattern.Length)
            {
                string twoChar = _pattern.Substring(_position, 2);
                if (TwoCharShorthandMap.TryGetValue(twoChar, out var twoCharTokenType))
                {
                    Advance(); // consume first char
                    Advance(); // consume second char

                    // Check for literal value: \tn"string"
                    string? value = null;
                    if (Peek() == '"')
                    {
                        value = ParseLiteralValue();
                    }

                    return new TokenMatchNode(twoCharTokenType, value);
                }
            }

            Advance(); // consume the type char

            if (!ShorthandMap.TryGetValue(typeChar, out var tokenType))
            {
                throw new PatternParseException($"Unknown token type shorthand: \\{typeChar}");
            }

            // Check for literal value: \k"const"
            string? value2 = null;
            if (Peek() == '"')
            {
                value2 = ParseLiteralValue();
            }

            return new TokenMatchNode(tokenType, value2);
        }

        // Any token: .
        if (c == '.')
        {
            Advance();
            return AnyNode.Instance;
        }

        // Literal value: "value"
        if (c == '"')
        {
            var value = ParseLiteralValue();
            return new LiteralNode(value);
        }

        // JSX-specific shortcuts
        if (c == '<')
        {
            return ParseJsxShorthand();
        }

        return null;
    }

    private PatternNode ParseBackreference()
    {
        int groupIndex = ReadInt();

        // Check for depth constraint: @0, @+1, @-1
        DepthConstraint? depth = null;
        if (Peek() == '@')
        {
            Advance();
            depth = ParseDepthConstraint();
        }

        return new BackreferenceNode(groupIndex, depth);
    }

    private DepthConstraint ParseDepthConstraint()
    {
        bool isRelative = false;
        int sign = 1;

        if (Peek() == '+')
        {
            Advance();
            isRelative = true;
            sign = 1;
        }
        else if (Peek() == '-')
        {
            Advance();
            isRelative = true;
            sign = -1;
        }

        int value = ReadInt() * sign;
        return new DepthConstraint(value, isRelative);
    }

    private PatternNode? ParseJsxShorthand()
    {
        int start = _position;

        Advance(); // consume '<'

        if (Peek() == '/')
        {
            // Closing tag shorthand: </name> or </\1> or </\1@0>
            Advance(); // consume '/'

            if (Peek() == '\\')
            {
                // Backreference closing tag: </\1> or </\1@0>
                Advance(); // consume '\'
                var backref = ParseBackreference();
                if (Peek() == '>') Advance();

                // Return a special closing tag backreference node
                return new JsxCloseBackrefNode((BackreferenceNode)backref);
            }

            // Regular closing tag: </name>
            var name = ReadIdentifier();
            if (Peek() == '>') Advance();
            return new TokenMatchNode(TokenType.JsxTagClose, $"</{name}>");
        }

        // Check for JSX element syntax: <(tagCapture) ... > ... </\1>
        if (Peek() == '(')
        {
            return ParseJsxElementPattern(start);
        }

        // Opening tag shorthand: <name
        var tagName = ReadIdentifier();
        if (string.IsNullOrEmpty(tagName))
        {
            // Not a valid JSX shorthand, backtrack
            _position = start;
            return null;
        }

        return new TokenMatchNode(TokenType.JsxTagOpen, $"<{tagName}");
    }

    private PatternNode ParseJsxElementPattern(int start)
    {
        // Parse: <(\i) (attrs)?> (children)? </\1@0>
        // This is a high-level JSX element pattern

        Expect('(');
        var tagPattern = ParseSequence();
        Expect(')');

        var jsxElement = new JsxElementNode(_captureIndex++);

        // Store tag pattern as a capture
        var tagCapture = new GroupNode(tagPattern, jsxElement.TagNameCaptureIndex);

        // Parse optional attributes pattern
        SkipWhitespace();
        PatternNode? attrsPattern = null;
        if (Peek() == '(')
        {
            Expect('(');
            attrsPattern = ParseSequence();
            Expect(')');
            jsxElement.AttributesPattern = attrsPattern;
        }

        // Expect > for tag end
        SkipWhitespace();
        if (Peek() == '>')
        {
            Advance();
        }

        // Parse optional children pattern
        SkipWhitespace();
        if (Peek() == '(')
        {
            Expect('(');
            jsxElement.ChildrenPattern = ParseSequence();
            Expect(')');
            jsxElement.CaptureChildren = true;
            jsxElement.ChildrenCaptureIndex = _captureIndex++;
        }

        // Expect closing tag </\1> or </\1@0>
        SkipWhitespace();
        if (Peek() == '<' && PeekAt(1) == '/')
        {
            Advance(); // <
            Advance(); // /
            if (Peek() == '\\')
            {
                Advance();
                ParseBackreference(); // consume but we already know it refs the tag
            }
            if (Peek() == '>') Advance();
        }

        return jsxElement;
    }

    private char PeekAt(int offset)
    {
        int pos = _position + offset;
        return pos < _pattern.Length ? _pattern[pos] : '\0';
    }

    private string ParseLiteralValue()
    {
        Expect('"');
        var value = ReadUntil('"');
        Expect('"');
        return value;
    }

    private PatternNode TryParseQuantifier(PatternNode node)
    {
        if (IsAtEnd()) return node;

        char c = Peek();
        bool greedy = true;

        PatternNode? result = null;

        // Check if the node contains capturing groups - if so, enable repetition collection
        bool hasCapturingGroups = ContainsCapturingGroup(node);

        switch (c)
        {
            case '*':
                Advance();
                if (Peek() == '?') { Advance(); greedy = false; }
                result = QuantifierNode.ZeroOrMore(node, greedy, collectRepetitions: hasCapturingGroups);
                break;

            case '+':
                Advance();
                if (Peek() == '?') { Advance(); greedy = false; }
                result = QuantifierNode.OneOrMore(node, greedy, collectRepetitions: hasCapturingGroups);
                break;

            case '?':
                Advance();
                if (Peek() == '?') { Advance(); greedy = false; }
                result = QuantifierNode.ZeroOrOne(node, greedy);
                break;

            case '{':
                result = ParseBraceQuantifier(node);
                break;

            default:
                return node;
        }

        return result ?? node;
    }

    /// <summary>
    /// Checks if a pattern node contains any capturing groups.
    /// </summary>
    private static bool ContainsCapturingGroup(PatternNode node)
    {
        return node switch
        {
            GroupNode group => group.Capturing || ContainsCapturingGroup(group.Child),
            SequenceNode seq => seq.Children.Any(ContainsCapturingGroup),
            AlternationNode alt => alt.Alternatives.Any(ContainsCapturingGroup),
            QuantifierNode quant => ContainsCapturingGroup(quant.Child),
            _ => false
        };
    }

    private PatternNode ParseBraceQuantifier(PatternNode node)
    {
        Expect('{');
        SkipWhitespace();

        int min = ReadInt();
        int max = min;

        SkipWhitespace();

        if (Peek() == ',')
        {
            Advance();
            SkipWhitespace();

            if (Peek() == '}')
            {
                max = -1; // unlimited
            }
            else
            {
                max = ReadInt();
            }
        }

        SkipWhitespace();
        Expect('}');

        bool greedy = true;
        if (Peek() == '?')
        {
            Advance();
            greedy = false;
        }

        // Enable repetition collection for brace quantifiers that can repeat and contain captures
        bool canRepeat = max != 1;
        bool hasCapturingGroups = ContainsCapturingGroup(node);

        return new QuantifierNode(node, min, max, greedy, collectRepetitions: canRepeat && hasCapturingGroups);
    }

    private string ReadIdentifier()
    {
        int start = _position;
        while (!IsAtEnd() && (char.IsLetterOrDigit(Peek()) || Peek() == '_' || Peek() == '$' || Peek() == '.'))
        {
            Advance();
        }
        return _pattern[start.._position];
    }

    private string ReadUntil(char terminator)
    {
        int start = _position;
        while (!IsAtEnd() && Peek() != terminator)
        {
            if (Peek() == '\\' && _position + 1 < _pattern.Length)
            {
                Advance(); // skip escape
            }
            Advance();
        }
        return _pattern[start.._position];
    }

    private int ReadInt()
    {
        int start = _position;
        while (!IsAtEnd() && char.IsDigit(Peek()))
        {
            Advance();
        }
        var numStr = _pattern[start.._position];
        return int.TryParse(numStr, out var n) ? n : 0;
    }

    private void SkipWhitespace()
    {
        while (!IsAtEnd() && char.IsWhiteSpace(Peek()))
        {
            Advance();
        }
    }

    private void Expect(char c)
    {
        if (Peek() != c)
        {
            throw new PatternParseException($"Expected '{c}' at position {_position}, got '{Peek()}'");
        }
        Advance();
    }

    private bool IsAtEnd() => _position >= _pattern.Length;
    private char Peek() => IsAtEnd() ? '\0' : _pattern[_position];
    private char Advance() => _pattern[_position++];
}

public class PatternParseException : Exception
{
    public PatternParseException(string message) : base(message) { }
}
