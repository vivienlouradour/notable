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
public sealed class RegisterEndpointsTests
{
    private const string Password = "Valid-password1!";

    [TestMethod]
    [DataRow(false, false, false)]
    [DataRow(false, true, false)]
    [DataRow(true, false, false)]
    [DataRow(false, false, true)]
    [DataRow(false, true, true)]
    [DataRow(true, false, true)]
    public async Task Register_WhenDisabled_Returns403WithoutCreatingUser(bool builtInEnabled, bool allowRegistration, bool authenticated)
    {
        // Arrange
        using var couchDb = new StubCouchDbHandler();
        var userId = Guid.NewGuid();
        using var host = await NotableTestHostBuilder.Default.WithCouchDbHandler(couchDb)
            .WithBuiltInAuthentication(true, allowRegistration)
            .WithUsers(new TestUser(userId, "existing@example.com", Password)).BuildAsync();
        // Startup requires an enabled provider; disable BuiltIn afterwards without configuring OIDC.
        host.Services.GetRequiredService<IOptions<AuthenticationOptions>>().Value.BuiltIn.Enabled = builtInEnabled;
        using var client = authenticated ? host.CreateAuthenticatedClient(userId) : host.CreateUnauthenticatedClient();

        // Act
        using var response = await client.PostAsJsonAsync("/auth/builtin/register", new { email = "new@example.com", Password });
        var body = await response.Content.ReadAsStringAsync();
        using var json = JsonDocument.Parse(body);
        using var scope = host.Services.CreateScope();
        var users = await scope.ServiceProvider.GetRequiredService<IdentityDbContext>().Users.ToListAsync();

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        (response.Content.Headers.ContentType?.MediaType).Should().Be("application/problem+json");
        json.RootElement.GetProperty("status").GetInt32().Should().Be(403);
        json.RootElement.GetProperty("title").GetString().Should().Be(builtInEnabled
            ? "Registration is disabled." : "Built-in authentication is disabled.");
        body.Should().NotContain(Password).And.NotContain("existing@example.com").And.NotContain("new@example.com");
        users.Should().ContainSingle().Which.Id.Should().Be(userId);
        response.Headers.Location.Should().BeNull();
        response.Headers.Contains("Set-Cookie").Should().BeFalse();
        couchDb.Requests.Should().BeEmpty();
    }

    [TestMethod]
    public async Task Register_WithValidCredentials_PersistsUserAndReturnsOnlyId()
    {
        // Arrange
        using var couchDb = new StubCouchDbHandler();
        using var host = NotableTestHostBuilder.Default.WithCouchDbHandler(couchDb)
            .WithBuiltInAuthentication(true, true).Build();
        using var client = host.CreateUnauthenticatedClient();
        var before = DateTime.UtcNow;

        // Act
        using var response = await client.PostAsJsonAsync("/auth/builtin/register", new { email = "new@example.com", Password });
        using var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        using var scope = host.Services.CreateScope();
        var user = await scope.ServiceProvider.GetRequiredService<IdentityDbContext>().Users.SingleAsync();
        var passwordMatches = await scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>().CheckPasswordAsync(user, Password);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Created);
        response.Headers.Location.Should().Be(new Uri($"/auth/users/{user.Id}", UriKind.Relative));
        (response.Content.Headers.ContentType?.MediaType).Should().Be("application/json");
        json.RootElement.EnumerateObject().Select(property => property.Name).Should().Equal("id");
        json.RootElement.GetProperty("id").GetGuid().Should().Be(user.Id).And.NotBeEmpty();
        user.Email.Should().Be("new@example.com");
        user.UserName.Should().Be("new@example.com");
        user.NormalizedEmail.Should().Be("NEW@EXAMPLE.COM");
        user.CreatedAt.Should().BeOnOrAfter(before).And.BeOnOrBefore(DateTime.UtcNow);
        user.PasswordHash.Should().NotBeNullOrWhiteSpace().And.NotBe(Password);
        passwordMatches.Should().BeTrue();
        response.Headers.Contains("Set-Cookie").Should().BeFalse();
        couchDb.Requests.Should().BeEmpty();
    }

    [TestMethod]
    [DataRow("invalid-email", Password, "InvalidEmail")]
    [DataRow("user@example.com", "Aa1!", "PasswordTooShort")]
    [DataRow("user@example.com", "password1!", "PasswordRequiresUpper")]
    [DataRow("user@example.com", "PASSWORD1!", "PasswordRequiresLower")]
    [DataRow("user@example.com", "Password!!", "PasswordRequiresDigit")]
    [DataRow("user@example.com", "Password123", "PasswordRequiresNonAlphanumeric")]
    [DataRow("", Password, "InvalidEmail")]
    [DataRow("user@example.com", "", "PasswordTooShort")]
    public async Task Register_WithInvalidCredentials_ReturnsValidationProblemAndDoesNotPersist(string email, string password, string errorCode)
    {
        // Arrange
        using var couchDb = new StubCouchDbHandler();
        using var host = NotableTestHostBuilder.Default.WithCouchDbHandler(couchDb).WithBuiltInAuthentication(true, true).Build();
        using var client = host.CreateUnauthenticatedClient();

        // Act
        using var response = await client.PostAsJsonAsync("/auth/builtin/register", new { email, password });
        using var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        using var scope = host.Services.CreateScope();
        var count = await scope.ServiceProvider.GetRequiredService<IdentityDbContext>().Users.CountAsync();

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (response.Content.Headers.ContentType?.MediaType).Should().Be("application/problem+json");
        json.RootElement.GetProperty("status").GetInt32().Should().Be(400);
        json.RootElement.GetProperty("errors").GetProperty(errorCode).EnumerateArray()
            .Select(value => value.GetString()).Should().NotBeEmpty().And.OnlyContain(value => !string.IsNullOrWhiteSpace(value));
        count.Should().Be(0);
        response.Headers.Contains("Set-Cookie").Should().BeFalse();
        couchDb.Requests.Should().BeEmpty();
    }

    [TestMethod]
    public async Task Register_WhenEmailAlreadyExists_RejectsCaseInsensitiveDuplicate()
    {
        // Arrange
        using var couchDb = new StubCouchDbHandler();
        using var host = NotableTestHostBuilder.Default.WithCouchDbHandler(couchDb).WithBuiltInAuthentication(true, true).Build();
        using var client = host.CreateUnauthenticatedClient();
        using var first = await client.PostAsJsonAsync("/auth/builtin/register", new { email = "existing@example.com", Password });
        using var firstJson = JsonDocument.Parse(await first.Content.ReadAsStringAsync());

        // Act
        using var response = await client.PostAsJsonAsync("/auth/builtin/register", new { email = "EXISTING@EXAMPLE.COM", Password });
        using var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        using var scope = host.Services.CreateScope();
        var users = await scope.ServiceProvider.GetRequiredService<IdentityDbContext>().Users.ToListAsync();

        // Assert
        first.StatusCode.Should().Be(HttpStatusCode.Created);
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        json.RootElement.GetProperty("errors").EnumerateObject().Select(property => property.Name)
            .Should().Contain("DuplicateEmail").And.Contain("DuplicateUserName");
        users.Should().ContainSingle().Which.Id.Should().Be(firstJson.RootElement.GetProperty("id").GetGuid());
        response.Headers.Contains("Set-Cookie").Should().BeFalse();
        couchDb.Requests.Should().BeEmpty();
    }

    [TestMethod]
    [DataRow("{}", "application/json", 400)]
    [DataRow("{", "application/json", 400)]
    [DataRow("null", "application/json", 400)]
    [DataRow("{\"email\":\"user@example.com\"}", "application/json", 400)]
    [DataRow("{\"password\":\"Valid-password1!\"}", "application/json", 400)]
    [DataRow("{}", "text/plain", 415)]
    public async Task Register_WithInvalidPayload_RejectsWithoutCreatingUser(string payload, string contentType, int status)
    {
        // Arrange
        using var couchDb = new StubCouchDbHandler();
        using var host = NotableTestHostBuilder.Default.WithCouchDbHandler(couchDb)
            .WithBuiltInAuthentication(true, true).Build();
        using var client = host.CreateUnauthenticatedClient();
        using var content = new StringContent(payload, Encoding.UTF8, contentType);

        // Act
        using var response = await client.PostAsync("/auth/builtin/register", content);
        using var scope = host.Services.CreateScope();
        var count = await scope.ServiceProvider.GetRequiredService<IdentityDbContext>().Users.CountAsync();

        // Assert
        response.StatusCode.Should().Be((HttpStatusCode)status);
        count.Should().Be(0);
        response.Headers.Contains("Set-Cookie").Should().BeFalse();
        couchDb.Requests.Should().BeEmpty();
    }
}
