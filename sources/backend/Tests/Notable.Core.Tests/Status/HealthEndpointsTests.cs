using System.Net;
using System.Text.Json;

using Notable.Testing;
using Notable.Testing.Handlers;

namespace Notable.Core.Tests.Status;

[TestClass]
public sealed class HealthEndpointsTests
{
    [TestMethod]
    [DataRow(false)]
    [DataRow(true)]
    public async Task GetHealth_WithoutCouchDb_ReturnsHealthy(bool authenticated)
    {
        // Arrange
        using var couchDb = new StubCouchDbHandler();
        var userId = Guid.NewGuid();
        using var host = await NotableTestHostBuilder.Default.WithCouchDbHandler(couchDb)
            .WithUsers(new TestUser(userId, "health@example.com")).BuildAsync();
        using var client = authenticated ? host.CreateAuthenticatedClient(userId) : host.CreateUnauthenticatedClient();

        // Act
        using var response = await client.GetAsync("/status/health");
        using var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync());

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        (response.Content.Headers.ContentType?.MediaType).Should().Be("application/json");
        json.RootElement.GetProperty("status").GetString().Should().Be("healthy");
        json.RootElement.EnumerateObject().Should().ContainSingle();
        response.Headers.Location.Should().BeNull();
        response.Headers.Contains("Set-Cookie").Should().BeFalse();
        couchDb.Requests.Should().BeEmpty();
    }

    [TestMethod]
    [DataRow("POST")]
    [DataRow("PUT")]
    [DataRow("PATCH")]
    [DataRow("DELETE")]
    [DataRow("HEAD")]
    [DataRow("OPTIONS")]
    public async Task Health_WithUnsupportedMethod_Returns405(string method)
    {
        // Arrange
        using var host = NotableTestHostBuilder.Default.Build();
        using var client = host.CreateUnauthenticatedClient();
        using var request = new HttpRequestMessage(new HttpMethod(method), "/status/health");

        // Act
        using var response = await client.SendAsync(request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.MethodNotAllowed);
        response.Content.Headers.Allow.Should().Equal("GET");
    }
}
