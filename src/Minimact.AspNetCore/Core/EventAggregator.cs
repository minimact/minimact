using System;
using System.Collections.Concurrent;
using System.Collections.Generic;

namespace Minimact.AspNetCore.Core;

/// <summary>
/// Client-side event aggregation for component-to-component communication.
/// Enables pub/sub pattern without prop drilling.
/// </summary>
public class EventAggregator
{
    private static readonly Lazy<EventAggregator> _instance = new(() => new EventAggregator());
    private readonly ConcurrentDictionary<string, List<Action<PubSubMessage>>> _subscriptions = new();

    /// <summary>
    /// Singleton instance of the EventAggregator
    /// </summary>
    public static EventAggregator Instance => _instance.Value;

    private EventAggregator()
    {
    }

    /// <summary>
    /// Publish a message to a channel
    /// </summary>
    /// <param name="channel">The channel name</param>
    /// <param name="value">The message value</param>
    /// <param name="options">Optional metadata (source, error, waiting, etc.)</param>
    public void Publish(string channel, dynamic value, PubSubOptions? options = null)
    {
        if (string.IsNullOrWhiteSpace(channel))
            throw new ArgumentNullException(nameof(channel));

        var message = new PubSubMessage
        {
            Value = value,
            Source = options?.Source,
            Error = options?.Error,
            Waiting = options?.Waiting,
            Timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
            IsStale = false
        };

        if (_subscriptions.TryGetValue(channel, out var subscribers))
        {
            // Create a copy to avoid collection modification during iteration
            var subscribersCopy = subscribers.ToArray();

            foreach (var callback in subscribersCopy)
            {
                try
                {
                    callback(message);
                }
                catch (Exception ex)
                {
                    // Log but don't crash on subscriber errors
                    Console.Error.WriteLine($"[EventAggregator] Error in subscriber for channel '{channel}': {ex.Message}");
                }
            }
        }
    }

    /// <summary>
    /// Subscribe to a channel
    /// </summary>
    /// <param name="channel">The channel name</param>
    /// <param name="callback">The callback to invoke when messages are published</param>
    /// <returns>Unsubscribe action</returns>
    public Action Subscribe(string channel, Action<PubSubMessage> callback)
    {
        if (string.IsNullOrWhiteSpace(channel))
            throw new ArgumentNullException(nameof(channel));

        if (callback == null)
            throw new ArgumentNullException(nameof(callback));

        var subscribers = _subscriptions.GetOrAdd(channel, _ => new List<Action<PubSubMessage>>());

        lock (subscribers)
        {
            subscribers.Add(callback);
        }

        // Return unsubscribe action
        return () => Unsubscribe(channel, callback);
    }

    /// <summary>
    /// Unsubscribe from a channel
    /// </summary>
    /// <param name="channel">The channel name</param>
    /// <param name="callback">The callback to remove</param>
    public void Unsubscribe(string channel, Action<PubSubMessage> callback)
    {
        if (_subscriptions.TryGetValue(channel, out var subscribers))
        {
            lock (subscribers)
            {
                subscribers.Remove(callback);

                // Clean up empty channel
                if (subscribers.Count == 0)
                {
                    _subscriptions.TryRemove(channel, out _);
                }
            }
        }
    }

    /// <summary>
    /// Clear all subscriptions for a channel
    /// </summary>
    /// <param name="channel">The channel name</param>
    public void ClearChannel(string channel)
    {
        _subscriptions.TryRemove(channel, out _);
    }

    /// <summary>
    /// Clear all subscriptions
    /// </summary>
    public void ClearAll()
    {
        _subscriptions.Clear();
    }

    /// <summary>
    /// Get count of subscribers for a channel
    /// </summary>
    public int GetSubscriberCount(string channel)
    {
        if (_subscriptions.TryGetValue(channel, out var subscribers))
        {
            lock (subscribers)
            {
                return subscribers.Count;
            }
        }
        return 0;
    }
}

/// <summary>
/// Message published through the EventAggregator
/// </summary>
public class PubSubMessage
{
    /// <summary>
    /// The actual message value
    /// </summary>
    public dynamic? Value { get; set; }

    /// <summary>
    /// Component or source that published the message
    /// </summary>
    public string? Source { get; set; }

    /// <summary>
    /// Error message if something went wrong
    /// </summary>
    public string? Error { get; set; }

    /// <summary>
    /// Milliseconds until expected update (for loading states)
    /// </summary>
    public int? Waiting { get; set; }

    /// <summary>
    /// Unix timestamp when message was sent
    /// </summary>
    public long Timestamp { get; set; }

    /// <summary>
    /// Whether the data is considered stale
    /// </summary>
    public bool IsStale { get; set; }
}

/// <summary>
/// Options for publishing messages
/// </summary>
public class PubSubOptions
{
    /// <summary>
    /// Component or source publishing the message
    /// </summary>
    public string? Source { get; set; }

    /// <summary>
    /// Error message if publishing an error state
    /// </summary>
    public string? Error { get; set; }

    /// <summary>
    /// Milliseconds until expected update
    /// </summary>
    public int? Waiting { get; set; }
}
