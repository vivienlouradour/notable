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
        // Arrange
        using var factory = new NotableWebApplicationFactory();
        string? receivedRoute = null;
        factory.Proxy.RespondAsync = (_, route, _) =>
        {
            receivedRoute = route;
            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK));
        };
        using var client = factory.CreateApiClient(Guid.NewGuid());

        // Act
        using var response = await client.GetAsync(path, TestContext.CancellationToken);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        receivedRoute.Should().Be(expectedRoute);
        factory.Proxy.CallCount.Should().Be(1);
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
        // Arrange
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

        // Act
        using var response = await client.SendAsync(request, TestContext.CancellationToken);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        receivedMethod.Should().Be(method);
        receivedBody.Should().Be("{\"value\":\"été\"}");
        receivedContentType.Should().Be("application/json; charset=utf-8");
        receivedHeader.Should().Be("\"2-revision\"");
        receivedUserId.Should().Be(userId);
        receivedRequestAborted.Should().BeTrue();
        factory.Proxy.CallCount.Should().Be(1);
    }

    [TestMethod]
    [DataRow(201)]
    [DataRow(401)]
    [DataRow(404)]
    [DataRow(409)]
    [DataRow(503)]
    public async Task Sync_WhenProxyResponds_PreservesStatusBodyAndHeaders(int statusCode)
    {
        // Arrange
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

        // Act
        using var response = await client.GetAsync("/sync/document", TestContext.CancellationToken);
        var responseBody = await response.Content.ReadAsStringAsync(TestContext.CancellationToken);

        // Assert
        response.StatusCode.Should().Be((HttpStatusCode)statusCode);
        responseBody.Should().Be(body);
        (response.Content.Headers.ContentType?.MediaType).Should().Be("application/json");
        (response.Content.Headers.ContentType?.CharSet).Should().Be("utf-8");
        (response.Headers.ETag?.Tag).Should().Be("\"2-revision\"");
        response.Headers.GetValues("X-Couch-Request-ID").ToArray().Should().Equal(new[] { "request-42" });
        response.Headers.Contains("Transfer-Encoding").Should().BeFalse();
    }

    [TestMethod]
    [Timeout(30_000, CooperativeCancellation = true)]
    public async Task Sync_WhenUpstreamStreams_DeliversFirstChunkBeforeUpstreamCompletes()
    {
        // Arrange
        using var content = new GatedHttpContent();
        using var upstream = new HttpResponseMessage(HttpStatusCode.OK) { Content = content };
        using var factory = new NotableWebApplicationFactory();
        factory.Proxy.RespondAsync = (_, _, _) => Task.FromResult(upstream);
        using var client = factory.CreateApiClient(Guid.NewGuid());

        // Act
        try
        {
            using var response = await client.GetAsync("/sync/_changes?feed=continuous", HttpCompletionOption.ResponseHeadersRead,
                TestContext.CancellationToken);
            using var stream = await response.Content.ReadAsStreamAsync(TestContext.CancellationToken);
            using var reader = new StreamReader(stream);
            var firstLine = await reader.ReadLineAsync(TestContext.CancellationToken);

            // The upstream cannot produce its remaining content until the client has read the first line.
            content.Complete();
            var remainingContent = await reader.ReadToEndAsync(TestContext.CancellationToken);

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.OK);
            (response.Content.Headers.ContentType?.MediaType).Should().Be("application/x-ndjson");
            firstLine.Should().Be("{\"seq\":1}");
            remainingContent.Should().Be("{\"seq\":2}\n");
        }
        finally
        {
            content.Complete();
        }
    }

    [TestMethod]
    public async Task Sync_WhenMethodIsUnsupported_Returns405WithoutCallingProxy()
    {
        // Arrange
        using var factory = new NotableWebApplicationFactory();
        using var client = factory.CreateApiClient(Guid.NewGuid());
        using var request = new HttpRequestMessage(HttpMethod.Head, "/sync/document");

        // Act
        using var response = await client.SendAsync(request, TestContext.CancellationToken);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.MethodNotAllowed);
        factory.Proxy.CallCount.Should().Be(0);
    }
}