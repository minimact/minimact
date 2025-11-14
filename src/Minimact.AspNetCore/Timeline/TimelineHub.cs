using Microsoft.AspNetCore.SignalR;
using Minimact.AspNetCore.Core;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Minimact.AspNetCore.Timeline;

/// <summary>
/// SignalR hub for timeline operations.
/// Handles client requests for timeline data and timeline playback events.
/// </summary>
public class TimelineHub : Hub
{
    private readonly TimelineRegistry _registry;

    public TimelineHub(TimelineRegistry registry)
    {
        _registry = registry;
    }

    /// <summary>
    /// Client requests timeline patch data
    /// </summary>
    /// <param name="timelineId">Timeline ID</param>
    /// <returns>Timeline patch data with pre-computed patches</returns>
    public async Task<TimelinePatchData?> GetTimeline(string timelineId)
    {
        Console.WriteLine($"[TimelineHub] Client {Context.ConnectionId} requested timeline: {timelineId}");

        var timeline = _registry.GetTimeline(timelineId);

        if (timeline == null)
        {
            Console.WriteLine($"[TimelineHub] Timeline not found: {timelineId}");
            throw new HubException($"Timeline not found: {timelineId}");
        }

        Console.WriteLine($"[TimelineHub] Sending timeline: {timeline.Name}");
        Console.WriteLine($"  - Duration: {timeline.Duration}ms");
        Console.WriteLine($"  - Keyframes: {timeline.KeyframeCount}");
        Console.WriteLine($"  - Total patches: {timeline.TotalPatchCount}");

        return await Task.FromResult(timeline);
    }

    /// <summary>
    /// Client requests timeline by name
    /// </summary>
    public async Task<TimelinePatchData?> GetTimelineByName(string name)
    {
        Console.WriteLine($"[TimelineHub] Client {Context.ConnectionId} requested timeline by name: {name}");

        var timeline = _registry.GetTimelineByName(name);

        if (timeline == null)
        {
            Console.WriteLine($"[TimelineHub] Timeline not found by name: {name}");
            throw new HubException($"Timeline not found: {name}");
        }

        return await Task.FromResult(timeline);
    }

    /// <summary>
    /// Get list of all available timeline IDs and names
    /// </summary>
    public async Task<List<TimelineInfo>> GetAvailableTimelines()
    {
        Console.WriteLine($"[TimelineHub] Client {Context.ConnectionId} requested available timelines");

        var timelines = _registry.GetAllTimelines();
        var info = timelines.Select(t => new TimelineInfo
        {
            TimelineId = t.TimelineId,
            Name = t.Name,
            Duration = t.Duration,
            KeyframeCount = t.KeyframeCount,
            Repeat = t.Repeat
        }).ToList();

        Console.WriteLine($"[TimelineHub] Returning {info.Count} timelines");

        return await Task.FromResult(info);
    }

    /// <summary>
    /// Get patches at specific time
    /// </summary>
    public async Task<List<Patch>?> GetPatchesAtTime(string timelineId, int time)
    {
        Console.WriteLine($"[TimelineHub] Client {Context.ConnectionId} requested patches at {time}ms for timeline: {timelineId}");

        var patches = _registry.GetPatchesAtTime(timelineId, time);

        if (patches == null)
        {
            Console.WriteLine($"[TimelineHub] No patches found at time {time}ms");
        }

        return await Task.FromResult(patches);
    }

    /// <summary>
    /// Get all patch times for a timeline (for client scheduling)
    /// </summary>
    public async Task<List<int>?> GetPatchTimes(string timelineId)
    {
        Console.WriteLine($"[TimelineHub] Client {Context.ConnectionId} requested patch times for timeline: {timelineId}");

        var times = _registry.GetPatchTimes(timelineId);

        if (times == null)
        {
            Console.WriteLine($"[TimelineHub] Timeline not found: {timelineId}");
            return null;
        }

        Console.WriteLine($"[TimelineHub] Returning {times.Count} patch times");

        return await Task.FromResult(times);
    }

    /// <summary>
    /// Client notifies timeline playback event (for analytics/debugging/multi-user sync)
    /// </summary>
    /// <param name="timelineId">Timeline ID</param>
    /// <param name="eventType">Event type (play, pause, stop, seek, complete, loop)</param>
    /// <param name="currentTime">Current playback time in milliseconds</param>
    public async Task TimelineEvent(string timelineId, string eventType, int? currentTime = null)
    {
        Console.WriteLine($"[TimelineHub] Timeline event from {Context.ConnectionId}:");
        Console.WriteLine($"  - Timeline: {timelineId}");
        Console.WriteLine($"  - Event: {eventType}");
        Console.WriteLine($"  - Time: {currentTime}ms");

        // Broadcast to other clients (for multi-user timeline sync)
        await Clients.Others.SendAsync("TimelineEvent", new
        {
            timelineId,
            eventType,
            currentTime,
            connectionId = Context.ConnectionId
        });
    }

    /// <summary>
    /// Get timeline registry statistics
    /// </summary>
    public async Task<TimelineRegistryStats> GetRegistryStats()
    {
        Console.WriteLine($"[TimelineHub] Client {Context.ConnectionId} requested registry stats");

        var stats = _registry.GetStats();

        Console.WriteLine($"[TimelineHub] Stats: {stats}");

        return await Task.FromResult(stats);
    }

    /// <summary>
    /// Connection lifecycle logging
    /// </summary>
    public override async Task OnConnectedAsync()
    {
        Console.WriteLine($"[TimelineHub] Client connected: {Context.ConnectionId}");
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        Console.WriteLine($"[TimelineHub] Client disconnected: {Context.ConnectionId}");
        if (exception != null)
        {
            Console.WriteLine($"[TimelineHub] Disconnect reason: {exception.Message}");
        }
        await base.OnDisconnectedAsync(exception);
    }
}

/// <summary>
/// Lightweight timeline info for listing available timelines
/// </summary>
public class TimelineInfo
{
    public string TimelineId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public int Duration { get; set; }
    public int KeyframeCount { get; set; }
    public bool Repeat { get; set; }
}
