using Reluxer.Attributes;
using Reluxer.Matching;
using Reluxer.Tokens;
using Reluxer.Visitor;

namespace Reluxer.Transformer.Visitors;

/// <summary>
/// Transforms JavaScript token patterns to C# equivalents.
/// Uses PatternMatcher + Replace for declarative token-based conversion.
///
/// This visitor should be run on Token[] arrays stored in ComponentModel
/// to produce C# tokens before the generator emits code.
/// </summary>
public class JsToCSharpVisitor : TokenVisitor
{
    #region Global Functions

    // parseInt(x) || default -> int.TryParse(x.ToString(), out var _p) ? _p : default
    // This handles the JS pattern where parseInt returns NaN and fallback is used
    // Must come BEFORE the simple parseInt pattern (higher priority)
    // Use \n for number OR \i for identifier as the fallback
    [TokenPattern(@"""parseInt"" ""("" (.*?) "")"" ""||"" (\n)", Priority = 10)]
    public void VisitParseIntWithFallbackNumber(TokenMatch match, Token[] arg, Token[] fallback)
    {
        // int.TryParse(arg.ToString(), out int _p) ? _p : fallback
        // Note: Use explicit 'int' type instead of 'var' for proper type inference in ternary context
        ReplaceMatch(match, Concat(
            Token.Identifier("int"),
            Token.Punctuation("."),
            Token.Identifier("TryParse"),
            Token.Punctuation("(")
        ).Concat(arg).Concat(new[] {
            Token.Punctuation("."),
            Token.Identifier("ToString"),
            Token.Punctuation("("),
            Token.Punctuation(")"),
            Token.Punctuation(","),
            Token.Whitespace(" "),
            Token.Keyword("out"),
            Token.Whitespace(" "),
            Token.Identifier("int"),
            Token.Whitespace(" "),
            Token.Identifier("_p"),
            Token.Punctuation(")"),
            Token.Whitespace(" "),
            Token.Operator("?"),
            Token.Whitespace(" "),
            Token.Identifier("_p"),
            Token.Whitespace(" "),
            Token.Create(TokenType.Colon, ":")
        }).Concat(fallback).ToArray());
    }

    // parseInt(x) || identifier -> int.TryParse(...) (same as above but for identifier fallback)
    [TokenPattern(@"""parseInt"" ""("" (.*?) "")"" ""||"" (\i)", Priority = 10)]
    public void VisitParseIntWithFallbackIdentifier(TokenMatch match, Token[] arg, Token[] fallback)
    {
        // int.TryParse(arg.ToString(), out int _p) ? _p : fallback
        // Note: Use explicit 'int' type instead of 'var' for proper type inference in ternary context
        ReplaceMatch(match, Concat(
            Token.Identifier("int"),
            Token.Punctuation("."),
            Token.Identifier("TryParse"),
            Token.Punctuation("(")
        ).Concat(arg).Concat(new[] {
            Token.Punctuation("."),
            Token.Identifier("ToString"),
            Token.Punctuation("("),
            Token.Punctuation(")"),
            Token.Punctuation(","),
            Token.Whitespace(" "),
            Token.Keyword("out"),
            Token.Whitespace(" "),
            Token.Identifier("int"),
            Token.Whitespace(" "),
            Token.Identifier("_p"),
            Token.Punctuation(")"),
            Token.Whitespace(" "),
            Token.Operator("?"),
            Token.Whitespace(" "),
            Token.Identifier("_p"),
            Token.Whitespace(" "),
            Token.Create(TokenType.Colon, ":")
        }).Concat(fallback).ToArray());
    }

    // parseInt(x) -> int.Parse(x.ToString())
    [TokenPattern(@"""parseInt"" ""("" (.*?) "")""")]
    public void VisitParseInt(TokenMatch match, Token[] arg)
    {
        ReplaceMatch(match, Concat(
            Token.Identifier("int"),
            Token.Punctuation("."),
            Token.Identifier("Parse"),
            Token.Punctuation("(")
        ).Concat(arg).Concat(new[] {
            Token.Punctuation("."),
            Token.Identifier("ToString"),
            Token.Punctuation("("),
            Token.Punctuation(")"),
            Token.Punctuation(")")
        }).ToArray());
    }

    // parseFloat(x) -> double.Parse(x.ToString())
    [TokenPattern(@"""parseFloat"" ""("" (.*?) "")""")]
    public void VisitParseFloat(TokenMatch match, Token[] arg)
    {
        ReplaceMatch(match, Concat(
            Token.Identifier("double"),
            Token.Punctuation("."),
            Token.Identifier("Parse"),
            Token.Punctuation("(")
        ).Concat(arg).Concat(new[] {
            Token.Punctuation("."),
            Token.Identifier("ToString"),
            Token.Punctuation("("),
            Token.Punctuation(")"),
            Token.Punctuation(")")
        }).ToArray());
    }

    // String(x) -> x.ToString()
    [TokenPattern(@"""String"" ""("" (.*?) "")""")]
    public void VisitStringCast(TokenMatch match, Token[] arg)
    {
        ReplaceMatch(match, arg.Concat(new[] {
            Token.Punctuation("."),
            Token.Identifier("ToString"),
            Token.Punctuation("("),
            Token.Punctuation(")")
        }).ToArray());
    }

    // Number(x) -> Convert.ToDouble(x)
    [TokenPattern(@"""Number"" ""("" (.*?) "")""")]
    public void VisitNumberCast(TokenMatch match, Token[] arg)
    {
        ReplaceMatch(match, Concat(
            Token.Identifier("Convert"),
            Token.Punctuation("."),
            Token.Identifier("ToDouble"),
            Token.Punctuation("(")
        ).Concat(arg).Concat(new[] {
            Token.Punctuation(")")
        }).ToArray());
    }

    // Boolean(x) -> Convert.ToBoolean(x)
    [TokenPattern(@"""Boolean"" ""("" (.*?) "")""")]
    public void VisitBooleanCast(TokenMatch match, Token[] arg)
    {
        ReplaceMatch(match, Concat(
            Token.Identifier("Convert"),
            Token.Punctuation("."),
            Token.Identifier("ToBoolean"),
            Token.Punctuation("(")
        ).Concat(arg).Concat(new[] {
            Token.Punctuation(")")
        }).ToArray());
    }

    #endregion

    #region Fetch/HTTP

    // await fetch(url) -> await _httpClient.GetStringAsync(url)
    // Simple GET without options
    [TokenPattern(@"\k""await"" ""fetch"" ""("" (\t) "")""", Priority = 20)]
    public void VisitAwaitFetchTemplateString(TokenMatch match, Token[] url)
    {
        // Convert template string backticks to C# interpolated string
        var urlStr = url.Length > 0 ? url[0].Value : "";
        if (urlStr.StartsWith("`") && urlStr.EndsWith("`"))
        {
            // Convert `...${x}...` to $"...{x}..."
            urlStr = "$\"" + urlStr[1..^1].Replace("${", "{") + "\"";
        }

        ReplaceMatch(match, new[] {
            Token.Keyword("await"),
            Token.Whitespace(" "),
            Token.Identifier("_httpClient"),
            Token.Punctuation("."),
            Token.Identifier("GetStringAsync"),
            Token.Punctuation("("),
            Token.String(urlStr),
            Token.Punctuation(")")
        });
    }

    // await fetch('url') or await fetch("url") -> await _httpClient.GetStringAsync(url)
    [TokenPattern(@"\k""await"" ""fetch"" ""("" (\s) "")""", Priority = 15)]
    public void VisitAwaitFetchString(TokenMatch match, Token[] url)
    {
        ReplaceMatch(match, new[] {
            Token.Keyword("await"),
            Token.Whitespace(" "),
            Token.Identifier("_httpClient"),
            Token.Punctuation("."),
            Token.Identifier("GetStringAsync"),
            Token.Punctuation("(")
        }.Concat(url).Concat(new[] {
            Token.Punctuation(")")
        }).ToArray());
    }

    // await fetch(url, { method: 'POST', body: ... }) -> await _httpClient.PostAsync(url, content)
    // This is complex - for now, convert to a simpler form
    [TokenPattern(@"\k""await"" ""fetch"" ""("" (\s) "","" (\Bb) "")""", Priority = 25)]
    public void VisitAwaitFetchWithOptions(TokenMatch match, Token[] url, Token[] options)
    {
        // Check if it's a POST
        var optionsStr = string.Join("", options.Select(t => t.Value));
        var isPost = optionsStr.Contains("method") && (optionsStr.Contains("'POST'") || optionsStr.Contains("\"POST\""));

        if (isPost)
        {
            // Extract body if present - look for body: JSON.stringify(...)
            // For now, generate a placeholder
            ReplaceMatch(match, new[] {
                Token.Keyword("await"),
                Token.Whitespace(" "),
                Token.Identifier("_httpClient"),
                Token.Punctuation("."),
                Token.Identifier("PostAsync"),
                Token.Punctuation("(")
            }.Concat(url).Concat(new[] {
                Token.Punctuation(","),
                Token.Whitespace(" "),
                Token.Keyword("new"),
                Token.Whitespace(" "),
                Token.Identifier("StringContent"),
                Token.Punctuation("("),
                Token.String("\"{}\""),  // Placeholder - would need proper body extraction
                Token.Punctuation(")"),
                Token.Punctuation(")")
            }).ToArray());
        }
        else
        {
            // Default to GET
            ReplaceMatch(match, new[] {
                Token.Keyword("await"),
                Token.Whitespace(" "),
                Token.Identifier("_httpClient"),
                Token.Punctuation("."),
                Token.Identifier("GetStringAsync"),
                Token.Punctuation("(")
            }.Concat(url).Concat(new[] {
                Token.Punctuation(")")
            }).ToArray());
        }
    }

    // response.json() -> (remove - we already have string from GetStringAsync)
    [TokenPattern(@"""."" ""json"" ""("" "")""")]
    public void VisitResponseJson(TokenMatch match)
    {
        // Remove .json() as we're returning string directly from HttpClient
        ReplaceMatch(match, Array.Empty<Token>());
    }

    // JSON.stringify(obj) -> JsonSerializer.Serialize(obj)
    [TokenPattern(@"""JSON"" ""."" ""stringify"" ""("" (.*?) "")""")]
    public void VisitJsonStringify(TokenMatch match, Token[] obj)
    {
        ReplaceMatch(match, new[] {
            Token.Identifier("JsonSerializer"),
            Token.Punctuation("."),
            Token.Identifier("Serialize"),
            Token.Punctuation("(")
        }.Concat(obj).Concat(new[] {
            Token.Punctuation(")")
        }).ToArray());
    }

    // JSON.parse(str) -> JsonSerializer.Deserialize<dynamic>(str)
    [TokenPattern(@"""JSON"" ""."" ""parse"" ""("" (.*?) "")""")]
    public void VisitJsonParse(TokenMatch match, Token[] str)
    {
        ReplaceMatch(match, new[] {
            Token.Identifier("JsonSerializer"),
            Token.Punctuation("."),
            Token.Identifier("Deserialize"),
            Token.Punctuation("<"),
            Token.Keyword("dynamic"),
            Token.Punctuation(">"),
            Token.Punctuation("(")
        }.Concat(str).Concat(new[] {
            Token.Punctuation(")")
        }).ToArray());
    }

    #endregion

    /// <summary>Helper to create Token arrays.</summary>
    private static Token[] Concat(params Token[] tokens) => tokens;

    #region Operators

    // === -> ==
    [TokenPattern(@"""===""")]
    public void VisitStrictEquals(TokenMatch match)
    {
        ReplaceMatch(match, Token.Operator("=="));
    }

    // !== -> !=
    [TokenPattern(@"""!==""")]
    public void VisitStrictNotEquals(TokenMatch match)
    {
        ReplaceMatch(match, Token.Operator("!="));
    }

    // !identifier || ... where identifier is used in string comparison
    // Pattern: !identifier || expr === identifier (common optional filter pattern)
    // Converts to: string.IsNullOrEmpty(identifier) || expr == identifier
    [TokenPattern(@"""!"" (\i) ""||"" (.*?) ""==="" (\i)")]
    public void VisitStringTruthyCheck(TokenMatch match, Token[] firstId, Token[] middleExpr, Token[] secondId)
    {
        // Check if both identifiers are the same (the optional filter pattern)
        var first = firstId.FirstOrDefault()?.Value;
        var second = secondId.FirstOrDefault()?.Value;
        if (first == second)
        {
            // Transform to: string.IsNullOrEmpty(identifier) || expr == identifier
            var result = Concat(
                Token.Identifier("string"),
                Token.Punctuation("."),
                Token.Identifier("IsNullOrEmpty"),
                Token.Punctuation("("),
                Token.Identifier(first ?? ""),
                Token.Punctuation(")"),
                Token.Whitespace(" "),
                Token.Operator("||"),
                Token.Whitespace(" ")
            ).Concat(middleExpr).Concat(new[] {
                Token.Whitespace(" "),
                Token.Operator("=="),
                Token.Whitespace(" "),
                Token.Identifier(second ?? "")
            }).ToArray();
            ReplaceMatch(match, result);
        }
        // If not the same identifier, don't transform (keep original)
    }

    #endregion

    #region Array Methods

    // .filter(x => ...) -> .Where(x => ...)
    [TokenPattern(@"""."" ""filter"" ""("" (.*?) "")""")]
    public void VisitFilter(TokenMatch match, Token[] callback)
    {
        ReplaceMatch(match, WrapMethod("Where", callback));
    }

    // .find(x => ...) -> .FirstOrDefault(x => ...)
    [TokenPattern(@"""."" ""find"" ""("" (.*?) "")""")]
    public void VisitFind(TokenMatch match, Token[] callback)
    {
        ReplaceMatch(match, WrapMethod("FirstOrDefault", callback));
    }

    // .some(x => ...) -> .Any(x => ...)
    [TokenPattern(@"""."" ""some"" ""("" (.*?) "")""")]
    public void VisitSome(TokenMatch match, Token[] callback)
    {
        ReplaceMatch(match, WrapMethod("Any", callback));
    }

    // .every(x => ...) -> .All(x => ...)
    [TokenPattern(@"""."" ""every"" ""("" (.*?) "")""")]
    public void VisitEvery(TokenMatch match, Token[] callback)
    {
        ReplaceMatch(match, WrapMethod("All", callback));
    }

    // .map(x => ...) -> .Select(x => ...)
    [TokenPattern(@"""."" ""map"" ""("" (.*?) "")""")]
    public void VisitMap(TokenMatch match, Token[] callback)
    {
        ReplaceMatch(match, WrapMethod("Select", callback));
    }

    // .flatMap(x => ...) -> .SelectMany(x => ...)
    [TokenPattern(@"""."" ""flatMap"" ""("" (.*?) "")""")]
    public void VisitFlatMap(TokenMatch match, Token[] callback)
    {
        ReplaceMatch(match, WrapMethod("SelectMany", callback));
    }

    // .includes(x) -> .Contains(x)
    [TokenPattern(@"""."" ""includes"" ""("" (.*?) "")""")]
    public void VisitIncludes(TokenMatch match, Token[] arg)
    {
        ReplaceMatch(match, WrapMethod("Contains", arg));
    }

    // .indexOf(x) -> .IndexOf(x)
    [TokenPattern(@"""."" ""indexOf"" ""("" (.*?) "")""")]
    public void VisitIndexOf(TokenMatch match, Token[] arg)
    {
        ReplaceMatch(match, WrapMethod("IndexOf", arg));
    }

    // .push(x) -> .Add(x)
    [TokenPattern(@"""."" ""push"" ""("" (.*?) "")""")]
    public void VisitPush(TokenMatch match, Token[] arg)
    {
        ReplaceMatch(match, WrapMethod("Add", arg));
    }

    // .length -> .Count() (use method form for LINQ compatibility)
    [TokenPattern(@"""."" ""length""")]
    public void VisitLength(TokenMatch match)
    {
        ReplaceMatch(match,
            Token.Punctuation("."),
            Token.Identifier("Count"),
            Token.Punctuation("("),
            Token.Punctuation(")")
        );
    }

    // .pop() -> .RemoveAt(Count - 1)
    [TokenPattern(@"""."" ""pop"" ""("" "")""")]
    public void VisitPop(TokenMatch match)
    {
        ReplaceMatch(match, Concat(
            Token.Punctuation("."),
            Token.Identifier("RemoveAt"),
            Token.Punctuation("("),
            Token.Identifier("Count"),
            Token.Operator("-"),
            Token.Number("1"),
            Token.Punctuation(")")
        ));
    }

    // .shift() -> .RemoveAt(0)
    [TokenPattern(@"""."" ""shift"" ""("" "")""")]
    public void VisitShift(TokenMatch match)
    {
        ReplaceMatch(match, Concat(
            Token.Punctuation("."),
            Token.Identifier("RemoveAt"),
            Token.Punctuation("("),
            Token.Number("0"),
            Token.Punctuation(")")
        ));
    }

    // .unshift(x) -> .Insert(0, x)
    [TokenPattern(@"""."" ""unshift"" ""("" (.*?) "")""")]
    public void VisitUnshift(TokenMatch match, Token[] arg)
    {
        ReplaceMatch(match, Concat(
            Token.Punctuation("."),
            Token.Identifier("Insert"),
            Token.Punctuation("("),
            Token.Number("0"),
            Token.Punctuation(",")
        ).Concat(arg).Concat(new[] {
            Token.Punctuation(")")
        }).ToArray());
    }

    // .concat(x) -> .Concat(x).ToList()
    [TokenPattern(@"""."" ""concat"" ""("" (.*?) "")""")]
    public void VisitConcat(TokenMatch match, Token[] arg)
    {
        ReplaceMatch(match, Concat(
            Token.Punctuation("."),
            Token.Identifier("Concat"),
            Token.Punctuation("(")
        ).Concat(arg).Concat(new[] {
            Token.Punctuation(")"),
            Token.Punctuation("."),
            Token.Identifier("ToList"),
            Token.Punctuation("("),
            Token.Punctuation(")")
        }).ToArray());
    }

    // .reverse() -> .Reverse().ToList()
    [TokenPattern(@"""."" ""reverse"" ""("" "")""")]
    public void VisitReverse(TokenMatch match)
    {
        ReplaceMatch(match, Concat(
            Token.Punctuation("."),
            Token.Identifier("Reverse"),
            Token.Punctuation("("),
            Token.Punctuation(")"),
            Token.Punctuation("."),
            Token.Identifier("ToList"),
            Token.Punctuation("("),
            Token.Punctuation(")")
        ));
    }

    // .slice(start, end) -> .Skip(start).Take(end - start).ToList()
    [TokenPattern(@"""."" ""slice"" ""("" (\i) "","" (\i) "")""")]
    public void VisitSliceTwoArgs(TokenMatch match, Token[] start, Token[] end)
    {
        ReplaceMatch(match, Concat(
            Token.Punctuation("."),
            Token.Identifier("Skip"),
            Token.Punctuation("(")
        ).Concat(start).Concat(new[] {
            Token.Punctuation(")"),
            Token.Punctuation("."),
            Token.Identifier("Take"),
            Token.Punctuation("(")
        }).Concat(end).Concat(new[] {
            Token.Operator("-")
        }).Concat(start).Concat(new[] {
            Token.Punctuation(")"),
            Token.Punctuation("."),
            Token.Identifier("ToList"),
            Token.Punctuation("("),
            Token.Punctuation(")")
        }).ToArray());
    }

    // .slice(start) -> .Skip(start).ToList()
    [TokenPattern(@"""."" ""slice"" ""("" (\i) "")""")]
    public void VisitSliceOneArg(TokenMatch match, Token[] start)
    {
        ReplaceMatch(match, Concat(
            Token.Punctuation("."),
            Token.Identifier("Skip"),
            Token.Punctuation("(")
        ).Concat(start).Concat(new[] {
            Token.Punctuation(")"),
            Token.Punctuation("."),
            Token.Identifier("ToList"),
            Token.Punctuation("("),
            Token.Punctuation(")")
        }).ToArray());
    }

    // .sort() -> .OrderBy(x => x).ToList()
    [TokenPattern(@"""."" ""sort"" ""("" "")""")]
    public void VisitSortEmpty(TokenMatch match)
    {
        ReplaceMatch(match, Concat(
            Token.Punctuation("."),
            Token.Identifier("OrderBy"),
            Token.Punctuation("("),
            Token.Identifier("x"),
            Token.Operator("=>"),
            Token.Identifier("x"),
            Token.Punctuation(")"),
            Token.Punctuation("."),
            Token.Identifier("ToList"),
            Token.Punctuation("("),
            Token.Punctuation(")")
        ));
    }

    // .sort((a, b) => ...) -> .OrderBy(x => x).ToList() (simplified - comparator ignored)
    // Use \Bp to match balanced parentheses in the comparator
    [TokenPattern(@"""."" ""sort"" (\Bp)")]
    public void VisitSortWithComparator(TokenMatch match, Token[] comparator)
    {
        // For complex sort comparators, we use a simplified OrderBy
        // A more sophisticated implementation could parse the comparator
        ReplaceMatch(match, Concat(
            Token.Punctuation("."),
            Token.Identifier("OrderBy"),
            Token.Punctuation("("),
            Token.Identifier("x"),
            Token.Operator("=>"),
            Token.Identifier("x"),
            Token.Punctuation(")"),
            Token.Punctuation("."),
            Token.Identifier("ToList"),
            Token.Punctuation("("),
            Token.Punctuation(")")
        ));
    }

    // .reduce((a, b) => expr, init) -> .Aggregate(init, (a, b) => expr)
    // Uses \Bp to capture balanced parens for the arrow function params
    [TokenPattern(@"""."" ""reduce"" ""("" (\Bp) \fa (.*?) "","" (.*?) "")""", Priority = 10)]
    public void VisitReduceArrowWithInit(TokenMatch match, Token[] fnParams, Token[] fnBody, Token[] init)
    {
        // Convert integer literal 0 to double 0.0d for type safety with double arrays
        var initTokens = init;
        if (init.Length == 1 && init[0].Type == TokenType.Number && init[0].Value == "0")
        {
            initTokens = new[] { Token.Number("0.0d") };
        }

        // Reconstruct: .Aggregate(init, (params) => body)
        ReplaceMatch(match, Concat(
            Token.Punctuation("."),
            Token.Identifier("Aggregate"),
            Token.Punctuation("(")
        ).Concat(initTokens).Concat(new[] {
            Token.Punctuation(","),
            Token.Whitespace(" "),
            Token.Punctuation("(")
        }).Concat(fnParams).Concat(new[] {
            Token.Punctuation(")"),
            Token.Whitespace(" "),
            Token.Operator("=>"),
            Token.Whitespace(" ")
        }).Concat(fnBody).Concat(new[] {
            Token.Punctuation(")")
        }).ToArray());
    }

    // .reduce(fn, init) -> .Aggregate(init, fn) - fallback for non-arrow function
    [TokenPattern(@"""."" ""reduce"" ""("" (.*?) "","" (.*?) "")""")]
    public void VisitReduceWithInit(TokenMatch match, Token[] fn, Token[] init)
    {
        ReplaceMatch(match, Concat(
            Token.Punctuation("."),
            Token.Identifier("Aggregate"),
            Token.Punctuation("(")
        ).Concat(init).Concat(new[] {
            Token.Punctuation(",")
        }).Concat(fn).Concat(new[] {
            Token.Punctuation(")")
        }).ToArray());
    }

    // .lastIndexOf(x) -> .LastIndexOf(x)
    [TokenPattern(@"""."" ""lastIndexOf"" ""("" (.*?) "")""")]
    public void VisitLastIndexOf(TokenMatch match, Token[] arg)
    {
        ReplaceMatch(match, WrapMethod("LastIndexOf", arg));
    }

    /// <summary>Helper to wrap a method call: .MethodName(args)</summary>
    /// <param name="methodName">The C# method name</param>
    /// <param name="args">Arguments to transform and include</param>
    private static Token[] WrapMethod(string methodName, Token[] args)
    {
        // Transform the arguments (e.g., convert === to == inside callbacks)
        var transformedArgs = Transform(args);

        return Concat(
            Token.Punctuation("."),
            Token.Identifier(methodName),
            Token.Punctuation("(")
        ).Concat(transformedArgs).Concat(new[] {
            Token.Punctuation(")")
        }).ToArray();
    }

    #endregion

    #region String Methods

    // .toLowerCase() -> .ToLower()
    [TokenPattern(@"""."" ""toLowerCase"" ""("" "")""")]
    public void VisitToLowerCase(TokenMatch match)
    {
        ReplaceMatch(match, EmptyMethodCall("ToLower"));
    }

    // .toUpperCase() -> .ToUpper()
    [TokenPattern(@"""."" ""toUpperCase"" ""("" "")""")]
    public void VisitToUpperCase(TokenMatch match)
    {
        ReplaceMatch(match, EmptyMethodCall("ToUpper"));
    }

    // .trim() -> .Trim()
    [TokenPattern(@"""."" ""trim"" ""("" "")""")]
    public void VisitTrim(TokenMatch match)
    {
        ReplaceMatch(match, EmptyMethodCall("Trim"));
    }

    // .startsWith(x) -> .StartsWith(x)
    [TokenPattern(@"""."" ""startsWith"" ""("" (.*?) "")""")]
    public void VisitStartsWith(TokenMatch match, Token[] arg)
    {
        ReplaceMatch(match, WrapMethod("StartsWith", arg));
    }

    // .endsWith(x) -> .EndsWith(x)
    [TokenPattern(@"""."" ""endsWith"" ""("" (.*?) "")""")]
    public void VisitEndsWith(TokenMatch match, Token[] arg)
    {
        ReplaceMatch(match, WrapMethod("EndsWith", arg));
    }

    // .replace(x, y) -> .Replace(x, y)
    [TokenPattern(@"""."" ""replace"" ""("" (.*?) "")""")]
    public void VisitReplace(TokenMatch match, Token[] args)
    {
        ReplaceMatch(match, WrapMethod("Replace", args));
    }

    // .replaceAll(x, y) -> .Replace(x, y)
    [TokenPattern(@"""."" ""replaceAll"" ""("" (.*?) "")""")]
    public void VisitReplaceAll(TokenMatch match, Token[] args)
    {
        ReplaceMatch(match, WrapMethod("Replace", args));
    }

    // .split(x) -> .Split(x)
    [TokenPattern(@"""."" ""split"" ""("" (.*?) "")""")]
    public void VisitSplit(TokenMatch match, Token[] arg)
    {
        ReplaceMatch(match, WrapMethod("Split", arg));
    }

    // .toString() -> .ToString()
    [TokenPattern(@"""."" ""toString"" ""("" "")""")]
    public void VisitToString(TokenMatch match)
    {
        ReplaceMatch(match, EmptyMethodCall("ToString"));
    }

    // .trimStart() / .trimLeft() -> .TrimStart()
    [TokenPattern(@"""."" ""trimStart"" ""("" "")""")]
    public void VisitTrimStart(TokenMatch match)
    {
        ReplaceMatch(match, EmptyMethodCall("TrimStart"));
    }

    [TokenPattern(@"""."" ""trimLeft"" ""("" "")""")]
    public void VisitTrimLeft(TokenMatch match)
    {
        ReplaceMatch(match, EmptyMethodCall("TrimStart"));
    }

    // .trimEnd() / .trimRight() -> .TrimEnd()
    [TokenPattern(@"""."" ""trimEnd"" ""("" "")""")]
    public void VisitTrimEnd(TokenMatch match)
    {
        ReplaceMatch(match, EmptyMethodCall("TrimEnd"));
    }

    [TokenPattern(@"""."" ""trimRight"" ""("" "")""")]
    public void VisitTrimRight(TokenMatch match)
    {
        ReplaceMatch(match, EmptyMethodCall("TrimEnd"));
    }

    // .padStart(len, char) -> .PadLeft(len, char)
    [TokenPattern(@"""."" ""padStart"" ""("" (.*?) "")""")]
    public void VisitPadStart(TokenMatch match, Token[] args)
    {
        ReplaceMatch(match, WrapMethod("PadLeft", args));
    }

    // .padEnd(len, char) -> .PadRight(len, char)
    [TokenPattern(@"""."" ""padEnd"" ""("" (.*?) "")""")]
    public void VisitPadEnd(TokenMatch match, Token[] args)
    {
        ReplaceMatch(match, WrapMethod("PadRight", args));
    }

    // .substring(start, end) -> .Substring(start, end - start) - simplified to just .Substring
    [TokenPattern(@"""."" ""substring"" ""("" (.*?) "")""")]
    public void VisitSubstring(TokenMatch match, Token[] args)
    {
        ReplaceMatch(match, WrapMethod("Substring", args));
    }

    // .substr(start, length) -> .Substring(start, length)
    [TokenPattern(@"""."" ""substr"" ""("" (.*?) "")""")]
    public void VisitSubstr(TokenMatch match, Token[] args)
    {
        ReplaceMatch(match, WrapMethod("Substring", args));
    }

    // .charAt(i) -> [i]
    [TokenPattern(@"""."" ""charAt"" ""("" (\i) "")""")]
    public void VisitCharAt(TokenMatch match, Token[] index)
    {
        ReplaceMatch(match, Concat(
            Token.Punctuation("[")
        ).Concat(index).Concat(new[] {
            Token.Punctuation("]")
        }).ToArray());
    }

    // .charCodeAt(i) -> (int)[i]
    [TokenPattern(@"""."" ""charCodeAt"" ""("" (\i) "")""")]
    public void VisitCharCodeAt(TokenMatch match, Token[] index)
    {
        ReplaceMatch(match, Concat(
            Token.Punctuation("("),
            Token.Keyword("int"),
            Token.Punctuation(")"),
            Token.Punctuation("[")
        ).Concat(index).Concat(new[] {
            Token.Punctuation("]")
        }).ToArray());
    }

    // .toFixed(n) -> .ToString("Fn")
    [TokenPattern(@"""."" ""toFixed"" ""("" (\n) "")""")]
    public void VisitToFixed(TokenMatch match, Token[] digits)
    {
        var n = digits.Length > 0 ? digits[0].Value : "2";
        ReplaceMatch(match, Concat(
            Token.Punctuation("."),
            Token.Identifier("ToString"),
            Token.Punctuation("("),
            Token.String($"\"F{n}\""),
            Token.Punctuation(")")
        ));
    }

    // .toLocaleString() -> .ToString("N0")
    [TokenPattern(@"""."" ""toLocaleString"" ""("" "")""")]
    public void VisitToLocaleString(TokenMatch match)
    {
        ReplaceMatch(match, Concat(
            Token.Punctuation("."),
            Token.Identifier("ToString"),
            Token.Punctuation("("),
            Token.String("\"N0\""),
            Token.Punctuation(")")
        ));
    }

    /// <summary>Helper for empty method calls: .MethodName()</summary>
    private static Token[] EmptyMethodCall(string methodName)
    {
        return Concat(
            Token.Punctuation("."),
            Token.Identifier(methodName),
            Token.Punctuation("("),
            Token.Punctuation(")")
        );
    }

    #endregion

    #region Console

    // console.log(x) -> Console.WriteLine(x)
    [TokenPattern(@"""console"" ""."" ""log"" ""("" (.*?) "")""")]
    public void VisitConsoleLog(TokenMatch match, Token[] arg)
    {
        ReplaceMatch(match, Concat(
            Token.Identifier("Console"),
            Token.Punctuation("."),
            Token.Identifier("WriteLine"),
            Token.Punctuation("(")
        ).Concat(arg).Concat(new[] {
            Token.Punctuation(")")
        }).ToArray());
    }

    #endregion

    #region Math

    // Math.max -> Math.Max
    [TokenPattern(@"""Math"" ""."" ""max""")]
    public void VisitMathMax(TokenMatch match)
    {
        ReplaceMatch(match, StaticMethod("Math", "Max"));
    }

    // Math.min -> Math.Min
    [TokenPattern(@"""Math"" ""."" ""min""")]
    public void VisitMathMin(TokenMatch match)
    {
        ReplaceMatch(match, StaticMethod("Math", "Min"));
    }

    // Math.floor -> (int)Math.Floor
    [TokenPattern(@"""Math"" ""."" ""floor""")]
    public void VisitMathFloor(TokenMatch match)
    {
        ReplaceMatch(match, CastMethod("int", "Math", "Floor"));
    }

    // Math.ceil -> (int)Math.Ceiling
    [TokenPattern(@"""Math"" ""."" ""ceil""")]
    public void VisitMathCeil(TokenMatch match)
    {
        ReplaceMatch(match, CastMethod("int", "Math", "Ceiling"));
    }

    // Math.round -> (int)Math.Round
    [TokenPattern(@"""Math"" ""."" ""round""")]
    public void VisitMathRound(TokenMatch match)
    {
        ReplaceMatch(match, CastMethod("int", "Math", "Round"));
    }

    // Math.abs -> Math.Abs
    [TokenPattern(@"""Math"" ""."" ""abs""")]
    public void VisitMathAbs(TokenMatch match)
    {
        ReplaceMatch(match, StaticMethod("Math", "Abs"));
    }

    // Math.pow -> Math.Pow
    [TokenPattern(@"""Math"" ""."" ""pow""")]
    public void VisitMathPow(TokenMatch match)
    {
        ReplaceMatch(match, StaticMethod("Math", "Pow"));
    }

    // Math.sqrt -> Math.Sqrt
    [TokenPattern(@"""Math"" ""."" ""sqrt""")]
    public void VisitMathSqrt(TokenMatch match)
    {
        ReplaceMatch(match, StaticMethod("Math", "Sqrt"));
    }

    /// <summary>Helper for static method reference: Class.Method</summary>
    private static Token[] StaticMethod(string className, string methodName)
    {
        return Concat(
            Token.Identifier(className),
            Token.Punctuation("."),
            Token.Identifier(methodName)
        );
    }

    /// <summary>Helper for cast + static method: (type)Class.Method</summary>
    private static Token[] CastMethod(string castType, string className, string methodName)
    {
        return Concat(
            Token.Punctuation("("),
            Token.Keyword(castType),
            Token.Punctuation(")"),
            Token.Identifier(className),
            Token.Punctuation("."),
            Token.Identifier(methodName)
        );
    }

    #endregion

    #region Template Literals and String Quotes

    // Template literal tokens (\t = TemplateString) get converted to interpolated strings
    // The lexer produces TemplateString tokens for template literals like `text ${expr}`
    [TokenPattern(@"(\t)")]
    public void VisitTemplateString(TokenMatch match, Token[] templateTokens)
    {
        if (templateTokens.Length == 0) return;

        var template = templateTokens[0].Value;
        // Template strings are stored with backticks, convert to C# interpolated string
        if (template.StartsWith("`") && template.EndsWith("`"))
        {
            var content = template.Substring(1, template.Length - 2);
            // Convert ${expr} to {expr}
            content = content.Replace("${", "{");
            ReplaceMatch(match, Token.String($"$\"{content}\""));
        }
        else
        {
            // Already processed or partial template
            ReplaceMatch(match, templateTokens);
        }
    }

    // Single quoted strings are converted to double quoted for C#
    // Match any String token and fix quotes if needed
    [TokenPattern(@"(\s)")]
    public void VisitString(TokenMatch match, Token[] stringTokens)
    {
        if (stringTokens.Length == 0) return;

        var str = stringTokens[0].Value;
        if (str.StartsWith("'") && str.EndsWith("'"))
        {
            // Convert 'text' to "text"
            var content = str.Substring(1, str.Length - 2);
            // Escape any double quotes inside
            content = content.Replace("\"", "\\\"");
            ReplaceMatch(match, Token.String($"\"{content}\""));
        }
        else
        {
            // Already double-quoted or other format, keep as-is
            ReplaceMatch(match, stringTokens);
        }
    }

    #endregion

    #region Object and Array Literals

    // Object literal key: value -> ["key"] = value
    // Transform individual key-value pairs within object literals
    // This pattern matches: identifier ":" value (where value is identifier or number)
    [TokenPattern(@"(\i) "":"" (\i)", Priority = -60)]
    public void VisitObjectKeyValueIdentifier(TokenMatch match, Token[] key, Token[] value)
    {
        // Only transform if we're inside an object literal context
        // (i.e., this isn't a ternary or type annotation)
        if (key.Length == 0 || value.Length == 0) return;

        var keyName = key[0].Value;

        // Transform: key: value -> ["key"] = value
        ReplaceMatch(match, Concat(
            Token.Punctuation("["),
            Token.String($"\"{keyName}\""),
            Token.Punctuation("]"),
            Token.Operator("=")
        ).Concat(value).ToArray());
    }

    // Object literal key: number -> ["key"] = number
    [TokenPattern(@"(\i) "":"" (\n)", Priority = -60)]
    public void VisitObjectKeyValueNumber(TokenMatch match, Token[] key, Token[] value)
    {
        if (key.Length == 0 || value.Length == 0) return;

        var keyName = key[0].Value;

        ReplaceMatch(match, Concat(
            Token.Punctuation("["),
            Token.String($"\"{keyName}\""),
            Token.Punctuation("]"),
            Token.Operator("=")
        ).Concat(value).ToArray());
    }

    // Object literal braces { key: value, ... } -> new Dictionary<string, object> { ["key"] = value, ... }
    // Check for identifier:value pattern to distinguish from block statements
    [TokenPattern(@"""{"" (.*?) ""}""", Priority = -70)]
    public void VisitObjectLiteralBraces(TokenMatch match, Token[] contents)
    {
        if (contents.Length == 0)
        {
            // Empty object {} -> keep as empty block (could be statement block)
            ReplaceMatch(match, match.MatchedTokens);
            return;
        }

        // Check if this looks like an object literal using pattern matching
        var objectLiteralMatcher = new PatternMatcher(@"\i "":""", skipWhitespace: true);
        var isObjectLiteral = objectLiteralMatcher.TryMatch(contents, 0, out _);

        if (!isObjectLiteral)
        {
            // Not an object literal, keep as-is (block statement)
            ReplaceMatch(match, match.MatchedTokens);
            return;
        }

        // Transform the contents (key:value patterns will be converted)
        var transformedContents = Transform(contents);

        // Build: new Dictionary<string, object> { contents }
        var result = new List<Token>
        {
            Token.Keyword("new"),
            Token.Identifier("Dictionary"),
            Token.Punctuation("<"),
            Token.Identifier("string"),
            Token.Punctuation(","),
            Token.Identifier("object"),
            Token.Punctuation(">"),
            Token.Punctuation("{")
        };
        result.AddRange(transformedContents);
        result.Add(Token.Punctuation("}"));

        ReplaceMatch(match, result.ToArray());
    }

    // Array literal [a, b, c] -> new List<object> { a, b, c }
    // Note: This is for standalone array literals, not array indexing
    // Match opening bracket, capture balanced content (using .*? since \Bk captures the brackets too)
    [TokenPattern(@"""["" (.*?) ""]""", Priority = -40)]
    public void VisitArrayLiteral(TokenMatch match, Token[] contents)
    {
        if (contents.Length == 0)
        {
            // Empty array [] -> new List<object>()
            ReplaceMatch(match, Concat(
                Token.Keyword("new"),
                Token.Identifier("List"),
                Token.Punctuation("<"),
                Token.Identifier("object"),
                Token.Punctuation(">"),
                Token.Punctuation("("),
                Token.Punctuation(")")
            ));
            return;
        }

        // Check if this looks like an array literal (has commas or simple values)
        // vs array indexing (single expression)
        var hasComma = contents.Any(t => t.Value == ",");
        var isSimpleIndex = contents.Length == 1 &&
            (contents[0].Type == TokenType.Number || contents[0].Type == TokenType.Identifier);

        if (isSimpleIndex && !hasComma)
        {
            // This is array indexing like arr[0] or arr[i], keep as-is
            ReplaceMatch(match, match.MatchedTokens);
            return;
        }

        // Transform array contents
        var transformedContents = Transform(contents);

        // Build: new List<object> { contents }
        var result = new List<Token>
        {
            Token.Keyword("new"),
            Token.Identifier("List"),
            Token.Punctuation("<"),
            Token.Identifier("object"),
            Token.Punctuation(">"),
            Token.Punctuation("{")
        };
        result.AddRange(transformedContents);
        result.Add(Token.Punctuation("}"));

        ReplaceMatch(match, result.ToArray());
    }

    #endregion

    #region Variable Declarations

    // const x = ... -> var x = ...
    [TokenPattern(@"""const""")]
    public void VisitConst(TokenMatch match)
    {
        ReplaceMatch(match, Token.Keyword("var"));
    }

    // let x = ... -> var x = ...
    [TokenPattern(@"""let""")]
    public void VisitLet(TokenMatch match)
    {
        ReplaceMatch(match, Token.Keyword("var"));
    }

    #endregion

    #region State Access

    // state["key"] -> State["key"]
    [TokenPattern(@"""state"" ""[""")]
    public void VisitStateAccess(TokenMatch match)
    {
        ReplaceMatch(match,
            Token.Identifier("State"),
            Token.Punctuation("[")
        );
    }

    #endregion

    #region Helper Methods

    /// <summary>
    /// Transforms a token array from JS to C#.
    /// Returns the modified token array.
    /// </summary>
    public static Token[] Transform(Token[] jsTokens)
    {
        if (jsTokens == null || jsTokens.Length == 0)
            return jsTokens ?? Array.Empty<Token>();

        var visitor = new JsToCSharpVisitor();
        visitor.Visit(jsTokens.ToList());
        return visitor.GetModifiedTokens()?.ToArray() ?? jsTokens;
    }

    /// <summary>
    /// Transforms a token array and returns the result as a string.
    /// Uses intelligent spacing between tokens.
    /// </summary>
    public static string TransformToString(Token[] jsTokens)
    {
        var transformed = Transform(jsTokens);
        return TokensToStringWithSpacing(transformed);
    }

    /// <summary>
    /// Converts tokens to string with proper spacing between tokens.
    /// </summary>
    private static string TokensToStringWithSpacing(Token[] tokens)
    {
        if (tokens.Length == 0) return "";

        var sb = new System.Text.StringBuilder();
        Token? prev = null;

        foreach (var token in tokens)
        {
            if (prev != null && NeedsSpaceBetween(prev, token))
            {
                sb.Append(' ');
            }
            sb.Append(token.Value);
            prev = token;
        }

        return sb.ToString();
    }

    /// <summary>
    /// Determines if a space is needed between two tokens.
    /// </summary>
    private static bool NeedsSpaceBetween(Token prev, Token next)
    {
        // No space around generic brackets
        if (prev.Value == "<" || next.Value == "<" ||
            prev.Value == ">" || next.Value == ">")
        {
            // Exception: space after > when followed by identifier (e.g., List<T> items)
            if (prev.Value == ">" && next.Type == TokenType.Identifier)
                return true;
            return false;
        }

        // Keywords (new, var, return, etc.) need space before identifiers/types
        if (prev.Type == TokenType.Keyword &&
            (next.Type == TokenType.Identifier || next.Type == TokenType.TypeName ||
             next.Value == "List" || next.Value == "Dictionary"))
            return true;

        // After identifier/keyword, before another identifier/keyword
        if ((prev.Type == TokenType.Identifier || prev.Type == TokenType.Keyword) &&
            (next.Type == TokenType.Identifier || next.Type == TokenType.Keyword))
            return true;

        // After type name, before identifier (but not before <)
        if (prev.Type == TokenType.TypeName && next.Type == TokenType.Identifier)
            return true;

        // After ), before { (e.g., () => { })
        if (prev.Value == ")" && next.Value == "{")
            return true;

        // After {, before content (for object initializers)
        if (prev.Value == "{" && next.Type == TokenType.Identifier)
            return true;

        // After =, before value
        if (prev.Value == "=" && next.Type != TokenType.Operator)
            return true;

        // Before =, after identifier
        if (next.Value == "=" && prev.Type == TokenType.Identifier)
            return true;

        // Around binary operators (+, -, *, /, etc.) but not unary
        if (prev.Type == TokenType.Operator && prev.Value.Length > 0 &&
            "+-*/%".Contains(prev.Value[0]) &&
            (next.Type == TokenType.Identifier || next.Type == TokenType.Number))
            return true;

        if (next.Type == TokenType.Operator && next.Value.Length > 0 &&
            "+-*/%".Contains(next.Value[0]) &&
            (prev.Type == TokenType.Identifier || prev.Type == TokenType.Number ||
             prev.Value == ")" || prev.Value == "]"))
            return true;

        // After comma, before next item
        if (prev.Value == ",")
            return true;

        // Around comparison operators
        if ((prev.Value == "==" || prev.Value == "!=" || prev.Value == ">" ||
             prev.Value == "<" || prev.Value == ">=" || prev.Value == "<=") &&
            next.Type != TokenType.Operator)
            return true;

        if ((next.Value == "==" || next.Value == "!=" || next.Value == ">" ||
             next.Value == "<" || next.Value == ">=" || next.Value == "<=") &&
            prev.Type != TokenType.Operator)
            return true;

        // Around logical operators
        if ((prev.Value == "&&" || prev.Value == "||") ||
            (next.Value == "&&" || next.Value == "||"))
            return true;

        // After colon in ternary or object literal
        if (prev.Value == ":" && prev.Type == TokenType.Colon)
            return true;

        // Around arrow =>
        if (prev.Value == "=>" || next.Value == "=>")
            return true;

        return false;
    }

    #endregion
}
