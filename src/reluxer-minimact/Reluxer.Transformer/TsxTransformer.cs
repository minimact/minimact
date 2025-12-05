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

        // Phase 2: Extract state (useState hooks)
        foreach (var component in components)
        {
            var stateVisitor = new StateVisitor(component);
            stateVisitor.Visit(tokens, source, sharedContext);
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

        return result;
    }
}

/// <summary>
/// Options for the transformer.
/// </summary>
public class TransformOptions
{
    public string Namespace { get; set; } = "MinimactTest.Components";
    public bool GeneratePartialClasses { get; set; } = true;
    public bool IncludeUsings { get; set; } = true;
    public string IndentString { get; set; } = "    ";

    /// <summary>
    /// If true, generates template JSON alongside C# code.
    /// </summary>
    public bool GenerateTemplates { get; set; } = true;
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
    /// </summary>
    public IEnumerable<(string Extension, string Content)> GetOutputs()
    {
        yield return (".cs", Code);
        if (!string.IsNullOrEmpty(TemplateJson))
        {
            yield return (".templates.json", TemplateJson);
        }
    }
}
