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
        using var factory = new NotableWebApplicationFactory();
        using var client = factory.CreateApiClient(Guid.NewGuid());

        using var response = await client.GetAsync(path, TestContext.CancellationToken);
        var json = await response.Content.ReadAsStringAsync(TestContext.CancellationToken);
        using var document = JsonDocument.Parse(json);

        Assert.AreEqual(HttpStatusCode.OK, response.StatusCode);
        Assert.AreEqual("application/json", response.Content.Headers.ContentType?.MediaType);
        Assert.AreEqual(AppVersion.Version, document.RootElement.GetProperty("version").GetString());
        Assert.AreEqual(AppVersion.FullVersion, document.RootElement.GetProperty("fullVersion").GetString());
        Assert.AreEqual(AppVersion.AssemblyVersion, document.RootElement.GetProperty("assemblyVersion").GetString());
        Assert.AreEqual(0, factory.Proxy.CallCount);
    }

    [TestMethod]
    public async Task GetHealth_WhenAuthenticated_ReturnsHealthyAsJson()
    {
        using var factory = new NotableWebApplicationFactory();
        using var client = factory.CreateApiClient(Guid.NewGuid());

        using var response = await client.GetAsync("/status/health", TestContext.CancellationToken);
        var json = await response.Content.ReadAsStringAsync(TestContext.CancellationToken);
        using var document = JsonDocument.Parse(json);

        Assert.AreEqual(HttpStatusCode.OK, response.StatusCode);
        Assert.AreEqual("application/json", response.Content.Headers.ContentType?.MediaType);
        Assert.AreEqual("healthy", document.RootElement.GetProperty("status").GetString());
    }
}