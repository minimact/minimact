using System.Reflection;

namespace Minimact.AspNetCore.Core;

/// <summary>
/// Manages state synchronization between [State] attributes and internal state dictionary
/// Uses reflection to automatically sync decorated fields/properties
/// </summary>
public static class StateManager
{
    /// <summary>
    /// Initialize state from [State] decorated members
    /// Called during component construction
    /// </summary>
    public static void InitializeState(MinimactComponent component)
    {
        var type = component.GetType();
        var members = GetStateMembers(type);

        foreach (var (memberInfo, attribute) in members)
        {
            var key = attribute.Key ?? memberInfo.Name;

            // If MVC ViewModel already populated this state, don't overwrite with default field value
            if (component.MvcViewModel != null && component.State.ContainsKey(key))
            {
                Console.WriteLine($"[StateManager.InitializeState] Skipping {key} - already populated from MVC ViewModel (value: {component.State[key]})");
                continue;
            }

            var value = GetMemberValue(component, memberInfo);

            if (value != null)
            {
                Console.WriteLine($"[StateManager.InitializeState] Initializing {key} from field (value: {value})");
                component.State[key] = value;
            }
        }
    }

    /// <summary>
    /// Sync state dictionary back to [State] decorated members
    /// Called after state changes to update the actual fields/properties
    /// </summary>
    public static void SyncStateToMembers(MinimactComponent component)
    {
        var type = component.GetType();
        var members = GetStateMembers(type);

        // Get namespace and parent for lifted state pattern
        var stateNamespace = component.GetStateNamespace();
        var parentComponent = component.GetParentComponent();

        foreach (var (memberInfo, attribute) in members)
        {
            var key = attribute.Key ?? memberInfo.Name;

            // Determine the actual state key (with namespace if lifted state)
            var actualKey = stateNamespace != null && parentComponent != null
                ? $"{stateNamespace}.{key}"
                : key;

            // Read from parent state if using lifted state, otherwise local state
            var stateSource = parentComponent?.State ?? component.State;

            if (stateSource.TryGetValue(actualKey, out var value))
            {
                SetMemberValue(component, memberInfo, value);
            }
        }
    }

    /// <summary>
    /// Sync [State] decorated members to state dictionary
    /// Called before rendering to capture any direct field changes
    /// </summary>
    public static void SyncMembersToState(MinimactComponent component)
    {
        var type = component.GetType();
        var members = GetStateMembers(type);

        // Get namespace and parent for lifted state pattern
        var stateNamespace = component.GetStateNamespace();
        var parentComponent = component.GetParentComponent();

        foreach (var (memberInfo, attribute) in members)
        {
            var key = attribute.Key ?? memberInfo.Name;

            // Determine the actual state key (with namespace if lifted state)
            var actualKey = stateNamespace != null && parentComponent != null
                ? $"{stateNamespace}.{key}"
                : key;

            // Determine the state target (parent if lifted state, otherwise local)
            var stateTarget = parentComponent?.State ?? component.State;

            // If MVC ViewModel already populated this state, don't overwrite with default field value
            if (component.MvcViewModel != null && stateTarget.ContainsKey(actualKey))
            {
                Console.WriteLine($"[StateManager] Skipping {actualKey} - already populated from MVC ViewModel (value: {stateTarget[actualKey]})");
                continue;
            }

            var value = GetMemberValue(component, memberInfo);

            if (value != null)
            {
                Console.WriteLine($"[StateManager] Syncing {actualKey} from field to state (value: {value})");
                stateTarget[actualKey] = value;
            }
        }
    }

    /// <summary>
    /// Get all members decorated with [State] attribute
    /// </summary>
    private static List<(MemberInfo Member, StateAttribute Attribute)> GetStateMembers(Type type)
    {
        var members = new List<(MemberInfo, StateAttribute)>();

        // Get fields with [State]
        var fields = type.GetFields(BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Instance)
            .Where(f => f.GetCustomAttribute<StateAttribute>() != null);

        foreach (var field in fields)
        {
            var attr = field.GetCustomAttribute<StateAttribute>()!;
            members.Add((field, attr));
        }

        // Get properties with [State]
        var properties = type.GetProperties(BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Instance)
            .Where(p => p.GetCustomAttribute<StateAttribute>() != null);

        foreach (var property in properties)
        {
            var attr = property.GetCustomAttribute<StateAttribute>()!;
            members.Add((property, attr));
        }

        return members;
    }

    /// <summary>
    /// Get value from field or property
    /// </summary>
    private static object? GetMemberValue(object obj, MemberInfo member)
    {
        return member switch
        {
            FieldInfo field => field.GetValue(obj),
            PropertyInfo property => property.GetValue(obj),
            _ => null
        };
    }

    /// <summary>
    /// Set value to field or property
    /// </summary>
    private static void SetMemberValue(object obj, MemberInfo member, object? value)
    {
        Type targetType;

        switch (member)
        {
            case FieldInfo field:
                targetType = field.FieldType;
                // Convert value to target type if needed
                var convertedFieldValue = ConvertValue(value, targetType);
                field.SetValue(obj, convertedFieldValue);
                break;
            case PropertyInfo property:
                if (property.CanWrite)
                {
                    targetType = property.PropertyType;
                    // Convert value to target type if needed
                    var convertedPropValue = ConvertValue(value, targetType);
                    property.SetValue(obj, convertedPropValue);
                }
                break;
        }
    }

    /// <summary>
    /// Convert a value to the target type, handling common conversions
    /// </summary>
    private static object? ConvertValue(object? value, Type targetType)
    {
        if (value == null)
            return null;

        var valueType = value.GetType();

        // If types already match, no conversion needed
        if (targetType.IsAssignableFrom(valueType))
            return value;

        // Handle nullable types
        var underlyingType = Nullable.GetUnderlyingType(targetType);
        if (underlyingType != null)
            targetType = underlyingType;

        try
        {
            // Use Convert.ChangeType for common conversions (decimal → int, double → int, etc.)
            return Convert.ChangeType(value, targetType);
        }
        catch
        {
            // If conversion fails, try direct assignment (may throw if incompatible)
            return value;
        }
    }

    /// <summary>
    /// Create a state wrapper that automatically syncs on property changes
    /// This enables automatic re-rendering when state is modified
    /// </summary>
    public static T CreateStateProxy<T>(T component) where T : MinimactComponent
    {
        // For now, return the component as-is
        // In the future, we could use Castle.DynamicProxy or similar
        // to intercept property setters and auto-trigger renders
        return component;
    }
}
