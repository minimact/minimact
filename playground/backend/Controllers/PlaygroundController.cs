using Microsoft.AspNetCore.Mvc;
using Minimact.Playground.Models;
using Minimact.Playground.Services;

namespace Minimact.Playground.Controllers;

/// <summary>
/// API endpoints for the Minimact Playground
/// </summary>
[ApiController]
[Route("api/playground")]
[Produces("application/json")]
public class PlaygroundController : ControllerBase
{
    private readonly PlaygroundService _playgroundService;
    private readonly ILogger<PlaygroundController> _logger;

    public PlaygroundController(PlaygroundService playgroundService, ILogger<PlaygroundController> logger)
    {
        _playgroundService = playgroundService;
        _logger = logger;
    }

    /// <summary>
    /// Compile C# code and prepare a component for interaction
    /// </summary>
    /// <remarks>
    /// This endpoint takes generated C# code (from Babel transpilation) and:
    /// 1. Compiles it to a .NET assembly
    /// 2. Instantiates the component
    /// 3. Performs initial render
    /// 4. Pre-computes predictions for likely state changes
    /// 5. Returns HTML and session ID for subsequent interactions
    /// </remarks>
    [HttpPost("compile")]
    [ProducesResponseType(typeof(CompileResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Compile(
        [FromBody] CompileRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(request.CSharpCode))
            {
                return BadRequest(new ErrorResponse
                {
                    Error = "CSharpCode is required"
                });
            }

            var response = await _playgroundService.CompileAsync(request, cancellationToken);
            return Ok(response);
        }
        catch (CompilationException ex)
        {
            _logger.LogWarning(ex, "Compilation failed");
            return BadRequest(new ErrorResponse
            {
                Error = "Compilation failed",
                Details = ex.Message
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in Compile endpoint");
            return BadRequest(new ErrorResponse
            {
                Error = "Internal error",
                Details = ex.Message
            });
        }
    }

    /// <summary>
    /// Handle user interaction (click, input, etc.) and return patches
    /// </summary>
    /// <remarks>
    /// This endpoint:
    /// 1. Applies state changes to the component
    /// 2. Checks if the predictor cached patches for this state change
    /// 3. If cache HIT: returns cached patches (2-3ms)
    /// 4. If cache MISS: re-renders and reconciles (15-20ms)
    /// 5. Learns the pattern for next time
    /// 6. Returns actual patches with timing information
    /// </remarks>
    [HttpPost("interact")]
    [ProducesResponseType(typeof(InteractionResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Interact(
        [FromBody] InteractionRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(request.SessionId))
            {
                return BadRequest(new ErrorResponse
                {
                    Error = "SessionId is required"
                });
            }

            if (string.IsNullOrWhiteSpace(request.EventType))
            {
                return BadRequest(new ErrorResponse
                {
                    Error = "EventType is required"
                });
            }

            var response = await _playgroundService.InteractAsync(request, cancellationToken);
            return Ok(response);
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(new ErrorResponse
            {
                Error = "Session not found",
                Details = ex.Message
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in Interact endpoint");
            return BadRequest(new ErrorResponse
            {
                Error = "Internal error",
                Details = ex.Message
            });
        }
    }

    /// <summary>
    /// Get metrics for a playground session
    /// </summary>
    /// <remarks>
    /// Returns aggregated metrics including:
    /// - Cache hit rate
    /// - Average latencies (predicted vs computed)
    /// - Time savings per interaction
    /// - Recent interaction history
    /// </remarks>
    [HttpGet("metrics/{sessionId}")]
    [ProducesResponseType(typeof(MetricsResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status404NotFound)]
    public IActionResult GetMetrics(string sessionId)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(sessionId))
            {
                return BadRequest(new ErrorResponse
                {
                    Error = "SessionId is required"
                });
            }

            var metrics = _playgroundService.GetMetrics(sessionId);
            return Ok(metrics);
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(new ErrorResponse
            {
                Error = "Session not found",
                Details = ex.Message
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetMetrics endpoint");
            return BadRequest(new ErrorResponse
            {
                Error = "Internal error",
                Details = ex.Message
            });
        }
    }

    /// <summary>
    /// Health check endpoint
    /// </summary>
    [HttpGet("health")]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    public IActionResult Health()
    {
        return Ok(new
        {
            status = "ok",
            timestamp = DateTime.UtcNow,
            version = "1.0.0"
        });
    }
}
