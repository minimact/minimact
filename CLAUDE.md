# Reluxer Declarative Coding Guide

This guide explains how to write declarative visitor code in Reluxer. The analyzer enforces these patterns via diagnostics REL001-REL014.

## Core Principle

Methods decorated with `[TokenPattern]` must be **purely declarative**:
- No loops (`for`, `foreach`, `while`, `do`)
- No direct token array indexing
- No `goto` statements
- Prefer pattern matching over manual type checks
- Use `Context` for cross-visitor state instead of mutable fields

## Analyzer Rules Summary

| Rule | Severity | What It Catches |
|------|----------|-----------------|
| REL001 | Error | `for`/`foreach`/`do-while` loops |
| REL003 | Warning | Field mutations (`_field = ...`, `this.field = ...`) |
| REL005 | Error | LINQ iteration on tokens (`Aggregate`, `Where`, `Select`, `TakeWhile`, etc.) |
| REL006 | Info | Manual `token.Type == TokenType.X` checks |
| REL007 | Error | `while` loops |
| REL008 | Error | `goto` statements |
| REL009 | Warning | Recursive calls without `Traverse()` |
| REL010 | Error | Regex usage in generators |
| REL011 | Error | String manipulation in generators (`Substring`, `IndexOf`, `Split`) |
| REL012 | Error | Manual bracket depth tracking |
| REL013 | Error | StringBuilder parsing patterns |
| REL014 | Error | `TokensToString()` in declarative visitors |

## Pattern DSL Reference

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

### Literal Values

Match specific token values using quotes:
```csharp
\k"const"     // Keyword with value "const"
"function"    // Any token with value "function"
"{"           // Punctuation with value "{"
```

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

### JSX Patterns

| Pattern | Matches |
|---------|---------|
| `\jo` | JSX tag open (`<Component`) |
| `\jc` | JSX tag close (`</Component>`) |
| `\je` | JSX tag end (`>` or `/>`) |
| `\ja` | JSX attribute name |
| `\jv` | JSX attribute value |
| `\jt` | JSX text content |

### Balanced Matchers

These are **critical** - use them instead of while loops tracking depth:

| Pattern | Matches |
|---------|---------|
| `\Bp` | Balanced parentheses `(...)` including nested |
| `\Bb` | Balanced braces `{...}` including nested |
| `\Bk` | Balanced brackets `[...]` including nested |
| `\Ba` | Balanced angle brackets `<...>` including nested |

```csharp
// Match function call with any arguments (including nested parens)
[TokenPattern(@"(\i) (\Bp)")]  // foo(a, bar(b, c))

// Match if statement with condition and body
[TokenPattern(@"\k""if"" (\Bp) (\Bb)")]  // if (cond) { body }

// Match array access with any index expression
[TokenPattern(@"(\i) (\Bk)")]  // arr[i + j]

// Match generic type
[TokenPattern(@"(\i) (\Ba)")]  // Map<string, number>
```

### Quantifiers

| Pattern | Meaning |
|---------|---------|
| `X?` | Zero or one |
| `X*` | Zero or more |
| `X+` | One or more |
| `X{n}` | Exactly n |
| `X{n,}` | n or more |
| `X{n,m}` | Between n and m |

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
```

### Alternation

```csharp
// Match keyword OR identifier
[TokenPattern(@"[\k|\i]")]

// Match const OR let OR var
[TokenPattern(@"[\k""const""|\k""let""|\k""var""]")]
```

### Lookahead and Lookbehind

Zero-width assertions that match without consuming tokens:

```csharp
// Positive lookahead: identifier only if followed by (
[TokenPattern(@"(\i)(?=""("")")]  // function call

// Negative lookahead: identifier NOT followed by (
[TokenPattern(@"(\i)(?!""("")")]  // variable, not function

// Positive lookbehind: after specific pattern
[TokenPattern(@"(?<=\k""const"")(\i)")]

// Negative lookbehind: NOT after pattern
[TokenPattern(@"(\i)(?<!""."")")]  // not after dot
```

### Backreferences (Depth-Aware)

```csharp
// Match closing tag with same name as opening
[TokenPattern(@"<(\i)> .* </\1>")]

// Match only when depth returns to 0 (balanced)
[TokenPattern(@"<(\i)> .* </\1@0>")]
```

## Common Migrations

### Loop to Pattern Matching

**Bad (REL001):**
```csharp
for (int i = 0; i < tokens.Length; i++)
{
    if (tokens[i].Type == TokenType.Identifier)
        ProcessIdentifier(tokens[i]);
}
```

**Good:**
```csharp
[TokenPattern(@"(\i)")]
public void VisitIdentifier(TokenMatch match)
{
    var identifier = match.Captures[0].AsIdentifier();
    ProcessIdentifier(identifier);
}
```

### While Loop to Balanced Matcher

**Bad (REL007):**
```csharp
int depth = 0;
int start = i;
while (i < tokens.Length)
{
    if (tokens[i].Value == "(") depth++;
    if (tokens[i].Value == ")") depth--;
    if (depth == 0) break;
    i++;
}
var content = tokens[start..i];
```

**Good:**
```csharp
[TokenPattern(@"(\Bp)")]
public void VisitParenthesized(TokenMatch match)
{
    var content = match.Captures[0].Tokens;
    // Content is everything inside the balanced parens
}
```

### Manual Type Check to Pattern

**Bad (REL006):**
```csharp
if (token.Type == TokenType.Keyword && token.Value == "const")
{
    // handle const
}
```

**Good:**
```csharp
[TokenPattern(@"\k""const"" (\i)")]
public void VisitConstDeclaration(TokenMatch match)
{
    var name = match.Captures[0].AsIdentifier();
}
```

### Field Mutation to Context

**Bad (REL003):**
```csharp
private List<string> _foundIdentifiers = new();

[TokenPattern(@"(\i)")]
public void VisitIdentifier(TokenMatch match)
{
    _foundIdentifiers.Add(match.Captures[0].AsIdentifier());
}
```

**Good:**
```csharp
[TokenPattern(@"(\i)")]
public void VisitIdentifier(TokenMatch match)
{
    var id = match.Captures[0].AsIdentifier();
    var list = Context.GetOrCreate<List<string>>("identifiers");
    list.Add(id);
}
```

### Recursive Call to Traverse

**Bad (REL009):**
```csharp
[TokenPattern(@"...")]
public void VisitBlock(TokenMatch match)
{
    var inner = match.Captures[0].Tokens;
    VisitBlock(new TokenMatch(inner)); // Direct recursion
}
```

**Good:**
```csharp
[TokenPattern(@"...")]
public void VisitBlock(TokenMatch match)
{
    var inner = match.Captures[0].Tokens;
    Traverse(inner, nameof(VisitBlock)); // Proper traversal
}
```

### LINQ Iteration to MatchAll

**Bad (REL005):**
```csharp
var identifiers = tokens
    .Where(t => t.Type == TokenType.Identifier)
    .Select(t => t.Value)
    .ToList();
```

**Good:**
```csharp
var matcher = new PatternMatcher(@"(\i)");
var matches = matcher.MatchAll(tokens);
var identifiers = matches.Select(m => m.Captures[0].AsIdentifier()).ToList();
```

## Generator Rules

Generators emit C# code from the `ComponentModel`. They must NOT re-parse:

**Bad (REL010/REL011/REL012/REL013):**
```csharp
// In generator - DON'T do this
var expr = field.Expression; // string
var parts = expr.Split('.'); // REL011
var match = Regex.Match(expr, @"\w+"); // REL010
```

**Good:**
```csharp
// Store tokens in model during visitor phase
model.ExpressionTokens = match.Captures[0].Tokens;

// In generator - use the tokens
var expr = TokenHelper.Convert(model.ExpressionTokens);
```

## Allowed Patterns

The analyzer allows certain loops when they iterate over **model collections** (not raw tokens):

```csharp
// Allowed - iterating over model data
foreach (var prop in component.Props) { ... }
foreach (var child in element.Children) { ... }
for (int i = 0; i < component.StateFields.Count; i++) { ... }

// Allowed - iterating over pattern match results
foreach (var match in matcher.MatchAll(tokens)) { ... }
```

## Escape Hatch

Use `[AllowImperative]` to opt out during migration:

```csharp
[AllowImperative]
[TokenPattern(@"...")]
public void LegacyVisitor(TokenMatch match)
{
    // Imperative code allowed here
    // TODO: Migrate to declarative
}
```

## Private Methods

If a class contains ANY `[TokenPattern]` methods, ALL private methods are also analyzed. This prevents bypassing enforcement via helper methods.

```csharp
public class MyVisitor
{
    [TokenPattern(@"...")]
    public void Visit(TokenMatch match)
    {
        ProcessTokens(match.Captures[0].Tokens);
    }

    // This is also analyzed!
    private void ProcessTokens(Token[] tokens)
    {
        // Loops here will trigger REL001/REL007
    }
}
```

## LINQ is NOT Declarative

**Do NOT use LINQ methods like `Aggregate`, `TakeWhile`, `Zip`, `SelectMany` to simulate loops.** This is imperative logic disguised as functional code.

**Bad - using Aggregate to build state:**
```csharp
var result = tokens.Aggregate(
    (list: new List<string>(), depth: 0),
    (acc, token) => {
        if (token.Value == "(") acc.depth++;
        if (token.Value == ")") acc.depth--;
        if (acc.depth == 0) acc.list.Add(token.Value);
        return acc;
    });
```

**Bad - using TakeWhile/SkipWhile to find boundaries:**
```csharp
var beforeParen = tokens.TakeWhile(t => t.Value != "(").ToArray();
var afterParen = tokens.SkipWhile(t => t.Value != ")").Skip(1).ToArray();
```

**Bad - using Select with index to track position:**
```csharp
var pairs = tokens.Select((t, i) => (token: t, index: i))
    .Where(x => x.token.Type == TokenType.Identifier)
    .ToList();
```

**Why this is wrong:** You're still thinking imperatively - "iterate through tokens, track state, find boundaries." The pattern DSL already handles this declaratively.

**Good - let the pattern matcher do the work:**
```csharp
// Pattern finds balanced content automatically
[TokenPattern(@"(\i) ""="" (\Bp)")]
public void VisitAssignment(TokenMatch match)
{
    var name = match.Captures[0].AsIdentifier();
    var valueTokens = match.Captures[1].Tokens; // Already extracted!
}

// MatchAll finds all occurrences
var matcher = new PatternMatcher(@"(\i) "":"" (\Bb)");
foreach (var match in matcher.MatchAll(tokens))
{
    // Each match is a complete, valid capture
}
```

**The rule:** If you're using LINQ to iterate over `Token[]` and make decisions based on token values/types, you should be using a pattern instead.

## Lux Extension Methods

Use `Reluxer.Extensions.TokenLinqExtensions` for LINQ-like operations on tokens that use patterns under the hood:

```csharp
using Reluxer.Extensions;

// Instead of: tokens.Where(t => t.Type == TokenType.Identifier)
var identifiers = tokens.LuxWhere(@"\i");

// Instead of: tokens.Select((t, i) => ...).FirstOrDefault(x => x.t.Value == "=>")
var arrowToken = tokens.LuxFind(@"""=>""");

// Get all identifier captures
var ids = tokens.LuxSelect(@"(\i)", m => m.Captures[0].AsIdentifier());

// Split on commas
var parts = tokens.LuxSplit(@""",""");

// Take before/skip after a pattern
var beforeArrow = tokens.LuxTakeBefore(@"""=>""");
var afterArrow = tokens.LuxSkipAfter(@"""=>""");

// Check if pattern exists
if (tokens.LuxContains(@"\k""const""")) { ... }

// Get index of pattern
var idx = tokens.LuxIndexOf(@"""=>""");

// Trim whitespace
var trimmed = tokens.LuxTrimWhitespace();

// Remove all whitespace
var noWs = tokens.LuxNoWhitespace();
```

## Key Principles

1. **Patterns over loops**: Use `[TokenPattern]` with the DSL instead of iterating
2. **Patterns over LINQ**: Use `Lux*` extension methods instead of `Where`/`Select` on tokens
3. **Balanced matchers over depth tracking**: Use `\Bp`, `\Bb`, `\Bk` instead of counting brackets
4. **Context over fields**: Use `Context.Set()`/`Context.Get()` for cross-visitor state
5. **Traverse over recursion**: Use `Traverse(tokens, nameof(Method))` for nested visiting
6. **Tokens over strings**: Store `Token[]` in models, not stringified expressions
7. **MatchAll over LINQ**: Use `PatternMatcher.MatchAll()` or `LuxMatchAll()` instead of `Where`/`Select` on tokens
