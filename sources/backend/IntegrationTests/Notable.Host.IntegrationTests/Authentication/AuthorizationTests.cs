using System.Net;

using Notable.Host.IntegrationTests.Infrastructure;

namespace Notable.Host.IntegrationTests.Authentication;

[TestClass]
public sealed class AuthorizationTests
{
    public TestContext TestContext { get; set; } = null!;

    [TestMethod]
    [DataRow("/")]
    [DataRow("/status/health")]
    [DataRow("/status/version")]
    [DataRow("/sync")]
    [DataRow("/sync/_changes?feed=longpoll&since=0")]
    public async Task GetProtectedEndpoint_WhenAnonymous_Returns401WithoutRedirect(string path)
    {
        // Arrange
        using var factory = new NotableWebApplicationFactory();
        using var client = factory.CreateApiClient();

        // Act
        using var response = await client.GetAsync(path, TestContext.CancellationToken);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        response.Headers.Location.Should().BeNull();
        factory.Proxy.CallCount.Should().Be(0);
    }

    [TestMethod]
    [DataRow("POST")]
    [DataRow("PUT")]
    [DataRow("DELETE")]
    [DataRow("OPTIONS")]
    [DataRow("PATCH")]
    public async Task Sync_WhenAnonymous_RejectsEverySupportedWriteMethod(string method)
    {
        // Arrange
        using var factory = new NotableWebApplicationFactory();
        using var client = factory.CreateApiClient();
        using var request = new HttpRequestMessage(new HttpMethod(method), "/sync/document");

        // Act
        using var response = await client.SendAsync(request, TestContext.CancellationToken);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        response.Headers.Location.Should().BeNull();
        factory.Proxy.CallCount.Should().Be(0);
    }
}