using System.Net;
using System.Net.Http.Headers;
using System.Text;

using Microsoft.Extensions.DependencyInjection;

using Notable.Host.IntegrationTests.Infrastructure;
using Notable.Identity.Common;

namespace Notable.Host.IntegrationTests.Sync;

[TestClass]
public sealed class CouchDbEndpointsTests
{
    public TestContext TestContext { get; set; } = null!;

    [TestMethod]
    [DataRow("/sync", "")]
    [DataRow("/sync/", "")]
    [DataRow("/sync/folder/document?rev=2-abc&conflicts=true", "folder/document?rev=2-abc&conflicts=true")]
    [DataRow("/sync/_changes?feed=longpoll&since=42%3Aabc", "_changes?feed=longpoll&since=42%3Aabc")]
    public async Task Sync_WhenAuthenticated_PassesCatchAllPathAndQueryToProxy(string path, string expectedRoute)
    {
        using var factory = new NotableWebApplicationFactory();
        string? receivedRoute = null;
        factory.Proxy.RespondAsync = (_, route, _) =>
        {
            receivedRoute = route;
            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK));
        };
        using var client = factory.CreateApiClient(Guid.NewGuid());

        using var response = await client.GetAsync(path, TestContext.CancellationToken);

        Assert.AreEqual(HttpStatusCode.OK, response.StatusCode);
        Assert.AreEqual(expectedRoute, receivedRoute);
        Assert.AreEqual(1, factory.Proxy.CallCount);
    }

    [TestMethod]
    [DataRow("GET")]
    [DataRow("POST")]
    [DataRow("PUT")]
    [DataRow("DELETE")]
    [DataRow("OPTIONS")]
    [DataRow("PATCH")]
    public async Task Sync_ForSupportedMethod_PassesRequestAndCancellationTokenToProxy(string method)
    {
        using var factory = new NotableWebApplicationFactory();
        var userId = Guid.NewGuid();
        string? receivedMethod = null;
        string? receivedBody = null;
        string? receivedContentType = null;
        string? receivedHeader = null;
        Guid? receivedUserId = null;
        var receivedRequestAborted = false;
        factory.Proxy.RespondAsync = async (request, _, cancellationToken) =>
        {
            receivedMethod = request.Method;
            receivedContentType = request.ContentType;
            receivedHeader = request.Headers["If-Match"].ToString();
            receivedUserId = request.HttpContext.RequestServices.GetRequiredService<ICurrentUser>().Id;
            receivedRequestAborted = cancellationToken == request.HttpContext.RequestAborted && cancellationToken.CanBeCanceled;
            using var reader = new StreamReader(request.Body, leaveOpen: true);
            receivedBody = await reader.ReadToEndAsync(cancellationToken);
            return new HttpResponseMessage(HttpStatusCode.OK);
        };
        using var client = factory.CreateApiClient(userId);
        using var request = new HttpRequestMessage(new HttpMethod(method), "/sync/document")
        {
            Content = new StringContent("{\"value\":\"été\"}", Encoding.UTF8, "application/json")
        };
        request.Headers.IfMatch.Add(new EntityTagHeaderValue("\"2-revision\""));

        using var response = await client.SendAsync(request, TestContext.CancellationToken);

        Assert.AreEqual(HttpStatusCode.OK, response.StatusCode);
        Assert.AreEqual(method, receivedMethod);
        Assert.AreEqual("{\"value\":\"été\"}", receivedBody);
        Assert.AreEqual("application/json; charset=utf-8", receivedContentType);
        Assert.AreEqual("\"2-revision\"", receivedHeader);
        Assert.AreEqual(userId, receivedUserId);
        Assert.IsTrue(receivedRequestAborted);
        Assert.AreEqual(1, factory.Proxy.CallCount);
    }

    [TestMethod]
    [DataRow(201)]
    [DataRow(401)]
    [DataRow(404)]
    [DataRow(409)]
    [DataRow(503)]
    public async Task Sync_WhenProxyResponds_PreservesStatusBodyAndHeaders(int statusCode)
    {
        const string body = "{\"id\":\"note\",\"rev\":\"2-révision\"}";
        using var upstream = new HttpResponseMessage((HttpStatusCode)statusCode)
        {
            Content = new StringContent(body, Encoding.UTF8, "application/json")
        };
        upstream.Headers.ETag = new EntityTagHeaderValue("\"2-revision\"");
        upstream.Headers.Add("X-Couch-Request-ID", "request-42");
        upstream.Headers.TransferEncodingChunked = true;
        using var factory = new NotableWebApplicationFactory();
        factory.Proxy.RespondAsync = (_, _, _) => Task.FromResult(upstream);
        using var client = factory.CreateApiClient(Guid.NewGuid());

        using var response = await client.GetAsync("/sync/document", TestContext.CancellationToken);
        var responseBody = await response.Content.ReadAsStringAsync(TestContext.CancellationToken);

        Assert.AreEqual((HttpStatusCode)statusCode, response.StatusCode);
        Assert.AreEqual(body, responseBody);
        Assert.AreEqual("application/json", response.Content.Headers.ContentType?.MediaType);
        Assert.AreEqual("utf-8", response.Content.Headers.ContentType?.CharSet);
        Assert.AreEqual("\"2-revision\"", response.Headers.ETag?.Tag);
        CollectionAssert.AreEqual(new[] { "request-42" }, response.Headers.GetValues("X-Couch-Request-ID").ToArray());
        Assert.IsFalse(response.Headers.Contains("Transfer-Encoding"));
    }

    [TestMethod]
    [Timeout(30_000, CooperativeCancellation = true)]
    public async Task Sync_WhenUpstreamStreams_DeliversFirstChunkBeforeUpstreamCompletes()
    {
        using var content = new GatedHttpContent();
        using var upstream = new HttpResponseMessage(HttpStatusCode.OK) { Content = content };
        using var factory = new NotableWebApplicationFactory();
        factory.Proxy.RespondAsync = (_, _, _) => Task.FromResult(upstream);
        using var client = factory.CreateApiClient(Guid.NewGuid());

        try
        {
            using var response = await client.GetAsync("/sync/_changes?feed=continuous", HttpCompletionOption.ResponseHeadersRead,
                TestContext.CancellationToken);
            using var stream = await response.Content.ReadAsStreamAsync(TestContext.CancellationToken);
            using var reader = new StreamReader(stream);
            var firstLine = await reader.ReadLineAsync(TestContext.CancellationToken);

            Assert.AreEqual(HttpStatusCode.OK, response.StatusCode);
            Assert.AreEqual("application/x-ndjson", response.Content.Headers.ContentType?.MediaType);
            Assert.AreEqual("{\"seq\":1}", firstLine);

            // The upstream cannot produce its remaining content until the client has read the first line.
            content.Complete();
            var remainingContent = await reader.ReadToEndAsync(TestContext.CancellationToken);
            Assert.AreEqual("{\"seq\":2}\n", remainingContent);
        }
        finally
        {
            content.Complete();
        }
    }

    [TestMethod]
    public async Task Sync_WhenMethodIsUnsupported_Returns405WithoutCallingProxy()
    {
        using var factory = new NotableWebApplicationFactory();
        using var client = factory.CreateApiClient(Guid.NewGuid());
        using var request = new HttpRequestMessage(HttpMethod.Head, "/sync/document");

        using var response = await client.SendAsync(request, TestContext.CancellationToken);

        Assert.AreEqual(HttpStatusCode.MethodNotAllowed, response.StatusCode);
        Assert.AreEqual(0, factory.Proxy.CallCount);
    }
}