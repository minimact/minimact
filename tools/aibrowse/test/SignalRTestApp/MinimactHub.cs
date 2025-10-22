using Microsoft.AspNetCore.SignalR;

namespace SignalRTestApp;

public class MinimactHub : Hub
{
    public async Task HandleEvent(string componentId, string eventName, object eventArgs)
    {
        Console.WriteLine($"[MinimactHub] Received event: {componentId}.{eventName}");

        // Simulate predictive patch (sent immediately)
        await Clients.Caller.SendAsync("ApplyPredictedPatch", new
        {
            componentId,
            patches = new[]
            {
                new
                {
                    type = "updateText",
                    path = new[] { 0, 0 },
                    content = $"Updated at {DateTime.Now:HH:mm:ss}"
                }
            },
            confidence = 0.95,
            predictionId = Guid.NewGuid().ToString()
        });

        // Simulate processing delay
        await Task.Delay(50);

        // Simulate verified patch (after server processing)
        await Clients.Caller.SendAsync("ApplyVerifiedPatch", new
        {
            componentId,
            patches = new[]
            {
                new
                {
                    type = "updateText",
                    path = new[] { 0, 0 },
                    content = $"Verified at {DateTime.Now:HH:mm:ss}"
                }
            },
            matched = true
        });

        Console.WriteLine($"[MinimactHub] Sent predicted and verified patches for {componentId}");
    }

    public override async Task OnConnectedAsync()
    {
        Console.WriteLine($"[MinimactHub] Client connected: {Context.ConnectionId}");
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        Console.WriteLine($"[MinimactHub] Client disconnected: {Context.ConnectionId}");
        await base.OnDisconnectedAsync(exception);
    }
}
