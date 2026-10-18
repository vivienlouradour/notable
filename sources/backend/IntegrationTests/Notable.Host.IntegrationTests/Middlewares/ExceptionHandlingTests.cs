using System.Net;
using System.Text.Json;

using Microsoft.Extensions.DependencyInjection;

using Notable.Host.IntegrationTests.Infrastructure;
using Notable.Identity.Common;

namespace Notable.Host.IntegrationTests.Middlewares;

[TestClass]
public sealed class ExceptionHandlingTests
{
    public TestContext TestContext { get; set; } = null!;

    [TestMethod]
    [DataRow("unauthorized", 401, "User not authenticated")]
    [DataRow("upstream", 500, "Unhandled exception")]
    [DataRow("unexpected", 500, "Unhandled exception")]
    [DataRow("cancelledWithoutClientDisconnect", 500, "Unhandled exception")]
    public async Task Sync_WhenProxyThrowsBeforeResponse_ReturnsSanitizedJsonError(string error, int expectedStatus, string expectedMessage)
    {
        // Arrange
        Exception exception = error switch
        {
            "unauthorized" => new UnauthorizedAccessException("Private authentication details"),
            "upstream" => new HttpRequestException("Private upstream details"),
            "cancelledWithoutClientDisconnect" => new OperationCanceledException("Private cancellation details"),
            _ => new InvalidOperationException("Private server details")
        };
        using var factory = new NotableWebApplicationFactory();
        factory.Proxy.RespondAsync = (_, _, _) => Task.FromException<HttpResponseMessage>(exception);
        using var client = factory.CreateApiClient(Guid.NewGuid());

        // Act
        using var response = await client.GetAsync("/sync/document", TestContext.CancellationToken);
        var json = await response.Content.ReadAsStringAsync(TestContext.CancellationToken);
        using var document = JsonDocument.Parse(json);

        // Assert
        response.StatusCode.Should().Be((HttpStatusCode)expectedStatus);
        (response.Content.Headers.ContentType?.MediaType).Should().Be("application/json");
        document.RootElement.GetProperty("statusCode").GetInt32().Should().Be(expectedStatus);
        document.RootElement.GetProperty("message").GetString().Should().Be(expectedMessage);
        document.RootElement.EnumerateObject().Select(property => property.Name).ToArray().Should().BeEquivalentTo(new[] { "message", "statusCode" });
        factory.Proxy.CallCount.Should().Be(1);
    }

    [TestMethod]
    public async Task Sync_WhenAuthenticatedIdentityHasMalformedUserId_Returns401()
    {
        // Arrange
        using var factory = new NotableWebApplicationFactory();
        factory.Proxy.RespondAsync = (request, _, _) =>
        {
            _ = request.HttpContext.RequestServices.GetRequiredService<ICurrentUser>().Id;
            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK));
        };
        using var client = factory.CreateApiClient();
        client.DefaultRequestHeaders.Add(TestAuthenticationHandler.UserIdHeader, "invalid-user-id");

        // Act
        using var response = await client.GetAsync("/sync/document", TestContext.CancellationToken);
        var json = await response.Content.ReadAsStringAsync(TestContext.CancellationToken);
        using var document = JsonDocument.Parse(json);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        document.RootElement.GetProperty("message").GetString().Should().Be("User not authenticated");
    }
}