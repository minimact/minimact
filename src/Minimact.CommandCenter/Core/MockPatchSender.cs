using Minimact.AspNetCore.Core;
using Minimact.AspNetCore.Abstractions;

namespace Minimact.CommandCenter.Core;

/// <summary>
/// Mock implementation of IPatchSender for Command Center testing
/// Sends patches via in-memory callbacks to MockClient (no SignalR!)
///
/// This is THE KEY to algorithm parity:
/// - Production uses SignalRPatchSender (sends via WebSocket)
/// - Testing uses MockPatchSender (sends via direct method calls)
/// - SAME component code, SAME rendering logic, DIFFERENT transport!
/// </summary>
public class MockPatchSender : IPatchSender
{
    private readonly MockClient _client;

    public MockPatchSender(MockClient client)
    {
        _client = client;
    }

    public async Task SendPatchesAsync(string componentId, List<Patch> patches)
    {
        if (patches.Count == 0)
            return;

        Console.WriteLine($"[MockPatchSender] → Sending {patches.Count} patches to MockClient");

        // Direct in-memory callback (no SignalR!)
        _client.OnApplyPatches(componentId, patches);

        await Task.CompletedTask;
    }

    public async Task SendHintAsync(string componentId, string hintId, List<Patch> patches, double confidence)
    {
        if (patches.Count == 0)
            return;

        Console.WriteLine($"[MockPatchSender] → Sending hint '{hintId}' to MockClient");

        // Direct in-memory callback (no SignalR!)
        _client.OnQueueHint(componentId, hintId, patches, confidence);

        await Task.CompletedTask;
    }

    public async Task SendErrorAsync(string componentId, string errorMessage)
    {
        Console.WriteLine($"[MockPatchSender] → Error for {componentId}: {errorMessage}");
        await Task.CompletedTask;
    }
}
