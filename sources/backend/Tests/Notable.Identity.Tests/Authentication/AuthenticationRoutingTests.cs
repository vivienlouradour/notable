using System.Net;

using Notable.Testing;
using Notable.Testing.Handlers;

namespace Notable.Identity.Tests.Authentication;

[TestClass]
public sealed class AuthenticationRoutingTests
{
    [TestMethod]
    [DataRow("/auth/methods", "POST", "GET")]
    [DataRow("/auth/builtin/login", "GET", "POST")]
    [DataRow("/auth/builtin/login", "PUT", "POST")]
    [DataRow("/auth/builtin/register", "GET", "POST")]
    [DataRow("/auth/builtin/register", "DELETE", "POST")]
    [DataRow("/auth/logout", "GET", "POST")]
    [DataRow("/auth/logout", "PUT", "POST")]
    public async Task Authentication_WithUnsupportedMethod_Returns405(string path, string method, string allowed)
    {
        // Arrange
        using var couchDb = new StubCouchDbHandler();
        using var host = NotableTestHostBuilder.Default.WithCouchDbHandler(couchDb).Build();
        using var client = host.CreateUnauthenticatedClient();
        using var request = new HttpRequestMessage(new HttpMethod(method), path);

        // Act
        using var response = await client.SendAsync(request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.MethodNotAllowed);
        response.Content.Headers.Allow.Should().Equal(allowed);
        response.Headers.Location.Should().BeNull();
        couchDb.Requests.Should().BeEmpty();
    }
}
