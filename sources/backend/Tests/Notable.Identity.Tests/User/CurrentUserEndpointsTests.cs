using System.Net;
using System.Text.Json;

using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;

using Notable.Identity.Authentication;
using Notable.Testing;
using Notable.Testing.Handlers;

namespace Notable.Identity.Tests.User;

[TestClass]
public sealed class CurrentUserEndpointsTests
{
    [TestMethod]
    [DataRow("current@example.com")]
    [DataRow("Current+notes@Example.COM")]
    public async Task GetMe_WithExistingUser_ReturnsOnlyPersistedPublicProfile(string email)
    {
        // Arrange
        using var couchDb = new StubCouchDbHandler();
        var userId = Guid.NewGuid();
        using var host = await NotableTestHostBuilder.Default
            .WithCouchDbHandler(couchDb)
            .WithUsers(new TestUser(userId, email))
            .BuildAsync();

        using var client = host.CreateAuthenticatedClient(userId);

        // Act
        using var response = await client.GetAsync("/auth/me");
        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        (response.Content.Headers.ContentType?.MediaType).Should().Be("application/json");
        document.RootElement.GetProperty("id").GetGuid().Should().Be(userId);
        document.RootElement.GetProperty("email").GetString().Should().Be(email);
        document.RootElement.EnumerateObject().Select(property => property.Name).Should().BeEquivalentTo(["id", "email"]);
        response.Headers.Location.Should().BeNull();
        response.Headers.Contains("Set-Cookie").Should().BeFalse();
        couchDb.Requests.Should().BeEmpty();
    }

    [TestMethod]
    public async Task GetMe_WhenAnonymous_Returns401WithoutRedirect()
    {
        // Arrange
        using var couchDb = new StubCouchDbHandler();
        using var host = NotableTestHostBuilder.Default.WithCouchDbHandler(couchDb).Build();
        using var client = host.CreateUnauthenticatedClient();

        // Act
        using var response = await client.GetAsync("/auth/me");
        var body = await response.Content.ReadAsStringAsync();

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        response.Headers.Location.Should().BeNull();
        body.Should().BeEmpty();
        response.Headers.Contains("Set-Cookie").Should().BeFalse();
        couchDb.Requests.Should().BeEmpty();
    }

    [TestMethod]
    [DataRow(false)]
    [DataRow(true)]
    public async Task GetMe_WithUnknownUser_ReturnsSanitized401WithoutFallingBackToAnotherUser(bool useEmptyGuid)
    {
        // Arrange
        using var couchDb = new StubCouchDbHandler();
        using var host = await NotableTestHostBuilder.Default
            .WithCouchDbHandler(couchDb)
            .WithUsers(new TestUser(Guid.NewGuid(), "other@example.com"))
            .BuildAsync();
        using var client = host.CreateAuthenticatedClient(useEmptyGuid ? Guid.Empty : Guid.NewGuid());

        // Act
        using var response = await client.GetAsync("/auth/me");
        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        (response.Content.Headers.ContentType?.MediaType).Should().Be("application/json");
        document.RootElement.GetProperty("message").GetString().Should().Be("User not authenticated");
        document.RootElement.GetProperty("statusCode").GetInt32().Should().Be(401);
        document.RootElement.EnumerateObject().Select(property => property.Name).Should().BeEquivalentTo(["message", "statusCode"]);
        response.Headers.Location.Should().BeNull();
        response.Headers.Contains("Set-Cookie").Should().BeFalse();
        couchDb.Requests.Should().BeEmpty();
    }

    [TestMethod]
    [DataRow(true)]
    [DataRow(false)]
    public async Task GetMe_AcrossRequests_UsesEachRequestsIdentity(bool builtInEnabled)
    {
        // Arrange
        using var couchDb = new StubCouchDbHandler();
        var firstUserId = Guid.NewGuid();
        var secondUserId = Guid.NewGuid();
        using var host = await NotableTestHostBuilder.Default
            .WithCouchDbHandler(couchDb)
            .WithUsers(new TestUser(firstUserId, "first@example.com"), new TestUser(secondUserId, "second@example.com"))
            .BuildAsync();
        host.Services.GetRequiredService<IOptions<AuthenticationOptions>>().Value.BuiltIn.Enabled = builtInEnabled;
        using var firstClient = host.CreateAuthenticatedClient(firstUserId);
        using var secondClient = host.CreateAuthenticatedClient(secondUserId);
        using var anonymousClient = host.CreateUnauthenticatedClient();

        // Act
        using var firstResponse = await firstClient.GetAsync("/auth/me");
        using var firstProfile = JsonDocument.Parse(await firstResponse.Content.ReadAsStringAsync());
        using var secondResponse = await secondClient.GetAsync("/auth/me");
        using var secondProfile = JsonDocument.Parse(await secondResponse.Content.ReadAsStringAsync());
        using var anonymousResponse = await anonymousClient.GetAsync("/auth/me");

        // Assert
        firstResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        firstProfile.RootElement.GetProperty("id").GetGuid().Should().Be(firstUserId);
        firstProfile.RootElement.GetProperty("email").GetString().Should().Be("first@example.com");
        secondResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        secondProfile.RootElement.GetProperty("id").GetGuid().Should().Be(secondUserId);
        secondProfile.RootElement.GetProperty("email").GetString().Should().Be("second@example.com");
        anonymousResponse.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        anonymousResponse.Headers.Location.Should().BeNull();
        couchDb.Requests.Should().BeEmpty();
    }

    [TestMethod]
    public async Task GetMe_WithAnotherUsersQueryParameters_ReturnsAuthenticatedUsersProfile()
    {
        // Arrange
        using var couchDb = new StubCouchDbHandler();
        var userId = Guid.NewGuid();
        var otherUserId = Guid.NewGuid();
        using var host = await NotableTestHostBuilder.Default
            .WithCouchDbHandler(couchDb)
            .WithUsers(new TestUser(userId, "current@example.com"), new TestUser(otherUserId, "other@example.com"))
            .BuildAsync();
        using var client = host.CreateAuthenticatedClient(userId);

        // Act
        using var response = await client.GetAsync($"/auth/me?id={otherUserId}&userId={otherUserId}&email=other%40example.com");
        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        document.RootElement.GetProperty("id").GetGuid().Should().Be(userId);
        document.RootElement.GetProperty("email").GetString().Should().Be("current@example.com");
        couchDb.Requests.Should().BeEmpty();
    }

    [TestMethod]
    [DataRow("POST")]
    [DataRow("PUT")]
    [DataRow("PATCH")]
    [DataRow("DELETE")]
    [DataRow("OPTIONS")]
    [DataRow("HEAD")]
    public async Task Me_WithUnsupportedHttpMethod_Returns405(string method)
    {
        // Arrange
        using var couchDb = new StubCouchDbHandler();
        var userId = Guid.NewGuid();
        using var host = await NotableTestHostBuilder.Default
            .WithCouchDbHandler(couchDb)
            .WithUsers(new TestUser(userId, "current@example.com"))
            .BuildAsync();
        using var client = host.CreateAuthenticatedClient(userId);
        using var request = new HttpRequestMessage(new HttpMethod(method), "/auth/me");

        // Act
        using var response = await client.SendAsync(request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.MethodNotAllowed);
        response.Content.Headers.Allow.Should().Equal("GET");
        response.Headers.Location.Should().BeNull();
        couchDb.Requests.Should().BeEmpty();
    }
}
