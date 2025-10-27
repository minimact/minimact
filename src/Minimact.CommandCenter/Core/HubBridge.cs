using Microsoft.ClearScript;
using System;
using System.Threading.Tasks;

namespace Minimact.CommandCenter.Core;

/// <summary>
/// Bridge that exposes MinimactHub methods to JavaScript
/// The JS client runtime calls these methods, which then invoke the real MinimactHub
/// This allows setting breakpoints in server-side code while testing!
/// </summary>
public class HubBridge
{
    private readonly object _hub; // The actual MinimactHub instance
    private readonly JSRuntime _jsRuntime;

    public HubBridge(object hub, JSRuntime jsRuntime)
    {
        _hub = hub;
        _jsRuntime = jsRuntime;
    }

    /// <summary>
    /// JavaScript calls: hub.invoke('RegisterComponent', componentId, initialState)
    /// This calls MinimactHub.RegisterComponent(componentId, initialState)
    /// </summary>
    [ScriptMember("invoke")]
    public async Task<object?> InvokeAsync(string methodName, params object[] args)
    {
        Console.WriteLine($"[HubBridge] JS -> Hub: {methodName}({string.Join(", ", args)})");

        try
        {
            // Use reflection to call the hub method
            var method = _hub.GetType().GetMethod(methodName);
            if (method == null)
            {
                throw new InvalidOperationException($"Method '{methodName}' not found on hub");
            }

            var result = method.Invoke(_hub, args);

            // If it's a Task, await it
            if (result is Task task)
            {
                await task;

                // If it's Task<T>, get the result
                var resultProperty = task.GetType().GetProperty("Result");
                if (resultProperty != null)
                {
                    return resultProperty.GetValue(task);
                }

                return null;
            }

            return result;
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"[HubBridge] Error invoking {methodName}: {ex.Message}");
            Console.Error.WriteLine(ex.StackTrace);
            throw;
        }
    }

    /// <summary>
    /// JavaScript calls: hub.send('MethodName', args...)
    /// Fire-and-forget version (doesn't wait for result)
    /// </summary>
    [ScriptMember("send")]
    public void Send(string methodName, params object[] args)
    {
        Console.WriteLine($"[HubBridge] JS -> Hub (fire-and-forget): {methodName}");

        Task.Run(async () =>
        {
            try
            {
                await InvokeAsync(methodName, args);
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"[HubBridge] Error in send {methodName}: {ex.Message}");
            }
        });
    }

    /// <summary>
    /// JavaScript calls: hub.on('MethodName', callback)
    /// Registers a handler for server->client messages
    /// </summary>
    [ScriptMember("on")]
    public void On(string methodName, object callback)
    {
        Console.WriteLine($"[HubBridge] JS registered handler for: {methodName}");

        // Store callback so server can call it later
        // TODO: Implement callback registry if needed
    }

    /// <summary>
    /// Server calls this to send a message to the JS client
    /// This simulates SignalR server->client messaging
    /// </summary>
    public void InvokeClientMethod(string methodName, params object[] args)
    {
        Console.WriteLine($"[HubBridge] Hub -> JS: {methodName}");

        try
        {
            // Call the JavaScript function
            var argsJson = System.Text.Json.JsonSerializer.Serialize(args);
            _jsRuntime.Execute($@"
                (function() {{
                    if (typeof Minimact !== 'undefined' && Minimact.{methodName}) {{
                        var args = {argsJson};
                        Minimact.{methodName}.apply(Minimact, args);
                    }}
                }})()
            ");
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"[HubBridge] Error calling JS method {methodName}: {ex.Message}");
        }
    }
}
