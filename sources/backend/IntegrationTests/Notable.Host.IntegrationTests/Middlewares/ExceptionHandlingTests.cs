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

        using var response = await client.GetAsync("/sync/document", TestContext.CancellationToken);
        var json = await response.Content.ReadAsStringAsync(TestContext.CancellationToken);
        using var document = JsonDocument.Parse(json);

        Assert.AreEqual((HttpStatusCode)expectedStatus, response.StatusCode);
        Assert.AreEqual("application/json", response.Content.Headers.ContentType?.MediaType);
        Assert.AreEqual(expectedStatus, document.RootElement.GetProperty("statusCode").GetInt32());
        Assert.AreEqual(expectedMessage, document.RootElement.GetProperty("message").GetString());
        CollectionAssert.AreEquivalent(new[] { "message", "statusCode" },
            document.RootElement.EnumerateObject().Select(property => property.Name).ToArray());
        Assert.AreEqual(1, factory.Proxy.CallCount);
    }

    [TestMethod]
    public async Task Sync_WhenAuthenticatedIdentityHasMalformedUserId_Returns401()
    {
        using var factory = new NotableWebApplicationFactory();
        factory.Proxy.RespondAsync = (request, _, _) =>
        {
            _ = request.HttpContext.RequestServices.GetRequiredService<ICurrentUser>().Id;
            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK));
        };
        using var client = factory.CreateApiClient();
        client.DefaultRequestHeaders.Add(TestAuthenticationHandler.UserIdHeader, "invalid-user-id");

        using var response = await client.GetAsync("/sync/document", TestContext.CancellationToken);
        var json = await response.Content.ReadAsStringAsync(TestContext.CancellationToken);
        using var document = JsonDocument.Parse(json);

        Assert.AreEqual(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.AreEqual("User not authenticated", document.RootElement.GetProperty("message").GetString());
    }
}