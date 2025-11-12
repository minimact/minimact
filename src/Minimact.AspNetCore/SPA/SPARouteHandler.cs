using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Abstractions;
using Microsoft.AspNetCore.Mvc.Controllers;
using Microsoft.AspNetCore.Mvc.Infrastructure;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace Minimact.AspNetCore.SPA;

/// <summary>
/// Handles URL routing for SPA navigation
/// Parses URLs and executes appropriate controller actions
/// </summary>
public class SPARouteHandler
{
    private readonly IActionDescriptorCollectionProvider _actionProvider;
    private readonly IActionInvokerFactory _invokerFactory;
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<SPARouteHandler>? _logger;

    public SPARouteHandler(
        IActionDescriptorCollectionProvider actionProvider,
        IActionInvokerFactory invokerFactory,
        IServiceProvider serviceProvider,
        ILogger<SPARouteHandler>? logger = null)
    {
        _actionProvider = actionProvider;
        _invokerFactory = invokerFactory;
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    /// <summary>
    /// Route a URL to a controller action and execute it
    /// Returns the ViewModel and page information
    /// </summary>
    public async Task<SPARouteResult> RouteAndExecuteAsync(string url, HttpContext signalRContext)
    {
        try
        {
            _logger?.LogDebug($"[SPARouteHandler] Routing URL: {url}");

            // Create a minimal HttpContext for routing
            var httpContext = CreateHttpContextForUrl(url, signalRContext);

            // Match route to action
            var routeData = await MatchRouteAsync(httpContext);

            if (routeData == null)
            {
                _logger?.LogWarning($"[SPARouteHandler] No route matched for: {url}");
                return SPARouteResult.CreateError($"Route not found: {url}", url);
            }

            // Get controller action descriptor
            var actionDescriptor = GetActionDescriptor(routeData);

            if (actionDescriptor == null)
            {
                _logger?.LogWarning($"[SPARouteHandler] No action descriptor found for: {url}");
                return SPARouteResult.CreateError($"Action not found: {url}", url);
            }

            _logger?.LogDebug($"[SPARouteHandler] Matched action: {actionDescriptor.ControllerName}.{actionDescriptor.ActionName}");

            // Execute controller action
            var result = await ExecuteActionAsync(httpContext, actionDescriptor, routeData, url);

            if (result == null)
            {
                return SPARouteResult.CreateError("Controller action returned null", url);
            }

            return result;
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, $"[SPARouteHandler] Error routing URL: {url}");
            return SPARouteResult.CreateError($"Routing error: {ex.Message}", url);
        }
    }

    /// <summary>
    /// Create a minimal HttpContext for routing
    /// Copies user/auth from SignalR context
    /// </summary>
    private HttpContext CreateHttpContextForUrl(string url, HttpContext signalRContext)
    {
        var httpContext = new DefaultHttpContext
        {
            RequestServices = _serviceProvider
        };

        // Parse URL
        var uri = new Uri(url, UriKind.RelativeOrAbsolute);
        if (!uri.IsAbsoluteUri)
        {
            uri = new Uri($"https://localhost{url}");
        }

        httpContext.Request.Method = "GET";
        httpContext.Request.Path = uri.AbsolutePath;
        httpContext.Request.QueryString = new QueryString(uri.Query);
        httpContext.Request.Scheme = "https";
        httpContext.Request.Host = new HostString("localhost");

        // Copy user/auth from SignalR context
        httpContext.User = signalRContext.User;

        // Copy important items from SignalR context
        if (signalRContext.Items != null)
        {
            foreach (var item in signalRContext.Items)
            {
                httpContext.Items[item.Key] = item.Value;
            }
        }

        return httpContext;
    }

    /// <summary>
    /// Match a URL to route data using ASP.NET Core routing
    /// </summary>
    private async Task<RouteData?> MatchRouteAsync(HttpContext httpContext)
    {
        // Get routing endpoint from request pipeline
        var endpoint = httpContext.GetEndpoint();

        if (endpoint is RouteEndpoint routeEndpoint)
        {
            var routeData = new RouteData();
            foreach (var kvp in routeEndpoint.RoutePattern.Defaults)
            {
                routeData.Values[kvp.Key] = kvp.Value;
            }
            return routeData;
        }

        // Fallback: Try to match manually using action descriptors
        var path = httpContext.Request.Path.Value ?? "/";
        var actions = _actionProvider.ActionDescriptors.Items
            .OfType<ControllerActionDescriptor>()
            .ToList();

        foreach (var action in actions)
        {
            var routePattern = action.AttributeRouteInfo?.Template;
            if (routePattern == null) continue;

            // Simple pattern matching (in production, use proper route matching)
            if (MatchesPattern(path, routePattern, out var routeValues))
            {
                var routeData = new RouteData();
                routeData.Values.Add("controller", action.ControllerName);
                routeData.Values.Add("action", action.ActionName);

                foreach (var kvp in routeValues)
                {
                    routeData.Values.Add(kvp.Key, kvp.Value);
                }

                return routeData;
            }
        }

        return null;
    }

    /// <summary>
    /// Simple pattern matching for routes
    /// TODO: Use ASP.NET Core's proper route matching
    /// </summary>
    private bool MatchesPattern(string path, string pattern, out Dictionary<string, string> values)
    {
        values = new Dictionary<string, string>();

        var pathParts = path.Trim('/').Split('/');
        var patternParts = pattern.Trim('/').Split('/');

        if (pathParts.Length != patternParts.Length)
        {
            return false;
        }

        for (int i = 0; i < pathParts.Length; i++)
        {
            var pathPart = pathParts[i];
            var patternPart = patternParts[i];

            if (patternPart.StartsWith("{") && patternPart.EndsWith("}"))
            {
                // Route parameter
                var paramName = patternPart.Trim('{', '}');
                values[paramName] = pathPart;
            }
            else if (!pathPart.Equals(patternPart, StringComparison.OrdinalIgnoreCase))
            {
                // Literal doesn't match
                return false;
            }
        }

        return true;
    }

    /// <summary>
    /// Get action descriptor from route data
    /// </summary>
    private ControllerActionDescriptor? GetActionDescriptor(RouteData routeData)
    {
        var controllerName = routeData.Values["controller"]?.ToString();
        var actionName = routeData.Values["action"]?.ToString();

        if (string.IsNullOrEmpty(controllerName) || string.IsNullOrEmpty(actionName))
        {
            return null;
        }

        return _actionProvider.ActionDescriptors.Items
            .OfType<ControllerActionDescriptor>()
            .FirstOrDefault(a =>
                a.ControllerName.Equals(controllerName, StringComparison.OrdinalIgnoreCase) &&
                a.ActionName.Equals(actionName, StringComparison.OrdinalIgnoreCase));
    }

    /// <summary>
    /// Execute a controller action and extract the result
    /// </summary>
    private async Task<SPARouteResult?> ExecuteActionAsync(
        HttpContext httpContext,
        ControllerActionDescriptor actionDescriptor,
        RouteData routeData,
        string url)
    {
        try
        {
            // Create action context
            var actionContext = new ActionContext(
                httpContext,
                routeData,
                actionDescriptor
            );

            // Create controller instance
            var controllerFactory = _serviceProvider.GetRequiredService<IControllerFactory>();
            var controller = controllerFactory.CreateController(new ControllerContext(actionContext));

            try
            {
                // Store actionContext for InferPageName
                httpContext.Items["ActionContext"] = actionContext;

                // Invoke action
                var invoker = _invokerFactory.CreateInvoker(actionContext);
                await invoker.InvokeAsync();

                // Note: The action result should be stored in httpContext.Items["ActionResult"]
                // or we extract from httpContext.Items["MinimactSPAResult"]
                var result = ExtractResultFromContext(httpContext, url);

                return result;
            }
            finally
            {
                // Release controller
                controllerFactory.ReleaseController(new ControllerContext(actionContext), controller);
            }
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, $"[SPARouteHandler] Error executing action: {actionDescriptor.DisplayName}");
            return SPARouteResult.CreateError($"Action execution failed: {ex.Message}", url);
        }
    }

    /// <summary>
    /// Extract ViewModel and page info from action execution result
    /// Automatically detects common return types and infers page name
    /// </summary>
    private SPARouteResult? ExtractResultFromContext(HttpContext httpContext, string url)
    {
        // 1. Check explicit convention (HttpContext.Items["MinimactSPAResult"])
        if (httpContext.Items.TryGetValue("MinimactSPAResult", out var spaResult) && spaResult is SPARouteResult explicitResult)
        {
            _logger?.LogDebug("[SPARouteHandler] Found explicit SPARouteResult in HttpContext.Items");
            return explicitResult;
        }

        // 2. Check if action result was stored (HttpContext.Items["ActionResult"])
        if (!httpContext.Items.TryGetValue("ActionResult", out var actionResultObj) || actionResultObj == null)
        {
            _logger?.LogWarning("[SPARouteHandler] No ActionResult found in HttpContext.Items");
            return SPARouteResult.CreateError("Controller did not store action result. Return MinimactViewModel or use Ok(viewModel).", url);
        }

        var actionResult = actionResultObj as IActionResult;
        if (actionResult == null)
        {
            _logger?.LogWarning("[SPARouteHandler] ActionResult is not IActionResult type");
            return SPARouteResult.CreateError("Invalid ActionResult type", url);
        }

        // 3. Check for ObjectResult (Ok, Json, etc.) with MinimactViewModel
        if (actionResult is ObjectResult objectResult && objectResult.Value != null)
        {
            var value = objectResult.Value;

            // Check for SPAResult<MinimactViewModel> wrapper
            if (value.GetType().IsGenericType &&
                value.GetType().GetGenericTypeDefinition() == typeof(SPAResult<>))
            {
                var viewModel = value.GetType().GetProperty("ViewModel")?.GetValue(value) as MinimactViewModel;
                var pageName = value.GetType().GetProperty("PageName")?.GetValue(value) as string;

                if (viewModel != null)
                {
                    pageName ??= InferPageName(httpContext);
                    _logger?.LogDebug($"[SPARouteHandler] Extracted SPAResult<T>: Page={pageName}");

                    return SPARouteResult.CreateSuccess(
                        viewModel: viewModel,
                        pageName: pageName,
                        shellName: viewModel.__Shell,
                        url: url
                    );
                }
            }

            // Check for direct MinimactViewModel
            if (value is MinimactViewModel directViewModel)
            {
                var pageName = InferPageName(httpContext);
                _logger?.LogDebug($"[SPARouteHandler] Extracted MinimactViewModel: Page={pageName}");

                return SPARouteResult.CreateSuccess(
                    viewModel: directViewModel,
                    pageName: pageName,
                    shellName: directViewModel.__Shell,
                    url: url
                );
            }
        }

        // 4. Check if result IS a MinimactViewModel (direct return)
        if (actionResult is MinimactViewModel directResult)
        {
            var pageName = InferPageName(httpContext);
            _logger?.LogDebug($"[SPARouteHandler] Extracted direct MinimactViewModel: Page={pageName}");

            return SPARouteResult.CreateSuccess(
                viewModel: directResult,
                pageName: pageName,
                shellName: directResult.__Shell,
                url: url
            );
        }

        // 5. Fallback - could not extract
        _logger?.LogWarning($"[SPARouteHandler] Could not extract ViewModel from action result type: {actionResult.GetType().Name}");
        _logger?.LogWarning("[SPARouteHandler] Controllers should return MinimactViewModel, Ok(viewModel), or SPAResult<T>");

        return SPARouteResult.CreateError(
            $"Could not extract ViewModel from result. Return type: {actionResult.GetType().Name}. " +
            "Controllers should return MinimactViewModel, Ok(viewModel), or new SPAResult<T>(viewModel).",
            url
        );
    }

    /// <summary>
    /// Infer page name from action context
    /// Convention: {Action}Page (e.g., "Details" → "DetailsPage")
    /// </summary>
    private string InferPageName(HttpContext httpContext)
    {
        // Get ActionContext from HttpContext.Items
        if (!httpContext.Items.TryGetValue("ActionContext", out var contextObj) || contextObj is not ActionContext context)
        {
            _logger?.LogWarning("[SPARouteHandler] ActionContext not found in HttpContext.Items, using 'DefaultPage'");
            return "DefaultPage";
        }

        var actionName = context.ActionDescriptor.RouteValues["action"];
        var controllerName = context.ActionDescriptor.RouteValues["controller"];

        if (!string.IsNullOrEmpty(actionName))
        {
            // Convention: ActionPage (e.g., "Details" → "DetailsPage")
            var pageName = $"{actionName}Page";
            _logger?.LogDebug($"[SPARouteHandler] Inferred page name: {pageName} from action: {actionName}");
            return pageName;
        }

        if (!string.IsNullOrEmpty(controllerName))
        {
            // Fallback: ControllerIndexPage
            var pageName = $"{controllerName}IndexPage";
            _logger?.LogDebug($"[SPARouteHandler] Inferred page name: {pageName} from controller: {controllerName}");
            return pageName;
        }

        // Ultimate fallback
        _logger?.LogWarning("[SPARouteHandler] Could not infer page name, using 'DefaultPage'");
        return "DefaultPage";
    }
}
