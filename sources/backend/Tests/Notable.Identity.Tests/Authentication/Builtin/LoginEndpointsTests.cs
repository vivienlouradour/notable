using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;

using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;

using Notable.Identity.Authentication;
using Notable.Identity.Persistence;
using Notable.Identity.Users;
using Notable.Testing;
using Notable.Testing.Handlers;

namespace Notable.Identity.Tests.Authentication.Builtin;

[TestClass]
public sealed class LoginEndpointsTests
{
    private const string Email = "login@example.com";
    private const string Password = "Valid-password1!";

    [TestMethod]
    [DataRow(Email, false)]
    [DataRow(Email, true)]
    [DataRow("LOGIN@EXAMPLE.COM", false)]
    [DataRow("LOGIN@EXAMPLE.COM", true)]
    public async Task Login_WithValidCredentials_IssuesSecureSessionCookie(string email, bool allowRegistration)
    {
        // Arrange
        using var couchDb = new StubCouchDbHandler();
        var userId = Guid.NewGuid();
        using var host = await NotableTestHostBuilder.Default.WithCouchDbHandler(couchDb)
            .WithBuiltInAuthentication(true, allowRegistration)
            .WithUsers(new TestUser(userId, Email, Password)).BuildAsync();
        using var client = host.CreateUnauthenticatedClient();

        // Act
        using var response = await client.PostAsJsonAsync("/auth/builtin/login", new { email, Password });
        using var scope = host.Services.CreateScope();
        var user = await scope.ServiceProvider.GetRequiredService<IdentityDbContext>().Users.SingleAsync();

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        user.Id.Should().Be(userId);
        user.Email.Should().Be(Email);
        (await response.Content.ReadAsStringAsync()).Should().BeEmpty();
        response.Headers.Location.Should().BeNull();
        var cookie = response.Headers.GetValues("Set-Cookie").Should().ContainSingle().Subject;
        cookie.Should().StartWith("Notable.Auth=").And.Contain("secure").And.Contain("httponly").And.Contain("samesite=lax");
        cookie.Should().NotContain("expires=").And.NotContain("max-age=").And.NotContain(Email).And.NotContain(Password);
        couchDb.Requests.Should().BeEmpty();
    }

    [TestMethod]
    [DataRow(false, Email, Password)]
    [DataRow(true, Email, Password)]
    [DataRow(false, Email, "Wrong-password1!")]
    [DataRow(true, Email, "Wrong-password1!")]
    [DataRow(false, "unknown@example.com", Password)]
    [DataRow(true, "unknown@example.com", Password)]
    public async Task Login_WhenBuiltInDisabled_Returns403WithoutAuthenticatingOrChangingLockout(bool allowRegistration, string email, string password)
    {
        // Arrange
        using var couchDb = new StubCouchDbHandler();
        var userId = Guid.NewGuid();
        using var host = await NotableTestHostBuilder.Default.WithCouchDbHandler(couchDb)
            .WithBuiltInAuthentication(true, allowRegistration)
            .WithUsers(new TestUser(userId, Email, Password)).BuildAsync();
        // Startup requires an enabled provider; disable BuiltIn afterwards without configuring OIDC.
        host.Services.GetRequiredService<IOptions<AuthenticationOptions>>().Value.BuiltIn.Enabled = false;
        using (var scope = host.Services.CreateScope())
        {
            var database = scope.ServiceProvider.GetRequiredService<IdentityDbContext>();
            var user = await database.Users.SingleAsync();
            user.AccessFailedCount = 2;
            await database.SaveChangesAsync();
        }
        using var client = host.CreateUnauthenticatedClient();

        // Act
        using var response = await client.PostAsJsonAsync("/auth/builtin/login", new { email, password });
        var body = await response.Content.ReadAsStringAsync();
        using var json = JsonDocument.Parse(body);
        using var verificationScope = host.Services.CreateScope();
        var persistedUser = await verificationScope.ServiceProvider.GetRequiredService<IdentityDbContext>().Users.SingleAsync();

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        (response.Content.Headers.ContentType?.MediaType).Should().Be("application/problem+json");
        json.RootElement.GetProperty("status").GetInt32().Should().Be(403);
        json.RootElement.GetProperty("title").GetString().Should().Be("Built-in authentication is disabled.");
        body.Should().NotContain(email).And.NotContain(password);
        persistedUser.Id.Should().Be(userId);
        persistedUser.AccessFailedCount.Should().Be(2);
        persistedUser.LockoutEnd.Should().BeNull();
        response.Headers.Location.Should().BeNull();
        response.Headers.Contains("Set-Cookie").Should().BeFalse();
        couchDb.Requests.Should().BeEmpty();
    }

    [TestMethod]
    [DataRow("unknown@example.com", Password)]
    [DataRow(Email, "Wrong-password1!")]
    [DataRow(Email, "")]
    [DataRow("", Password)]
    public async Task Login_WithInvalidCredentials_ReturnsEmpty401WithoutCookie(string email, string password)
    {
        // Arrange
        using var couchDb = new StubCouchDbHandler();
        using var host = await NotableTestHostBuilder.Default.WithCouchDbHandler(couchDb)
            .WithUsers(new TestUser(Guid.NewGuid(), Email, Password)).BuildAsync();
        using var client = host.CreateUnauthenticatedClient();

        // Act
        using var response = await client.PostAsJsonAsync("/auth/builtin/login", new { email, password });

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        (await response.Content.ReadAsStringAsync()).Should().BeEmpty();
        response.Headers.Contains("Set-Cookie").Should().BeFalse();
        response.Headers.Location.Should().BeNull();
        couchDb.Requests.Should().BeEmpty();
    }

    [TestMethod]
    public async Task Login_WhenUserHasNoPassword_Returns401WithoutCookie()
    {
        // Arrange
        using var couchDb = new StubCouchDbHandler();
        using var host = await NotableTestHostBuilder.Default.WithCouchDbHandler(couchDb)
            .WithUsers(new TestUser(Guid.NewGuid(), Email)).BuildAsync();
        using var client = host.CreateUnauthenticatedClient();

        // Act
        using var response = await client.PostAsJsonAsync("/auth/builtin/login", new { Email, Password });

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        (await response.Content.ReadAsStringAsync()).Should().BeEmpty();
        response.Headers.Contains("Set-Cookie").Should().BeFalse();
        response.Headers.Location.Should().BeNull();
        couchDb.Requests.Should().BeEmpty();
    }

    [TestMethod]
    public async Task Login_AfterFiveFailures_LocksAccountAndRejectsCorrectPassword()
    {
        // Arrange
        using var couchDb = new StubCouchDbHandler();
        using var host = await NotableTestHostBuilder.Default.WithCouchDbHandler(couchDb)
            .WithUsers(new TestUser(Guid.NewGuid(), Email, Password)).BuildAsync();
        using var client = host.CreateUnauthenticatedClient();
        var failures = new List<HttpStatusCode>();

        // Act
        for (var attempt = 0; attempt < 5; attempt++)
        {
            using var failure = await client.PostAsJsonAsync("/auth/builtin/login", new { Email, password = "Wrong-password1!" });
            failures.Add(failure.StatusCode);
            failure.Headers.Contains("Set-Cookie").Should().BeFalse();
        }
        using var response = await client.PostAsJsonAsync("/auth/builtin/login", new { Email, Password });
        using var scope = host.Services.CreateScope();
        var user = await scope.ServiceProvider.GetRequiredService<IdentityDbContext>().Users.SingleAsync();
        var locked = await scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>().IsLockedOutAsync(user);

        // Assert
        failures.Should().HaveCount(5).And.OnlyContain(status => status == HttpStatusCode.Unauthorized);
        locked.Should().BeTrue();
        user.AccessFailedCount.Should().Be(0);
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        response.Headers.Contains("Set-Cookie").Should().BeFalse();
        couchDb.Requests.Should().BeEmpty();
    }

    [TestMethod]
    public async Task Login_AfterSuccessfulAttempt_ResetsFailureCounter()
    {
        // Arrange
        using var host = await NotableTestHostBuilder.Default
            .WithUsers(new TestUser(Guid.NewGuid(), Email, Password)).BuildAsync();
        using var client = host.CreateUnauthenticatedClient();
        using var failure = await client.PostAsJsonAsync("/auth/builtin/login", new { Email, password = "Wrong-password1!" });

        // Act
        using var response = await client.PostAsJsonAsync("/auth/builtin/login", new { Email, Password });
        using var scope = host.Services.CreateScope();
        var user = await scope.ServiceProvider.GetRequiredService<IdentityDbContext>().Users.SingleAsync();

        // Assert
        failure.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        user.AccessFailedCount.Should().Be(0);
    }

    [TestMethod]
    [DataRow("{}", "application/json", 400)]
    [DataRow("{", "application/json", 400)]
    [DataRow("null", "application/json", 400)]
    [DataRow("{\"email\":\"login@example.com\"}", "application/json", 400)]
    [DataRow("{}", "text/plain", 415)]
    public async Task Login_WithMalformedPayload_RejectsWithoutCookie(string payload, string contentType, int status)
    {
        // Arrange
        using var couchDb = new StubCouchDbHandler();
        using var host = NotableTestHostBuilder.Default.WithCouchDbHandler(couchDb).Build();
        using var client = host.CreateUnauthenticatedClient();
        using var content = new StringContent(payload, Encoding.UTF8, contentType);

        // Act
        using var response = await client.PostAsync("/auth/builtin/login", content);

        // Assert
        response.StatusCode.Should().Be((HttpStatusCode)status);
        response.Headers.Contains("Set-Cookie").Should().BeFalse();
        couchDb.Requests.Should().BeEmpty();
    }
}
