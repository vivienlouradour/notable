using System.Net;
using System.Text;
using System.Text.Json;

using Microsoft.AspNetCore.Http;

using Notable.CouchDb.UnitTests.Infrastructure;

namespace Notable.CouchDb.UnitTests.Services;

[TestClass]
public sealed class CouchDbProxyTests
{
    public TestContext TestContext { get; set; } = null!;

    [TestMethod]
    [DataRow("GET")]
    [DataRow("POST")]
    [DataRow("PUT")]
    [DataRow("DELETE")]
    [DataRow("OPTIONS")]
    [DataRow("PATCH")]
    public async Task ProxyRequest_WhenDatabaseExists_ForwardsMethodBodyHeadersAndQuery(string method)
    {
        // Arrange
        using var fixture = new ProxyTestFixture();
        fixture.Enqueue(HttpStatusCode.OK);
        var expectedResponse = fixture.Enqueue(HttpStatusCode.Accepted, new StringContent("upstream response"));
        using var body = new MemoryStream(Encoding.UTF8.GetBytes("{\"title\":\"été\"}"));
        var request = new DefaultHttpContext().Request;
        request.Method = method;
        request.Body = body;
        request.ContentLength = body.Length;
        request.ContentType = "application/json; charset=utf-8";
        request.Headers.IfMatch = "\"2-revision\"";

        // Act
        using var response = await fixture.Proxy.ProxyRequestToUserDatabaseAsync(request, "folder/document?rev=2-abc", TestContext.CancellationToken);

        // Assert
        response.Should().BeSameAs(expectedResponse);
        fixture.Requests.Should().HaveCount(2);
        var check = fixture.Requests[0];
        check.Method.Should().Be(HttpMethod.Get);
        (check.Uri?.AbsoluteUri).Should().Be(fixture.DatabaseUrl);
        var forwarded = fixture.Requests[1];
        forwarded.Method.Method.Should().Be(method);
        (forwarded.Uri?.AbsoluteUri).Should().Be(fixture.DatabaseUrl + "/folder/document?rev=2-abc");
        forwarded.Body.Should().Be("{\"title\":\"été\"}");
        forwarded.ContentType.Should().Be("application/json; charset=utf-8");
        forwarded.IfMatch.Should().Be("\"2-revision\"");
        foreach (var outgoing in fixture.Requests)
        {
            (outgoing.Authorization?.Scheme).Should().Be("Basic");
            (outgoing.Authorization?.Parameter).Should().Be(Convert.ToBase64String(Encoding.ASCII.GetBytes($"api_user:{fixture.Password}")));
        }
    }

    [TestMethod]
    [DataRow(null)]
    [DataRow("")]
    public async Task ProxyRequest_WithoutRouteOrBody_TargetsUserDatabaseRoot(string? route)
    {
        // Arrange
        using var fixture = new ProxyTestFixture();
        fixture.Enqueue(HttpStatusCode.OK);
        fixture.Enqueue(HttpStatusCode.OK);
        var request = new DefaultHttpContext().Request;
        request.Method = HttpMethods.Get;

        // Act
        using var response = await fixture.Proxy.ProxyRequestToUserDatabaseAsync(request, route, TestContext.CancellationToken);

        // Assert
        (fixture.Requests[1].Uri?.AbsoluteUri).Should().Be(fixture.DatabaseUrl + "/");
        fixture.Requests[1].Body.Should().BeNull();
    }

    [TestMethod]
    public async Task ProxyRequest_WhenDatabaseIsMissing_CreatesAndSecuresDatabaseBeforeForwarding()
    {
        // Arrange
        using var fixture = new ProxyTestFixture();
        fixture.Enqueue(HttpStatusCode.NotFound);
        fixture.Enqueue(HttpStatusCode.Created);
        fixture.Enqueue(HttpStatusCode.OK);
        fixture.Enqueue(HttpStatusCode.OK);
        var request = new DefaultHttpContext().Request;
        request.Method = HttpMethods.Get;

        // Act
        using var response = await fixture.Proxy.ProxyRequestToUserDatabaseAsync(request, "_all_docs", TestContext.CancellationToken);

        // Assert
        fixture.Requests.Select(outgoing => outgoing.Method.Method).ToArray().Should().Equal(new[] { "GET", "PUT", "PUT", "GET" });
        (fixture.Requests.Select(outgoing => outgoing.Uri?.AbsoluteUri).ToArray()).Should().Equal(new[] { fixture.DatabaseUrl, fixture.DatabaseUrl, fixture.DatabaseUrl + "/_security", fixture.DatabaseUrl + "/_all_docs" });
        var security = fixture.Requests[2];
        security.ContentType.Should().Be("application/json; charset=utf-8");
        security.Body.Should().NotBeNull();
        using var document = JsonDocument.Parse(security.Body!);
        document.RootElement.GetProperty("admins").GetProperty("names").GetArrayLength().Should().Be(0);
        document.RootElement.GetProperty("admins").GetProperty("roles").GetArrayLength().Should().Be(0);
        document.RootElement.GetProperty("members").GetProperty("names")
            .EnumerateArray().Select(member => member.GetString()).ToArray().Should().Equal(new[] { "api_user" });
        document.RootElement.GetProperty("members").GetProperty("roles").GetArrayLength().Should().Be(0);
    }

    [TestMethod]
    public async Task ProxyRequest_WhenDatabaseCreationFails_StopsBeforeSecurityOrForwarding()
    {
        // Arrange
        using var fixture = new ProxyTestFixture();
        fixture.Enqueue(HttpStatusCode.NotFound);
        fixture.Enqueue(HttpStatusCode.ServiceUnavailable);
        var request = new DefaultHttpContext().Request;

        // Act
        Func<Task> act = () =>
            fixture.Proxy.ProxyRequestToUserDatabaseAsync(request, "document", TestContext.CancellationToken);

        // Assert
        var exception = (await act.Should().ThrowExactlyAsync<Exception>()).Which;

        exception.Message.Should().Be("CouchDB database creation failed : ServiceUnavailable");
        fixture.Requests.Should().HaveCount(2);
    }

    [TestMethod]
    public async Task ProxyRequest_WhenSecurityConfigurationFails_StopsBeforeForwarding()
    {
        // Arrange
        using var fixture = new ProxyTestFixture();
        fixture.Enqueue(HttpStatusCode.NotFound);
        fixture.Enqueue(HttpStatusCode.Created);
        fixture.Enqueue(HttpStatusCode.Forbidden);
        var request = new DefaultHttpContext().Request;

        // Act
        Func<Task> act = () =>
            fixture.Proxy.ProxyRequestToUserDatabaseAsync(request, "document", TestContext.CancellationToken);

        // Assert
        var exception = (await act.Should().ThrowExactlyAsync<Exception>()).Which;

        exception.Message.Should().Be("Permission on new database failed : Forbidden");
        fixture.Requests.Should().HaveCount(3);
    }

    [TestMethod]
    public async Task ProxyRequest_WhenForwardedResponseStreams_DoesNotBufferBody()
    {
        // Arrange
        using var fixture = new ProxyTestFixture();
        fixture.Enqueue(HttpStatusCode.OK);
        using var content = new UnreadableHttpContent();
        var expectedResponse = fixture.Enqueue(HttpStatusCode.OK, content);
        var request = new DefaultHttpContext().Request;
        request.Method = HttpMethods.Get;

        // Act
        using var response = await fixture.Proxy.ProxyRequestToUserDatabaseAsync(request, "_changes?feed=continuous", TestContext.CancellationToken);

        // Assert
        response.Should().BeSameAs(expectedResponse);
        content.WasRead.Should().BeFalse();
    }

    [TestMethod]
    public async Task ProxyRequest_WhenAlreadyCancelled_DoesNotSendHttpRequests()
    {
        // Arrange
        using var fixture = new ProxyTestFixture();
        using var cancellation = new CancellationTokenSource();
        cancellation.Cancel();

        // Act
        Func<Task> act = () => fixture.Proxy.ProxyRequestToUserDatabaseAsync(
            new DefaultHttpContext().Request, "document", cancellation.Token);

        // Assert
        await act.Should().ThrowAsync<OperationCanceledException>();

        fixture.Requests.Should().BeEmpty();
    }

    [TestMethod]
    [DataRow(1)]
    [DataRow(2)]
    public async Task ProxyRequest_WhenCancelledDuringIo_PropagatesCancellationAndStops(int cancelOnRequest)
    {
        // Arrange
        using var fixture = new ProxyTestFixture();
        using var cancellation = new CancellationTokenSource();
        fixture.RespondAsync = cancellationToken =>
        {
            if (fixture.Requests.Count == cancelOnRequest)
            {
                cancellation.Cancel();
                cancellationToken.ThrowIfCancellationRequested();
            }

            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK));
        };
        var request = new DefaultHttpContext().Request;
        request.Method = HttpMethods.Get;

        // Act
        Func<Task> act = () =>
            fixture.Proxy.ProxyRequestToUserDatabaseAsync(request, "document", cancellation.Token);

        // Assert
        await act.Should().ThrowAsync<OperationCanceledException>();

        fixture.Requests.Should().HaveCount(cancelOnRequest);
        fixture.Requests.All(outgoing => outgoing.CanBeCanceled).Should().BeTrue();
    }

    [TestMethod]
    public async Task ProxyRequest_WhenUpstreamConnectionFails_PropagatesOriginalException()
    {
        // Arrange
        using var fixture = new ProxyTestFixture();
        var expected = new HttpRequestException("Upstream connection failed");
        fixture.RespondAsync = _ => Task.FromException<HttpResponseMessage>(expected);

        // Act
        Func<Task> act = () => fixture.Proxy.ProxyRequestToUserDatabaseAsync(
            new DefaultHttpContext().Request, "document", TestContext.CancellationToken);

        // Assert
        var actual = (await act.Should().ThrowExactlyAsync<HttpRequestException>()).Which;

        actual.Should().BeSameAs(expected);
        fixture.Requests.Should().HaveCount(1);
    }
}