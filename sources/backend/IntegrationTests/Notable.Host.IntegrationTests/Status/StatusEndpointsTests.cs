using System.Net;
using System.Text.Json;

using Notable.Core;
using Notable.Host.IntegrationTests.Infrastructure;

namespace Notable.Host.IntegrationTests.Status;

[TestClass]
public sealed class StatusEndpointsTests
{
    public TestContext TestContext { get; set; } = null!;

    [TestMethod]
    [DataRow("/")]
    [DataRow("/status/version")]
    public async Task GetVersion_WhenAuthenticated_ReturnsAssemblyVersionAsJson(string path)
    {
        // Arrange
        using var factory = new NotableWebApplicationFactory();
        using var client = factory.CreateApiClient(Guid.NewGuid());

        // Act
        using var response = await client.GetAsync(path, TestContext.CancellationToken);
        var json = await response.Content.ReadAsStringAsync(TestContext.CancellationToken);
        using var document = JsonDocument.Parse(json);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        (response.Content.Headers.ContentType?.MediaType).Should().Be("application/json");
        document.RootElement.GetProperty("version").GetString().Should().Be(AppVersion.Version);
        document.RootElement.GetProperty("fullVersion").GetString().Should().Be(AppVersion.FullVersion);
        document.RootElement.GetProperty("assemblyVersion").GetString().Should().Be(AppVersion.AssemblyVersion);
        factory.Proxy.CallCount.Should().Be(0);
    }

    [TestMethod]
    public async Task GetHealth_WhenAuthenticated_ReturnsHealthyAsJson()
    {
        // Arrange
        using var factory = new NotableWebApplicationFactory();
        using var client = factory.CreateApiClient(Guid.NewGuid());

        // Act
        using var response = await client.GetAsync("/status/health", TestContext.CancellationToken);
        var json = await response.Content.ReadAsStringAsync(TestContext.CancellationToken);
        using var document = JsonDocument.Parse(json);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        (response.Content.Headers.ContentType?.MediaType).Should().Be("application/json");
        document.RootElement.GetProperty("status").GetString().Should().Be("healthy");
    }
}