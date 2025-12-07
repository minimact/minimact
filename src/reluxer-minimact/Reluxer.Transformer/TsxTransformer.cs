using Reluxer.Lexer;
using Reluxer.Tokens;
using Reluxer.Transformer.Models;
using Reluxer.Transformer.Visitors;
using Reluxer.Visitor;

namespace Reluxer.Transformer;

/// <summary>
/// Transforms TSX/JSX source code into C# Minimact components.
/// </summary>
public class TsxTransformer
{
    private readonly TransformOptions _options;

    public TsxTransformer() : this(new TransformOptions()) { }

    public TsxTransformer(TransformOptions options)
    {
        _options = options;
    }

    /// <summary>
    /// Transforms TSX source code into C# code.
    /// </summary>
    public TransformResult Transform(string source)
    {
        // Tokenize the source
        var lexer = new TsxLexer(source);
        var tokens = lexer.Tokenize();

        return Transform(tokens, source);
    }

    /// <summary>
    /// Transforms pre-tokenized TSX into C# code.
    /// </summary>
    public TransformResult Transform(IReadOnlyList<Token> tokens, string source)
    {
        var result = new TransformResult();

        // Shared context for multi-pass transformation
        var sharedContext = new VisitorContext();

        // Phase 1: Extract components
        var componentVisitor = new ComponentVisitor();
        componentVisitor.Visit(tokens, source, sharedContext);
        var components = componentVisitor.Components;

        // Phase 1.5: Extract props from destructured parameters
        foreach (var component in components)
        {
            var paramsKey = $"ComponentParams:{component.Name}";
            var paramTokens = sharedContext.Get<Token[]>(paramsKey);
            if (paramTokens != null && paramTokens.Length > 0)
            {
                var propsVisitor = new PropsVisitor();
                propsVisitor.ExtractPropsFromParams(paramTokens, component.Name);
                foreach (var prop in propsVisitor.Props)
                {
                    component.Props.Add(prop);
                }
            }
        }

        // Phase 1.6: Process custom hooks (useXxx functions)
        // This identifies hook functions and extracts their parameters
        var customHookVisitor = new CustomHookVisitor(components);
        customHookVisitor.Visit(tokens, source, sharedContext);

        // Phase 2: Extract state (useState hooks) - assigns hook indices
        foreach (var component in components)
        {
            var stateVisitor = new StateVisitor(component);
            stateVisitor.Visit(tokens, source, sharedContext);
        }

        // Phase 2.5: Extract effects (useEffect hooks)
        if (_options.GenerateHooks)
        {
            foreach (var component in components)
            {
                var effectVisitor = new EffectVisitor(component);
                effectVisitor.Visit(tokens, source, sharedContext);
            }
        }

        // Phase 2.6: Extract refs (useRef hooks)
        if (_options.GenerateHooks)
        {
            foreach (var component in components)
            {
                var refVisitor = new RefVisitor(component);
                refVisitor.Visit(tokens, source, sharedContext);
            }
        }

        // Phase 2.7: Extract timeline hooks (useTimeline, useTimelineState)
        foreach (var component in components)
        {
            var timelineVisitor = new TimelineVisitor(component);
            timelineVisitor.Visit(tokens, source, sharedContext);
        }

        // Phase 2.8: Extract special hooks (useServerTask, useValidation, etc.)
        foreach (var component in components)
        {
            var specialHooksVisitor = new SpecialHooksVisitor(component);
            specialHooksVisitor.Visit(tokens, source, sharedContext);
        }

        // Phase 3: Extract event handlers and local variables
        foreach (var component in components)
        {
            var handlerVisitor = new HandlerVisitor(component);
            handlerVisitor.Visit(tokens, source, sharedContext);
        }

        // Phase 4: Build render tree (JSX -> VNode)
        foreach (var component in components)
        {
            var jsxVisitor = new JsxVisitor(component);
            jsxVisitor.Visit(tokens, source, sharedContext);
        }

        // Phase 5: Generate C# code
        var csharpGenerator = new CSharpGenerator(_options);
        result.Code = csharpGenerator.Generate(components);
        result.Components = components;

        // Phase 6: Generate template JSON (for predictive patches)
        if (_options.GenerateTemplates)
        {
            var templateGenerator = new TemplateGenerator(_options);
            if (components.Count == 1)
            {
                result.TemplateJson = templateGenerator.Generate(components[0]);
            }
            else if (components.Count > 1)
            {
                result.TemplateJson = templateGenerator.Generate(components);
            }
        }

        // Phase 7: Generate hooks JSON
        if (_options.GenerateHooks)
        {
            var hooksGenerator = new HooksGenerator();
            if (components.Count == 1)
            {
                result.HooksJson = hooksGenerator.Generate(components[0]);
            }
            else if (components.Count > 1)
            {
                result.HooksJson = hooksGenerator.Generate(components);
            }
        }

        // Phase 8: Generate structural changes JSON
        if (_options.GenerateStructuralChanges)
        {
            var structuralGenerator = new StructuralChangesGenerator();
            if (components.Count == 1)
            {
                result.StructuralChangesJson = structuralGenerator.Generate(
                    components[0],
                    _options.SourceFilePath);
            }
            else if (components.Count > 1)
            {
                // For multiple components, concatenate JSON (could be improved)
                var allChanges = components.Select(c =>
                    structuralGenerator.Generate(c, _options.SourceFilePath));
                result.StructuralChangesJson = "[" + string.Join(",", allChanges) + "]";
            }
        }

        // Phase 9: Generate keys JSON
        if (_options.GenerateKeys)
        {
            var keysGenerator = new KeysGenerator();

            // Load existing keys if available
            if (!string.IsNullOrEmpty(_options.ExistingKeysPath) &&
                File.Exists(_options.ExistingKeysPath))
            {
                try
                {
                    var existingKeysContent = File.ReadAllText(_options.ExistingKeysPath);
                    keysGenerator.LoadExistingKeys(existingKeysContent);
                }
                catch
                {
                    // Ignore errors loading existing keys - will generate new ones
                }
            }

            if (components.Count == 1)
            {
                result.KeysJson = keysGenerator.Generate(components[0], tokens);
            }
            else if (components.Count > 1)
            {
                // For multiple components, generate keys for first component
                // (typically each file has one main component)
                result.KeysJson = keysGenerator.Generate(components[0], tokens);
            }
        }

        return result;
    }
}

/// <summary>
/// Options for the transformer.
/// </summary>
public class TransformOptions
{
    public string Namespace { get; set; } = "Minimact.Components";
    public bool GeneratePartialClasses { get; set; } = true;
    public bool IncludeUsings { get; set; } = true;
    public string IndentString { get; set; } = "    ";

    /// <summary>
    /// If true, generates template JSON alongside C# code.
    /// </summary>
    public bool GenerateTemplates { get; set; } = true;

    /// <summary>
    /// If true, generates hooks.json for hook tracking.
    /// </summary>
    public bool GenerateHooks { get; set; } = true;

    /// <summary>
    /// If true, generates structural-changes.json for hot reload.
    /// </summary>
    public bool GenerateStructuralChanges { get; set; } = true;

    /// <summary>
    /// If true, generates tsx.keys for stable element identification.
    /// </summary>
    public bool GenerateKeys { get; set; } = true;

    /// <summary>
    /// Path to existing .tsx.keys file for key persistence.
    /// If set and file exists, keys will be reused.
    /// </summary>
    public string? ExistingKeysPath { get; set; }

    /// <summary>
    /// Source file path (included in structural-changes.json).
    /// </summary>
    public string? SourceFilePath { get; set; }
}

/// <summary>
/// Result of a transformation (multi-output).
/// </summary>
public class TransformResult
{
    /// <summary>
    /// Generated C# code.
    /// </summary>
    public string Code { get; set; } = "";

    /// <summary>
    /// Generated template JSON for predictive patches.
    /// </summary>
    public string TemplateJson { get; set; } = "";

    /// <summary>
    /// Generated hooks JSON for hook tracking.
    /// </summary>
    public string HooksJson { get; set; } = "";

    /// <summary>
    /// Generated structural changes JSON for hot reload.
    /// </summary>
    public string StructuralChangesJson { get; set; } = "";

    /// <summary>
    /// Generated keys JSON for stable element identification.
    /// </summary>
    public string KeysJson { get; set; } = "";

    /// <summary>
    /// Parsed component models (intermediate representation).
    /// </summary>
    public List<ComponentModel> Components { get; set; } = new();

    /// <summary>
    /// Transformation errors.
    /// </summary>
    public List<string> Errors { get; } = new();

    /// <summary>
    /// Transformation warnings.
    /// </summary>
    public List<string> Warnings { get; } = new();

    /// <summary>
    /// Gets file outputs for writing to disk.
    /// Yields tuples of (extension, content) for each generated file.
    /// </summary>
    public IEnumerable<(string Extension, string Content)> GetOutputs()
    {
        yield return (".cs", Code);

        if (!string.IsNullOrEmpty(TemplateJson))
        {
            yield return (".templates.json", TemplateJson);
        }

        if (!string.IsNullOrEmpty(HooksJson))
        {
            yield return (".hooks.json", HooksJson);
        }

        if (!string.IsNullOrEmpty(StructuralChangesJson))
        {
            yield return (".structural-changes.json", StructuralChangesJson);
        }

        if (!string.IsNullOrEmpty(KeysJson))
        {
            yield return (".tsx.keys", KeysJson);
        }
    }
}
