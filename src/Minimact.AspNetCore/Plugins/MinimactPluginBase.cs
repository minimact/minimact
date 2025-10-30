using Minimact.AspNetCore.Core;

namespace Minimact.AspNetCore.Plugins;

/// <summary>
/// Base class for Minimact plugins with default implementations
/// </summary>
public abstract class MinimactPluginBase : IMinimactPlugin
{
    public abstract string Name { get; }
    public abstract string Version { get; }
    public virtual string Description => string.Empty;
    public virtual string Author => string.Empty;

    public abstract VNode Render(object state);

    public virtual bool ValidateState(object state)
    {
        // Default: use JSON schema validation if provided
        var schema = GetStateSchema();
        if (string.IsNullOrEmpty(schema)) return true;

        return JsonSchemaValidator.Validate(state, schema);
    }

    public virtual PluginAssets GetAssets()
    {
        return new PluginAssets();
    }

    public virtual string GetStateSchema()
    {
        // Override in derived class to provide JSON schema
        return string.Empty;
    }

    public virtual void Initialize(IServiceProvider services)
    {
        // Default: no initialization needed
        // Override if plugin needs to access DI services
    }
}

/// <summary>
/// Strongly-typed base class for type-safe state handling
/// </summary>
/// <typeparam name="TState">The type of state this plugin expects</typeparam>
public abstract class MinimactPlugin<TState> : MinimactPluginBase
{
    public sealed override VNode Render(object state)
    {
        if (state is not TState typedState)
        {
            throw new ArgumentException($"State must be of type {typeof(TState).Name}, got {state?.GetType().Name ?? "null"}");
        }
        return RenderTyped(typedState);
    }

    protected abstract VNode RenderTyped(TState state);

    public override string GetStateSchema()
    {
        return JsonSchemaGenerator.Generate<TState>();
    }
}
