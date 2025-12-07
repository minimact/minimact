using Reluxer.Matching;
using Reluxer.Tokens;

namespace Reluxer.Extensions;

/// <summary>
/// LINQ-like extension methods for Token[] that use PatternMatcher internally.
/// These provide a declarative API that satisfies REL005 while being ergonomic.
/// </summary>
public static class TokenLinqExtensions
{
    /// <summary>
    /// Filters tokens matching a pattern.
    /// Example: tokens.LuxWhere(@"\i") returns all identifiers.
    /// </summary>
    public static IEnumerable<Token> LuxWhere(this Token[] tokens, string pattern)
    {
        var matcher = new PatternMatcher(pattern, skipWhitespace: true);
        int pos = 0;
        while (pos < tokens.Length)
        {
            if (matcher.TryMatch(tokens, pos, out var match) && match != null)
            {
                foreach (var token in match.MatchedTokens)
                {
                    yield return token;
                }
                // Ensure we always advance at least one position
                pos = Math.Max(pos + 1, match.EndIndex);
            }
            else
            {
                pos++;
            }
        }
    }

    /// <summary>
    /// Filters tokens matching a pattern and returns captured groups.
    /// Example: tokens.LuxSelect(@"(\i)") returns captured identifiers.
    /// </summary>
    public static IEnumerable<Token[]> LuxSelect(this Token[] tokens, string pattern)
    {
        var matcher = new PatternMatcher(pattern, skipWhitespace: true);
        int pos = 0;
        while (pos < tokens.Length)
        {
            if (matcher.TryMatch(tokens, pos, out var match) && match != null)
            {
                if (match.Captures.Length > 0)
                {
                    yield return match.Captures[0].Tokens;
                }
                // Ensure we always advance at least one position
                pos = Math.Max(pos + 1, match.EndIndex);
            }
            else
            {
                pos++;
            }
        }
    }

    /// <summary>
    /// Filters tokens matching a pattern and projects using a selector.
    /// Example: tokens.LuxSelect(@"(\i)", m => m.Captures[0].AsIdentifier())
    /// </summary>
    public static IEnumerable<T> LuxSelect<T>(this Token[] tokens, string pattern, Func<TokenMatch, T> selector)
    {
        var matcher = new PatternMatcher(pattern, skipWhitespace: true);
        int pos = 0;
        while (pos < tokens.Length)
        {
            if (matcher.TryMatch(tokens, pos, out var match) && match != null)
            {
                yield return selector(match);
                // Ensure we always advance at least one position
                pos = Math.Max(pos + 1, match.EndIndex);
            }
            else
            {
                pos++;
            }
        }
    }

    /// <summary>
    /// Finds the first token matching a pattern.
    /// Example: tokens.LuxFind(@"""=>""") finds arrow token.
    /// </summary>
    public static Token? LuxFind(this Token[] tokens, string pattern)
    {
        var matcher = new PatternMatcher(pattern, skipWhitespace: true);
        if (matcher.TryMatch(tokens, 0, out var match) && match != null)
        {
            return match.MatchedTokens.FirstOrDefault();
        }
        return null;
    }

    /// <summary>
    /// Finds the first match and returns the match object.
    /// Example: tokens.LuxMatch(@"(\i) ""="" (.*)")
    /// </summary>
    public static TokenMatch? LuxMatch(this Token[] tokens, string pattern)
    {
        var matcher = new PatternMatcher(pattern, skipWhitespace: true);
        if (matcher.TryMatch(tokens, 0, out var match))
        {
            return match;
        }
        return null;
    }

    /// <summary>
    /// Returns all matches for a pattern.
    /// Example: tokens.LuxMatchAll(@"(\i)") returns all identifier matches.
    /// </summary>
    public static IEnumerable<TokenMatch> LuxMatchAll(this Token[] tokens, string pattern)
    {
        var matcher = new PatternMatcher(pattern, skipWhitespace: true);
        int pos = 0;
        while (pos < tokens.Length)
        {
            if (matcher.TryMatch(tokens, pos, out var match) && match != null)
            {
                yield return match;
                // Ensure we always advance at least one position
                pos = Math.Max(pos + 1, match.EndIndex);
            }
            else
            {
                pos++;
            }
        }
    }

    /// <summary>
    /// Finds the index of the first token matching a pattern.
    /// Example: tokens.LuxIndexOf(@"""=>""") returns index of arrow.
    /// </summary>
    public static int LuxIndexOf(this Token[] tokens, string pattern)
    {
        var matcher = new PatternMatcher(pattern, skipWhitespace: true);
        if (matcher.TryMatch(tokens, 0, out var match) && match != null)
        {
            return match.StartIndex;
        }
        return -1;
    }

    /// <summary>
    /// Splits tokens at a delimiter pattern.
    /// Example: tokens.LuxSplit(@""",""") splits on commas.
    /// </summary>
    public static IEnumerable<Token[]> LuxSplit(this Token[] tokens, string delimiterPattern)
    {
        var matches = tokens.LuxMatchAll(delimiterPattern).ToList();

        if (matches.Count == 0)
        {
            yield return tokens;
            yield break;
        }

        int lastEnd = 0;
        foreach (var match in matches)
        {
            if (match.StartIndex > lastEnd)
            {
                yield return tokens[lastEnd..match.StartIndex];
            }
            lastEnd = match.EndIndex;
        }

        if (lastEnd < tokens.Length)
        {
            yield return tokens[lastEnd..];
        }
    }

    /// <summary>
    /// Takes tokens before a pattern match.
    /// Example: tokens.LuxTakeBefore(@"""=>""") returns tokens before arrow.
    /// </summary>
    public static Token[] LuxTakeBefore(this Token[] tokens, string pattern)
    {
        var idx = tokens.LuxIndexOf(pattern);
        return idx > 0 ? tokens[..idx] : Array.Empty<Token>();
    }

    /// <summary>
    /// Takes tokens after a pattern match.
    /// Example: tokens.LuxSkipAfter(@"""=>""") returns tokens after arrow.
    /// </summary>
    public static Token[] LuxSkipAfter(this Token[] tokens, string pattern)
    {
        var matcher = new PatternMatcher(pattern, skipWhitespace: true);
        if (matcher.TryMatch(tokens, 0, out var match) && match != null)
        {
            return tokens[match.EndIndex..];
        }
        return Array.Empty<Token>();
    }

    /// <summary>
    /// Checks if tokens contain a pattern.
    /// Example: tokens.LuxContains(@"""=>""")
    /// </summary>
    public static bool LuxContains(this Token[] tokens, string pattern)
    {
        var matcher = new PatternMatcher(pattern, skipWhitespace: true);
        return matcher.TryMatch(tokens, 0, out _);
    }

    /// <summary>
    /// Filters out whitespace tokens.
    /// </summary>
    public static Token[] LuxTrimWhitespace(this Token[] tokens)
    {
        if (tokens.Length == 0) return tokens;

        int start = 0;
        while (start < tokens.Length && tokens[start].Type == TokenType.Whitespace)
            start++;

        int end = tokens.Length - 1;
        while (end > start && tokens[end].Type == TokenType.Whitespace)
            end--;

        return tokens[start..(end + 1)];
    }

    /// <summary>
    /// Returns tokens without whitespace, comments, or EOF.
    /// Uses negated pattern \W\C\E - matches any token that is NOT Whitespace, Comment, or Eof.
    /// </summary>
    public static Token[] LuxNoWhitespace(this Token[] tokens)
    {
        return tokens.LuxWhere(@"\W").ToArray();
    }

    /// <summary>
    /// Returns tokens without whitespace, comments, or EOF (common filter).
    /// </summary>
    public static Token[] LuxSignificant(this Token[] tokens)
    {
        // Matches any token that is NOT Whitespace (\W), NOT Comment (\C), NOT Eof (\E)
        // These are separate patterns combined in sequence - each must match for the token to pass
        return tokens.LuxWhere(@"(?=\W)(?=\C)(?=\E).").ToArray();
    }

    /// <summary>
    /// Returns identifier values from the tokens.
    /// Example: tokens.LuxIdentifiers() returns all identifier string values.
    /// </summary>
    public static IEnumerable<string> LuxIdentifiers(this Token[] tokens)
    {
        return tokens.LuxWhere(@"\i").Select(t => t.Value);
    }

    /// <summary>
    /// Returns string literal values (without quotes) from the tokens.
    /// </summary>
    public static IEnumerable<string> LuxStrings(this Token[] tokens)
    {
        return tokens.LuxWhere(@"\s").Select(t => t.Value.Trim('"', '\''));
    }

    /// <summary>
    /// Returns token values for tokens matching a pattern.
    /// Example: tokens.LuxValues(@"\i") returns identifier values.
    /// </summary>
    public static IEnumerable<string> LuxValues(this Token[] tokens, string pattern)
    {
        return tokens.LuxWhere(pattern).Select(t => t.Value);
    }

    /// <summary>
    /// Compares two token arrays for value equality.
    /// Returns true if both arrays have the same length and token values match.
    /// </summary>
    public static bool LuxSequenceEqual(this Token[] tokens, Token[] other)
    {
        if (tokens.Length != other.Length)
            return false;

        for (int i = 0; i < tokens.Length; i++)
        {
            if (tokens[i].Value != other[i].Value)
                return false;
        }

        return true;
    }
}
