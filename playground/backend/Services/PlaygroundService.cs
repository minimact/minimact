using System.Diagnostics;
using System.Reflection;
using Minimact.AspNetCore.Core;
using Minimact.Playground.Models;
using static Minimact.AspNetCore.Core.RustBridge;

namespace Minimact.Playground.Services;

/// <summary>
/// Main service for playground operations: compilation and interaction
/// </summary>
public class PlaygroundService
{
    private readonly CompilationService _compilationService;
    private readonly SessionManager _sessionManager;
    private readonly ILogger<PlaygroundService> _logger;

    public PlaygroundService(
        CompilationService compilationService,
        SessionManager sessionManager,
        ILogger<PlaygroundService> logger)
    {
        _compilationService = compilationService;
        _sessionManager = sessionManager;
        _logger = logger;
    }

    /// <summary>
    /// Compile C# code and prepare for interactions
    /// </summary>
    public async Task<CompileResponse> CompileAsync(
        CompileRequest request,
        CancellationToken cancellationToken = default)
    {
        var stopwatch = Stopwatch.StartNew();

        try
        {
            // 1. Compile C# code
            var (component, componentType) = await _compilationService.CompileAndInstantiateAsync(
                request.CSharpCode,
                cancellationToken);

            // 2. Initial render
            var vnode = component.RenderComponent();

            stopwatch.Stop();

            // 3. Create session
            var sessionId = Guid.NewGuid().ToString();
            var predictor = new RustBridge.Predictor();
            var session = new PlaygroundSession
            {
                SessionId = sessionId,
                Component = component,
                CurrentVNode = vnode,
                Predictor = predictor,
                Metrics = new SessionMetrics(),
                OriginalCSharpCode = request.CSharpCode
            };

            _sessionManager.AddSession(session);

            // 4. Generate predictions based on common patterns
            var predictions = GeneratePredictions(session.Predictor, vnode);

            // 5. Render to HTML
            var html = RenderVNodeToHtml(vnode);

            _logger.LogInformation(
                "Compiled component {ComponentType} in {Elapsed}ms",
                componentType.Name,
                stopwatch.ElapsedMilliseconds);

            return new CompileResponse
            {
                SessionId = sessionId,
                Html = html,
                VNode = vnode,
                Predictions = predictions,
                CompilationTimeMs = stopwatch.ElapsedMilliseconds
            };
        }
        catch (CompilationException ex)
        {
            _logger.LogWarning("Compilation failed: {Message}", ex.Message);
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error in CompileAsync");
            throw;
        }
    }

    /// <summary>
    /// Handle user interaction and check prediction cache
    /// </summary>
    public async Task<InteractionResponse> InteractAsync(
        InteractionRequest request,
        CancellationToken cancellationToken = default)
    {
        var stopwatch = Stopwatch.StartNew();

        try
        {
            // 1. Get session
            var session = _sessionManager.GetSession(request.SessionId)
                ?? throw new InvalidOperationException($"Session not found: {request.SessionId}");

            // 2. Save old state
            var oldVNode = session.CurrentVNode;

            // 3. Apply state changes using reflection (SetState is protected)
            var setStateMethod = session.Component.GetType()
                .GetMethod("SetState", BindingFlags.NonPublic | BindingFlags.Instance);

            foreach (var (key, value) in request.StateChanges)
            {
                try
                {
                    setStateMethod?.Invoke(session.Component, new object[] { key, value });
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Error setting state {StateKey}", key);
                }
            }

            // 4. Check predictor cache
            var cacheHit = false;
            object[]? predictedPatches = null;
            var stateChange = new StateChange
            {
                ComponentId = session.Component.ComponentId.ToString(),
                StateKey = request.StateChanges.Keys.FirstOrDefault() ?? "unknown",
                OldValue = request.StateChanges.Values.FirstOrDefault(),
                NewValue = request.StateChanges.Values.FirstOrDefault()
            };

            // Try to get prediction from Rust predictor if available
            if (session.Predictor != null && request.StateChanges.Count == 1 && oldVNode is VNode oldVNodeTyped)
            {
                try
                {
                    var prediction = session.Predictor.Predict(stateChange, oldVNodeTyped);
                    if (prediction.Confidence >= 0.7)
                    {
                        predictedPatches = prediction.Patches.Cast<object>().ToArray();
                        cacheHit = true;
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Prediction failed, falling back to reconciliation");
                }
            }

            // 5. Render new state
            var newVNode = session.Component.RenderComponent();

            // 6. Reconcile (compute actual patches)
            var actualPatches = ComputePatches(oldVNode, newVNode);

            // 7. Learn pattern if not cached
            if (!cacheHit && session.Predictor != null && request.StateChanges.Count == 1
                && oldVNode is VNode oldVNodeTypedForLearn && newVNode is VNode newVNodeTypedForLearn)
            {
                try
                {
                    session.Predictor.Learn(stateChange, oldVNodeTypedForLearn, newVNodeTypedForLearn);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to learn from interaction");
                }
            }

            // 8. Update session
            session.CurrentVNode = newVNode;

            stopwatch.Stop();

            // 9. Record metrics
            var metric = new InteractionMetric
            {
                Timestamp = DateTime.UtcNow,
                EventType = request.EventType,
                CacheHit = cacheHit,
                LatencyMs = stopwatch.ElapsedMilliseconds
            };
            session.Metrics.RecordInteraction(metric);

            // 10. Render new HTML
            var html = RenderVNodeToHtml(newVNode);

            var latencyStr = cacheHit
                ? $"{stopwatch.ElapsedMilliseconds}ms 🟢 CACHED"
                : $"{stopwatch.ElapsedMilliseconds}ms 🔴 COMPUTED";

            _logger.LogInformation(
                "Interaction {EventType} on {SessionId}: {Latency}",
                request.EventType,
                request.SessionId,
                latencyStr);

            return new InteractionResponse
            {
                ElapsedMs = stopwatch.ElapsedMilliseconds,
                CacheHit = cacheHit,
                Latency = latencyStr,
                ActualPatches = actualPatches,
                PredictedPatches = predictedPatches,
                PredictionConfidence = cacheHit ? 0.95f : 0,
                Html = html
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in InteractAsync");
            throw;
        }
    }

    /// <summary>
    /// Get metrics for a session
    /// </summary>
    public MetricsResponse GetMetrics(string sessionId)
    {
        var session = _sessionManager.GetSession(sessionId)
            ?? throw new InvalidOperationException($"Session not found: {sessionId}");

        return session.Metrics.GetResponse();
    }

    /// <summary>
    /// Generate predictions for likely state changes using the predictor
    /// </summary>
    private List<PredictionInfo> GeneratePredictions(RustBridge.Predictor? predictor, object vnode)
    {
        if (predictor == null)
        {
            return new();
        }

        var predictions = new List<PredictionInfo>();

        try
        {
            // Generate predictions for common state changes
            // The predictor will learn these patterns as users interact

            // Example: For counter components, predict increment/decrement
            var vnodeType = vnode.GetType();
            var vnodeString = vnode.ToString() ?? "";

            if (vnodeString.Contains("count", StringComparison.OrdinalIgnoreCase) ||
                vnodeString.Contains("counter", StringComparison.OrdinalIgnoreCase))
            {
                predictions.Add(new PredictionInfo
                {
                    StateKey = "count",
                    PredictedValue = "increment",
                    Confidence = 0.5f
                });
            }

            // Example: For form components, predict input changes
            if (vnodeString.Contains("input", StringComparison.OrdinalIgnoreCase) ||
                vnodeString.Contains("form", StringComparison.OrdinalIgnoreCase))
            {
                predictions.Add(new PredictionInfo
                {
                    StateKey = "value",
                    PredictedValue = "user_input",
                    Confidence = 0.4f
                });
            }

            _logger.LogDebug("Generated {Count} initial predictions", predictions.Count);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error generating predictions");
        }

        return predictions;
    }

    /// <summary>
    /// Convert VNode to HTML using VNode.ToHtml() method
    /// </summary>
    private string RenderVNodeToHtml(object vnode)
    {
        try
        {
            if (vnode == null)
            {
                return GenerateErrorHtml("Component returned null VNode");
            }

            // Call the VNode's ToHtml() method
            var vnodeType = vnode.GetType();
            var toHtmlMethod = vnodeType.GetMethod("ToHtml", System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.Instance, null, Type.EmptyTypes, null);

            if (toHtmlMethod == null)
            {
                _logger.LogWarning("VNode type {VNodeType} does not have ToHtml() method", vnodeType.Name);
                return GenerateErrorHtml($"VNode of type {vnodeType.Name} cannot be rendered");
            }

            // Invoke ToHtml() to get the rendered HTML
            var renderedHtml = toHtmlMethod.Invoke(vnode, null) as string ?? "";

            // Wrap with proper HTML document structure and styling for playground
            return WrapHtmlInDocument(renderedHtml);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error rendering VNode to HTML");
            return GenerateErrorHtml($"Rendering error: {ex.Message}");
        }
    }

    /// <summary>
    /// Wrap component HTML in a complete document with playground styling
    /// </summary>
    private string WrapHtmlInDocument(string componentHtml)
    {
        return $@"<!DOCTYPE html>
<html lang='en'>
<head>
    <meta charset='UTF-8'>
    <meta name='viewport' content='width=device-width, initial-scale=1.0'>
    <title>Minimact Playground - Component Preview</title>
    <style>
        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}

        html, body {{
            height: 100%;
        }}

        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
            line-height: 1.6;
            color: #333;
            background: #f5f5f5;
        }}

        #root {{
            background: white;
            min-height: 100vh;
            padding: 20px;
            max-width: 100%;
            overflow: auto;
        }}

        h1, h2, h3, h4, h5, h6 {{
            margin-top: 20px;
            margin-bottom: 10px;
            color: #222;
        }}

        h1 {{ font-size: 32px; }}
        h2 {{ font-size: 28px; }}
        h3 {{ font-size: 24px; }}

        p {{
            margin: 10px 0;
            color: #555;
        }}

        button {{
            padding: 10px 20px;
            margin: 5px;
            background: #007bff;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            transition: background 0.2s ease, transform 0.1s ease;
        }}

        button:hover {{
            background: #0056b3;
            transform: translateY(-1px);
        }}

        button:active {{
            transform: translateY(0);
        }}

        button:disabled {{
            background: #ccc;
            cursor: not-allowed;
        }}

        input, textarea, select {{
            padding: 8px 12px;
            margin: 5px 0;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-family: inherit;
            font-size: 14px;
            width: 100%;
            max-width: 300px;
        }}

        input:focus, textarea:focus, select:focus {{
            outline: none;
            border-color: #007bff;
            box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.25);
        }}

        a {{
            color: #007bff;
            text-decoration: none;
        }}

        a:hover {{
            text-decoration: underline;
        }}

        code {{
            background: #f4f4f4;
            padding: 2px 6px;
            border-radius: 3px;
            font-family: 'Monaco', 'Courier New', monospace;
            font-size: 13px;
        }}

        pre {{
            background: #f4f4f4;
            padding: 15px;
            border-radius: 4px;
            overflow-x: auto;
            margin: 10px 0;
        }}

        pre code {{
            background: none;
            padding: 0;
        }}

        table {{
            border-collapse: collapse;
            width: 100%;
            margin: 15px 0;
        }}

        th, td {{
            border: 1px solid #ddd;
            padding: 10px;
            text-align: left;
        }}

        th {{
            background: #f4f4f4;
            font-weight: 600;
        }}

        tr:hover {{
            background: #f9f9f9;
        }}

        .counter {{
            padding: 20px;
            border: 1px solid #ddd;
            border-radius: 4px;
            background: #f9f9f9;
        }}

        .counter h2 {{
            margin-top: 0;
        }}
    </style>
</head>
<body>
    <div id='root'>
        {componentHtml}
    </div>
</body>
</html>";
    }

    /// <summary>
    /// Generate an error page HTML
    /// </summary>
    private string GenerateErrorHtml(string errorMessage)
    {
        var escapedError = System.Net.WebUtility.HtmlEncode(errorMessage);
        return $@"<!DOCTYPE html>
<html>
<head>
    <meta charset='UTF-8'>
    <title>Error - Minimact Playground</title>
    <style>
        body {{
            font-family: system-ui, sans-serif;
            margin: 0;
            padding: 20px;
            background: #fff3cd;
        }}
        .error-container {{
            max-width: 600px;
            margin: 40px auto;
            background: #f8d7da;
            border: 1px solid #f5c6cb;
            color: #721c24;
            padding: 20px;
            border-radius: 4px;
        }}
        .error-title {{
            font-size: 20px;
            font-weight: bold;
            margin-bottom: 10px;
        }}
        .error-message {{
            font-family: 'Courier New', monospace;
            white-space: pre-wrap;
            word-break: break-word;
        }}
    </style>
</head>
<body>
    <div class='error-container'>
        <div class='error-title'>⚠️ Rendering Error</div>
        <div class='error-message'>{escapedError}</div>
    </div>
</body>
</html>";
    }

    /// <summary>
    /// Compute patches between two vnodes using Rust reconciler
    /// </summary>
    private object[] ComputePatches(object oldVNode, object newVNode)
    {
        try
        {
            // Use RustBridge to compute patches
            var patches = Reconcile((VNode)oldVNode, (VNode)newVNode);
            return patches.Cast<object>().ToArray();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error computing patches");
            return Array.Empty<object>();
        }
    }
}
