using System.Net;
using System.Text.Json;

using Notable.Testing;
using Notable.Testing.Handlers;

namespace Notable.Host.Tests.Middlewares;

[TestClass]
public sealed class ExceptionHandlingTests
{
    [TestMethod]
    [DataRow("unauthorized", 401, "User not authenticated")]
    [DataRow("http", 500, "Unhandled exception")]
    [DataRow("cancelled", 500, "Unhandled exception")]
    [DataRow("unexpected", 500, "Unhandled exception")]
    public async Task Request_WhenServiceThrows_ReturnsOnlySanitizedError(string exceptionKind, int status, string message)
    {
        // Arrange
        const string privateDetails = "private-backend-details";
        using var couchDb = new StubCouchDbHandler
        {
            RespondAsync = (_, _) => throw exceptionKind switch
            {
                "unauthorized" => new UnauthorizedAccessException(privateDetails),
                "http" => new HttpRequestException(privateDetails),
                "cancelled" => new OperationCanceledException(privateDetails),
                _ => new InvalidOperationException(privateDetails)
            }
        };
        var userId = Guid.NewGuid();
        using var host = await NotableTestHostBuilder.Default.WithCouchDbHandler(couchDb)
            .WithUsers(new TestUser(userId, "errors@example.com")).BuildAsync();
        using var client = host.CreateAuthenticatedClient(userId);

        // Act
        using var response = await client.GetAsync("/sync/document");
        var body = await response.Content.ReadAsStringAsync();
        using var json = JsonDocument.Parse(body);

        // Assert
        response.StatusCode.Should().Be((HttpStatusCode)status);
        (response.Content.Headers.ContentType?.MediaType).Should().Be("application/json");
        json.RootElement.GetProperty("message").GetString().Should().Be(message);
        json.RootElement.GetProperty("statusCode").GetInt32().Should().Be(status);
        json.RootElement.EnumerateObject().Select(property => property.Name).Should().BeEquivalentTo(["message", "statusCode"]);
        body.Should().NotContain(privateDetails).And.NotContain("Exception").And.NotContain("stackTrace");
        response.Headers.Location.Should().BeNull();
        response.Headers.Contains("Set-Cookie").Should().BeFalse();
        couchDb.Requests.Should().ContainSingle();
    }
}
