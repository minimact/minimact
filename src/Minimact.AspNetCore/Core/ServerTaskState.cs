namespace Minimact.AspNetCore.Core;

/// <summary>
/// Status of a server task
/// </summary>
public enum ServerTaskStatus
{
    Idle,
    Running,
    Complete,
    Error,
    Cancelled
}

/// <summary>
/// Manages the state and execution of a server task
/// </summary>
public class ServerTaskState<T>
{
    public string TaskId { get; }
    public ServerTaskStatus Status { get; private set; }
    public T? Result { get; private set; }
    public Exception? Error { get; private set; }
    public double Progress { get; private set; }
    public DateTime? StartedAt { get; private set; }
    public DateTime? CompletedAt { get; private set; }
    public TimeSpan? Duration => CompletedAt.HasValue && StartedAt.HasValue
        ? CompletedAt.Value - StartedAt.Value
        : null;

    private Task<T>? _runningTask;
    private CancellationTokenSource? _cancellationTokenSource;
    private readonly Func<IProgress<double>, CancellationToken, Task<T>> _taskFactory;
    private readonly MinimactComponent _component;

    public ServerTaskState(
        string taskId,
        Func<IProgress<double>, CancellationToken, Task<T>> taskFactory,
        MinimactComponent component)
    {
        TaskId = taskId;
        _taskFactory = taskFactory;
        _component = component;
        Status = ServerTaskStatus.Idle;
    }

    /// <summary>
    /// Start the server task
    /// </summary>
    public async Task Start(params object[] args)
    {
        if (Status == ServerTaskStatus.Running)
        {
            throw new InvalidOperationException($"Task '{TaskId}' is already running");
        }

        Status = ServerTaskStatus.Running;
        StartedAt = DateTime.UtcNow;
        CompletedAt = null;
        Progress = 0;
        Error = null;
        Result = default;
        _cancellationTokenSource = new CancellationTokenSource();

        // Trigger immediate re-render to show "running" state
        _component.TriggerRender();

        // Create progress reporter that triggers re-render on updates
        var progress = new Progress<double>(value =>
        {
            Progress = value;
            _component.TriggerRender();
        });

        _runningTask = Task.Run(async () =>
        {
            try
            {
                var result = await _taskFactory(progress, _cancellationTokenSource.Token);
                Status = ServerTaskStatus.Complete;
                Result = result;
                CompletedAt = DateTime.UtcNow;
                Progress = 1.0;
                _component.TriggerRender();
                return result;
            }
            catch (OperationCanceledException)
            {
                Status = ServerTaskStatus.Cancelled;
                CompletedAt = DateTime.UtcNow;
                _component.TriggerRender();
                throw;
            }
            catch (Exception ex)
            {
                Status = ServerTaskStatus.Error;
                Error = ex;
                CompletedAt = DateTime.UtcNow;
                _component.TriggerRender();
                throw;
            }
        });

        // Don't await - task runs in background
    }

    /// <summary>
    /// Retry a failed or cancelled task
    /// </summary>
    public async Task Retry(params object[] args)
    {
        if (Status != ServerTaskStatus.Error && Status != ServerTaskStatus.Cancelled)
        {
            throw new InvalidOperationException($"Can only retry failed or cancelled tasks. Current status: {Status}");
        }
        await Start(args);
    }

    /// <summary>
    /// Cancel a running task
    /// </summary>
    public void Cancel()
    {
        if (Status != ServerTaskStatus.Running)
        {
            throw new InvalidOperationException($"Can only cancel running tasks. Current status: {Status}");
        }
        _cancellationTokenSource?.Cancel();
    }

    /// <summary>
    /// Get the result asynchronously (await task completion)
    /// </summary>
    public async Task<T> GetResultAsync()
    {
        if (_runningTask == null)
        {
            throw new InvalidOperationException($"Task '{TaskId}' has not been started");
        }
        return await _runningTask;
    }

    /// <summary>
    /// Get task state for serialization to client
    /// </summary>
    public object GetStateForClient()
    {
        return new
        {
            taskId = TaskId,
            status = Status.ToString().ToLower(),
            progress = Progress,
            result = Result,
            error = Error?.Message,
            startedAt = StartedAt,
            completedAt = CompletedAt,
            duration = Duration?.TotalMilliseconds
        };
    }
}
