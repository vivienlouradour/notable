using Notable.Auth.Exceptions;
using Notable.Host.Models;

using System.Net;

namespace Notable.Host.Middlewares
{
    public class ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
    {
        private readonly RequestDelegate next = next;
        private readonly ILogger<ExceptionHandlingMiddleware> logger = logger;

        public async Task InvokeAsync(HttpContext context)
        {
            try
            {
                await next(context);
            }
            catch (Exception ex)
            {
                await HandleExceptionAsync(context, ex);
            }
        }

        private async Task HandleExceptionAsync(HttpContext context, Exception exception)
        {
            this.logger.LogError(exception, "An unhandled exception has been intercepted.");

            var errorResponse = GetErrorResponseFromException(exception);

            context.Response.StatusCode = errorResponse.StatusCode;
            
            await context.Response.WriteAsJsonAsync(errorResponse);
        }

        private static ErrorResponse GetErrorResponseFromException(Exception exception)
        {
            return exception switch
            {
                NotAuthenticatedException => new ErrorResponse { Message = "User not authenticated", StatusCode = (int)HttpStatusCode.Unauthorized },
                _ => new ErrorResponse { Message = "Unhandled exception", StatusCode = (int)HttpStatusCode.InternalServerError }
            };
        }
    }
}
