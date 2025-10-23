using System.Text.RegularExpressions;

namespace Minimact.AspNetCore.Core;

/// <summary>
/// Represents a validation field with rules and state
/// </summary>
public class ValidationField
{
    /// <summary>
    /// Unique key for this field
    /// </summary>
    public string FieldKey { get; set; } = "";

    /// <summary>
    /// Current value of the field
    /// </summary>
    public string Value { get; set; } = "";

    /// <summary>
    /// Whether the field is required
    /// </summary>
    public bool Required { get; set; }

    /// <summary>
    /// Minimum length requirement
    /// </summary>
    public int? MinLength { get; set; }

    /// <summary>
    /// Maximum length requirement
    /// </summary>
    public int? MaxLength { get; set; }

    /// <summary>
    /// Regex pattern for validation
    /// </summary>
    public string? Pattern { get; set; }

    /// <summary>
    /// Custom validation error message
    /// </summary>
    public string? Message { get; set; }

    /// <summary>
    /// Current error message (null if valid)
    /// </summary>
    public string? Error
    {
        get
        {
            if (Required && string.IsNullOrWhiteSpace(Value))
            {
                return Message ?? "This field is required";
            }

            if (MinLength.HasValue && Value.Length < MinLength.Value)
            {
                return Message ?? $"Minimum length is {MinLength.Value} characters";
            }

            if (MaxLength.HasValue && Value.Length > MaxLength.Value)
            {
                return Message ?? $"Maximum length is {MaxLength.Value} characters";
            }

            if (!string.IsNullOrEmpty(Pattern) && !string.IsNullOrWhiteSpace(Value))
            {
                // Remove leading/trailing slashes from pattern if present
                var cleanPattern = Pattern.TrimStart('/').TrimEnd('/');
                if (!Regex.IsMatch(Value, cleanPattern))
                {
                    return Message ?? "Invalid format";
                }
            }

            return null;
        }
    }

    /// <summary>
    /// Whether the field is currently valid
    /// </summary>
    public bool Valid => Error == null;

    /// <summary>
    /// Props to be spread onto the input element
    /// </summary>
    public Dictionary<string, string> Props => new Dictionary<string, string>
    {
        ["name"] = FieldKey,
        ["value"] = Value,
        ["data-validation"] = FieldKey
    };

    /// <summary>
    /// Validate the field and return error if any
    /// </summary>
    public string? Validate()
    {
        return Error;
    }

    /// <summary>
    /// Set the value and trigger validation
    /// </summary>
    public void SetValue(string value)
    {
        Value = value;
    }
}
