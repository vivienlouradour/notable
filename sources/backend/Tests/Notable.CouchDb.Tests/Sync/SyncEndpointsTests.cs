using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;

using Notable.Testing;
using Notable.Testing.Handlers;

namespace Notable.CouchDb.Tests.Sync;

[TestClass]
public sealed class SyncEndpointsTests
{
    [TestMethod]
    [DataRow("GET", "_all_docs?include_docs=true&limit=10", false)]
    [DataRow("POST", "_bulk_docs", true)]
    [DataRow("PUT", "folder/document?rev=2-abc", true)]
    [DataRow("PATCH", "document", true)]
    [DataRow("DELETE", "document?rev=2-abc", false)]
    [DataRow("OPTIONS", "", false)]
    public async Task Sync_ForwardsMethodPathQueryBodyAndHeaders(string method, string route, bool hasBody)
    {
        // Arrange
        using var couchDb = new StubCouchDbHandler();
        couchDb.Enqueue(HttpStatusCode.OK);
        couchDb.Enqueue(HttpStatusCode.Accepted, new StringContent("{\"ok\":true}", Encoding.UTF8, "application/json"));
        var userId = Guid.NewGuid();
        using var host = await NotableTestHostBuilder.Default.WithCouchDbHandler(couchDb)
            .WithUsers(new TestUser(userId, "sync@example.com")).BuildAsync();
        using var client = host.CreateAuthenticatedClient(userId);
        using var request = new HttpRequestMessage(new HttpMethod(method), "/sync/" + route);
        request.Headers.IfMatch.Add(new EntityTagHeaderValue("\"2-abc\""));
        request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
        if (hasBody)
        {
            request.Content = new StringContent("{\"title\":\"été\"}", Encoding.UTF8, "application/json");
        }

        // Act
        using var response = await client.SendAsync(request);
        var body = await response.Content.ReadAsStringAsync();

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Accepted);
        body.Should().Be("{\"ok\":true}");
        (response.Content.Headers.ContentType?.MediaType).Should().Be("application/json");
        couchDb.Requests.Should().HaveCount(2);
        couchDb.Requests[0].Method.Should().Be(HttpMethod.Get);
        couchDb.Requests[0].Uri.Should().Be(new Uri($"https://couchdb.invalid/db_user_{userId:D}"));
        var forwarded = couchDb.Requests[1];
        forwarded.Method.Method.Should().Be(method);
        forwarded.Uri.Should().Be(new Uri($"https://couchdb.invalid/db_user_{userId:D}/{route}"));
        forwarded.Headers["If-Match"].Should().Equal("\"2-abc\"");
        forwarded.Headers["Accept"].Should().Equal("application/json");
        forwarded.Body.Should().Be(hasBody ? "{\"title\":\"été\"}" : null);
        if (hasBody)
        {
            forwarded.ContentHeaders["Content-Type"].Should().Equal("application/json; charset=utf-8");
        }
        couchDb.Requests.Should().OnlyContain(recorded => recorded.CanBeCanceled);
    }

    [TestMethod]
    public async Task Sync_WhenDatabaseMissing_CreatesItAndSetsPermissionsBeforeForwarding()
    {
        // Arrange
        using var couchDb = new StubCouchDbHandler();
        couchDb.Enqueue(HttpStatusCode.NotFound);
        couchDb.Enqueue(HttpStatusCode.Created);
        couchDb.Enqueue(HttpStatusCode.OK);
        couchDb.Enqueue(HttpStatusCode.OK, new StringContent("{\"rows\":[]}"));
        var userId = Guid.NewGuid();
        var databaseUrl = $"https://couchdb.invalid/db_user_{userId:D}";
        using var host = await NotableTestHostBuilder.Default.WithCouchDbHandler(couchDb)
            .WithUsers(new TestUser(userId, "new@example.com")).BuildAsync();
        using var client = host.CreateAuthenticatedClient(userId);

        // Act
        using var response = await client.GetAsync("/sync/_all_docs");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        couchDb.Requests.Select(request => request.Method).Should().Equal(HttpMethod.Get, HttpMethod.Put, HttpMethod.Put, HttpMethod.Get);
        couchDb.Requests.Select(request => request.Uri!.AbsoluteUri).Should().Equal(databaseUrl, databaseUrl, databaseUrl + "/_security", databaseUrl + "/_all_docs");
        couchDb.Requests[1].Body.Should().BeNull();
        using var security = JsonDocument.Parse(couchDb.Requests[2].Body!);
        security.RootElement.GetProperty("admins").GetProperty("names").EnumerateArray().Should().BeEmpty();
        security.RootElement.GetProperty("admins").GetProperty("roles").EnumerateArray().Should().BeEmpty();
        security.RootElement.GetProperty("members").GetProperty("names").EnumerateArray().Select(value => value.GetString()).Should().Equal("api_user");
        security.RootElement.GetProperty("members").GetProperty("roles").EnumerateArray().Should().BeEmpty();
        couchDb.Requests[2].ContentHeaders["Content-Type"].Should().Equal("application/json; charset=utf-8");
    }

    [TestMethod]
    [DataRow(false)]
    [DataRow(true)]
    public async Task Sync_WhenProvisioningFails_ReturnsSanitized500AndStops(bool permissionsFail)
    {
        // Arrange
        using var couchDb = new StubCouchDbHandler();
        couchDb.Enqueue(HttpStatusCode.NotFound);
        if (permissionsFail)
        {
            couchDb.Enqueue(HttpStatusCode.Created);
        }
        couchDb.Enqueue(HttpStatusCode.Forbidden, new StringContent("private-couchdb-error"));
        var userId = Guid.NewGuid();
        using var host = await NotableTestHostBuilder.Default.WithCouchDbHandler(couchDb)
            .WithUsers(new TestUser(userId, "failure@example.com")).BuildAsync();
        using var client = host.CreateAuthenticatedClient(userId);

        // Act
        using var response = await client.GetAsync("/sync/_all_docs");
        using var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync());

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.InternalServerError);
        json.RootElement.GetProperty("message").GetString().Should().Be("Unhandled exception");
        json.RootElement.GetProperty("statusCode").GetInt32().Should().Be(500);
        json.RootElement.EnumerateObject().Select(property => property.Name).Should().BeEquivalentTo(["message", "statusCode"]);
        couchDb.Requests.Should().HaveCount(permissionsFail ? 3 : 2);
        couchDb.Requests.Should().NotContain(request => request.Uri!.AbsolutePath.EndsWith("/_all_docs", StringComparison.Ordinal));
    }

    [TestMethod]
    [DataRow(200)]
    [DataRow(201)]
    [DataRow(304)]
    [DataRow(400)]
    [DataRow(401)]
    [DataRow(403)]
    [DataRow(404)]
    [DataRow(409)]
    [DataRow(500)]
    [DataRow(503)]
    public async Task Sync_ForwardsCouchDbStatusAndResponseHeaders(int status)
    {
        // Arrange
        using var couchDb = new StubCouchDbHandler
        {
            RespondAsync = (request, _) =>
            {
                var response = new HttpResponseMessage(request.RequestUri!.AbsolutePath.EndsWith("/document", StringComparison.Ordinal)
                    ? (HttpStatusCode)status : HttpStatusCode.OK);
                response.Content = new StringContent("{\"result\":\"été\"}", Encoding.UTF8, "application/json");
                response.Headers.ETag = new EntityTagHeaderValue("\"2-abc\"");
                response.Headers.CacheControl = new CacheControlHeaderValue { NoCache = true };
                response.Headers.TryAddWithoutValidation("X-Couch-Request-ID", "request-123");
                response.Headers.TransferEncodingChunked = true;
                return Task.FromResult(response);
            }
        };
        var userId = Guid.NewGuid();
        using var host = await NotableTestHostBuilder.Default.WithCouchDbHandler(couchDb)
            .WithUsers(new TestUser(userId, "response@example.com")).BuildAsync();
        using var client = host.CreateAuthenticatedClient(userId);

        // Act
        using var response = await client.GetAsync("/sync/document");

        // Assert
        response.StatusCode.Should().Be((HttpStatusCode)status);
        response.Headers.ETag!.Tag.Should().Be("\"2-abc\"");
        response.Headers.CacheControl!.NoCache.Should().BeTrue();
        response.Headers.GetValues("X-Couch-Request-ID").Should().Equal("request-123");
        response.Headers.Contains("Transfer-Encoding").Should().BeFalse();
        (response.Content.Headers.ContentType?.MediaType).Should().Be("application/json");
        (await response.Content.ReadAsStringAsync()).Should().Be("{\"result\":\"été\"}");
        couchDb.Requests.Should().HaveCount(2);
    }

    [TestMethod]
    [DataRow("GET")]
    [DataRow("POST")]
    [DataRow("PUT")]
    [DataRow("DELETE")]
    [DataRow("OPTIONS")]
    [DataRow("PATCH")]
    public async Task Sync_WhenAnonymous_Returns401WithoutCallingCouchDb(string method)
    {
        // Arrange
        using var couchDb = new StubCouchDbHandler();
        using var host = NotableTestHostBuilder.Default.WithCouchDbHandler(couchDb).Build();
        using var client = host.CreateUnauthenticatedClient();
        using var request = new HttpRequestMessage(new HttpMethod(method), "/sync/document");

        // Act
        using var response = await client.SendAsync(request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        response.Headers.Location.Should().BeNull();
        response.Headers.Contains("Set-Cookie").Should().BeFalse();
        (await response.Content.ReadAsStringAsync()).Should().BeEmpty();
        couchDb.Requests.Should().BeEmpty();
    }

    [TestMethod]
    [DataRow("HEAD")]
    [DataRow("TRACE")]
    public async Task Sync_WithUnsupportedMethod_Returns405WithoutCallingCouchDb(string method)
    {
        // Arrange
        using var couchDb = new StubCouchDbHandler();
        var userId = Guid.NewGuid();
        using var host = await NotableTestHostBuilder.Default.WithCouchDbHandler(couchDb)
            .WithUsers(new TestUser(userId, "method@example.com")).BuildAsync();
        using var client = host.CreateAuthenticatedClient(userId);
        using var request = new HttpRequestMessage(new HttpMethod(method), "/sync/document");

        // Act
        using var response = await client.SendAsync(request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.MethodNotAllowed);
        response.Content.Headers.Allow.Should().BeEquivalentTo("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH");
        couchDb.Requests.Should().BeEmpty();
    }

    [TestMethod]
    public async Task Sync_AcrossIdentities_AlwaysTargetsAuthenticatedUsersDatabase()
    {
        // Arrange
        using var couchDb = new StubCouchDbHandler
        {
            RespondAsync = (_, _) => Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent("{}") })
        };
        var firstId = Guid.NewGuid();
        var secondId = Guid.NewGuid();
        using var host = await NotableTestHostBuilder.Default.WithCouchDbHandler(couchDb)
            .WithUsers(new TestUser(firstId, "first@example.com"), new TestUser(secondId, "second@example.com")).BuildAsync();
        using var firstClient = host.CreateAuthenticatedClient(firstId);
        using var secondClient = host.CreateAuthenticatedClient(secondId);
        using var anonymousClient = host.CreateUnauthenticatedClient();

        // Act
        using var firstResponse = await firstClient.GetAsync($"/sync/_all_docs?userId={secondId}");
        using var secondResponse = await secondClient.GetAsync($"/sync/db_user_{firstId:D}/document");
        using var anonymousResponse = await anonymousClient.GetAsync("/sync/_all_docs");
        using var repeatedResponse = await firstClient.GetAsync("/sync/_all_docs");

        // Assert
        firstResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        secondResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        repeatedResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        anonymousResponse.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        couchDb.Requests.Should().HaveCount(6);
        couchDb.Requests.Take(2).Concat(couchDb.Requests.Skip(4)).Should()
            .OnlyContain(request => request.Uri!.AbsolutePath.StartsWith($"/db_user_{firstId:D}", StringComparison.Ordinal));
        couchDb.Requests.Skip(2).Take(2).Should()
            .OnlyContain(request => request.Uri!.AbsolutePath.StartsWith($"/db_user_{secondId:D}", StringComparison.Ordinal));
        couchDb.Requests[3].Uri!.AbsolutePath.Should().Be($"/db_user_{secondId:D}/db_user_{firstId:D}/document");
    }
}
