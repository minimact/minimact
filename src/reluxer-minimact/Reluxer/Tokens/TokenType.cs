namespace Reluxer.Tokens;

/// <summary>
/// Represents the type of a lexed token.
/// Maps to pattern shorthand: \k, \i, \s, \n, \o, \p, etc.
/// </summary>
public enum TokenType
{
    // Core token types
    Keyword,        // \k - function, const, let, if, else, return, etc.
    Identifier,     // \i - variable names, function names
    String,         // \s - string literals ("...", '...', `...`)
    Number,         // \n - numeric literals
    Operator,       // \o - +, -, *, /, =, ==, ===, etc.
    Punctuation,    // \p - (, ), {, }, [, ], ;, ,, etc.

    // JSX-specific token types
    JsxTagOpen,     // <tagName
    JsxTagClose,    // </tagName>
    JsxTagSelfClose,// />
    JsxTagEnd,      // >
    JsxAttrName,    // attribute name in JSX
    JsxAttrValue,   // attribute value in JSX
    JsxText,        // text content inside JSX elements
    JsxExprStart,   // {
    JsxExprEnd,     // }

    // TypeScript-specific token types
    Colon,          // \co - : (type annotation separator)
    GenericOpen,    // \go - < (generic type parameter open)
    GenericClose,   // \gc - > (generic type parameter close)
    TypeName,       // \tn - type names (string, number, boolean, void, etc.)
    QuestionMark,   // \qm - ? (optional parameter/property marker)
    Arrow,          // \ar - => (arrow function, but also useful separately)

    // TypeScript advanced type tokens
    TypeOperator,   // \to - typeof, keyof, infer, readonly (type-level operators)
    Extends,        // \ex - extends (in conditional types and constraints)
    TupleOpen,      // \tb - [ in tuple type context
    TupleClose,     // \te - ] in tuple type context
    MappedIn,       // \mi - 'in' keyword in mapped types
    AsConst,        // \ac - 'as const' assertion

    // Decorator
    Decorator,      // \dc - @decorator, @Component, etc.

    // Additional types
    Comment,        // // or /* */
    Whitespace,     // spaces, tabs, newlines
    TemplateString, // template literal parts
    Regex,          // /pattern/flags

    // Special
    Eof,            // end of file
    Unknown         // unrecognized token
}
