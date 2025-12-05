using System.Text;
using Reluxer.Attributes;
using Reluxer.Lexer;
using Reluxer.Matching;
using Reluxer.Pattern;
using Reluxer.Tokens;
using Reluxer.Visitor;

// Sample TSX code with nested functions
var tsxCode = @"
export default function App() {
    const [count, setCount] = useState(0);
    const [name, setName] = useState('');

    function handleClick() {
        const doubled = count * 2;
        setCount(doubled);
    }

    const handleReset = () => {
        setCount(0);
        setName('');
    };

    return (
        <div className=""app"">
            <span>{count}</span>
            <button onClick={handleClick}>Double</button>
        </div>
    );
}
";

Console.WriteLine("=== TSX Source ===");
Console.WriteLine(tsxCode);

// Lex the source
var lexer = new TsxLexer(tsxCode);
var tokens = lexer.Tokenize();

// Test JSX expression handling
Console.WriteLine("\n=== JSX Expression Tokenization Test ===");
TestJsxExpressions();

// Test non-greedy backtracking
Console.WriteLine("\n=== Non-Greedy Backtracking Test ===");
TestNonGreedyBacktracking();

// Test TypeScript type tokenization
Console.WriteLine("\n=== TypeScript Type Tokenization Test ===");
TestTypeScriptTypes();

Console.WriteLine("\n=== Token Manipulation Demo ===");
Console.WriteLine("Adding hexPath attribute to JSX elements:\n");
TestTokenManipulation();

Console.WriteLine("\n=== SkipTo Demo ===");
Console.WriteLine("Testing fast-forward through token stream:\n");
TestSkipTo();

Console.WriteLine("\n=== Pattern Macros Demo ===");
Console.WriteLine("Using \\la, \\fc, \\ty and other pattern macros:\n");

var macroVisitor = new MacroDemoVisitor();
macroVisitor.Visit(tokens);
Console.WriteLine(macroVisitor.GetOutput());

Console.WriteLine("\n=== Inject Demo ===");
Console.WriteLine("Demonstrating [Inject] attribute for passing values between visitors:\n");

var injectVisitor = new InjectDemoVisitor();
injectVisitor.Visit(tokens);
Console.WriteLine(injectVisitor.GetOutput());

Console.WriteLine("\n=== Scoped Traversal Demo ===");
Console.WriteLine("Using 'From' to restrict which visitors can call other visitors:\n");

var visitor = new ScopedVisitor();
visitor.Visit(tokens);
Console.WriteLine(visitor.GetOutput());


// =====================================================
// Test: Non-Greedy Backtracking
// =====================================================

void TestNonGreedyBacktracking()
{
    // Test 1: Basic non-greedy with terminator
    // Pattern: const x = .*? ;
    // Should match "const x = 5 ;" and capture "5"
    {
        var code = "const x = 5;";
        var testLexer = new TsxLexer(code);
        var testTokens = testLexer.Tokenize();

        var matcher = new PatternMatcher(@"\k""const"" (\i) ""="" (.*?) "";""");
        var result = matcher.TryMatch(testTokens, 0, out var match);

        if (result && match != null && match.Captures.Length >= 2)
        {
            var varName = match.Captures[0].Value;
            var value = match.Captures[1].Value;
            if (varName == "x" && value == "5")
            {
                Console.WriteLine("  [PASS] Basic non-greedy: const x = 5;");
            }
            else
            {
                Console.WriteLine($"  [FAIL] Basic non-greedy: expected x/5, got {varName}/{value}");
            }
        }
        else
        {
            Console.WriteLine($"  [FAIL] Basic non-greedy: no match (result={result})");
        }
    }

    // Test 2: Non-greedy with multiple tokens before terminator
    {
        var code = "const y = a + b * c;";
        var testLexer = new TsxLexer(code);
        var testTokens = testLexer.Tokenize();

        var matcher = new PatternMatcher(@"\k""const"" (\i) ""="" (.*?) "";""");
        var result = matcher.TryMatch(testTokens, 0, out var match);

        if (result && match != null && match.Captures.Length >= 2)
        {
            var varName = match.Captures[0].Value;
            var value = match.Captures[1].Value;
            // The captured value should be "a+b*c" (all tokens concatenated)
            if (varName == "y" && value == "a+b*c")
            {
                Console.WriteLine("  [PASS] Multi-token non-greedy: const y = a + b * c;");
            }
            else
            {
                Console.WriteLine($"  [FAIL] Multi-token non-greedy: expected y/a+b*c, got {varName}/{value}");
            }
        }
        else
        {
            Console.WriteLine($"  [FAIL] Multi-token non-greedy: no match");
        }
    }

    // Test 3: Non-greedy stops at first match
    {
        var code = "x; y;";
        var testLexer = new TsxLexer(code);
        var testTokens = testLexer.Tokenize();

        var matcher = new PatternMatcher(@"(.*?) "";""");
        var result = matcher.TryMatch(testTokens, 0, out var match);

        if (result && match != null && match.Captures.Length >= 1)
        {
            var captured = match.Captures[0].Value;
            if (captured == "x")
            {
                Console.WriteLine("  [PASS] Non-greedy stops at first: x; y;");
            }
            else
            {
                Console.WriteLine($"  [FAIL] Non-greedy stops at first: expected x, got {captured}");
            }
        }
        else
        {
            Console.WriteLine($"  [FAIL] Non-greedy stops at first: no match");
        }
    }

    // Test 4: Greedy backtracking (for comparison)
    {
        var code = "a b c;";
        var testLexer = new TsxLexer(code);
        var testTokens = testLexer.Tokenize();

        var matcher = new PatternMatcher(@"(.*) "";""");
        var result = matcher.TryMatch(testTokens, 0, out var match);

        if (result && match != null && match.Captures.Length >= 1)
        {
            var captured = match.Captures[0].Value;
            if (captured == "abc")
            {
                Console.WriteLine("  [PASS] Greedy backtracking: a b c;");
            }
            else
            {
                Console.WriteLine($"  [FAIL] Greedy backtracking: expected abc, got {captured}");
            }
        }
        else
        {
            Console.WriteLine($"  [FAIL] Greedy backtracking: no match");
        }
    }

    // Test 5: +? (one or more, non-greedy)
    // Note: (.+?) ";" on "a b;" should capture "ab" because:
    //   - After matching just "a", next token is "b" not ";" - can't stop
    //   - After matching "a b", next token is ";" - success
    {
        var code = "a b;";
        var testLexer = new TsxLexer(code);
        var testTokens = testLexer.Tokenize();

        var matcher = new PatternMatcher(@"(.+?) "";""");
        var result = matcher.TryMatch(testTokens, 0, out var match);

        if (result && match != null && match.Captures.Length >= 1)
        {
            var captured = match.Captures[0].Value;
            if (captured == "ab")
            {
                Console.WriteLine("  [PASS] +? non-greedy: a b; -> captures 'ab'");
            }
            else
            {
                Console.WriteLine($"  [FAIL] +? non-greedy: expected ab, got {captured}");
            }
        }
        else
        {
            Console.WriteLine($"  [FAIL] +? non-greedy: no match");
        }
    }

    // Test 6: Non-greedy with no match possible
    {
        var code = "a b c";  // No semicolon
        var testLexer = new TsxLexer(code);
        var testTokens = testLexer.Tokenize();

        var matcher = new PatternMatcher(@"(.*?) "";""");
        var result = matcher.TryMatch(testTokens, 0, out var match);

        if (!result)
        {
            Console.WriteLine("  [PASS] Non-greedy no match: a b c (no semicolon)");
        }
        else
        {
            Console.WriteLine($"  [FAIL] Non-greedy no match: should not match");
        }
    }
}

// =====================================================
// Test: TypeScript Type Tokenization
// =====================================================

void TestTypeScriptTypes()
{
    // Test 1: Simple type annotation
    TypeTestCase("Simple type annotation", "const x: string = 'hello';", new[] {
        "Keyword:const", "Identifier:x", "Colon::", "TypeName:string", "Operator:=", "String:'hello'", "Punctuation:;"
    });

    // Test 2: Function parameter types
    TypeTestCase("Function parameter types", "function foo(x: number, y: boolean): void {}", new[] {
        "Keyword:function", "Identifier:foo", "Punctuation:(", "Identifier:x", "Colon::", "TypeName:number",
        "Punctuation:,", "Identifier:y", "Colon::", "TypeName:boolean", "Punctuation:)",
        "Colon::", "TypeName:void", "Punctuation:{", "Punctuation:}"
    });

    // Test 3: Generic type
    TypeTestCase("Generic type", "const arr: Array<number> = [];", new[] {
        "Keyword:const", "Identifier:arr", "Colon::", "TypeName:Array", "GenericOpen:<", "TypeName:number", "GenericClose:>",
        "Operator:=", "Punctuation:[", "Punctuation:]", "Punctuation:;"
    });

    // Test 4: Nested generics
    TypeTestCase("Nested generics", "const map: Map<string, Array<number>> = new Map();", new[] {
        "Keyword:const", "Identifier:map", "Colon::", "TypeName:Map", "GenericOpen:<", "TypeName:string", "Punctuation:,",
        "TypeName:Array", "GenericOpen:<", "TypeName:number", "GenericClose:>", "GenericClose:>",
        "Operator:=", "Keyword:new", "Identifier:Map", "Punctuation:(", "Punctuation:)", "Punctuation:;"
    });

    // Test 5: Union type
    TypeTestCase("Union type", "let x: string | number;", new[] {
        "Keyword:let", "Identifier:x", "Colon::", "TypeName:string", "Operator:|", "TypeName:number", "Punctuation:;"
    });

    // Test 6: Arrow function type annotation
    // Inside type annotation, parens contain type parameters with proper type recognition
    // The => in the type is Arrow, and string is TypeName
    TypeTestCase("Arrow function with types", "const fn: (x: number) => string = (x) => x.toString();", new[] {
        "Keyword:const", "Identifier:fn", "Colon::", "Punctuation:(", "TypeName:x", "Colon::", "TypeName:number",
        "Punctuation:)", "Arrow:=>", "TypeName:string", "Operator:=", "Punctuation:(", "Identifier:x", "Punctuation:)",
        "Operator:=>", "Identifier:x", "Punctuation:.", "Identifier:toString", "Punctuation:(", "Punctuation:)", "Punctuation:;"
    });

    // Test 7: Generic function
    // After return type T and {, type mode exits so function body is normal JS
    TypeTestCase("Generic function", "function identity<T>(x: T): T { return x; }", new[] {
        "Keyword:function", "Identifier:identity", "GenericOpen:<", "TypeName:T", "GenericClose:>",
        "Punctuation:(", "Identifier:x", "Colon::", "TypeName:T", "Punctuation:)", "Colon::", "TypeName:T",
        "Punctuation:{", "Keyword:return", "Identifier:x", "Punctuation:;", "Punctuation:}"
    });

    // Test 8: Object type literal
    // Note: Inside object type literal { name: string }, property colons are Colon (type annotation context)
    TypeTestCase("Object type literal", "let obj: { name: string, age: number };", new[] {
        "Keyword:let", "Identifier:obj", "Colon::", "Punctuation:{", "Identifier:name", "Colon::", "TypeName:string",
        "Punctuation:,", "Identifier:age", "Colon::", "TypeName:number", "Punctuation:}", "Punctuation:;"
    });

    // Test 9: Array type shorthand
    TypeTestCase("Array type shorthand", "const nums: number[] = [1, 2, 3];", new[] {
        "Keyword:const", "Identifier:nums", "Colon::", "TypeName:number", "Punctuation:[]", "Operator:=",
        "Punctuation:[", "Number:1", "Punctuation:,", "Number:2", "Punctuation:,", "Number:3", "Punctuation:]", "Punctuation:;"
    });

    // Test 10: Optional parameter
    // After name?, the : now correctly enters type annotation mode
    TypeTestCase("Optional parameter", "function greet(name?: string): void {}", new[] {
        "Keyword:function", "Identifier:greet", "Punctuation:(", "Identifier:name", "Operator:?", "Colon::", "TypeName:string",
        "Punctuation:)", "Colon::", "TypeName:void", "Punctuation:{", "Punctuation:}"
    });

    // Test 11: Tuple type
    TypeTestCase("Tuple type", "let point: [number, number] = [0, 0];", new[] {
        "Keyword:let", "Identifier:point", "Colon::", "TupleOpen:[", "TypeName:number", "Punctuation:,", "TypeName:number", "TupleClose:]",
        "Operator:=", "Punctuation:[", "Number:0", "Punctuation:,", "Number:0", "Punctuation:]", "Punctuation:;"
    });

    // Test 12: typeof type operator
    // Note: y after typeof is TypeName because single-char identifiers in type position become TypeName
    TypeTestCase("typeof operator", "let x: typeof y;", new[] {
        "Keyword:let", "Identifier:x", "Colon::", "TypeOperator:typeof", "TypeName:y", "Punctuation:;"
    });

    // Test 13: keyof type operator
    TypeTestCase("keyof operator", "type Keys = keyof MyType;", new[] {
        "Keyword:type", "Identifier:Keys", "Operator:=", "TypeOperator:keyof", "TypeName:MyType", "Punctuation:;"
    });

    // Test 14: Conditional type with extends
    TypeTestCase("Conditional type", "type Check<T> = T extends string ? 'yes' : 'no';", new[] {
        "Keyword:type", "Identifier:Check", "GenericOpen:<", "TypeName:T", "GenericClose:>", "Operator:=",
        "TypeName:T", "Extends:extends", "TypeName:string", "QuestionMark:?", "String:'yes'", "Colon::", "String:'no'", "Punctuation:;"
    });

    // Test 15: infer keyword in conditional type
    // Note: args becomes TypeName because single-char identifiers in type position use the heuristic
    TypeTestCase("infer keyword", "type ReturnType<T> = T extends (...args: any) => infer R ? R : never;", new[] {
        "Keyword:type", "Identifier:ReturnType", "GenericOpen:<", "TypeName:T", "GenericClose:>", "Operator:=",
        "TypeName:T", "Extends:extends", "Punctuation:(", "Operator:...", "Identifier:args", "Colon::", "TypeName:any", "Punctuation:)",
        "Arrow:=>", "TypeOperator:infer", "TypeName:R", "QuestionMark:?", "TypeName:R", "Colon::", "TypeName:never", "Punctuation:;"
    });

    // Test 16: Mapped type
    TypeTestCase("Mapped type", "type Readonly<T> = { readonly [K in keyof T]: T[K] };", new[] {
        "Keyword:type", "Identifier:Readonly", "GenericOpen:<", "TypeName:T", "GenericClose:>", "Operator:=",
        "Punctuation:{", "TypeOperator:readonly", "TupleOpen:[", "TypeName:K", "MappedIn:in", "TypeOperator:keyof", "TypeName:T", "TupleClose:]",
        "Colon::", "TypeName:T", "TupleOpen:[", "TypeName:K", "TupleClose:]", "Punctuation:}", "Punctuation:;"
    });

    // Test 17: Template literal type
    TypeTestCase("Template literal type", "type Greeting = `Hello ${string}`;", new[] {
        "Keyword:type", "Identifier:Greeting", "Operator:=", "TemplateString:`Hello ${string}`", "Punctuation:;"
    });

    // Test 18: Intersection type
    TypeTestCase("Intersection type", "type Combined = TypeA & TypeB;", new[] {
        "Keyword:type", "Identifier:Combined", "Operator:=", "TypeName:TypeA", "Operator:&", "TypeName:TypeB", "Punctuation:;"
    });

    // Test 19: Complex nested type
    TypeTestCase("Complex nested type", "type Deep<T> = T extends Array<infer U> ? Deep<U> : T;", new[] {
        "Keyword:type", "Identifier:Deep", "GenericOpen:<", "TypeName:T", "GenericClose:>", "Operator:=",
        "TypeName:T", "Extends:extends", "TypeName:Array", "GenericOpen:<", "TypeOperator:infer", "TypeName:U", "GenericClose:>",
        "QuestionMark:?", "TypeName:Deep", "GenericOpen:<", "TypeName:U", "GenericClose:>", "Colon::", "TypeName:T", "Punctuation:;"
    });

    // Test 20: Advanced type pattern matching
    TestAdvancedTypePatterns();

    // Test 21: Pattern matching with new shorthands
    TestTypePatternMatching();

    // Test 22: Regex literal detection
    Console.WriteLine("\n  Regex literal detection:");
    TestRegexLiterals();

    // Test 23: 'as' type assertions
    Console.WriteLine("\n  'as' type assertions:");
    TestAsTypeAssertions();

    // Test 24: Pattern matching - lookahead/lookbehind
    Console.WriteLine("\n  Pattern lookahead/lookbehind assertions:");
    TestLookaheadLookbehind();

    // Test 25: Named capture groups and backreferences
    Console.WriteLine("\n  Named capture groups:");
    TestNamedCaptureGroups();

    // Test 26: Balanced bracket matching
    Console.WriteLine("\n  Balanced bracket matching:");
    TestBalancedBrackets();
}

void TypeTestCase(string name, string code, string[] expected)
{
    var testLexer = new TsxLexer(code);
    var testTokens = testLexer.Tokenize();

    // Filter to relevant tokens
    var actual = testTokens
        .Where(t => t.Type != TokenType.Whitespace && t.Type != TokenType.Eof)
        .Select(t => $"{t.Type}:{t.Value}")
        .ToArray();

    bool pass = actual.Length == expected.Length;
    if (pass)
    {
        for (int i = 0; i < actual.Length; i++)
        {
            if (actual[i] != expected[i])
            {
                pass = false;
                break;
            }
        }
    }

    if (pass)
    {
        Console.WriteLine($"  [PASS] {name}");
    }
    else
    {
        Console.WriteLine($"  [FAIL] {name}");
        Console.WriteLine($"    Code: {code}");
        Console.WriteLine($"    Expected: {string.Join(", ", expected)}");
        Console.WriteLine($"    Actual:   {string.Join(", ", actual)}");
    }
}

void TestAdvancedTypePatterns()
{
    Console.WriteLine("\n  Advanced type pattern matching:");

    // Test \op - TypeOperator (renamed from \to)
    {
        var code = "type Keys = keyof T;";
        var testLexer = new TsxLexer(code);
        var testTokens = testLexer.Tokenize();

        var matcher = new PatternMatcher(@"\k""type"" (\i) \o \op (\tn)");
        var result = matcher.TryMatch(testTokens, 0, out var match);

        if (result && match != null && match.Captures.Length >= 2 && match.Captures[0].Value == "Keys")
        {
            Console.WriteLine("    [PASS] \\op matches TypeOperator (keyof)");
        }
        else
        {
            Console.WriteLine($"    [FAIL] \\op pattern - result={result}, captures={match?.Captures.Length ?? 0}");
        }
    }

    // Test \xt - Extends (renamed from \ex to avoid conflict with export macro)
    {
        var code = "type Check<T> = T extends string ? 'yes' : 'no';";
        var testLexer = new TsxLexer(code);
        var testTokens = testLexer.Tokenize();

        // Match extends token using \xt shorthand
        var matcher = new PatternMatcher(@"\xt");
        var result = matcher.TryMatch(testTokens, 7, out var match); // Index 7 should be 'extends'

        if (result && match != null)
        {
            Console.WriteLine("    [PASS] \\xt matches Extends keyword");
        }
        else
        {
            Console.WriteLine($"    [FAIL] \\xt pattern - result={result}");
        }
    }

    // Test \tl and \tr - Tuple brackets (renamed from \tb/\te to avoid ternary conflict)
    {
        var code = "let point: [number, string];";
        var testLexer = new TsxLexer(code);
        var testTokens = testLexer.Tokenize();

        // Use \cl for Colon token type (renamed from \co)
        var matcher = new PatternMatcher(@"\k""let"" (\i) \cl \tl (\tn) "","" (\tn) \tr");
        var result = matcher.TryMatch(testTokens, 0, out var match);

        if (result && match != null && match.Captures.Length >= 3 &&
            match.Captures[0].Value == "point" && match.Captures[1].Value == "number" && match.Captures[2].Value == "string")
        {
            Console.WriteLine("    [PASS] \\tl/\\tr match tuple brackets");
        }
        else
        {
            Console.WriteLine($"    [FAIL] \\tl/\\tr pattern - result={result}, captures={match?.Captures.Length ?? 0}");
        }
    }

    // Test \mn - MappedIn (mapped 'in')
    {
        var code = "type Readonly<T> = { [K in keyof T]: T[K] };";
        var testLexer = new TsxLexer(code);
        var testTokens = testLexer.Tokenize();

        // Use new shorthand names: \tl for TupleOpen, \mn for MappedIn, \op for TypeOperator
        var matcher = new PatternMatcher(@"\k""type"" (\i) .* \tl (\tn) \mn \op");
        var result = matcher.TryMatch(testTokens, 0, out var match);

        if (result && match != null && match.Captures.Length >= 2 && match.Captures[0].Value == "Readonly" && match.Captures[1].Value == "K")
        {
            Console.WriteLine("    [PASS] \\mn matches 'in' in mapped types");
        }
        else
        {
            Console.WriteLine($"    [FAIL] \\mn pattern - result={result}, captures={match?.Captures.Length ?? 0}");
        }
    }

    // Test \dc - Decorator
    {
        var code = "@Component class MyClass {}";
        var testLexer = new TsxLexer(code);
        var testTokens = testLexer.Tokenize();

        var matcher = new PatternMatcher(@"\dc \k""class"" (\i)");
        var result = matcher.TryMatch(testTokens, 0, out var match);

        if (result && match != null && match.Captures.Length >= 1 && match.Captures[0].Value == "MyClass")
        {
            Console.WriteLine("    [PASS] \\dc matches decorators");
        }
        else
        {
            Console.WriteLine($"    [FAIL] \\dc pattern - result={result}, captures={match?.Captures.Length ?? 0}");
        }
    }
}

void TestLookaheadLookbehind()
{
    // Test 1: Positive lookahead - match identifier only if followed by (
    // Pattern: \i(?="(") - matches function name before call
    {
        var code = "foo(x)";
        var testLexer = new TsxLexer(code);
        var testTokens = testLexer.Tokenize();

        var matcher = new PatternMatcher(@"(\i)(?=""("")");
        var result = matcher.TryMatch(testTokens, 0, out var match);

        if (result && match != null && match.Captures.Length >= 1 && match.Captures[0].Value == "foo")
        {
            Console.WriteLine("    [PASS] Positive lookahead: \\i(?=\"(\") matches 'foo' in foo(x)");
        }
        else
        {
            Console.WriteLine($"    [FAIL] Positive lookahead - result={result}, captures={match?.Captures.Length ?? 0}");
        }
    }

    // Test 2: Negative lookahead - match identifier NOT followed by (
    // Pattern: \i(?!"(") - matches variable name, not function call
    {
        var code = "bar + foo(x)";
        var testLexer = new TsxLexer(code);
        var testTokens = testLexer.Tokenize();

        var matcher = new PatternMatcher(@"(\i)(?!""("")");
        var result = matcher.TryMatch(testTokens, 0, out var match);

        if (result && match != null && match.Captures.Length >= 1 && match.Captures[0].Value == "bar")
        {
            Console.WriteLine("    [PASS] Negative lookahead: \\i(?!\"(\") matches 'bar' not 'foo'");
        }
        else
        {
            Console.WriteLine($"    [FAIL] Negative lookahead - result={result}, value={match?.Captures[0].Value ?? "null"}");
        }
    }

    // Test 3: Lookahead doesn't consume tokens
    {
        var code = "const x = 1;";
        var testLexer = new TsxLexer(code);
        var testTokens = testLexer.Tokenize();

        // Pattern matches 'const' and captures 'x', with lookahead checking for =
        var matcher = new PatternMatcher(@"\k""const"" (\i)(?=""="") ""=""");
        var result = matcher.TryMatch(testTokens, 0, out var match);

        if (result && match != null && match.Captures.Length >= 1 && match.Captures[0].Value == "x")
        {
            Console.WriteLine("    [PASS] Lookahead doesn't consume: matched 'const x =' with lookahead");
        }
        else
        {
            Console.WriteLine($"    [FAIL] Lookahead consume test - result={result}");
        }
    }

    // Test 4: Positive lookbehind - match only if preceded by specific token
    {
        var code = "const x = 42;";
        var testLexer = new TsxLexer(code);
        var testTokens = testLexer.Tokenize();

        // Match: const <identifier> = <number>
        // The lookbehind verifies that we matched 'const' before the identifier
        var matcher = new PatternMatcher(@"\k""const"" (?<=\k""const"")(\i) ""="" \n");
        var result = matcher.TryMatch(testTokens, 0, out var match);

        // Note: lookbehind checks the tokens we've already matched
        if (result && match != null && match.Captures.Length >= 1 && match.Captures[0].Value == "x")
        {
            Console.WriteLine("    [PASS] Positive lookbehind: matched identifier after 'const'");
        }
        else
        {
            Console.WriteLine($"    [FAIL] Positive lookbehind - result={result}");
        }
    }

    // Test 5: Negative lookbehind - match identifier NOT after .
    {
        var code = "foo.bar + baz";
        var testLexer = new TsxLexer(code);
        var testTokens = testLexer.Tokenize();

        // Match first identifier (foo), which is not preceded by .
        var matcher = new PatternMatcher(@"(\i)(?<!""."")");
        var result = matcher.TryMatch(testTokens, 0, out var match);

        if (result && match != null && match.Captures.Length >= 1 && match.Captures[0].Value == "foo")
        {
            Console.WriteLine("    [PASS] Negative lookbehind: first \\i not after '.' is 'foo'");
        }
        else
        {
            Console.WriteLine($"    [FAIL] Negative lookbehind - result={result}, value={match?.Captures[0].Value ?? "null"}");
        }
    }
}

void TestSkipTo()
{
    // Test: Visitor that processes functions but skips their bodies
    var code = @"function foo() {
    const x = 1;
    const y = 2;
}
const outer = 3;
function bar() {
    const z = 4;
}";

    var testLexer = new TsxLexer(code);
    var testTokens = testLexer.Tokenize();

    var visitor = new SkipBodyVisitor();
    visitor.Visit(testTokens);

    Console.WriteLine("Functions found: " + string.Join(", ", visitor.Functions));
    Console.WriteLine("Outer consts found: " + string.Join(", ", visitor.OuterConsts));

    // Should find both functions but only the outer const (not x, y, z inside bodies)
    if (visitor.Functions.Count == 2 &&
        visitor.Functions.Contains("foo") &&
        visitor.Functions.Contains("bar") &&
        visitor.OuterConsts.Count == 1 &&
        visitor.OuterConsts.Contains("outer"))
    {
        Console.WriteLine("    [PASS] SkipTo correctly skipped function bodies");
    }
    else
    {
        Console.WriteLine("    [FAIL] SkipTo did not work as expected");
    }
}

void TestTokenManipulation()
{
    // Test: Add hexPath attribute to JSX elements
    var jsxCode = @"function App() {
    return (
        <div className=""container"">
            <span id=""label"">Hello</span>
            <button onClick={handleClick}>Click</button>
        </div>
    );
}";

    Console.WriteLine("Original:");
    Console.WriteLine(jsxCode);
    Console.WriteLine();

    var testLexer = new TsxLexer(jsxCode);
    var testTokens = testLexer.Tokenize();

    var visitor = new HexPathVisitor();
    visitor.Visit(testTokens, jsxCode);  // Pass original source for formatting preservation

    var modifiedSource = visitor.GetModifiedSource();
    Console.WriteLine("Modified (with hexPath attributes):");
    Console.WriteLine(modifiedSource);
    Console.WriteLine();

    // Verify the modifications
    if (modifiedSource.Contains("hexPath="))
    {
        Console.WriteLine("    [PASS] hexPath attributes were inserted");
    }
    else
    {
        Console.WriteLine("    [FAIL] hexPath attributes not found");
    }
}

void TestBalancedBrackets()
{
    // Test 1: Simple balanced parentheses
    {
        var code = "foo(a, b)";
        var testLexer = new TsxLexer(code);
        var testTokens = testLexer.Tokenize();

        // \Bp matches balanced parentheses including content
        var matcher = new PatternMatcher(@"\i \Bp");
        var result = matcher.TryMatch(testTokens, 0, out var match);

        if (result && match != null && match.MatchedTokens.Length == 6) // foo ( a , b )
        {
            Console.WriteLine("    [PASS] Balanced parens: foo(a, b) matched");
        }
        else
        {
            Console.WriteLine($"    [FAIL] Balanced parens - result={result}, tokens={match?.MatchedTokens.Length ?? 0}");
        }
    }

    // Test 2: Nested balanced parentheses
    {
        var code = "foo((a + b), c)";
        var testLexer = new TsxLexer(code);
        var testTokens = testLexer.Tokenize();

        var matcher = new PatternMatcher(@"\i \Bp");
        var result = matcher.TryMatch(testTokens, 0, out var match);

        if (result && match != null && match.MatchedTokens.Length == 10) // foo ( ( a + b ) , c )
        {
            Console.WriteLine("    [PASS] Nested balanced parens: foo((a + b), c) matched");
        }
        else
        {
            Console.WriteLine($"    [FAIL] Nested balanced parens - result={result}, tokens={match?.MatchedTokens.Length ?? 0}");
        }
    }

    // Test 3: Balanced braces
    {
        var code = "if (x) { return y; }";
        var testLexer = new TsxLexer(code);
        var testTokens = testLexer.Tokenize();

        // Match: if (x) { ... }
        var matcher = new PatternMatcher(@"\k""if"" \Bp \Bb");
        var result = matcher.TryMatch(testTokens, 0, out var match);

        if (result && match != null)
        {
            Console.WriteLine("    [PASS] Balanced braces: if (x) { return y; } matched");
        }
        else
        {
            Console.WriteLine($"    [FAIL] Balanced braces - result={result}");
        }
    }

    // Test 4: Balanced brackets
    {
        var code = "arr[i + j]";
        var testLexer = new TsxLexer(code);
        var testTokens = testLexer.Tokenize();

        var matcher = new PatternMatcher(@"\i \Bk");
        var result = matcher.TryMatch(testTokens, 0, out var match);

        if (result && match != null)
        {
            Console.WriteLine("    [PASS] Balanced brackets: arr[i + j] matched");
        }
        else
        {
            Console.WriteLine($"    [FAIL] Balanced brackets - result={result}");
        }
    }

    // Test 5: Deeply nested brackets
    {
        var code = "foo(bar(baz(x)))";
        var testLexer = new TsxLexer(code);
        var testTokens = testLexer.Tokenize();

        var matcher = new PatternMatcher(@"(\i) \Bp");
        var result = matcher.TryMatch(testTokens, 0, out var match);

        if (result && match != null && match.Captures.Length >= 1 && match.Captures[0].Value == "foo")
        {
            Console.WriteLine("    [PASS] Deep nesting: foo(bar(baz(x))) matched, captured 'foo'");
        }
        else
        {
            Console.WriteLine($"    [FAIL] Deep nesting - result={result}");
        }
    }

    // Test 6: Unbalanced should not match
    {
        var code = "foo(a, b";  // Missing closing paren
        var testLexer = new TsxLexer(code);
        var testTokens = testLexer.Tokenize();

        var matcher = new PatternMatcher(@"\i \Bp");
        var result = matcher.TryMatch(testTokens, 0, out var match);

        if (!result)
        {
            Console.WriteLine("    [PASS] Unbalanced rejected: foo(a, b did NOT match");
        }
        else
        {
            Console.WriteLine($"    [FAIL] Unbalanced should not match");
        }
    }
}

void TestNamedCaptureGroups()
{
    // Test 1: Named capture group and backreference
    {
        var code = "const foo = foo;";
        var testLexer = new TsxLexer(code);
        var testTokens = testLexer.Tokenize();

        // Use named capture (?<name>\i) and backreference \k<name>
        var matcher = new PatternMatcher(@"\k""const"" (?<varName>\i) ""="" \k<varName>");
        var result = matcher.TryMatch(testTokens, 0, out var match);

        if (result && match != null)
        {
            Console.WriteLine("    [PASS] Named capture and backref: const foo = foo matched");
        }
        else
        {
            Console.WriteLine($"    [FAIL] Named capture and backref - result={result}");
        }
    }

    // Test 2: Named backref should NOT match different value
    {
        var code = "const foo = bar;";
        var testLexer = new TsxLexer(code);
        var testTokens = testLexer.Tokenize();

        var matcher = new PatternMatcher(@"\k""const"" (?<varName>\i) ""="" \k<varName>");
        var result = matcher.TryMatch(testTokens, 0, out var match);

        if (!result)
        {
            Console.WriteLine("    [PASS] Named backref mismatch: const foo = bar did NOT match");
        }
        else
        {
            Console.WriteLine($"    [FAIL] Named backref should not match different values");
        }
    }

    // Test 3: Access named capture from match result
    {
        var code = "function myFunc() {}";
        var testLexer = new TsxLexer(code);
        var testTokens = testLexer.Tokenize();

        // Note: Use token type \k (keyword) with value, then named group for identifier
        var matcher = new PatternMatcher(@"\k""function"" (?<funcName>\i) ""(""");
        var result = matcher.TryMatch(testTokens, 0, out var match);

        if (result && match != null && match.NamedCaptures != null &&
            match.NamedCaptures.TryGetValue("funcName", out var capture) &&
            capture.Value == "myFunc")
        {
            Console.WriteLine("    [PASS] Named capture access: funcName = 'myFunc'");
        }
        else
        {
            Console.WriteLine($"    [FAIL] Named capture access - result={result}");
        }
    }
}

void TestAsTypeAssertions()
{
    // Test 1: Simple as assertion
    TypeTestCase("Simple as assertion", "x as string", new[] {
        "Identifier:x", "Keyword:as", "TypeName:string"
    });

    // Test 2: as const assertion
    TypeTestCase("as const assertion", "const x = 'hello' as const;", new[] {
        "Keyword:const", "Identifier:x", "Operator:=", "String:'hello'", "Keyword:as", "Keyword:const", "Punctuation:;"
    });

    // Test 3: as with complex type
    TypeTestCase("as with complex type", "value as string | number", new[] {
        "Identifier:value", "Keyword:as", "TypeName:string", "Operator:|", "TypeName:number"
    });

    // Test 4: as after function call
    TypeTestCase("as after call", "getValue() as string", new[] {
        "Identifier:getValue", "Punctuation:(", "Punctuation:)", "Keyword:as", "TypeName:string"
    });

    // Test 5: as after array access
    TypeTestCase("as after array access", "arr[0] as number", new[] {
        "Identifier:arr", "Punctuation:[", "Number:0", "Punctuation:]", "Keyword:as", "TypeName:number"
    });

    // Test 6: as after number literal
    TypeTestCase("as after number", "42 as const", new[] {
        "Number:42", "Keyword:as", "Keyword:const"
    });

    // Test 7: as with generic type
    TypeTestCase("as with generic", "value as Array<string>", new[] {
        "Identifier:value", "Keyword:as", "TypeName:Array", "GenericOpen:<", "TypeName:string", "GenericClose:>"
    });

    // Test 8: as in expression with semicolon
    TypeTestCase("as in statement", "const x = y as number;", new[] {
        "Keyword:const", "Identifier:x", "Operator:=", "Identifier:y", "Keyword:as", "TypeName:number", "Punctuation:;"
    });

    // Test 9: Double as assertion
    TypeTestCase("Double as", "x as unknown as string", new[] {
        "Identifier:x", "Keyword:as", "TypeName:unknown", "Keyword:as", "TypeName:string"
    });

    // Test 10: as after parenthesized expression
    TypeTestCase("as after paren expr", "(a + b) as number", new[] {
        "Punctuation:(", "Identifier:a", "Operator:+", "Identifier:b", "Punctuation:)", "Keyword:as", "TypeName:number"
    });
}

void TestRegexLiterals()
{
    // Test 1: Simple regex literal
    TypeTestCase("Simple regex", "const re = /pattern/;", new[] {
        "Keyword:const", "Identifier:re", "Operator:=", "Regex:/pattern/", "Punctuation:;"
    });

    // Test 2: Regex with flags
    TypeTestCase("Regex with flags", "const re = /test/gi;", new[] {
        "Keyword:const", "Identifier:re", "Operator:=", "Regex:/test/gi", "Punctuation:;"
    });

    // Test 3: Division operator (not regex)
    TypeTestCase("Division operator", "const x = a / b;", new[] {
        "Keyword:const", "Identifier:x", "Operator:=", "Identifier:a", "Operator:/", "Identifier:b", "Punctuation:;"
    });

    // Test 4: Regex after return
    TypeTestCase("Regex after return", "return /test/.test(x);", new[] {
        "Keyword:return", "Regex:/test/", "Punctuation:.", "Identifier:test", "Punctuation:(", "Identifier:x", "Punctuation:)", "Punctuation:;"
    });

    // Test 5: Division after closing paren (not regex)
    TypeTestCase("Division after paren", "(a + b) / c", new[] {
        "Punctuation:(", "Identifier:a", "Operator:+", "Identifier:b", "Punctuation:)", "Operator:/", "Identifier:c"
    });

    // Test 6: Regex in condition
    TypeTestCase("Regex in condition", "if (/test/.test(x)) {}", new[] {
        "Keyword:if", "Punctuation:(", "Regex:/test/", "Punctuation:.", "Identifier:test", "Punctuation:(", "Identifier:x", "Punctuation:)", "Punctuation:)", "Punctuation:{", "Punctuation:}"
    });

    // Test 7: Regex with character class
    TypeTestCase("Regex with char class", "const re = /[a-z]/;", new[] {
        "Keyword:const", "Identifier:re", "Operator:=", "Regex:/[a-z]/", "Punctuation:;"
    });

    // Test 8: Regex with escaped slash
    TypeTestCase("Regex with escaped slash", "const re = /a\\/b/;", new[] {
        "Keyword:const", "Identifier:re", "Operator:=", "Regex:/a\\/b/", "Punctuation:;"
    });

    // Test 9: Regex with slash in character class (not escaped)
    TypeTestCase("Regex slash in char class", "const re = /[/]/;", new[] {
        "Keyword:const", "Identifier:re", "Operator:=", "Regex:/[/]/", "Punctuation:;"
    });

    // Test 10: Division after identifier (not regex)
    TypeTestCase("Division after identifier", "x / y", new[] {
        "Identifier:x", "Operator:/", "Identifier:y"
    });

    // Test 11: Regex after open paren
    TypeTestCase("Regex after open paren", "foo(/bar/)", new[] {
        "Identifier:foo", "Punctuation:(", "Regex:/bar/", "Punctuation:)"
    });

    // Test 12: Regex after comma
    TypeTestCase("Regex after comma", "foo(x, /bar/)", new[] {
        "Identifier:foo", "Punctuation:(", "Identifier:x", "Punctuation:,", "Regex:/bar/", "Punctuation:)"
    });

    // Test 13: Regex after semicolon (new statement)
    TypeTestCase("Regex after semicolon", "x; /bar/.test(y)", new[] {
        "Identifier:x", "Punctuation:;", "Regex:/bar/", "Punctuation:.", "Identifier:test", "Punctuation:(", "Identifier:y", "Punctuation:)"
    });
}

void TestTypePatternMatching()
{
    Console.WriteLine("\n  Pattern matching with TypeScript type shorthands:");

    // Test \\tn - type name shorthand
    {
        var code = "const x: string = '';";
        var testLexer = new TsxLexer(code);
        var testTokens = testLexer.Tokenize();

        var matcher = new PatternMatcher(@"\k""const"" \i "":"" (\tn)");
        var result = matcher.TryMatch(testTokens, 0, out var match);

        if (result && match != null && match.Captures.Length >= 1 && match.Captures[0].Value == "string")
        {
            Console.WriteLine("    [PASS] \\tn matches TypeName:string");
        }
        else
        {
            Console.WriteLine($"    [FAIL] \\tn pattern - result={result}, captures={match?.Captures.Length ?? 0}");
        }
    }

    // Test \\go and \\gc - generic open/close shorthands
    {
        var code = "const arr: Array<number> = [];";
        var testLexer = new TsxLexer(code);
        var testTokens = testLexer.Tokenize();

        var matcher = new PatternMatcher(@"\k""const"" \i "":"" \tn \go (\tn) \gc");
        var result = matcher.TryMatch(testTokens, 0, out var match);

        if (result && match != null && match.Captures.Length >= 1 && match.Captures[0].Value == "number")
        {
            Console.WriteLine("    [PASS] \\go/\\gc match generic angle brackets");
        }
        else
        {
            Console.WriteLine($"    [FAIL] \\go/\\gc pattern - result={result}, captures={match?.Captures.Length ?? 0}");
        }
    }

    // Test \\cl - colon shorthand (renamed from \co)
    {
        var code = "function foo(): void {}";
        var testLexer = new TsxLexer(code);
        var testTokens = testLexer.Tokenize();

        var matcher = new PatternMatcher(@"\k""function"" (\i) ""("" "")"" \cl (\tn)");
        var result = matcher.TryMatch(testTokens, 0, out var match);

        if (result && match != null && match.Captures.Length >= 2 && match.Captures[0].Value == "foo" && match.Captures[1].Value == "void")
        {
            Console.WriteLine("    [PASS] \\cl matches type annotation colon");
        }
        else
        {
            Console.WriteLine($"    [FAIL] \\cl pattern - result={result}, captures={match?.Captures.Length ?? 0}");
        }
    }

    // Test \\ar - arrow shorthand
    // Note: The Arrow token type is only used inside TypeAnnotation state
    // In regular JS context, => is just an Operator
    // Let's test with a simpler case where we match the operator version
    {
        var code = "const fn = x => x;";
        var testLexer = new TsxLexer(code);
        var testTokens = testLexer.Tokenize();

        // The => in regular JS is Operator, not Arrow
        var matcher = new PatternMatcher(@"\k""const"" (\i) ""="" \i ""=>""");
        var result = matcher.TryMatch(testTokens, 0, out var match);

        if (result && match != null && match.Captures.Length >= 1 && match.Captures[0].Value == "fn")
        {
            Console.WriteLine("    [PASS] Arrow function pattern matches (=> as Operator)");
        }
        else
        {
            Console.WriteLine($"    [FAIL] Arrow function pattern - result={result}, captures={match?.Captures.Length ?? 0}");
        }
    }
}

// =====================================================
// Test: JSX Expression Tokenization
// =====================================================

void TestJsxExpressions()
{
    // Test 1: Simple expression
    TestCase("Simple expression", "<div>{count}</div>", new[] {
        "JsxTagOpen:<div", "JsxTagEnd:>",
        "JsxExprStart:{", "Identifier:count", "JsxExprEnd:}",
        "JsxTagClose:</div", "JsxTagEnd:>"
    });

    // Test 2: Expression with operators
    TestCase("Expression with operators", "<div>{count + 1}</div>", new[] {
        "JsxTagOpen:<div", "JsxTagEnd:>",
        "JsxExprStart:{", "Identifier:count", "Operator:+", "Number:1", "JsxExprEnd:}",
        "JsxTagClose:</div", "JsxTagEnd:>"
    });

    // Test 3: Nested JSX in expression
    TestCase("Nested JSX in expression", "<div>{items.map(i => <span>{i}</span>)}</div>", new[] {
        "JsxTagOpen:<div", "JsxTagEnd:>",
        "JsxExprStart:{",
            "Identifier:items", "Punctuation:.", "Identifier:map", "Punctuation:(", "Identifier:i", "Operator:=>",
            "JsxTagOpen:<span", "JsxTagEnd:>",
            "JsxExprStart:{", "Identifier:i", "JsxExprEnd:}",
            "JsxTagClose:</span", "JsxTagEnd:>",
            "Punctuation:)",
        "JsxExprEnd:}",
        "JsxTagClose:</div", "JsxTagEnd:>"
    });

    // Test 4: Object in JSX expression
    TestCase("Object in expression", "<div style={{ color: 'red' }}></div>", new[] {
        "JsxTagOpen:<div", "JsxAttrName:style", "Operator:=",
        "JsxExprStart:{",
            "Punctuation:{", "Identifier:color", "Operator::", "String:'red'", "Punctuation:}",
        "JsxExprEnd:}",
        "JsxTagEnd:>",
        "JsxTagClose:</div", "JsxTagEnd:>"
    });

    // Test 5: Self-closing with expression
    TestCase("Self-closing with expression", "<input value={name} />", new[] {
        "JsxTagOpen:<input", "JsxAttrName:value", "Operator:=",
        "JsxExprStart:{", "Identifier:name", "JsxExprEnd:}",
        "JsxTagSelfClose:/>"
    });
}

void TestCase(string name, string code, string[] expected)
{
    var testLexer = new TsxLexer(code);
    var testTokens = testLexer.Tokenize();

    // Filter to relevant tokens
    var actual = testTokens
        .Where(t => t.Type != TokenType.Whitespace && t.Type != TokenType.Eof)
        .Select(t => $"{t.Type}:{t.Value}")
        .ToArray();

    bool pass = actual.Length == expected.Length;
    if (pass)
    {
        for (int i = 0; i < actual.Length; i++)
        {
            if (actual[i] != expected[i])
            {
                pass = false;
                break;
            }
        }
    }

    if (pass)
    {
        Console.WriteLine($"  [PASS] {name}");
    }
    else
    {
        Console.WriteLine($"  [FAIL] {name}");
        Console.WriteLine($"    Code: {code}");
        Console.WriteLine($"    Expected: {string.Join(", ", expected)}");
        Console.WriteLine($"    Actual:   {string.Join(", ", actual)}");
    }
}

// =====================================================
// Demo: Pattern Macros (\la, \fc, \ty, etc.)
// =====================================================

/// <summary>
/// Demonstrates pattern macros for matching compound structures.
/// </summary>
public class MacroDemoVisitor : TokenVisitor
{
    private readonly StringBuilder _output = new();

    // Match arrow functions using \la (lambda) macro
    // \la expands to: (?:"(" .*? ")" | \i) "=>"
    [TokenPattern(@"\k""const"" (\i) ""="" \la")]
    public void VisitArrowFunction(string name)
    {
        AppendLine($"[\\la Arrow Function] const {name} = (...) => ...");
    }

    // Match function calls using \fc (function call) macro
    // \fc expands to: \i "(" .*? ")"
    [TokenPattern(@"(\fc)", From = new[] { nameof(VisitArrowFunction) })]
    public void VisitFunctionCall(string call)
    {
        // Only show setter calls
        if (call.StartsWith("set"))
        {
            AppendLine($"  [\\fc Call] {call}");
        }
    }

    private void AppendLine(string line)
    {
        _output.AppendLine(line);
    }

    public string GetOutput() => _output.ToString();
}

// =====================================================
// Demo: Using [Inject] to pass values between visitors
// =====================================================

/// <summary>
/// Info about a function found in the code.
/// </summary>
public record FunctionInfo(string Name, bool IsArrow);

/// <summary>
/// Info about a useState hook.
/// </summary>
public record StateInfo(string VarName, string SetterName);

/// <summary>
/// Demonstrates [Inject] attribute for dependency injection between visitors.
///
/// - VisitFunction returns FunctionInfo
/// - VisitUseState returns StateInfo
/// - VisitCall uses [Inject] to access the current function context
/// </summary>
public class InjectDemoVisitor : TokenVisitor
{
    private readonly StringBuilder _output = new();

    // Match: function Name()
    [TokenPattern(@"\k""function"" (\i) ""(""")]
    public FunctionInfo VisitFunction(TokenMatch match, string funcName)
    {
        AppendLine($"[Function] {funcName}() - returning FunctionInfo");

        var body = ExtractFunctionBody();
        if (body.Length > 0)
        {
            Traverse(body,
                nameof(VisitNestedFunction),
                nameof(VisitCall),
                nameof(VisitUseState));
        }

        return new FunctionInfo(funcName, IsArrow: false);
    }

    // Match useState: const [x, setX] = useState(...)
    [TokenPattern(@"\k""const"" ""\["" (\i) "","" (\i) ""\]"" ""="" \i""useState""")]
    public StateInfo VisitUseState(TokenMatch match, string varName, string setterName)
    {
        AppendLine($"  [State] {varName} / {setterName}() - returning StateInfo");
        return new StateInfo(varName, setterName);
    }

    // Match arrow function: const name = () => { ... }
    [TokenPattern(@"\k""const"" (\i) ""="" ""("" "")"" ""=>""")]
    public FunctionInfo VisitArrowFunction(TokenMatch match, string funcName)
    {
        AppendLine($"[Arrow] {funcName} - returning FunctionInfo");

        var body = ExtractFunctionBody();
        if (body.Length > 0)
        {
            Traverse(body, nameof(VisitCall));
        }

        return new FunctionInfo(funcName, IsArrow: true);
    }

    // Nested function
    [TokenPattern(@"\k""function"" (\i) ""(""", Name = "NestedFunc")]
    public FunctionInfo VisitNestedFunction(TokenMatch match, string funcName)
    {
        AppendLine($"  [Nested Function] {funcName}()");

        var body = ExtractFunctionBody();
        if (body.Length > 0)
        {
            Traverse(body, nameof(VisitCall));
        }

        return new FunctionInfo(funcName, IsArrow: false);
    }

    // Function call - uses [Inject] to get the current function context
    [TokenPattern(@"(\i) ""(""", From = new[] { nameof(VisitFunction), nameof(VisitArrowFunction), nameof(VisitNestedFunction) })]
    public void VisitCall(
        TokenMatch match,
        string funcName,
        [Inject(nameof(VisitFunction))] FunctionInfo? currentFunction,
        [Inject(nameof(VisitUseState), All = true)] List<StateInfo> allState)
    {
        // Skip keywords
        if (funcName is "function" or "if" or "for" or "while" or "const" or "return" or "useState")
            return;

        var inFunction = currentFunction?.Name ?? "unknown";
        var stateCount = allState.Count;

        AppendLine($"    [Call] {funcName}() - inside '{inFunction}', {stateCount} state hooks defined so far");
    }

    private void AppendLine(string line)
    {
        _output.AppendLine(line);
    }

    public string GetOutput() => _output.ToString();
}


/// <summary>
/// Demonstrates scoped visitor restrictions using the From property.
///
/// - VisitFunctionCall can only be called from VisitFunctionDecl or VisitArrowFunction
/// - VisitInnerConst can only be called from VisitNestedFunction
/// </summary>
public class ScopedVisitor : TokenVisitor
{
    private readonly StringBuilder _output = new();
    private int _indent;

    // =====================================================
    // TOP-LEVEL VISITORS (run during Visit())
    // =====================================================

    // Match: function Name()
    [TokenPattern(@"\k""function"" (\i) ""(""")]
    public void VisitFunctionDecl(TokenMatch match, string funcName)
    {
        AppendLine($"[Function] {funcName}()");

        var body = ExtractFunctionBody();
        if (body.Length > 0)
        {
            _indent++;
            // VisitFunctionCall will work here (From includes VisitFunctionDecl)
            // VisitInnerConst will NOT work here (From only includes VisitNestedFunction)
            Traverse(body,
                nameof(VisitNestedFunction),
                nameof(VisitFunctionCall),
                nameof(VisitInnerConst));  // Won't match - restricted to VisitNestedFunction
            _indent--;
        }
    }

    // Match useState: const [x, setX] = useState(...)
    [TokenPattern(@"\k""const"" ""\["" (\i) "","" (\i) ""\]"" ""="" \i""useState""")]
    public void VisitUseState(TokenMatch match, string varName, string setterName)
    {
        AppendLine($"[State] {varName} / {setterName}()");
    }

    // Match arrow function: const name = () => { ... }
    [TokenPattern(@"\k""const"" (\i) ""="" ""("" "")"" ""=>""")]
    public void VisitArrowFunction(TokenMatch match, string funcName)
    {
        AppendLine($"[Arrow] {funcName}");

        var body = ExtractFunctionBody();
        if (body.Length > 0)
        {
            _indent++;
            // VisitFunctionCall will work here (From includes VisitArrowFunction)
            Traverse(body, nameof(VisitFunctionCall));
            _indent--;
        }
    }

    // =====================================================
    // SCOPED VISITORS (restricted by From)
    // =====================================================

    // Nested function - can be called from anyone
    [TokenPattern(@"\k""function"" (\i) ""(""", Name = "NestedFunc")]
    public void VisitNestedFunction(TokenMatch match, string funcName)
    {
        AppendLine($"[Nested Function] {funcName}()");

        var body = ExtractFunctionBody();
        if (body.Length > 0)
        {
            _indent++;
            // VisitInnerConst WILL work here (From includes VisitNestedFunction)
            Traverse(body,
                nameof(VisitFunctionCall),
                nameof(VisitInnerConst));
            _indent--;
        }
    }

    // Function call - can ONLY be called from VisitFunctionDecl or VisitArrowFunction
    [TokenPattern(@"(\i) ""(""", From = new[] { nameof(VisitFunctionDecl), nameof(VisitArrowFunction), nameof(VisitNestedFunction) })]
    public void VisitFunctionCall(TokenMatch match, string funcName)
    {
        // Skip keywords
        if (funcName is "function" or "if" or "for" or "while" or "const" or "return" or "useState")
            return;

        AppendLine($"[Call] {funcName}()");
    }

    // Inner const - can ONLY be called from VisitNestedFunction
    [TokenPattern(@"\k""const"" (\i) ""=""", From = new[] { nameof(VisitNestedFunction) })]
    public void VisitInnerConst(TokenMatch match, string varName)
    {
        if (varName == "[") return; // Skip destructuring

        AppendLine($"[Inner Const] {varName} (only visible inside nested functions!)");
    }

    private void AppendLine(string line)
    {
        _output.Append(new string(' ', _indent * 2));
        _output.AppendLine(line);
    }

    public string GetOutput() => _output.ToString();
}

// =====================================================
// Demo: Token Manipulation (InsertAfter, Replace, Remove)
// =====================================================

/// <summary>
/// Visitor that adds hexPath attributes to JSX elements.
/// Demonstrates token insertion for source transformation.
/// </summary>
public class HexPathVisitor : TokenVisitor
{
    private int _pathCounter = 0;

    // Match JSX opening tag token (JsxTagOpen type contains "<tagName")
    [TokenPattern(@".")]  // Match any token, we'll filter in the method
    public void VisitToken(TokenMatch match)
    {
        var token = match.MatchedTokens[0];

        // Only process JSX opening tags (not closing tags like </div)
        if (token.Type != TokenType.JsxTagOpen) return;
        if (token.Value.StartsWith("</")) return;  // Skip closing tags

        // Generate a hex path based on element order
        var hexPath = _pathCounter.ToString("X4");
        _pathCounter++;

        // Insert hexPath attribute after the opening tag token
        // We want to insert: hexPath="XXXX"
        InsertAfter(token,
            Token.Whitespace(" "),
            Token.JsxAttrName("hexPath"),
            Token.Operator("="),
            Token.JsxAttrValue($"\"{hexPath}\"")
        );
    }
}

/// <summary>
/// Visitor that finds functions and outer consts, but skips function bodies.
/// Demonstrates SkipFunctionBody() to fast-forward past explored tokens.
/// </summary>
public class SkipBodyVisitor : TokenVisitor
{
    public List<string> Functions { get; } = new();
    public List<string> OuterConsts { get; } = new();

    // Match function declarations and skip their bodies
    [TokenPattern(@"\k""function"" (\i) ""(""")]
    public void VisitFunction(string name)
    {
        Functions.Add(name);

        // Skip past the function body - we don't want to process tokens inside
        SkipFunctionBody();
    }

    // Match const declarations at the current level
    [TokenPattern(@"\k""const"" (\i)")]
    public void VisitConst(string name)
    {
        // This will only match consts that weren't skipped
        OuterConsts.Add(name);
    }
}
