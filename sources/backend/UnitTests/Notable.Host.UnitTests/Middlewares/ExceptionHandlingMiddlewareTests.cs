using System.Text.Json;

using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

using Notable.Host.Middlewares;
using Notable.Host.UnitTests.Infrastructure;

namespace Notable.Host.UnitTests.Middlewares;

[TestClass]
public sealed class ExceptionHandlingMiddlewareTests
{
    public TestContext TestContext { get; set; } = null!;

    [TestMethod]
    public async Task InvokeAsync_WhenNextSucceeds_PreservesItsResponseWithoutLoggingAnError()
    {
        // Arrange
        using var body = new MemoryStream();
        var context = new DefaultHttpContext();
        context.Response.Body = body;
        var logger = new RecordingLogger<ExceptionHandlingMiddleware>();
        var middleware = new ExceptionHandlingMiddleware(async nextContext =>
        {
            nextContext.Response.StatusCode = StatusCodes.Status202Accepted;
            nextContext.Response.Headers["X-Result"] = "preserved";
            await nextContext.Response.WriteAsync("response from next", TestContext.CancellationToken);
        }, logger);

        // Act
        await middleware.InvokeAsync(context);

        body.Position = 0;
        using var reader = new StreamReader(body);
        // Assert
        (await reader.ReadToEndAsync(TestContext.CancellationToken)).Should().Be("response from next");
        context.Response.StatusCode.Should().Be(StatusCodes.Status202Accepted);
        context.Response.Headers["X-Result"].ToString().Should().Be("preserved");
        logger.Entries.Should().BeEmpty();
    }

    [TestMethod]
    [DataRow("unauthorized", 401, "User not authenticated")]
    [DataRow("unexpected", 500, "Unhandled exception")]
    [DataRow("upstream", 500, "Unhandled exception")]
    [DataRow("cancelledWithoutClientDisconnect", 500, "Unhandled exception")]
    public async Task InvokeAsync_WhenNextThrows_ReturnsPublicErrorAndLogsOriginalException(string error, int statusCode, string message)
    {
        // Arrange
        Exception exception = error switch
        {
            "unauthorized" => new UnauthorizedAccessException("Private authentication details"),
            "upstream" => new HttpRequestException("Private upstream details"),
            "cancelledWithoutClientDisconnect" => new OperationCanceledException("Private cancellation details"),
            _ => new InvalidOperationException("Private server details")
        };
        using var provider = new ServiceCollection().BuildServiceProvider();
        using var body = new MemoryStream();
        var context = new DefaultHttpContext { RequestServices = provider };
        context.Response.Body = body;
        var logger = new RecordingLogger<ExceptionHandlingMiddleware>();
        var middleware = new ExceptionHandlingMiddleware(_ => Task.FromException(exception), logger);

        // Act
        await middleware.InvokeAsync(context);

        body.Position = 0;
        using var document = await JsonDocument.ParseAsync(body, cancellationToken: TestContext.CancellationToken);
        // Assert
        context.Response.StatusCode.Should().Be(statusCode);
        (context.Response.ContentType?.StartsWith("application/json", StringComparison.Ordinal)).Should().BeTrue();
        document.RootElement.GetProperty("statusCode").GetInt32().Should().Be(statusCode);
        document.RootElement.GetProperty("message").GetString().Should().Be(message);
        document.RootElement.EnumerateObject().Select(property => property.Name).ToArray().Should().BeEquivalentTo(new[] { "message", "statusCode" });
        var logEntry = logger.Entries.Single();
        logEntry.Level.Should().Be(LogLevel.Error);
        logEntry.Exception.Should().BeSameAs(exception);
    }

    [TestMethod]
    [DataRow(false)]
    [DataRow(true)]
    public async Task InvokeAsync_WhenClientCancels_DoesNotWriteErrorAndLogsAtDebugLevel(bool taskCancelled)
    {
        // Arrange
        using var cancellation = new CancellationTokenSource();
        cancellation.Cancel();
        using var body = new MemoryStream();
        var context = new DefaultHttpContext { RequestAborted = cancellation.Token };
        context.Response.Body = body;
        context.Response.StatusCode = StatusCodes.Status202Accepted;
        Exception exception = taskCancelled ? new TaskCanceledException() : new OperationCanceledException(cancellation.Token);
        var logger = new RecordingLogger<ExceptionHandlingMiddleware>();
        var middleware = new ExceptionHandlingMiddleware(_ => Task.FromException(exception), logger);

        // Act
        await middleware.InvokeAsync(context);

        // Assert
        body.Length.Should().Be(0L);
        context.Response.StatusCode.Should().Be(StatusCodes.Status202Accepted);
        logger.Entries.Single().Level.Should().Be(LogLevel.Debug);
    }
}