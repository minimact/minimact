using Microsoft.AspNetCore.SignalR;

namespace Mactic.Api.Hubs;

/// <summary>
/// SignalR Hub for real-time community updates
/// Broadcasts: new deployments, trending projects, live activity feed
/// Makes the platform feel ALIVE!
/// </summary>
public class CommunityHub : Hub
{
    private readonly ILogger<CommunityHub> _logger;

    public CommunityHub(ILogger<CommunityHub> logger)
    {
        _logger = logger;
    }

    public override async Task OnConnectedAsync()
    {
        _logger.LogInformation("Client connected: {ConnectionId}", Context.ConnectionId);
        await base.OnConnectedAsync();

        // Send welcome message
        await Clients.Caller.SendAsync("Welcome", new
        {
            message = "Connected to Mactic Community Platform!",
            timestamp = DateTime.UtcNow
        });
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        _logger.LogInformation("Client disconnected: {ConnectionId}", Context.ConnectionId);
        await base.OnDisconnectedAsync(exception);
    }

    /// <summary>
    /// Subscribe to category-specific updates
    /// </summary>
    public async Task SubscribeToCategory(string category)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, $"category:{category}");
        _logger.LogInformation(
            "Client {ConnectionId} subscribed to category: {Category}",
            Context.ConnectionId,
            category);

        await Clients.Caller.SendAsync("Subscribed", new
        {
            category,
            message = $"Subscribed to {category} updates"
        });
    }

    /// <summary>
    /// Unsubscribe from category
    /// </summary>
    public async Task UnsubscribeFromCategory(string category)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"category:{category}");
        _logger.LogInformation(
            "Client {ConnectionId} unsubscribed from category: {Category}",
            Context.ConnectionId,
            category);
    }

    /// <summary>
    /// Subscribe to developer activity
    /// </summary>
    public async Task FollowDeveloper(string username)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, $"developer:{username}");
        _logger.LogInformation(
            "Client {ConnectionId} following developer: {Username}",
            Context.ConnectionId,
            username);
    }

    /// <summary>
    /// Unfollow developer
    /// </summary>
    public async Task UnfollowDeveloper(string username)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"developer:{username}");
        _logger.LogInformation(
            "Client {ConnectionId} unfollowed developer: {Username}",
            Context.ConnectionId,
            username);
    }
}

/// <summary>
/// Service for broadcasting community events via SignalR
/// Called by EventProcessor and other services
/// </summary>
public class CommunityBroadcaster
{
    private readonly IHubContext<CommunityHub> _hubContext;
    private readonly ILogger<CommunityBroadcaster> _logger;

    public CommunityBroadcaster(
        IHubContext<CommunityHub> hubContext,
        ILogger<CommunityBroadcaster> logger)
    {
        _hubContext = hubContext;
        _logger = logger;
    }

    /// <summary>
    /// Broadcast new project deployment
    /// </summary>
    public async Task BroadcastNewDeployment(object deployment)
    {
        _logger.LogInformation("Broadcasting new deployment");

        // Send to all clients
        await _hubContext.Clients.All.SendAsync("NewDeployment", deployment);

        // TODO: Also send to category-specific groups
        // await _hubContext.Clients.Group($"category:{deployment.Category}")
        //     .SendAsync("NewDeployment", deployment);
    }

    /// <summary>
    /// Broadcast activity feed update
    /// </summary>
    public async Task BroadcastActivity(object activity)
    {
        _logger.LogInformation("Broadcasting new activity");
        await _hubContext.Clients.All.SendAsync("NewActivity", activity);
    }

    /// <summary>
    /// Broadcast trending update
    /// </summary>
    public async Task BroadcastTrending(object trending)
    {
        _logger.LogInformation("Broadcasting trending update");
        await _hubContext.Clients.All.SendAsync("TrendingUpdated", trending);
    }

    /// <summary>
    /// Broadcast community stats update
    /// </summary>
    public async Task BroadcastStats(object stats)
    {
        await _hubContext.Clients.All.SendAsync("StatsUpdated", stats);
    }

    /// <summary>
    /// Broadcast developer profile update
    /// </summary>
    public async Task BroadcastDeveloperUpdate(string username, object update)
    {
        _logger.LogInformation("Broadcasting developer update: {Username}", username);

        // Send to followers
        await _hubContext.Clients.Group($"developer:{username}")
            .SendAsync("DeveloperUpdated", update);
    }
}
