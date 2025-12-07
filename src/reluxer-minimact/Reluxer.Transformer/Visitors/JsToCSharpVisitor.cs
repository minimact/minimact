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

    // .length -> .Count
    [TokenPattern(@"""."" ""length""")]
    public void VisitLength(TokenMatch match)
    {
        ReplaceMatch(match,
            Token.Punctuation("."),
            Token.Identifier("Count")
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
    [TokenPattern(@"""."" ""sort"" ""("" (.*?) "")""")]
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

    // .reduce(fn, init) -> .Aggregate(init, fn)
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
    private static Token[] WrapMethod(string methodName, Token[] args)
    {
        return Concat(
            Token.Punctuation("."),
            Token.Identifier(methodName),
            Token.Punctuation("(")
        ).Concat(args).Concat(new[] {
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
    [TokenPattern(@"""."" ""toFixed"" ""("" (\d) "")""")]
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

    // Template literal: `text ${expr}` -> $"text {expr}"
    // This is handled at the token level - TemplateLiteral tokens get converted
    [TokenPattern(@"(\`)")]
    public void VisitTemplateLiteralStart(TokenMatch match)
    {
        // Convert backtick to $"
        ReplaceMatch(match, Token.String("$\""));
    }

    // Single quoted string 'text' -> "text"
    // The lexer produces String tokens for both, but we need to ensure double quotes
    [TokenPattern(@"(')")]
    public void VisitSingleQuote(TokenMatch match)
    {
        ReplaceMatch(match, Token.String("\""));
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
    /// </summary>
    public static string TransformToString(Token[] jsTokens)
    {
        var transformed = Transform(jsTokens);
        return string.Join("", transformed.Select(t => t.Value));
    }

    #endregion
}
