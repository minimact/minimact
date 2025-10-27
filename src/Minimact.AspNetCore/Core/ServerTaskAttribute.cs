namespace Minimact.AspNetCore.Core;

/// <summary>
/// Marks a method as a server task that can be executed via useServerTask hook.
/// The method must return Task&lt;T&gt; and accept IProgress&lt;double&gt; and CancellationToken parameters.
/// </summary>
[AttributeUsage(AttributeTargets.Method, AllowMultiple = false)]
public class ServerTaskAttribute : Attribute
{
    /// <summary>
    /// Unique identifier for this server task
    /// </summary>
    public string TaskId { get; }

    /// <summary>
    /// Return type of the task (for metadata/reflection)
    /// </summary>
    public string? ReturnType { get; set; }

    /// <summary>
    /// Parameter types (for metadata/reflection)
    /// </summary>
    public string[]? ParameterTypes { get; set; }

    /// <summary>
    /// Whether this task supports streaming results
    /// </summary>
    public bool Streaming { get; set; }

    public ServerTaskAttribute(string taskId)
    {
        TaskId = taskId;
    }
}
