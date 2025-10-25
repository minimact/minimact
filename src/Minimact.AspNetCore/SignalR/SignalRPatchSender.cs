using Microsoft.AspNetCore.SignalR;
using Minimact.AspNetCore.Core;
using Minimact.AspNetCore.Abstractions;

namespace Minimact.AspNetCore.SignalR;

/// <summary>
/// Production implementation of IPatchSender
/// Sends patches via SignalR to real browser clients
/// </summary>
public class SignalRPatchSender : IPatchSender
{
    private readonly IHubContext<MinimactHub> _hubContext;
    private readonly ComponentRegistry _registry;

    public SignalRPatchSender(IHubContext<MinimactHub> hubContext, ComponentRegistry registry)
    {
        _hubContext = hubContext;
        _registry = registry;
    }

    public async Task SendPatchesAsync(string componentId, List<Patch> patches)
    {
        if (patches.Count == 0)
            return;

        var component = _registry.GetComponent(componentId);
        if (component == null || string.IsNullOrEmpty(component.ConnectionId))
            return;

        await _hubContext.Clients.Client(component.ConnectionId)
            .SendAsync("ApplyPatches", componentId, patches);
    }

    public async Task SendHintAsync(string componentId, string hintId, List<Patch> patches, double confidence)
    {
        if (patches.Count == 0)
            return;

        var component = _registry.GetComponent(componentId);
        if (component == null || string.IsNullOrEmpty(component.ConnectionId))
            return;

        await _hubContext.Clients.Client(component.ConnectionId)
            .SendAsync("QueueHint", componentId, hintId, patches, confidence);
    }

    public async Task SendErrorAsync(string componentId, string errorMessage)
    {
        var component = _registry.GetComponent(componentId);
        if (component == null || string.IsNullOrEmpty(component.ConnectionId))
            return;

        await _hubContext.Clients.Client(component.ConnectionId)
            .SendAsync("Error", errorMessage);
    }
}
