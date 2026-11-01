using System.Net;
using System.Text.Json;

using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;

using Notable.Identity.Authentication;
using Notable.Testing;
using Notable.Testing.Handlers;

namespace Notable.Identity.Tests.Authentication;

[TestClass]
public sealed class MethodsEndpointsTests
{
    [TestMethod]
    [DataRow(false, false, false)]
    [DataRow(false, false, true)]
    [DataRow(false, true, false)]
    [DataRow(false, true, true)]
    [DataRow(true, false, false)]
    [DataRow(true, false, true)]
    [DataRow(true, true, false)]
    [DataRow(true, true, true)]
    public async Task GetMethods_ReturnsOnlyEffectivePublicOptions(bool authenticated, bool builtInEnabled, bool allowRegistration)
    {
        // Arrange
        using var couchDb = new StubCouchDbHandler();
        var userId = Guid.NewGuid();
        using var host = await NotableTestHostBuilder.Default.WithCouchDbHandler(couchDb)
            .WithBuiltInAuthentication(true, allowRegistration)
            .WithUsers(new TestUser(userId, "methods@example.com")).BuildAsync();
        // Startup requires an enabled provider; disable BuiltIn afterwards without configuring OIDC.
        host.Services.GetRequiredService<IOptions<AuthenticationOptions>>().Value.BuiltIn.Enabled = builtInEnabled;
        using var client = authenticated ? host.CreateAuthenticatedClient(userId) : host.CreateUnauthenticatedClient();

        // Act
        using var response = await client.GetAsync("/auth/methods");
        using var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync());

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        (response.Content.Headers.ContentType?.MediaType).Should().Be("application/json");
        json.RootElement.EnumerateObject().Select(property => property.Name).Should().BeEquivalentTo(["builtInMethodResponse", "oidcMethodResponse"]);
        var builtIn = json.RootElement.GetProperty("builtInMethodResponse");
        builtIn.EnumerateObject().Select(property => property.Name).Should().BeEquivalentTo(["enabled", "allowRegistration"]);
        builtIn.GetProperty("enabled").GetBoolean().Should().Be(builtInEnabled);
        builtIn.GetProperty("allowRegistration").GetBoolean().Should().Be(builtInEnabled && allowRegistration);
        var oidc = json.RootElement.GetProperty("oidcMethodResponse");
        oidc.EnumerateObject().Select(property => property.Name).Should().BeEquivalentTo(["enabled", "displayName"]);
        oidc.GetProperty("enabled").GetBoolean().Should().BeFalse();
        oidc.GetProperty("displayName").GetString().Should().Be("OpenID Connect");
        response.Headers.Location.Should().BeNull();
        response.Headers.Contains("Set-Cookie").Should().BeFalse();
        couchDb.Requests.Should().BeEmpty();
    }
}
