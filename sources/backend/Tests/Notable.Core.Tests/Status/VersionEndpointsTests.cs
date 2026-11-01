using System.Net;
using System.Reflection;
using System.Text.Json;

using Notable.Testing;
using Notable.Testing.Handlers;

namespace Notable.Core.Tests.Status;

[TestClass]
public sealed class VersionEndpointsTests
{
    [TestMethod]
    [DataRow("/", false)]
    [DataRow("/", true)]
    [DataRow("/status/version", false)]
    [DataRow("/status/version", true)]
    public async Task GetVersion_ReturnsPublicAssemblyVersion(string path, bool authenticated)
    {
        // Arrange
        using var couchDb = new StubCouchDbHandler();
        var userId = Guid.NewGuid();
        using var host = await NotableTestHostBuilder.Default.WithCouchDbHandler(couchDb)
            .WithUsers(new TestUser(userId, "version@example.com")).BuildAsync();
        using var client = authenticated ? host.CreateAuthenticatedClient(userId) : host.CreateUnauthenticatedClient();
        var assembly = typeof(AppVersion).Assembly;
        var informationalVersion = assembly.GetCustomAttribute<AssemblyInformationalVersionAttribute>()!.InformationalVersion;

        // Act
        using var response = await client.GetAsync(path);
        using var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync());

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        (response.Content.Headers.ContentType?.MediaType).Should().Be("application/json");
        json.RootElement.EnumerateObject().Select(property => property.Name).Should().BeEquivalentTo(["version", "fullVersion", "assemblyVersion"]);
        json.RootElement.GetProperty("version").GetString().Should().Be(informationalVersion.Split('+')[0]);
        json.RootElement.GetProperty("fullVersion").GetString().Should().Be(informationalVersion);
        json.RootElement.GetProperty("assemblyVersion").GetString().Should().Be(assembly.GetName().Version!.ToString());
        response.Headers.Location.Should().BeNull();
        response.Headers.Contains("Set-Cookie").Should().BeFalse();
        couchDb.Requests.Should().BeEmpty();
    }

    [TestMethod]
    [DataRow("/", "POST")]
    [DataRow("/status/version", "DELETE")]
    [DataRow("/status/version", "HEAD")]
    public async Task Version_WithUnsupportedMethod_Returns405(string path, string method)
    {
        // Arrange
        using var host = NotableTestHostBuilder.Default.Build();
        using var client = host.CreateUnauthenticatedClient();
        using var request = new HttpRequestMessage(new HttpMethod(method), path);

        // Act
        using var response = await client.SendAsync(request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.MethodNotAllowed);
        response.Content.Headers.Allow.Should().Equal("GET");
    }
}
