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

        foreach (var (memberInfo, attribute) in members)
        {
            var key = attribute.Key ?? memberInfo.Name;

            if (component.State.TryGetValue(key, out var value))
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

        foreach (var (memberInfo, attribute) in members)
        {
            var key = attribute.Key ?? memberInfo.Name;

            // If MVC ViewModel already populated this state, don't overwrite with default field value
            if (component.MvcViewModel != null && component.State.ContainsKey(key))
            {
                Console.WriteLine($"[StateManager] Skipping {key} - already populated from MVC ViewModel (value: {component.State[key]})");
                continue;
            }

            var value = GetMemberValue(component, memberInfo);

            if (value != null)
            {
                Console.WriteLine($"[StateManager] Syncing {key} from field to state (value: {value})");
                component.State[key] = value;
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
        switch (member)
        {
            case FieldInfo field:
                field.SetValue(obj, value);
                break;
            case PropertyInfo property:
                if (property.CanWrite)
                {
                    property.SetValue(obj, value);
                }
                break;
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
