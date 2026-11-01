using System.Net;

using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;

using Notable.Identity.Authentication;
using Notable.Testing;
using Notable.Testing.Handlers;

namespace Notable.Identity.Tests.Authentication;

[TestClass]
public sealed class LogoutEndpointsTests
{
    [TestMethod]
    public async Task Logout_WhenAnonymous_Returns401WithoutCookieOrRedirect()
    {
        // Arrange
        using var couchDb = new StubCouchDbHandler();
        using var host = NotableTestHostBuilder.Default.WithCouchDbHandler(couchDb).Build();
        using var client = host.CreateUnauthenticatedClient();

        // Act
        using var response = await client.PostAsync("/auth/logout", null);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        (await response.Content.ReadAsStringAsync()).Should().BeEmpty();
        response.Headers.Location.Should().BeNull();
        response.Headers.Contains("Set-Cookie").Should().BeFalse();
        couchDb.Requests.Should().BeEmpty();
    }

    [TestMethod]
    [DataRow(true)]
    [DataRow(false)]
    public async Task Logout_WhenAuthenticated_ExpiresApplicationCookie(bool builtInEnabled)
    {
        // Arrange
        using var couchDb = new StubCouchDbHandler();
        var userId = Guid.NewGuid();
        using var host = await NotableTestHostBuilder.Default.WithCouchDbHandler(couchDb)
            .WithUsers(new TestUser(userId, "logout@example.com")).BuildAsync();
        host.Services.GetRequiredService<IOptions<AuthenticationOptions>>().Value.BuiltIn.Enabled = builtInEnabled;
        using var client = host.CreateAuthenticatedClient(userId);

        // Act
        using var response = await client.PostAsync("/auth/logout", null);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NoContent);
        (await response.Content.ReadAsStringAsync()).Should().BeEmpty();
        response.Headers.Location.Should().BeNull();
        var cookie = response.Headers.GetValues("Set-Cookie").Should().ContainSingle().Subject;
        cookie.Should().StartWith("Notable.Auth=;").And.Contain("expires=Thu, 01 Jan 1970")
            .And.Contain("secure").And.Contain("httponly").And.Contain("samesite=lax");
        couchDb.Requests.Should().BeEmpty();
    }
}
