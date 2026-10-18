using System.Net;
using System.Text.Json;

using Microsoft.Extensions.Options;

using Notable.Host.IntegrationTests.Infrastructure;

namespace Notable.Host.IntegrationTests.Authentication;

[TestClass]
public sealed class AuthenticationEndpointsTests
{
    public TestContext TestContext { get; set; } = null!;

    [TestMethod]
    [DataRow(true, false, false)]
    [DataRow(true, false, true)]
    [DataRow(false, true, false)]
    [DataRow(true, true, true)]
    public async Task GetMethods_WhenAnonymous_ReturnsConfiguredPublicOptions(bool builtInEnabled, bool oidcEnabled, bool allowRegistration)
    {
        // Arrange
        var settings = CreateOidcSettings();
        settings["Authentication:BuiltIn:Enabled"] = builtInEnabled.ToString();
        settings["Authentication:BuiltIn:AllowRegistration"] = allowRegistration.ToString();
        settings["Authentication:Oidc:Enabled"] = oidcEnabled.ToString();
        using var factory = new NotableWebApplicationFactory(settings);
        using var client = factory.CreateApiClient();

        // Act
        using var response = await client.GetAsync("/auth/methods", TestContext.CancellationToken);
        var json = await response.Content.ReadAsStringAsync(TestContext.CancellationToken);
        using var document = JsonDocument.Parse(json);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        (response.Content.Headers.ContentType?.MediaType).Should().Be("application/json");
        var builtIn = document.RootElement.GetProperty("builtInMethodResponse");
        var oidc = document.RootElement.GetProperty("oidcMethodResponse");
        builtIn.GetProperty("enabled").GetBoolean().Should().Be(builtInEnabled);
        builtIn.GetProperty("allowRegistration").GetBoolean().Should().Be(allowRegistration);
        oidc.GetProperty("enabled").GetBoolean().Should().Be(oidcEnabled);
        oidc.GetProperty("displayName").GetString().Should().Be("Test identity provider");

        // Lock the public contract down so private OIDC configuration cannot leak into this response.
        document.RootElement.EnumerateObject().Select(property => property.Name).ToArray().Should().BeEquivalentTo(new[] { "builtInMethodResponse", "oidcMethodResponse" });
        builtIn.EnumerateObject().Select(property => property.Name).ToArray().Should().BeEquivalentTo(new[] { "enabled", "allowRegistration" });
        oidc.EnumerateObject().Select(property => property.Name).ToArray().Should().BeEquivalentTo(new[] { "enabled", "displayName" });
        factory.Proxy.CallCount.Should().Be(0);
    }

    [TestMethod]
    public void Start_WhenAllAuthenticationMethodsAreDisabled_FailsValidation()
    {
        // Arrange
        using var factory = new NotableWebApplicationFactory(new Dictionary<string, string?>
        {
            ["Authentication:BuiltIn:Enabled"] = "false",
            ["Authentication:Oidc:Enabled"] = "false"
        });

        // Act
        Action act = () =>
        {
            using var client = factory.CreateApiClient();
        };

        // Assert
        var exception = act.Should().ThrowExactly<OptionsValidationException>().Which;

        exception.Failures.ToArray().Should().Contain("At least one authentication method must be enabled (BuiltIn or OIDC).");
    }

    [TestMethod]
    [DataRow("Authority")]
    [DataRow("ClientId")]
    [DataRow("ClientSecret")]
    public void Start_WhenEnabledOidcIsIncomplete_FailsValidation(string missingSetting)
    {
        // Arrange
        var settings = CreateOidcSettings();
        settings[$"Authentication:Oidc:{missingSetting}"] = " ";
        using var factory = new NotableWebApplicationFactory(settings);

        // Act
        Action act = () =>
        {
            using var client = factory.CreateApiClient();
        };

        // Assert
        var exception = act.Should().ThrowExactly<OptionsValidationException>().Which;

        exception.Failures.ToArray().Should().Contain("OIDC requires Authority, ClientId and ClientSecret.");
    }

    private static Dictionary<string, string?> CreateOidcSettings()
    {
        return new Dictionary<string, string?>
        {
            ["Authentication:Oidc:Enabled"] = "true",
            ["Authentication:Oidc:Authority"] = "https://identity.invalid",
            ["Authentication:Oidc:ClientId"] = "integration-tests",
            ["Authentication:Oidc:ClientSecret"] = Guid.NewGuid().ToString(),
            ["Authentication:Oidc:DisplayName"] = "Test identity provider"
        };
    }
}