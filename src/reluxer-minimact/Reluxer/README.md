# reluxer
A token-based pattern matching and visitor framework for C#, inspired by Babel's AST traversal. Designed for transforming TSX/JSX to C# or other source-to-source transformations.

## Features

- **Token Pattern DSL** - Regex-like syntax for matching token sequences
- **Attribute-Based Visitors** - Decorate methods with `[TokenPattern]` to handle matches
- **Automatic Parameter Injection** - Captured groups are injected as method parameters
- **Nested Traversal** - Use `Traverse()` with `nameof()` for Babel-style nested visiting
- **Scoped Visitors** - Restrict which visitors can call other visitors with `From`
- **Depth-Aware Matching** - Handle balanced structures like JSX with `</\1@0>`
- **TSX/JSX Lexer** - Built-in lexer for TypeScript/JavaScript with JSX support
- **TypeScript Type Support** - Full lexing of type annotations, generics, tuples, conditional types
- **Lookahead/Lookbehind** - Zero-width assertions: `(?=...)`, `(?!...)`, `(?<=...)`, `(?<!...)`
- **Named Captures** - Named groups `(?<name>...)` and backreferences `\k<name>`
- **Balanced Matching** - Match balanced brackets with `\Bp`, `\Bb`, `\Bk`, `\Ba`
- **Token Manipulation** - Insert, replace, remove tokens with `GetModifiedSource()` preserving formatting

## Installation

```bash
dotnet add reference path/to/TokenLexer.csproj
```

## Quick Start

```csharp
using TokenLexer.Attributes;
using TokenLexer.Lexer;
using TokenLexer.Matching;
using TokenLexer.Tokens;
using TokenLexer.Visitor;

// 1. Lex your source code
var lexer = new TsxLexer(sourceCode);
var tokens = lexer.Tokenize();

// 2. Create a visitor and process tokens
var visitor = new MyVisitor();
visitor.Visit(tokens);
```

## Pattern Syntax

### Token Type Shorthands

| Pattern | Matches |
|---------|---------|
| `\k` | Keyword (`function`, `const`, `if`, etc.) |
| `\i` | Identifier (variable names) |
| `\s` | String literal |
| `\n` | Number literal |
| `\o` | Operator (`+`, `-`, `=`, `=>`, etc.) |
| `\p` | Punctuation (`(`, `)`, `{`, `}`, etc.) |
| `.` | Any token |

### TypeScript Type Shorthands

| Pattern | Matches |
|---------|---------|
| `\tn` | Type name (`string`, `number`, `MyClass`, etc.) |
| `\cl` | Colon in type annotation (`:`) |
| `\go` | Generic open (`<`) |
| `\gc` | Generic close (`>`) |
| `\qm` | Question mark (`?`) |
| `\fa` | Function arrow (`=>`) in type context |
| `\op` | Type operator (`typeof`, `keyof`, `infer`, `readonly`) |
| `\xt` | Extends keyword in type context |
| `\tl` | Tuple open (`[`) |
| `\tr` | Tuple close (`]`) |
| `\mn` | Mapped type `in` keyword |
| `\dc` | Decorator (`@Component`, etc.) |

### Literal Values

Match specific token values using quotes:

```csharp
// Match keyword with specific value
[TokenPattern(@"\k""const""")]

// Match any token with specific value
[TokenPattern(@"""function""")]

// Match punctuation with specific value
[TokenPattern(@"""{""")]
```

### Quantifiers

| Pattern | Meaning |
|---------|---------|
| `*` | Zero or more |
| `+` | One or more |
| `?` | Zero or one |
| `{n}` | Exactly n |
| `{n,}` | n or more |
| `{n,m}` | Between n and m |

Add `?` for non-greedy: `*?`, `+?`

### Groups and Captures

```csharp
// Capture group - value injected into method parameter
[TokenPattern(@"\k""function"" (\i)")]
public void Visit(string functionName) { }

// Multiple captures - injected in order
[TokenPattern(@"\k""const"" (\i) ""="" (\n)")]
public void Visit(string varName, string value) { }

// Non-capturing group
[TokenPattern(@"(?:\k""async"")? \k""function""")]

// Named capture group
[TokenPattern(@"\k""function"" (?<funcName>\i)")]
public void Visit(TokenMatch match)
{
    var name = match.NamedCaptures["funcName"].Value;
}

// Named backreference - matches same value
[TokenPattern(@"\k""const"" (?<name>\i) ""="" \k<name>")]
```

### Alternation

```csharp
// Match keyword OR identifier
[TokenPattern(@"[\k|\i]")]

// Match const OR let OR var
[TokenPattern(@"[\k""const""|\k""let""|\k""var""]")]
```

### Lookahead and Lookbehind Assertions

Zero-width assertions that match without consuming tokens:

```csharp
// Positive lookahead: match identifier only if followed by (
[TokenPattern(@"(\i)(?=""("")")]  // Matches function name in foo(x)

// Negative lookahead: match identifier NOT followed by (
[TokenPattern(@"(\i)(?!""("")")]  // Matches variable, not function call

// Positive lookbehind: match if preceded by pattern
[TokenPattern(@"\k""const"" (?<=\k""const"")(\i)")]

// Negative lookbehind: match if NOT preceded by pattern
[TokenPattern(@"(\i)(?<!""."")")]  // Identifier not after dot
```

### Balanced Bracket Matching

Match balanced pairs including nested content:

```csharp
// \Bp - balanced parentheses ( ... )
[TokenPattern(@"\i \Bp")]  // Matches foo(a, (b + c))

// \Bb - balanced braces { ... }
[TokenPattern(@"\k""if"" \Bp \Bb")]  // Matches if (cond) { body }

// \Bk - balanced brackets [ ... ]
[TokenPattern(@"\i \Bk")]  // Matches arr[i + j]

// \Ba - balanced angle brackets < ... >
[TokenPattern(@"\i \Ba")]  // Matches generic<T, U>
```

### Backreferences (Depth-Aware)

```csharp
// Match closing tag with same name as captured opening tag
[TokenPattern(@"<(\i)> .* </\1>")]

// Match only when depth returns to 0 (balanced)
[TokenPattern(@"<(\i)> .* </\1@0>")]
```

## Visitor Methods

### Basic Visitor

```csharp
public class MyVisitor : TokenVisitor
{
    [TokenPattern(@"\k""function"" (\i) ""(""")]
    public void VisitFunction(TokenMatch match, string name)
    {
        Console.WriteLine($"Found function: {name}");
    }
}
```

### Parameter Types

The framework automatically injects captured values based on parameter type:

| Parameter Type | Injection |
|----------------|-----------|
| `TokenMatch` | The full match result |
| `Token` | First token of capture group |
| `Token[]` | All tokens in capture group |
| `string` | Combined value of capture group |
| `TokenCapture` | Full capture with metadata |
| `TraversalScope` | Scope for fluent traversal |

```csharp
[TokenPattern(@"\k""const"" (\i) ""="" (.*?) "";""")]
public void VisitConst(
    TokenMatch match,      // Full match info
    string varName,        // First capture as string
    Token[] initializer)   // Second capture as token array
{
}
```

### Attribute Properties

```csharp
[TokenPattern(
    @"\k""function"" (\i)",
    Name = "FuncDecl",     // Explicit name for Traverse lookup
    Priority = 10,          // Higher priority matches first
    Consumes = true,        // Whether to consume matched tokens
    From = new[] { nameof(VisitClass) }  // Restrict callers
)]
```

## Nested Traversal

Use `Traverse()` with `nameof()` to process nested structures, similar to Babel's `path.traverse()`.

```csharp
public class MyVisitor : TokenVisitor
{
    // Top-level visitor
    [TokenPattern(@"\k""function"" (\i) ""(""")]
    public void VisitFunction(string name)
    {
        Console.WriteLine($"Function: {name}");

        // Extract the function body
        var body = ExtractFunctionBody();

        // Traverse body with specific visitors
        Traverse(body,
            nameof(VisitNestedFunction),
            nameof(VisitStatement));
    }

    // Only called via Traverse, not during Visit()
    [TokenPattern(@"\k""function"" (\i)", Name = "Nested")]
    public void VisitNestedFunction(string name)
    {
        Console.WriteLine($"  Nested function: {name}");
    }

    [TokenPattern(@"\k""const"" (\i)", Name = "Stmt")]
    public void VisitStatement(string varName)
    {
        Console.WriteLine($"  Variable: {varName}");
    }
}
```

## Scoped Visitors with `From`

Restrict which visitors can call other visitors:

```csharp
public class ScopedVisitor : TokenVisitor
{
    [TokenPattern(@"\k""class"" (\i)")]
    public void VisitClass(string name)
    {
        var body = ExtractFunctionBody();
        Traverse(body, nameof(VisitMethod), nameof(VisitField));
    }

    [TokenPattern(@"\k""function"" (\i)")]
    public void VisitFunction(string name)
    {
        var body = ExtractFunctionBody();
        // VisitField will NOT be called here - restricted to VisitClass
        Traverse(body, nameof(VisitField), nameof(VisitStatement));
    }

    // Can only be called from VisitClass
    [TokenPattern(@"(\i) ""=""", From = new[] { nameof(VisitClass) })]
    public void VisitField(string name)
    {
        Console.WriteLine($"Field: {name}");
    }

    // Can only be called from VisitClass or VisitFunction
    [TokenPattern(@"(\i) ""(""", From = new[] { nameof(VisitClass), nameof(VisitFunction) })]
    public void VisitMethod(string name) { }

    // No restriction - can be called from anywhere
    [TokenPattern(@"\k""const"" (\i)", Name = "Stmt")]
    public void VisitStatement(string name) { }
}
```

## Extracting Balanced Blocks

The `TokenVisitor` base class provides helpers for extracting balanced content:

```csharp
public class MyVisitor : TokenVisitor
{
    [TokenPattern(@"\k""function"" (\i) ""(""")]
    public void VisitFunction(string name)
    {
        // Extract content between { }
        Token[] body = ExtractFunctionBody();

        // Extract content between ( )
        Token[] params = ExtractParenthesized();

        // Extract content between [ ]
        Token[] items = ExtractBracketed();

        // Custom delimiters
        Token[] custom = ExtractBalanced(0, "<", ">");
    }
}
```

## Token Manipulation

Transform source code by inserting, replacing, or removing tokens while preserving original formatting:

```csharp
public class AddAttributeVisitor : TokenVisitor
{
    private int _counter = 0;

    [TokenPattern(@".")]
    public void VisitToken(TokenMatch match)
    {
        var token = match.MatchedTokens[0];

        // Only process JSX opening tags
        if (token.Type != TokenType.JsxTagOpen) return;

        // Insert hexPath attribute after the tag name
        InsertAfter(token,
            Token.Whitespace(" "),
            Token.JsxAttrName("hexPath"),
            Token.Operator("="),
            Token.JsxAttrValue($"\"{_counter++:X4}\"")
        );
    }
}

// Usage
var lexer = new TsxLexer(source);
var tokens = lexer.Tokenize();

var visitor = new AddAttributeVisitor();
visitor.Visit(tokens, source);  // Pass original source for formatting preservation

var modified = visitor.GetModifiedSource();  // Reconstructed source with edits
```

### Manipulation Methods

| Method | Description |
|--------|-------------|
| `InsertAfter(token, ...newTokens)` | Insert tokens after a specific token |
| `InsertBefore(token, ...newTokens)` | Insert tokens before a specific token |
| `InsertAt(index, ...newTokens)` | Insert tokens at a specific index |
| `Replace(token, ...newTokens)` | Replace a single token |
| `ReplaceMatch(match, ...newTokens)` | Replace all tokens in a match |
| `ReplaceRange(start, end, ...newTokens)` | Replace a range of tokens |
| `Remove(token)` | Remove a single token |
| `RemoveMatch(match)` | Remove all tokens in a match |
| `GetModifiedTokens()` | Get the modified token list |
| `GetModifiedSource()` | Get reconstructed source with formatting preserved |

### Token Factory Methods

Create synthetic tokens for insertion:

```csharp
Token.Keyword("const")
Token.Identifier("myVar")
Token.String("\"hello\"")
Token.Number("42")
Token.Operator("=")
Token.Punctuation(";")
Token.JsxAttrName("className")
Token.JsxAttrValue("\"container\"")
Token.Whitespace(" ")
Token.Create(TokenType.Comment, "// comment")
```

## Skipping / Fast-Forward

When you manually explore tokens (e.g., extracting a function body), you can skip ahead so subsequent visitors don't re-process those tokens:

```csharp
public class MyVisitor : TokenVisitor
{
    [TokenPattern(@"\k""function"" (\i) ""(""")]
    public void VisitFunction(string name)
    {
        // Extract and process the function body
        var body = ExtractFunctionBody();
        ProcessBody(body);

        // Skip past the body so next iteration starts after the closing }
        SkipTo(body[^1]);  // Skip to last token in body
    }

    [TokenPattern(@"\k""if"" ""(""")]
    public void VisitIf(TokenMatch match)
    {
        // Skip the entire if block including balanced braces
        SkipBalanced("{", "}");
    }
}
```

### Skip Methods

| Method | Description |
|--------|-------------|
| `SkipTo(token)` | Skip to a specific token (resumes after it) |
| `SkipToIndex(index)` | Skip to a specific index in the token stream |
| `SkipBalanced(open, close)` | Skip past a balanced block (e.g., `{...}`) |

## Lifecycle Hooks

Override these methods to hook into the visitor lifecycle:

```csharp
public class MyVisitor : TokenVisitor
{
    public override void OnBegin(IReadOnlyList<Token> tokens)
    {
        // Called before visiting starts
    }

    public override void OnEnd()
    {
        // Called after visiting completes
    }

    public override void OnUnmatched(Token token)
    {
        // Called for each token not matched by any pattern
    }
}
```

## TSX/JSX Lexer

The built-in `TsxLexer` tokenizes TypeScript/JavaScript with JSX support:

```csharp
var lexer = new TsxLexer(source);

// Basic tokenization (excludes whitespace and comments)
var tokens = lexer.Tokenize();

// Include whitespace and/or comments
var allTokens = lexer.Tokenize(
    includeWhitespace: true,
    includeComments: true);
```

### Token Types

```csharp
public enum TokenType
{
    // JavaScript/TypeScript
    Keyword,        // function, const, if, etc.
    Identifier,     // variable names
    String,         // "..." or '...'
    Number,         // 42, 3.14
    Operator,       // +, -, =, =>, etc.
    Punctuation,    // (, ), {, }, etc.
    TemplateString, // `...${...}...`
    Comment,        // // or /* */
    Regex,          // /pattern/flags
    Decorator,      // @Component, @Injectable

    // TypeScript Type Annotations
    Colon,          // : (in type context)
    GenericOpen,    // < (generic type)
    GenericClose,   // > (generic type)
    TypeName,       // string, number, MyClass
    QuestionMark,   // ? (optional)
    Arrow,          // => (in type context)
    TypeOperator,   // typeof, keyof, infer, readonly
    Extends,        // extends (in types)
    TupleOpen,      // [ (tuple type)
    TupleClose,     // ] (tuple type)
    MappedIn,       // in (mapped types)
    AsConst,        // as const

    // JSX-specific
    JsxTagOpen,     // <div
    JsxTagClose,    // </div>
    JsxTagSelfClose,// />
    JsxTagEnd,      // >
    JsxAttrName,    // className
    JsxAttrValue,   // "value"
    JsxText,        // text content
    JsxExprStart,   // {
    JsxExprEnd,     // }

    // Special
    Whitespace,
    Eof,
    Unknown
}
```

## Complete Example

Transform TSX useState hooks to C# properties:

```csharp
public class TsxToCSharpVisitor : TokenVisitor
{
    private readonly StringBuilder _output = new();

    public override void OnBegin(IReadOnlyList<Token> tokens)
    {
        _output.AppendLine("public partial class Component {");
    }

    public override void OnEnd()
    {
        _output.AppendLine("}");
    }

    // Match: const [value, setValue] = useState(initial)
    [TokenPattern(@"\k""const"" ""\["" (\i) "","" (\i) ""\]"" ""="" \i""useState"" ""("" (\n) "")""")]
    public void VisitUseState(string valueName, string setterName, string initial)
    {
        _output.AppendLine($"    private int _{valueName} = {initial};");
        _output.AppendLine($"    public int {Capitalize(valueName)}");
        _output.AppendLine( "    {");
        _output.AppendLine($"        get => _{valueName};");
        _output.AppendLine($"        set {{ _{valueName} = value; OnPropertyChanged(); }}");
        _output.AppendLine( "    }");
    }

    // Match: function ComponentName()
    [TokenPattern(@"\k""function"" (\i) ""(""")]
    public void VisitComponent(string name)
    {
        var body = ExtractFunctionBody();
        Traverse(body, nameof(VisitUseState));
    }

    private static string Capitalize(string s) =>
        char.ToUpper(s[0]) + s[1..];

    public string GetOutput() => _output.ToString();
}

// Usage
var lexer = new TsxLexer(tsxSource);
var visitor = new TsxToCSharpVisitor();
visitor.Visit(lexer.Tokenize());
Console.WriteLine(visitor.GetOutput());
```

## Debugging

Access the visitor call stack for debugging:

```csharp
public class MyVisitor : TokenVisitor
{
    [TokenPattern(@"(\i)")]
    public void VisitIdentifier(string name)
    {
        // See who called us via Traverse
        Console.WriteLine($"Caller: {CurrentCaller}");
        Console.WriteLine($"Stack: {string.Join(" -> ", CallStack)}");
    }
}
```

## Project Structure

```
src/TokenLexer/
├── Tokens/
│   ├── Token.cs           # Token class
│   └── TokenType.cs       # Token type enum
├── Lexer/
│   └── TsxLexer.cs        # TSX/JSX tokenizer
├── Pattern/
│   ├── PatternNode.cs     # Pattern AST nodes
│   └── PatternParser.cs   # Pattern DSL parser
├── Matching/
│   ├── TokenMatch.cs      # Match result
│   └── PatternMatcher.cs  # Pattern execution
├── Attributes/
│   └── TokenPatternAttribute.cs
└── Visitor/
    └── TokenVisitor.cs    # Base visitor class
```

## API Reference

### TokenVisitor

| Method | Description |
|--------|-------------|
| `Visit(tokens)` | Process tokens with default visitors |
| `Visit(tokens, source)` | Process tokens with source for formatting preservation |
| `Traverse(tokens, names...)` | Process tokens with specific visitors |
| `ExtractFunctionBody()` | Extract balanced `{ }` content |
| `ExtractParenthesized()` | Extract balanced `( )` content |
| `ExtractBracketed()` | Extract balanced `[ ]` content |
| `ExtractBalanced(offset, open, close)` | Extract custom balanced content |
| `Enter(tokens)` | Create a TraversalScope |
| `InsertAfter(token, ...tokens)` | Insert tokens after a token |
| `InsertBefore(token, ...tokens)` | Insert tokens before a token |
| `Replace(token, ...tokens)` | Replace a token |
| `Remove(token)` | Remove a token |
| `GetModifiedTokens()` | Get modified token list |
| `GetModifiedSource()` | Get reconstructed source code |
| `SkipTo(token)` | Skip to a token (resumes after it) |
| `SkipToIndex(index)` | Skip to a specific index |
| `SkipBalanced(open, close)` | Skip past a balanced block |

### TokenPatternAttribute

| Property | Type | Description |
|----------|------|-------------|
| `Pattern` | string | The token pattern (required) |
| `Name` | string? | Explicit name for Traverse lookup |
| `Priority` | int | Match priority (higher = first) |
| `Consumes` | bool | Whether to consume matched tokens |
| `From` | string[]? | Restrict to specific callers |

### TokenMatch

| Property | Description |
|----------|-------------|
| `MatchedTokens` | All tokens in the match |
| `Captures` | Array of capture groups |
| `NamedCaptures` | Dictionary of named capture groups |
| `StartIndex` | Start position in token stream |
| `EndIndex` | End position (exclusive) |
| `Pattern` | The pattern that matched |

## See Also

- [ENHANCEMENTS.md](ENHANCEMENTS.md) - Planned improvements and roadmap
