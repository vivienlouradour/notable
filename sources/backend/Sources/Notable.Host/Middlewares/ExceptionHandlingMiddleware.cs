using System.Net;

using Notable.Host.Models;

namespace Notable.Host.Middlewares;

public class ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
{
    private readonly RequestDelegate _next = next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger = logger;

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (OperationCanceledException)
            when (context.RequestAborted.IsCancellationRequested)
        {
            _logger.LogDebug("HTTP request cancelled by client.");
        }
        catch (Exception ex)
        {
            await this.HandleExceptionAsync(context, ex);
        }
    }

    private async Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        _logger.LogError(exception, "An unhandled exception has been intercepted.");
        var errorResponse = GetErrorResponseFromException(exception);

        context.Response.StatusCode = errorResponse.StatusCode;

        await context.Response.WriteAsJsonAsync(errorResponse);
    }

    private static ErrorResponse GetErrorResponseFromException(Exception exception)
    {
        return exception switch
        {
            UnauthorizedAccessException => new ErrorResponse { Message = "User not authenticated", StatusCode = (int)HttpStatusCode.Unauthorized },
            _ => new ErrorResponse { Message = "Unhandled exception", StatusCode = (int)HttpStatusCode.InternalServerError }
        };
    }
}
