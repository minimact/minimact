using System.Globalization;
using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Json.Serialization;
using Reluxer.Tokens;
using Reluxer.Transformer.Models;

namespace Reluxer.Transformer;

/// <summary>
/// Generates and persists .tsx.keys files for stable element identification.
/// Keys are persisted across file saves so that element identities remain stable.
/// This enables:
/// - Hot reload to correlate old vs new elements
/// - Accurate structural change detection
/// - Predictable patch targeting
/// </summary>
public class KeysGenerator
{
    /// <summary>
    /// Gap between sibling keys to allow insertions.
    /// With 0x10000000, we can insert ~268 million siblings between any two elements.
    /// </summary>
    private const int HEX_GAP = 0x10000000;

    private Dictionary<string, string> _existingKeys = new();
    private int _nextKeyValue = 1;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        WriteIndented = true,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
        Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping
    };

    /// <summary>
    /// Loads existing keys from a .tsx.keys file content.
    /// Call this before Generate() to reuse existing keys.
    /// </summary>
    public void LoadExistingKeys(string json)
    {
        try
        {
            var data = JsonSerializer.Deserialize<KeysJsonFile>(json, JsonOptions);
            if (data?.Keys != null)
            {
                _existingKeys = new Dictionary<string, string>(data.Keys);

                // Parse nextKey to continue sequence
                if (!string.IsNullOrEmpty(data.NextKey) &&
                    int.TryParse(data.NextKey, NumberStyles.HexNumber, null, out var next))
                {
                    _nextKeyValue = next / HEX_GAP;
                }
            }
        }
        catch (JsonException)
        {
            // Invalid JSON - start fresh
            _existingKeys = new();
            _nextKeyValue = 1;
        }
    }

    /// <summary>
    /// Generates keys JSON from the component and its tokens.
    /// Reuses existing keys where possible, generates new keys for new elements.
    /// </summary>
    public string Generate(ComponentModel component, IReadOnlyList<Token> tokens)
    {
        var output = new KeysJsonFile
        {
            Version = "1.0",
            ComponentName = component.Name,
            GeneratedAt = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
        };

        // Collect all JSX elements with their positions
        var elements = CollectJsxElements(tokens);

        foreach (var elem in elements)
        {
            var locationKey = $"{elem.TagName}:{elem.Line}:{elem.Column}";

            if (_existingKeys.TryGetValue(locationKey, out var existingKey))
            {
                // Reuse existing key
                output.Keys[locationKey] = existingKey;
            }
            else
            {
                // Generate new key
                var newKey = (_nextKeyValue++ * HEX_GAP).ToString("X8");
                output.Keys[locationKey] = newKey;
            }
        }

        output.NextKey = (_nextKeyValue * HEX_GAP).ToString("X8");

        return JsonSerializer.Serialize(output, JsonOptions);
    }

    /// <summary>
    /// Gets the hex key for an element at a given position.
    /// If no existing key, generates a new one.
    /// </summary>
    public string GetKeyForElement(string tagName, int line, int column)
    {
        var locationKey = $"{tagName}:{line}:{column}";

        if (_existingKeys.TryGetValue(locationKey, out var key))
        {
            return key;
        }

        // Generate new
        var newKey = (_nextKeyValue++ * HEX_GAP).ToString("X8");
        _existingKeys[locationKey] = newKey;
        return newKey;
    }

    /// <summary>
    /// Gets a key lookup function for use during JSX parsing.
    /// </summary>
    public Func<string, int, int, string> GetKeyLookup()
    {
        return GetKeyForElement;
    }

    /// <summary>
    /// Collects all JSX opening tags from the token stream.
    /// </summary>
    private List<JsxElementInfo> CollectJsxElements(IReadOnlyList<Token> tokens)
    {
        var elements = new List<JsxElementInfo>();

        foreach (var token in tokens)
        {
            // JsxTagOpen tokens look like "<tagName"
            if (token.Type == TokenType.JsxTagOpen)
            {
                var tagName = token.Value.TrimStart('<');

                // Skip self-closing markers and closing tags
                if (string.IsNullOrEmpty(tagName) || tagName.StartsWith("/"))
                    continue;

                elements.Add(new JsxElementInfo
                {
                    TagName = tagName,
                    Line = token.Line,
                    Column = token.Column
                });
            }
        }

        return elements;
    }

    /// <summary>
    /// Resets the generator state (for testing or processing multiple unrelated files).
    /// </summary>
    public void Reset()
    {
        _existingKeys.Clear();
        _nextKeyValue = 1;
    }
}

#region Internal Types

internal class JsxElementInfo
{
    public string TagName { get; set; } = "";
    public int Line { get; set; }
    public int Column { get; set; }
}

#endregion

#region JSON Models

internal class KeysJsonFile
{
    public string Version { get; set; } = "1.0";
    public string ComponentName { get; set; } = "";
    public long GeneratedAt { get; set; }
    public Dictionary<string, string> Keys { get; set; } = new();
    public string NextKey { get; set; } = "";
}

#endregion
