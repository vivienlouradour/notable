using System.Net;

using Notable.Testing;
using Notable.Testing.Handlers;

namespace Notable.Host.Tests.Http;

[TestClass]
public sealed class HttpPipelineTests
{
    [TestMethod]
    [DataRow("/missing")]
    [DataRow("/auth/users/00000000-0000-0000-0000-000000000000")]
    [DataRow("/swagger/v1/swagger.json")]
    public async Task UnknownRoute_Returns404WithoutCallingCouchDb(string path)
    {
        // Arrange
        using var couchDb = new StubCouchDbHandler();
        using var host = NotableTestHostBuilder.Default.WithCouchDbHandler(couchDb).Build();
        using var client = host.CreateUnauthenticatedClient();

        // Act
        using var response = await client.GetAsync(path);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        response.Headers.Location.Should().BeNull();
        couchDb.Requests.Should().BeEmpty();
    }

    [TestMethod]
    [DataRow("http://localhost:4200", true)]
    [DataRow("https://untrusted.invalid", false)]
    public async Task CorsPreflight_AllowsOnlyConfiguredOrigin(string origin, bool allowed)
    {
        // Arrange
        using var couchDb = new StubCouchDbHandler();
        using var host = NotableTestHostBuilder.Default.WithCouchDbHandler(couchDb).Build();
        using var client = host.CreateUnauthenticatedClient();
        using var request = new HttpRequestMessage(HttpMethod.Options, "/sync/document");
        request.Headers.Add("Origin", origin);
        request.Headers.Add("Access-Control-Request-Method", "PUT");
        request.Headers.Add("Access-Control-Request-Headers", "content-type,if-match");

        // Act
        using var response = await client.SendAsync(request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NoContent);
        response.Headers.Contains("Access-Control-Allow-Origin").Should().Be(allowed);
        if (allowed)
        {
            response.Headers.GetValues("Access-Control-Allow-Origin").Should().Equal(origin);
            response.Headers.GetValues("Access-Control-Allow-Credentials").Should().Equal("true");
            response.Headers.GetValues("Access-Control-Allow-Methods").Should().Contain("PUT");
        }
        couchDb.Requests.Should().BeEmpty();
    }
}
