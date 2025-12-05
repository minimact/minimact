using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Json.Serialization;
using Reluxer.Transformer.Models;

namespace Reluxer.Transformer;

/// <summary>
/// Generates .hooks.json files from parsed component models.
/// These files track all hooks used in a component with their types, names, and indices.
/// Used by hot reload to detect hook changes (additions, removals, reordering).
/// </summary>
public class HooksGenerator
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        WriteIndented = true,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
        Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping
    };

    /// <summary>
    /// Generates hooks JSON for a single component.
    /// </summary>
    public string Generate(ComponentModel component)
    {
        var output = new HooksJsonOutput
        {
            ComponentName = component.Name,
            Timestamp = DateTime.UtcNow.ToString("O")
        };

        // Collect all hooks
        var allHooks = new List<HookEntry>();

        // Add useState hooks
        foreach (var state in component.StateFields)
        {
            allHooks.Add(new HookEntry
            {
                Type = "useState",
                VarName = state.Name,
                Index = state.HookIndex
            });
        }

        // Add useMvcState hooks
        foreach (var mvc in component.MvcStateFields)
        {
            allHooks.Add(new HookEntry
            {
                Type = "useMvcState",
                VarName = mvc.LocalName,
                ViewModelKey = mvc.ViewModelKey,
                Index = mvc.HookIndex,
                Mutable = !string.IsNullOrEmpty(mvc.SetterName)
            });
        }

        // Add useEffect hooks
        foreach (var effect in component.EffectHooks)
        {
            allHooks.Add(new HookEntry
            {
                Type = "useEffect",
                Index = effect.Index,
                Deps = effect.Dependencies.Count > 0 ? effect.Dependencies.ToArray() : null,
                HasCleanup = effect.HasCleanup ? true : null
            });
        }

        // Add useRef hooks
        foreach (var refHook in component.RefHooks)
        {
            allHooks.Add(new HookEntry
            {
                Type = "useRef",
                VarName = refHook.Name,
                Index = refHook.Index
            });
        }

        // Sort by index to maintain hook order
        output.Hooks = allHooks.OrderBy(h => h.Index).ToList();

        return JsonSerializer.Serialize(output, JsonOptions);
    }

    /// <summary>
    /// Generates hooks JSON for multiple components (combined output).
    /// </summary>
    public string Generate(List<ComponentModel> components)
    {
        if (components.Count == 1)
        {
            return Generate(components[0]);
        }

        // For multiple components, generate an array of outputs
        var outputs = components.Select(c =>
        {
            var output = new HooksJsonOutput
            {
                ComponentName = c.Name,
                Timestamp = DateTime.UtcNow.ToString("O")
            };

            var allHooks = new List<HookEntry>();

            foreach (var state in c.StateFields)
            {
                allHooks.Add(new HookEntry
                {
                    Type = "useState",
                    VarName = state.Name,
                    Index = state.HookIndex
                });
            }

            foreach (var mvc in c.MvcStateFields)
            {
                allHooks.Add(new HookEntry
                {
                    Type = "useMvcState",
                    VarName = mvc.LocalName,
                    ViewModelKey = mvc.ViewModelKey,
                    Index = mvc.HookIndex,
                    Mutable = !string.IsNullOrEmpty(mvc.SetterName)
                });
            }

            foreach (var effect in c.EffectHooks)
            {
                allHooks.Add(new HookEntry
                {
                    Type = "useEffect",
                    Index = effect.Index,
                    Deps = effect.Dependencies.Count > 0 ? effect.Dependencies.ToArray() : null,
                    HasCleanup = effect.HasCleanup ? true : null
                });
            }

            foreach (var refHook in c.RefHooks)
            {
                allHooks.Add(new HookEntry
                {
                    Type = "useRef",
                    VarName = refHook.Name,
                    Index = refHook.Index
                });
            }

            output.Hooks = allHooks.OrderBy(h => h.Index).ToList();
            return output;
        }).ToList();

        return JsonSerializer.Serialize(outputs, JsonOptions);
    }
}

#region JSON Output Models

internal class HooksJsonOutput
{
    public string ComponentName { get; set; } = "";
    public string Timestamp { get; set; } = "";
    public List<HookEntry> Hooks { get; set; } = new();
}

internal class HookEntry
{
    public string Type { get; set; } = "";

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? VarName { get; set; }

    public int Index { get; set; }

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string[]? Deps { get; set; }

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? ViewModelKey { get; set; }

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public bool? Mutable { get; set; }

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public bool? HasCleanup { get; set; }
}

#endregion
