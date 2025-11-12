namespace Minimact.AspNetCore.Attributes;

/// <summary>
/// Controls which client-side modules from mact_modules/ are included for this component
///
/// Default behavior: Include ALL modules from mact_modules/ (zero-config)
/// Use this attribute to opt-out or selectively include modules for performance
/// </summary>
/// <example>
/// // Example 1: Opt-out of all extra modules (core only - 12 KB)
/// [ModuleInfo(OptOut = true)]
/// public class LandingPage : MinimactComponent { }
///
/// // Example 2: Exclude specific modules
/// [ModuleInfo(Exclude = new[] { "lodash", "moment" })]
/// public class ProductPage : MinimactComponent { }
///
/// // Example 3: Explicitly include only specific modules
/// [ModuleInfo(Include = new[] { "@minimact/power", "lodash" })]
/// public class DataProcessorPage : MinimactComponent { }
/// </example>
[AttributeUsage(AttributeTargets.Class, AllowMultiple = false, Inherited = true)]
public class ModuleInfoAttribute : Attribute
{
    /// <summary>
    /// Opt-out of automatic module inclusion
    ///
    /// When true with no Exclude list: Component uses core only (12 KB)
    /// When true with Exclude list: Component includes all modules except excluded ones
    ///
    /// Default: false (include all modules)
    /// </summary>
    public bool OptOut { get; set; } = false;

    /// <summary>
    /// Exclude specific modules by name
    /// Only applies when OptOut is true
    ///
    /// Example: new[] { "lodash", "moment", "@minimact/punch" }
    /// </summary>
    public string[]? Exclude { get; set; }

    /// <summary>
    /// Explicitly include only these modules (overrides default behavior)
    /// When set, ONLY these modules are included (ignores OptOut and Exclude)
    ///
    /// Example: new[] { "@minimact/power", "lodash" }
    /// </summary>
    public string[]? Include { get; set; }

    /// <summary>
    /// Constructor for easy opt-out
    /// </summary>
    public ModuleInfoAttribute()
    {
    }

    /// <summary>
    /// Constructor for opt-out with exclusions
    /// </summary>
    /// <param name="optOut">Set to true to enable opt-out mode</param>
    public ModuleInfoAttribute(bool optOut)
    {
        OptOut = optOut;
    }
}
