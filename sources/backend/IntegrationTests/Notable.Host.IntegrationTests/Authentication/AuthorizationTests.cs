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
        using var factory = new NotableWebApplicationFactory();
        using var client = factory.CreateApiClient();

        using var response = await client.GetAsync(path, TestContext.CancellationToken);

        Assert.AreEqual(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.IsNull(response.Headers.Location);
        Assert.AreEqual(0, factory.Proxy.CallCount);
    }

    [TestMethod]
    [DataRow("POST")]
    [DataRow("PUT")]
    [DataRow("DELETE")]
    [DataRow("OPTIONS")]
    [DataRow("PATCH")]
    public async Task Sync_WhenAnonymous_RejectsEverySupportedWriteMethod(string method)
    {
        using var factory = new NotableWebApplicationFactory();
        using var client = factory.CreateApiClient();
        using var request = new HttpRequestMessage(new HttpMethod(method), "/sync/document");

        using var response = await client.SendAsync(request, TestContext.CancellationToken);

        Assert.AreEqual(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.IsNull(response.Headers.Location);
        Assert.AreEqual(0, factory.Proxy.CallCount);
    }
}