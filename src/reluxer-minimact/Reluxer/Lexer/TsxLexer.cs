using Reluxer.Tokens;

namespace Reluxer.Lexer;

/// <summary>
/// Lexer for TSX/JSX source code.
/// Tokenizes JavaScript/TypeScript with JSX support.
///
/// Uses a state machine to properly handle:
/// - JSX tags and attributes
/// - JSX children (text between tags)
/// - JSX expressions ({...} blocks)
/// - Nested JSX within expressions
/// - TypeScript type annotations
/// </summary>
public class TsxLexer
{
    private readonly string _source;
    private int _position;
    private int _line = 1;
    private int _column = 1;

    // State machine for JSX parsing
    private enum LexerState
    {
        JavaScript,      // Normal JS/TS code
        JsxTagOpen,      // Inside opening tag: <div ...>
        JsxTagClose,     // Inside closing tag: </div>
        JsxChildren,     // Between tags: <div>...children...</div>
        JsxExpression,   // Inside expression: {expr}
        TypeAnnotation,  // After : in type annotation context
        GenericParams,   // Inside <T, U> generic parameters
    }

    // Stack of states to handle nesting
    private readonly Stack<LexerState> _stateStack = new();
    private LexerState _state = LexerState.JavaScript;

    // Track JSX tag depth for balanced matching
    private int _jsxDepth = 0;

    // Track brace depth within JSX expressions for proper nesting
    private int _expressionBraceDepth = 0;

    // Track generic angle bracket depth
    private int _genericDepth = 0;

    // Track brace/bracket/paren depth within type annotations for object types, tuples, and function types
    private int _typeBraceDepth = 0;
    private int _typeBracketDepth = 0;
    private int _typeParenDepth = 0;

    // Track last token for context-sensitive lexing
    private TokenType _lastTokenType = TokenType.Unknown;
    private string _lastTokenValue = "";

    // Track if we're after 'type' keyword for type alias context
    private bool _afterTypeKeyword = false;

    private static readonly HashSet<string> Keywords = new()
    {
        "break", "case", "catch", "class", "const", "continue", "debugger",
        "default", "delete", "do", "else", "enum", "export", "extends",
        "false", "finally", "for", "function", "if", "import", "in",
        "instanceof", "let", "new", "null", "return", "static", "super",
        "switch", "this", "throw", "true", "try", "typeof", "undefined",
        "var", "void", "while", "with", "yield", "async", "await",
        "implements", "interface", "package", "private", "protected", "public",
        "as", "from", "type", "namespace", "module", "declare", "readonly"
    };

    // Built-in TypeScript type names
    private static readonly HashSet<string> BuiltInTypes = new()
    {
        "string", "number", "boolean", "void", "null", "undefined",
        "any", "unknown", "never", "object", "symbol", "bigint"
    };

    // TypeScript type-level operators (keywords used in type position)
    private static readonly HashSet<string> TypeOperators = new()
    {
        "typeof", "keyof", "infer", "readonly"
    };

    private static readonly HashSet<char> OperatorChars = new()
    {
        '+', '-', '*', '/', '%', '=', '<', '>', '!', '&', '|', '^', '~', '?', ':'
    };

    private static readonly HashSet<char> PunctuationChars = new()
    {
        '(', ')', '{', '}', '[', ']', ';', ',', '.'
    };

    public TsxLexer(string source)
    {
        _source = source;
        _position = 0;
    }

    /// <summary>
    /// Tokenizes the entire source and returns all tokens.
    /// </summary>
    public List<Token> Tokenize(bool includeWhitespace = false, bool includeComments = false)
    {
        var tokens = new List<Token>();

        while (!IsAtEnd())
        {
            var token = NextToken();
            if (token == null) continue;

            if (token.Type == TokenType.Whitespace && !includeWhitespace) continue;
            if (token.Type == TokenType.Comment && !includeComments) continue;

            // Track last non-whitespace token for context-sensitive lexing
            if (token.Type != TokenType.Whitespace && token.Type != TokenType.Comment)
            {
                _lastTokenType = token.Type;
                _lastTokenValue = token.Value;
            }

            tokens.Add(token);
        }

        tokens.Add(new Token(TokenType.Eof, "", _position, _position, _line, _column));
        return tokens;
    }

    private Token? NextToken()
    {
        if (IsAtEnd()) return null;

        return _state switch
        {
            LexerState.JavaScript => NextJavaScriptToken(),
            LexerState.JsxTagOpen => NextJsxTagOpenToken(),
            LexerState.JsxTagClose => NextJsxTagCloseToken(),
            LexerState.JsxChildren => NextJsxChildrenToken(),
            LexerState.JsxExpression => NextJsxExpressionToken(),
            LexerState.TypeAnnotation => NextTypeAnnotationToken(),
            LexerState.GenericParams => NextGenericParamsToken(),
            _ => NextJavaScriptToken()
        };
    }

    /// <summary>
    /// Tokenizes JavaScript/TypeScript code.
    /// </summary>
    private Token? NextJavaScriptToken()
    {
        var start = _position;
        var startLine = _line;
        var startColumn = _column;

        char c = Peek();

        // Whitespace
        if (char.IsWhiteSpace(c))
        {
            return ReadWhitespace(start, startLine, startColumn);
        }

        // Comments
        if (c == '/' && (PeekNext() == '/' || PeekNext() == '*'))
        {
            return ReadComment(start, startLine, startColumn);
        }

        // Decorators: @decorator, @Component(), @Injectable({...})
        if (c == '@')
        {
            return ReadDecorator(start, startLine, startColumn);
        }

        // Colon - check if it's a type annotation context
        if (c == ':')
        {
            Advance();
            if (IsTypeAnnotationContext())
            {
                PushState(_state);
                _state = LexerState.TypeAnnotation;
                _typeBraceDepth = 0;
                _typeBracketDepth = 0;
                _typeParenDepth = 0;
                return new Token(TokenType.Colon, ":", start, _position, startLine, startColumn);
            }
            // Otherwise treat as regular operator (ternary else, object property, etc.)
            return new Token(TokenType.Operator, ":", start, _position, startLine, startColumn);
        }

        // Generic type parameters - check if < is start of generics
        if (c == '<' && IsGenericStart())
        {
            Advance();
            PushState(_state);
            _state = LexerState.GenericParams;
            _genericDepth = 1;
            return new Token(TokenType.GenericOpen, "<", start, _position, startLine, startColumn);
        }

        // JSX start - detect opening tag
        if (c == '<' && IsJsxStart())
        {
            return StartJsxTag(start, startLine, startColumn);
        }

        // Strings
        if (c == '"' || c == '\'' || c == '`')
        {
            return ReadString(c, start, startLine, startColumn);
        }

        // Numbers
        if (char.IsDigit(c) || (c == '.' && char.IsDigit(PeekNext())))
        {
            return ReadNumber(start, startLine, startColumn);
        }

        // Identifiers and keywords
        if (IsIdentifierStart(c))
        {
            return ReadIdentifier(start, startLine, startColumn);
        }

        // Regex literal vs division operator
        // / starts a regex if preceded by: operator, punctuation (except ) and ]), keyword, or at start
        if (c == '/' && IsRegexStart())
        {
            return ReadRegex(start, startLine, startColumn);
        }

        // Operators
        if (OperatorChars.Contains(c))
        {
            return ReadOperator(start, startLine, startColumn);
        }

        // Punctuation
        if (PunctuationChars.Contains(c))
        {
            Advance();
            return new Token(TokenType.Punctuation, c.ToString(), start, _position, startLine, startColumn);
        }

        // Unknown
        Advance();
        return new Token(TokenType.Unknown, c.ToString(), start, _position, startLine, startColumn);
    }

    /// <summary>
    /// Tokenizes inside a JSX opening tag: &lt;tagName attr="value" ...&gt;
    /// </summary>
    private Token? NextJsxTagOpenToken()
    {
        var start = _position;
        var startLine = _line;
        var startColumn = _column;

        char c = Peek();

        // Whitespace
        if (char.IsWhiteSpace(c))
        {
            return ReadWhitespace(start, startLine, startColumn);
        }

        // Self-closing />
        if (c == '/' && PeekNext() == '>')
        {
            Advance();
            Advance();
            _jsxDepth--;

            // Return to previous state (could be JsxChildren, JsxExpression, or JavaScript)
            _state = PopState();

            return new Token(TokenType.JsxTagSelfClose, "/>", start, _position, startLine, startColumn);
        }

        // Tag end > - transition to children
        if (c == '>')
        {
            Advance();
            // Don't push here - the state was already pushed when we started the tag
            // Just transition to children mode; the closing tag will pop back
            _state = LexerState.JsxChildren;
            return new Token(TokenType.JsxTagEnd, ">", start, _position, startLine, startColumn);
        }

        // Expression in attribute: attr={expr}
        if (c == '{')
        {
            Advance();
            PushState(LexerState.JsxTagOpen);
            _state = LexerState.JsxExpression;
            _expressionBraceDepth = 0; // Reset for new expression
            return new Token(TokenType.JsxExprStart, "{", start, _position, startLine, startColumn);
        }

        // Attribute name
        if (IsIdentifierStart(c))
        {
            while (!IsAtEnd() && (IsIdentifierPart(Peek()) || Peek() == '-'))
            {
                Advance();
            }
            return new Token(TokenType.JsxAttrName, _source[start.._position], start, _position, startLine, startColumn);
        }

        // Operator (=)
        if (c == '=')
        {
            Advance();
            return new Token(TokenType.Operator, "=", start, _position, startLine, startColumn);
        }

        // Attribute value (string)
        if (c == '"' || c == '\'')
        {
            var quote = Advance();
            while (!IsAtEnd() && Peek() != quote)
            {
                if (Peek() == '\\') Advance();
                Advance();
            }
            if (!IsAtEnd()) Advance();
            return new Token(TokenType.JsxAttrValue, _source[start.._position], start, _position, startLine, startColumn);
        }

        // Unknown character in tag
        Advance();
        return new Token(TokenType.Unknown, c.ToString(), start, _position, startLine, startColumn);
    }

    /// <summary>
    /// Tokenizes inside a JSX closing tag: &lt;/tagName&gt;
    /// </summary>
    private Token? NextJsxTagCloseToken()
    {
        var start = _position;
        var startLine = _line;
        var startColumn = _column;

        char c = Peek();

        // Whitespace
        if (char.IsWhiteSpace(c))
        {
            return ReadWhitespace(start, startLine, startColumn);
        }

        // Tag end >
        if (c == '>')
        {
            Advance();
            _jsxDepth--;

            // Return to previous state (could be JsxChildren, JsxExpression, or JavaScript)
            _state = PopState();

            return new Token(TokenType.JsxTagEnd, ">", start, _position, startLine, startColumn);
        }

        // Tag name
        if (IsIdentifierStart(c))
        {
            while (!IsAtEnd() && (IsIdentifierPart(Peek()) || Peek() == '.'))
            {
                Advance();
            }
            return new Token(TokenType.Identifier, _source[start.._position], start, _position, startLine, startColumn);
        }

        // Unknown
        Advance();
        return new Token(TokenType.Unknown, c.ToString(), start, _position, startLine, startColumn);
    }

    /// <summary>
    /// Tokenizes JSX children (content between tags).
    /// </summary>
    private Token? NextJsxChildrenToken()
    {
        var start = _position;
        var startLine = _line;
        var startColumn = _column;

        char c = Peek();

        // New JSX tag (child element or closing tag)
        if (c == '<')
        {
            Advance();

            if (Peek() == '/')
            {
                // Closing tag
                Advance();
                _state = LexerState.JsxTagClose;

                // Read the tag name for the token
                int nameStart = _position;
                while (!IsAtEnd() && (IsIdentifierPart(Peek()) || Peek() == '.'))
                {
                    Advance();
                }
                string tagName = _source[nameStart.._position];

                return new Token(TokenType.JsxTagClose, $"</{tagName}", start, _position, startLine, startColumn);
            }
            else if (IsIdentifierStart(Peek()) || Peek() == '>')
            {
                // Opening tag (child element) or fragment <>
                // Push current state so we return to JsxChildren after this element closes
                PushState(LexerState.JsxChildren);
                _jsxDepth++;
                _state = LexerState.JsxTagOpen;

                // Read tag name
                int nameStart = _position;
                while (!IsAtEnd() && (IsIdentifierPart(Peek()) || Peek() == '.'))
                {
                    Advance();
                }
                string tagName = _source[nameStart.._position];

                return new Token(TokenType.JsxTagOpen, $"<{tagName}", start, _position, startLine, startColumn);
            }
        }

        // Expression start
        if (c == '{')
        {
            Advance();
            PushState(LexerState.JsxChildren);
            _state = LexerState.JsxExpression;
            _expressionBraceDepth = 0; // Reset for new expression
            return new Token(TokenType.JsxExprStart, "{", start, _position, startLine, startColumn);
        }

        // JSX Text (content between tags)
        // Read until we hit < or {
        while (!IsAtEnd() && Peek() != '<' && Peek() != '{')
        {
            Advance();
        }

        if (_position > start)
        {
            var text = _source[start.._position];
            // Only return if there's meaningful content
            var trimmed = text.Trim();
            if (!string.IsNullOrEmpty(trimmed))
            {
                return new Token(TokenType.JsxText, trimmed, start, _position, startLine, startColumn);
            }
            // If only whitespace, return as whitespace token
            if (!string.IsNullOrEmpty(text))
            {
                return new Token(TokenType.Whitespace, text, start, _position, startLine, startColumn);
            }
        }

        return null;
    }

    /// <summary>
    /// Tokenizes inside a JSX expression: {expr}
    /// This is essentially JavaScript mode but tracks brace depth.
    /// </summary>
    private Token? NextJsxExpressionToken()
    {
        var start = _position;
        var startLine = _line;
        var startColumn = _column;

        char c = Peek();

        // Whitespace
        if (char.IsWhiteSpace(c))
        {
            return ReadWhitespace(start, startLine, startColumn);
        }

        // Closing brace }
        if (c == '}')
        {
            Advance();

            // If we have nested braces, this is just punctuation
            if (_expressionBraceDepth > 0)
            {
                _expressionBraceDepth--;
                return new Token(TokenType.Punctuation, "}", start, _position, startLine, startColumn);
            }

            // Otherwise, this ends the JSX expression
            _state = PopState();
            return new Token(TokenType.JsxExprEnd, "}", start, _position, startLine, startColumn);
        }

        // Nested JSX inside expression: {items.map(i => <span>{i}</span>)}
        if (c == '<' && IsJsxStart())
        {
            PushState(LexerState.JsxExpression);
            return StartJsxTag(start, startLine, startColumn);
        }

        // Opening brace { - track depth for nested objects
        if (c == '{')
        {
            Advance();
            _expressionBraceDepth++;
            return new Token(TokenType.Punctuation, "{", start, _position, startLine, startColumn);
        }

        // Comments
        if (c == '/' && (PeekNext() == '/' || PeekNext() == '*'))
        {
            return ReadComment(start, startLine, startColumn);
        }

        // Strings
        if (c == '"' || c == '\'' || c == '`')
        {
            return ReadString(c, start, startLine, startColumn);
        }

        // Numbers
        if (char.IsDigit(c) || (c == '.' && char.IsDigit(PeekNext())))
        {
            return ReadNumber(start, startLine, startColumn);
        }

        // Identifiers and keywords
        if (IsIdentifierStart(c))
        {
            return ReadIdentifier(start, startLine, startColumn);
        }

        // Operators
        if (OperatorChars.Contains(c))
        {
            return ReadOperator(start, startLine, startColumn);
        }

        // Punctuation (except { and } which are handled above)
        if (PunctuationChars.Contains(c) && c != '{' && c != '}')
        {
            Advance();
            return new Token(TokenType.Punctuation, c.ToString(), start, _position, startLine, startColumn);
        }

        // Unknown
        Advance();
        return new Token(TokenType.Unknown, c.ToString(), start, _position, startLine, startColumn);
    }

    /// <summary>
    /// Starts parsing a JSX tag. Called when we see &lt; and determine it's JSX.
    /// </summary>
    private Token StartJsxTag(int start, int startLine, int startColumn)
    {
        Advance(); // consume '<'

        // Save current state before entering JSX
        if (_state == LexerState.JavaScript)
        {
            PushState(LexerState.JavaScript);
        }

        _jsxDepth++;
        _state = LexerState.JsxTagOpen;

        // Read tag name
        int nameStart = _position;
        while (!IsAtEnd() && (IsIdentifierPart(Peek()) || Peek() == '.'))
        {
            Advance();
        }
        string tagName = _source[nameStart.._position];

        return new Token(TokenType.JsxTagOpen, $"<{tagName}", start, _position, startLine, startColumn);
    }

    private void PushState(LexerState state)
    {
        _stateStack.Push(state);
    }

    private LexerState PopState()
    {
        if (_stateStack.Count > 0)
        {
            return _stateStack.Pop();
        }
        return LexerState.JavaScript;
    }

    private Token ReadWhitespace(int start, int startLine, int startColumn)
    {
        while (!IsAtEnd() && char.IsWhiteSpace(Peek()))
        {
            Advance();
        }
        return new Token(TokenType.Whitespace, _source[start.._position], start, _position, startLine, startColumn);
    }

    private Token ReadComment(int start, int startLine, int startColumn)
    {
        Advance(); // consume '/'

        if (Peek() == '/')
        {
            // Single-line comment
            while (!IsAtEnd() && Peek() != '\n')
            {
                Advance();
            }
        }
        else if (Peek() == '*')
        {
            // Multi-line comment
            Advance(); // consume '*'
            while (!IsAtEnd())
            {
                if (Peek() == '*' && PeekNext() == '/')
                {
                    Advance(); // consume '*'
                    Advance(); // consume '/'
                    break;
                }
                Advance();
            }
        }

        return new Token(TokenType.Comment, _source[start.._position], start, _position, startLine, startColumn);
    }

    private Token ReadString(char quote, int start, int startLine, int startColumn)
    {
        Advance(); // consume opening quote

        if (quote == '`')
        {
            return ReadTemplateString(start, startLine, startColumn);
        }

        while (!IsAtEnd() && Peek() != quote)
        {
            if (Peek() == '\\' && !IsAtEnd())
            {
                Advance(); // consume backslash
            }
            Advance();
        }

        if (!IsAtEnd()) Advance(); // consume closing quote

        return new Token(TokenType.String, _source[start.._position], start, _position, startLine, startColumn);
    }

    private Token ReadTemplateString(int start, int startLine, int startColumn)
    {
        while (!IsAtEnd())
        {
            if (Peek() == '`')
            {
                Advance();
                break;
            }
            if (Peek() == '$' && PeekNext() == '{')
            {
                // Template literal expression - track brace depth
                int braceCount = 0;
                Advance(); // $
                Advance(); // {
                braceCount++;
                while (!IsAtEnd() && braceCount > 0)
                {
                    if (Peek() == '{') braceCount++;
                    else if (Peek() == '}') braceCount--;
                    if (braceCount > 0) Advance();
                    else Advance(); // consume the final }
                }
                continue;
            }
            if (Peek() == '\\' && !IsAtEnd())
            {
                Advance();
            }
            Advance();
        }

        return new Token(TokenType.TemplateString, _source[start.._position], start, _position, startLine, startColumn);
    }

    private Token ReadNumber(int start, int startLine, int startColumn)
    {
        // Handle hex, octal, binary
        if (Peek() == '0' && !IsAtEnd())
        {
            char next = char.ToLower(PeekNext());
            if (next == 'x' || next == 'o' || next == 'b')
            {
                Advance(); // 0
                Advance(); // x/o/b
                while (!IsAtEnd() && (char.IsLetterOrDigit(Peek()) || Peek() == '_'))
                {
                    Advance();
                }
                return new Token(TokenType.Number, _source[start.._position], start, _position, startLine, startColumn);
            }
        }

        // Regular number
        while (!IsAtEnd() && (char.IsDigit(Peek()) || Peek() == '_'))
        {
            Advance();
        }

        // Decimal part
        if (Peek() == '.' && char.IsDigit(PeekNext()))
        {
            Advance();
            while (!IsAtEnd() && char.IsDigit(Peek()))
            {
                Advance();
            }
        }

        // Exponent
        if (Peek() == 'e' || Peek() == 'E')
        {
            Advance();
            if (Peek() == '+' || Peek() == '-') Advance();
            while (!IsAtEnd() && char.IsDigit(Peek()))
            {
                Advance();
            }
        }

        // BigInt suffix
        if (Peek() == 'n') Advance();

        return new Token(TokenType.Number, _source[start.._position], start, _position, startLine, startColumn);
    }

    private Token ReadIdentifier(int start, int startLine, int startColumn)
    {
        while (!IsAtEnd() && IsIdentifierPart(Peek()))
        {
            Advance();
        }

        var value = _source[start.._position];
        var type = Keywords.Contains(value) ? TokenType.Keyword : TokenType.Identifier;

        // Handle 'as' type assertion: x as string
        // 'as' after an expression (identifier, ), ], string, number) starts type annotation
        if (type == TokenType.Keyword && value == "as" && IsAsTypeAssertionContext())
        {
            PushState(_state);
            _state = LexerState.TypeAnnotation;
            _typeBraceDepth = 0;
            _typeBracketDepth = 0;
            _typeParenDepth = 0;
            return new Token(TokenType.Keyword, value, start, _position, startLine, startColumn);
        }

        // Track 'type' keyword for type alias context detection
        if (type == TokenType.Keyword && value == "type")
        {
            _afterTypeKeyword = true;
        }
        else if (type == TokenType.Identifier && _afterTypeKeyword)
        {
            // Still in type alias context: type <identifier>
            // _afterTypeKeyword remains true
        }
        else
        {
            // Any other token clears the flag (except when we read generics)
            if (_lastTokenType != TokenType.GenericClose)
            {
                _afterTypeKeyword = false;
            }
        }

        return new Token(type, value, start, _position, startLine, startColumn);
    }

    /// <summary>
    /// Determines if 'as' is being used for type assertion (x as string) vs other uses.
    /// 'as' is a type assertion after: identifier, ), ], string, number, template literal.
    /// </summary>
    private bool IsAsTypeAssertionContext()
    {
        // After identifier: x as string
        if (_lastTokenType == TokenType.Identifier)
            return true;

        // After closing paren: (x + y) as number
        if (_lastTokenType == TokenType.Punctuation && _lastTokenValue == ")")
            return true;

        // After closing bracket: arr[0] as string
        if (_lastTokenType == TokenType.Punctuation && _lastTokenValue == "]")
            return true;

        // After string: "hello" as const
        if (_lastTokenType == TokenType.String)
            return true;

        // After number: 42 as const
        if (_lastTokenType == TokenType.Number)
            return true;

        // After template string: `hello` as const
        if (_lastTokenType == TokenType.TemplateString)
            return true;

        // After generic close: getValue<T>() as string
        if (_lastTokenType == TokenType.GenericClose)
            return true;

        return false;
    }

    /// <summary>
    /// Reads a decorator: @decoratorName
    /// Only reads the @ and decorator name, not the arguments (those are handled as regular tokens).
    /// </summary>
    private Token ReadDecorator(int start, int startLine, int startColumn)
    {
        Advance(); // consume @

        // Read decorator name (identifier)
        while (!IsAtEnd() && IsIdentifierPart(Peek()))
        {
            Advance();
        }

        // Include the @ in the value
        return new Token(TokenType.Decorator, _source[start.._position], start, _position, startLine, startColumn);
    }

    private Token ReadOperator(int start, int startLine, int startColumn)
    {
        // Handle multi-character operators
        var c = Advance();

        // Arrow function - always use Arrow type for consistency
        if (c == '=' && Peek() == '>')
        {
            Advance();
            return new Token(TokenType.Arrow, "=>", start, _position, startLine, startColumn);
        }

        // Triple operators (===, !==, etc.)
        if ((c == '=' || c == '!' || c == '<' || c == '>') && Peek() == '=' && PeekNext() == '=')
        {
            Advance();
            Advance();
            return new Token(TokenType.Operator, _source[start.._position], start, _position, startLine, startColumn);
        }

        // Double operators (==, !=, <=, >=, &&, ||, ++, --, etc.)
        if (Peek() == c || Peek() == '=' || (c == '?' && (Peek() == '?' || Peek() == '.')))
        {
            Advance();
            // Triple &&= ||= ??=
            if (Peek() == '=')
            {
                Advance();
            }
            return new Token(TokenType.Operator, _source[start.._position], start, _position, startLine, startColumn);
        }

        // Check for type alias context: type X = <type here>
        // After single '=' following 'type' keyword and identifier
        if (c == '=' && IsTypeAliasContext())
        {
            PushState(_state);
            _state = LexerState.TypeAnnotation;
            _typeBraceDepth = 0;
            _typeBracketDepth = 0;
            _typeParenDepth = 0;
            _afterTypeKeyword = false; // Clear the flag
        }

        return new Token(TokenType.Operator, c.ToString(), start, _position, startLine, startColumn);
    }

    /// <summary>
    /// Checks if we're in a type alias context: type X = ...
    /// </summary>
    private bool IsTypeAliasContext()
    {
        // We're in type alias context if we saw: type <identifier> or type <identifier><T>
        // and now we're at the =
        return _afterTypeKeyword &&
               (_lastTokenType == TokenType.Identifier || _lastTokenType == TokenType.GenericClose);
    }

    private bool IsJsxStart()
    {
        // Heuristic: <identifier or </ or <> (fragment)
        // Not < in comparison/generics context
        int pos = _position + 1;
        while (pos < _source.Length && char.IsWhiteSpace(_source[pos])) pos++;

        if (pos >= _source.Length) return false;

        char next = _source[pos];

        // </ is closing tag
        if (next == '/') return true;

        // <> is fragment
        if (next == '>') return true;

        // <Identifier is JSX
        if (IsIdentifierStart(next))
        {
            // But not if it looks like a generic: <T>(...) or <T, U>
            // Look for patterns that suggest generics vs JSX
            int identEnd = pos;
            while (identEnd < _source.Length && IsIdentifierPart(_source[identEnd]))
            {
                identEnd++;
            }

            // Skip whitespace
            while (identEnd < _source.Length && char.IsWhiteSpace(_source[identEnd]))
            {
                identEnd++;
            }

            if (identEnd < _source.Length)
            {
                char afterIdent = _source[identEnd];
                // If followed by comma or >, could be generic: <T, U> or <T>
                // If followed by > and then ( it's likely generic: <T>()
                // JSX tags usually have attributes, children, or self-close
                if (afterIdent == ',')
                {
                    return false; // Likely generic: <T, U>
                }
                if (afterIdent == '>')
                {
                    // Check what comes after >
                    int afterClose = identEnd + 1;
                    while (afterClose < _source.Length && char.IsWhiteSpace(_source[afterClose]))
                    {
                        afterClose++;
                    }
                    if (afterClose < _source.Length && _source[afterClose] == '(')
                    {
                        return false; // Likely generic function call: <T>()
                    }
                }
            }

            return true;
        }

        return false;
    }

    private bool IsIdentifierStart(char c) => char.IsLetter(c) || c == '_' || c == '$';
    private bool IsIdentifierPart(char c) => char.IsLetterOrDigit(c) || c == '_' || c == '$';

    private bool IsAtEnd() => _position >= _source.Length;

    private char Peek() => IsAtEnd() ? '\0' : _source[_position];

    private char PeekNext() => _position + 1 >= _source.Length ? '\0' : _source[_position + 1];

    private char Advance()
    {
        if (IsAtEnd()) return '\0';

        char c = _source[_position++];
        if (c == '\n')
        {
            _line++;
            _column = 1;
        }
        else
        {
            _column++;
        }
        return c;
    }

    /// <summary>
    /// Determines if the current context suggests a type annotation.
    /// Type annotations follow: identifier, ), ], or ? in certain contexts.
    /// </summary>
    private bool IsTypeAnnotationContext()
    {
        // After identifier (variable, parameter, property)
        // const x: string
        // function foo(x: number)
        // { x: string }
        if (_lastTokenType == TokenType.Identifier)
            return true;

        // After ) for return type: function foo(): void
        if (_lastTokenType == TokenType.Punctuation && _lastTokenValue == ")")
            return true;

        // After ] for array element type in some contexts
        if (_lastTokenType == TokenType.Punctuation && _lastTokenValue == "]")
            return true;

        // After ? for optional property/parameter: x?: string, name?: string
        // In JS mode, ? is Operator, in type mode it's QuestionMark
        if (_lastTokenType == TokenType.QuestionMark)
            return true;
        if (_lastTokenType == TokenType.Operator && _lastTokenValue == "?")
            return true;

        return false;
    }

    /// <summary>
    /// Determines if / is the start of a regex literal vs division operator.
    /// / starts a regex after: operators, punctuation (except ) and ]), keywords, or at start.
    /// / is division after: identifiers, numbers, ), ], string/template literals.
    /// </summary>
    private bool IsRegexStart()
    {
        // At very start of input
        if (_lastTokenType == TokenType.Unknown && _lastTokenValue == "")
            return true;

        // After operators - regex
        if (_lastTokenType == TokenType.Operator)
            return true;

        // After most keywords - regex (but not after some keywords that act like values)
        if (_lastTokenType == TokenType.Keyword)
        {
            // Keywords that act like values (this, true, false, null, undefined)
            // After these, / is likely division
            string[] valueKeywords = { "this", "true", "false", "null", "undefined" };
            if (Array.IndexOf(valueKeywords, _lastTokenValue) >= 0)
                return false;
            return true;
        }

        // After punctuation (except ) and ]) - regex
        if (_lastTokenType == TokenType.Punctuation)
        {
            // ) and ] indicate end of expression - / is division
            if (_lastTokenValue == ")" || _lastTokenValue == "]" || _lastTokenValue == "}")
                return false;
            // ( [ { ; , : - regex follows
            return true;
        }

        // After identifier, number, string, closing JSX - division
        // (already excluded by not being any of the above cases)
        return false;
    }

    /// <summary>
    /// Reads a regex literal: /pattern/flags
    /// </summary>
    private Token ReadRegex(int start, int startLine, int startColumn)
    {
        Advance(); // consume opening /

        bool inCharClass = false;
        while (!IsAtEnd())
        {
            char c = Peek();

            if (c == '\\' && !IsAtEnd())
            {
                // Escape sequence - skip next char
                Advance();
                if (!IsAtEnd()) Advance();
                continue;
            }

            if (c == '[')
            {
                inCharClass = true;
                Advance();
                continue;
            }

            if (c == ']' && inCharClass)
            {
                inCharClass = false;
                Advance();
                continue;
            }

            // End of regex (only if not in character class)
            if (c == '/' && !inCharClass)
            {
                Advance(); // consume closing /

                // Read flags (g, i, m, s, u, y, d)
                while (!IsAtEnd() && char.IsLetter(Peek()))
                {
                    Advance();
                }
                break;
            }

            if (c == '\n')
            {
                // Regex can't span lines (unless escaped)
                break;
            }

            Advance();
        }

        return new Token(TokenType.Regex, _source[start.._position], start, _position, startLine, startColumn);
    }

    /// <summary>
    /// Determines if < is the start of generic type parameters vs JSX or comparison.
    /// </summary>
    private bool IsGenericStart()
    {
        // After identifier that could be a generic type/function:
        // Array<T>, Map<K, V>, function<T>()
        if (_lastTokenType == TokenType.Identifier)
        {
            // Check if followed by type-like content
            int pos = _position + 1;
            while (pos < _source.Length && char.IsWhiteSpace(_source[pos])) pos++;

            if (pos < _source.Length)
            {
                char next = _source[pos];
                // If followed by identifier (type param) or another < (nested generic)
                if (IsIdentifierStart(next) || next == '<')
                    return true;
            }
        }

        // After certain keywords: class Foo<T>, interface Bar<T>
        if (_lastTokenType == TokenType.Keyword)
        {
            return _lastTokenValue is "class" or "interface" or "type" or "extends" or "implements";
        }

        return false;
    }

    /// <summary>
    /// Tokenizes inside a type annotation (after :).
    /// Handles type names, generics, unions, intersections, arrays.
    /// </summary>
    private Token? NextTypeAnnotationToken()
    {
        var start = _position;
        var startLine = _line;
        var startColumn = _column;

        char c = Peek();

        // Whitespace
        if (char.IsWhiteSpace(c))
        {
            return ReadWhitespace(start, startLine, startColumn);
        }

        // Arrow for function types: => (must check before = exit)
        if (c == '=' && PeekNext() == '>')
        {
            Advance();
            Advance();
            return new Token(TokenType.Arrow, "=>", start, _position, startLine, startColumn);
        }

        // End of type annotation on single '='
        if (c == '=')
        {
            _state = PopState();
            _typeBraceDepth = 0;
            _typeBracketDepth = 0;
            _typeParenDepth = 0;
            // Don't consume - let the parent state handle it
            return NextToken();
        }

        // Semicolon: ends type annotation unless inside object type
        if (c == ';')
        {
            if (_typeBraceDepth > 0)
            {
                // Inside object type, semicolon is property separator
                Advance();
                return new Token(TokenType.Punctuation, ";", start, _position, startLine, startColumn);
            }
            _state = PopState();
            _typeBraceDepth = 0;
            _typeBracketDepth = 0;
            return NextToken();
        }

        // Closing paren - track depth for function types
        if (c == ')')
        {
            Advance();
            if (_typeParenDepth > 0)
            {
                _typeParenDepth--;
            }
            return new Token(TokenType.Punctuation, ")", start, _position, startLine, startColumn);
        }

        // Object type literal or mapped type: { [K in keyof T]: T[K] }
        // But NOT a function body after return type: function(): T { ... }
        if (c == '{')
        {
            // If { follows a type name, >, or ) directly (without preceding : or |), it's likely a function body
            // Object type literals usually appear after : or | or at start of type
            bool isLikelyObjectType = _lastTokenType == TokenType.Colon ||
                                      _lastTokenType == TokenType.Operator; // | or &

            if (isLikelyObjectType)
            {
                Advance();
                _typeBraceDepth++;
                return new Token(TokenType.Punctuation, "{", start, _position, startLine, startColumn);
            }
            else
            {
                // Exit type annotation mode - this is a code block
                _state = PopState();
                _typeBraceDepth = 0;
                _typeBracketDepth = 0;
                return NextToken();
            }
        }

        // End of object type literal
        if (c == '}')
        {
            Advance();
            _typeBraceDepth--;
            if (_typeBraceDepth < 0) _typeBraceDepth = 0;
            // If we closed all braces and brackets, and next char ends type, stay in type mode for now
            return new Token(TokenType.Punctuation, "}", start, _position, startLine, startColumn);
        }

        // Comma - inside object type or tuple, stay in type mode
        if (c == ',')
        {
            Advance();
            if (_typeBraceDepth == 0 && _typeBracketDepth == 0)
            {
                // Comma at top level exits type annotation (parameter list)
                _state = PopState();
            }
            return new Token(TokenType.Punctuation, ",", start, _position, startLine, startColumn);
        }

        // Semicolon inside object type (property separator)
        // Note: Inside object types, ; is a property separator, not statement end

        // Generic open
        if (c == '<')
        {
            Advance();
            PushState(_state);
            _state = LexerState.GenericParams;
            _genericDepth = 1;
            return new Token(TokenType.GenericOpen, "<", start, _position, startLine, startColumn);
        }

        // Array type [] or Tuple type [string, number]
        if (c == '[')
        {
            Advance();
            if (Peek() == ']')
            {
                // Empty array type suffix: number[]
                Advance();
                return new Token(TokenType.Punctuation, "[]", start, _position, startLine, startColumn);
            }
            // Tuple type or indexed access type
            _typeBracketDepth++;
            return new Token(TokenType.TupleOpen, "[", start, _position, startLine, startColumn);
        }

        // Tuple close
        if (c == ']')
        {
            Advance();
            _typeBracketDepth--;
            if (_typeBracketDepth < 0) _typeBracketDepth = 0;
            return new Token(TokenType.TupleClose, "]", start, _position, startLine, startColumn);
        }

        // Union type: |
        if (c == '|')
        {
            Advance();
            return new Token(TokenType.Operator, "|", start, _position, startLine, startColumn);
        }

        // Intersection type: &
        if (c == '&')
        {
            Advance();
            return new Token(TokenType.Operator, "&", start, _position, startLine, startColumn);
        }

        // Optional/nullable: ?
        if (c == '?')
        {
            Advance();
            return new Token(TokenType.QuestionMark, "?", start, _position, startLine, startColumn);
        }

        // Parentheses for function types and grouping
        if (c == '(')
        {
            Advance();
            _typeParenDepth++;
            return new Token(TokenType.Punctuation, "(", start, _position, startLine, startColumn);
        }

        // Type name or identifier
        if (IsIdentifierStart(c))
        {
            return ReadTypeName(start, startLine, startColumn);
        }

        // String literal types: "hello" | "world"
        if (c == '"' || c == '\'')
        {
            return ReadString(c, start, startLine, startColumn);
        }

        // Template literal types: `${string}-${number}`
        if (c == '`')
        {
            Advance(); // consume opening backtick
            return ReadTemplateString(start, startLine, startColumn);
        }

        // Colon inside type (for mapped types: { [K in keyof T]: T[K] })
        if (c == ':')
        {
            Advance();
            return new Token(TokenType.Colon, ":", start, _position, startLine, startColumn);
        }

        // Number literal types: 1 | 2 | 3
        if (char.IsDigit(c))
        {
            return ReadNumber(start, startLine, startColumn);
        }

        // Dot for qualified types: Foo.Bar, or spread/rest operator: ...args
        if (c == '.')
        {
            Advance();
            // Check for spread/rest: ...
            if (Peek() == '.' && PeekNext() == '.')
            {
                Advance();
                Advance();
                return new Token(TokenType.Operator, "...", start, _position, startLine, startColumn);
            }
            return new Token(TokenType.Punctuation, ".", start, _position, startLine, startColumn);
        }

        // Unknown - exit type annotation mode
        _state = PopState();
        return NextToken();
    }

    /// <summary>
    /// Tokenizes inside generic type parameters: &lt;T, U extends Foo&gt;
    /// </summary>
    private Token? NextGenericParamsToken()
    {
        var start = _position;
        var startLine = _line;
        var startColumn = _column;

        char c = Peek();

        // Whitespace
        if (char.IsWhiteSpace(c))
        {
            return ReadWhitespace(start, startLine, startColumn);
        }

        // Nested generic open
        if (c == '<')
        {
            Advance();
            _genericDepth++;
            return new Token(TokenType.GenericOpen, "<", start, _position, startLine, startColumn);
        }

        // Generic close
        if (c == '>')
        {
            Advance();
            _genericDepth--;
            if (_genericDepth == 0)
            {
                _state = PopState();
            }
            return new Token(TokenType.GenericClose, ">", start, _position, startLine, startColumn);
        }

        // Comma between type parameters
        if (c == ',')
        {
            Advance();
            return new Token(TokenType.Punctuation, ",", start, _position, startLine, startColumn);
        }

        // Type parameter or constraint
        if (IsIdentifierStart(c))
        {
            return ReadTypeName(start, startLine, startColumn);
        }

        // Array type [] or tuple type in generic: Array<string[]> or Map<string, [number, string]>
        if (c == '[')
        {
            Advance();
            if (Peek() == ']')
            {
                Advance();
                return new Token(TokenType.Punctuation, "[]", start, _position, startLine, startColumn);
            }
            // Tuple type or indexed access
            return new Token(TokenType.TupleOpen, "[", start, _position, startLine, startColumn);
        }

        // Tuple close
        if (c == ']')
        {
            Advance();
            return new Token(TokenType.TupleClose, "]", start, _position, startLine, startColumn);
        }

        // Conditional type: T extends U ? X : Y
        if (c == '?')
        {
            Advance();
            return new Token(TokenType.QuestionMark, "?", start, _position, startLine, startColumn);
        }

        // Colon in conditional type
        if (c == ':')
        {
            Advance();
            return new Token(TokenType.Colon, ":", start, _position, startLine, startColumn);
        }

        // Parentheses for grouping: (A | B) & C
        if (c == '(')
        {
            Advance();
            return new Token(TokenType.Punctuation, "(", start, _position, startLine, startColumn);
        }

        if (c == ')')
        {
            Advance();
            return new Token(TokenType.Punctuation, ")", start, _position, startLine, startColumn);
        }

        // Template literal types in generics
        if (c == '`')
        {
            Advance();
            return ReadTemplateString(start, startLine, startColumn);
        }

        // String literal types in generics
        if (c == '"' || c == '\'')
        {
            return ReadString(c, start, startLine, startColumn);
        }

        // Arrow in function types within generics: <T extends (x: number) => boolean>
        if (c == '=' && PeekNext() == '>')
        {
            Advance();
            Advance();
            return new Token(TokenType.Arrow, "=>", start, _position, startLine, startColumn);
        }

        // Union/intersection in generic: Map<string | number, any>
        if (c == '|')
        {
            Advance();
            return new Token(TokenType.Operator, "|", start, _position, startLine, startColumn);
        }

        if (c == '&')
        {
            Advance();
            return new Token(TokenType.Operator, "&", start, _position, startLine, startColumn);
        }

        // Dot for qualified types
        if (c == '.')
        {
            Advance();
            return new Token(TokenType.Punctuation, ".", start, _position, startLine, startColumn);
        }

        // Unknown character in generic - exit
        _state = PopState();
        _genericDepth = 0;
        return NextToken();
    }

    /// <summary>
    /// Reads a type name (could be built-in type or user type).
    /// </summary>
    private Token ReadTypeName(int start, int startLine, int startColumn)
    {
        while (!IsAtEnd() && IsIdentifierPart(Peek()))
        {
            Advance();
        }

        var value = _source[start.._position];

        // Check for type operators: typeof, keyof, infer, readonly
        if (TypeOperators.Contains(value))
        {
            return new Token(TokenType.TypeOperator, value, start, _position, startLine, startColumn);
        }

        // Check for 'extends' - special in conditional types and constraints
        if (value == "extends")
        {
            return new Token(TokenType.Extends, value, start, _position, startLine, startColumn);
        }

        // Check for 'in' - special in mapped types
        if (value == "in")
        {
            return new Token(TokenType.MappedIn, value, start, _position, startLine, startColumn);
        }

        // Check for 'as' followed by 'const' - handle separately in caller
        if (value == "as")
        {
            return new Token(TokenType.Keyword, value, start, _position, startLine, startColumn);
        }

        // Check if it's a built-in type
        if (BuiltInTypes.Contains(value))
        {
            return new Token(TokenType.TypeName, value, start, _position, startLine, startColumn);
        }

        // Check if it's a keyword used as type (void, null, undefined are also keywords)
        if (Keywords.Contains(value))
        {
            // Keywords in type position
            return new Token(TokenType.Keyword, value, start, _position, startLine, startColumn);
        }

        // User-defined type (PascalCase typically) or type parameter (T, U, etc.)
        // We'll use TypeName for PascalCase, Identifier for others
        if (char.IsUpper(value[0]) || value.Length == 1)
        {
            return new Token(TokenType.TypeName, value, start, _position, startLine, startColumn);
        }

        return new Token(TokenType.Identifier, value, start, _position, startLine, startColumn);
    }
}
