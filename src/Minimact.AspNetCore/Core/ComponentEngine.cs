using Minimact.AspNetCore.Abstractions;

namespace Minimact.AspNetCore.Core;

/// <summary>
/// Core component engine - THE PRODUCTION CODE
///
/// This is used by BOTH:
/// - MinimactHub (real SignalR server)
/// - MockHub (Command Center testing)
///
/// CRITICAL: No SignalR dependencies!
/// Only knows about components, state, rendering, and patches.
/// </summary>
public class ComponentEngine : IComponentEngine
{
    private readonly ComponentRegistry _registry;

    public ComponentEngine(ComponentRegistry registry)
    {
        _registry = registry;
    }

    // ========================================
    // Component Lifecycle
    // ========================================

    public void RegisterComponent(string componentId, MinimactComponent component)
    {
        _registry.RegisterComponent(component);
    }

    public MinimactComponent? GetComponent(string componentId)
    {
        return _registry.GetComponent(componentId);
    }

    public void UnregisterComponent(string componentId)
    {
        _registry.UnregisterComponent(componentId);
    }

    // ========================================
    // State Management
    // ========================================

    public async Task<List<Patch>> UpdateComponentStateAsync(
        string componentId,
        string stateKey,
        object value)
    {
        var component = _registry.GetComponent(componentId);
        if (component == null)
            return new List<Patch>();

        // Update state (keeps server in sync with client)
        component.SetStateFromClient(stateKey, value);

        // Trigger re-render with new state
        // Component will send patches via its injected IPatchSender
        component.TriggerRender();

        // Note: Patches are sent directly by component via IPatchSender
        // We return empty list for backward compatibility
        return new List<Patch>();
    }

    public async Task<List<Patch>> UpdateDomElementStateAsync(
        string componentId,
        string stateKey,
        DomElementStateSnapshot snapshot)
    {
        var component = _registry.GetComponent(componentId);
        if (component == null)
            return new List<Patch>();

        // Update DOM state
        component.SetDomStateFromClient(stateKey, snapshot);

        // Trigger re-render
        // Component will send patches via its injected IPatchSender
        component.TriggerRender();

        // Note: Patches are sent directly by component via IPatchSender
        return new List<Patch>();
    }

    public async Task<List<Patch>> UpdateClientComputedStateAsync(
        string componentId,
        Dictionary<string, object> computedValues)
    {
        var component = _registry.GetComponent(componentId);
        if (component == null)
            return new List<Patch>();

        // Update client-computed state
        component.UpdateClientState(computedValues);

        // Trigger re-render
        // Component will send patches via its injected IPatchSender
        component.TriggerRender();

        // Note: Patches are sent directly by component via IPatchSender
        return new List<Patch>();
    }

    // ========================================
    // Method Invocation
    // ========================================

    public async Task<MethodInvocationResult> InvokeComponentMethodAsync(
        string componentId,
        string methodName,
        object[] args)
    {
        var component = _registry.GetComponent(componentId);
        if (component == null)
        {
            return new MethodInvocationResult
            {
                Success = false,
                ErrorMessage = $"Component {componentId} not found"
            };
        }

        try
        {
            // Use reflection to find and invoke the method
            var method = component.GetType().GetMethod(methodName,
                System.Reflection.BindingFlags.Public |
                System.Reflection.BindingFlags.NonPublic |
                System.Reflection.BindingFlags.Instance);

            if (method == null)
            {
                return new MethodInvocationResult
                {
                    Success = false,
                    ErrorMessage = $"Method {methodName} not found on component {componentId}"
                };
            }

            // Invoke the method
            var result = method.Invoke(component, args);

            // If method returns Task, await it
            if (result is Task task)
            {
                await task;
            }

            // Method succeeded - component may have triggered a render
            // Patches are sent directly by component via IPatchSender
            return new MethodInvocationResult
            {
                Success = true,
                Patches = new List<Patch>(),
                Hints = new List<PredictHint>()
            };
        }
        catch (Exception ex)
        {
            return new MethodInvocationResult
            {
                Success = false,
                ErrorMessage = $"Error invoking {methodName}: {ex.Message}"
            };
        }
    }

    // ========================================
    // Prediction
    // ========================================

    public async Task<List<PredictHint>> RequestPredictAsync(
        string componentId,
        Dictionary<string, object> stateChanges)
    {
        // TODO: Implement prediction engine
        // For now, return empty list
        return new List<PredictHint>();
    }
}
