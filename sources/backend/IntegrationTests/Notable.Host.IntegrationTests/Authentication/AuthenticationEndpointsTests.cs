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
        var settings = CreateOidcSettings();
        settings["Authentication:BuiltIn:Enabled"] = builtInEnabled.ToString();
        settings["Authentication:BuiltIn:AllowRegistration"] = allowRegistration.ToString();
        settings["Authentication:Oidc:Enabled"] = oidcEnabled.ToString();
        using var factory = new NotableWebApplicationFactory(settings);
        using var client = factory.CreateApiClient();

        using var response = await client.GetAsync("/auth/methods", TestContext.CancellationToken);
        var json = await response.Content.ReadAsStringAsync(TestContext.CancellationToken);
        using var document = JsonDocument.Parse(json);

        Assert.AreEqual(HttpStatusCode.OK, response.StatusCode);
        Assert.AreEqual("application/json", response.Content.Headers.ContentType?.MediaType);
        var builtIn = document.RootElement.GetProperty("builtInMethodResponse");
        var oidc = document.RootElement.GetProperty("oidcMethodResponse");
        Assert.AreEqual(builtInEnabled, builtIn.GetProperty("enabled").GetBoolean());
        Assert.AreEqual(allowRegistration, builtIn.GetProperty("allowRegistration").GetBoolean());
        Assert.AreEqual(oidcEnabled, oidc.GetProperty("enabled").GetBoolean());
        Assert.AreEqual("Test identity provider", oidc.GetProperty("displayName").GetString());

        // Lock the public contract down so private OIDC configuration cannot leak into this response.
        CollectionAssert.AreEquivalent(new[] { "builtInMethodResponse", "oidcMethodResponse" },
            document.RootElement.EnumerateObject().Select(property => property.Name).ToArray());
        CollectionAssert.AreEquivalent(new[] { "enabled", "allowRegistration" },
            builtIn.EnumerateObject().Select(property => property.Name).ToArray());
        CollectionAssert.AreEquivalent(new[] { "enabled", "displayName" },
            oidc.EnumerateObject().Select(property => property.Name).ToArray());
        Assert.AreEqual(0, factory.Proxy.CallCount);
    }

    [TestMethod]
    public void Start_WhenAllAuthenticationMethodsAreDisabled_FailsValidation()
    {
        using var factory = new NotableWebApplicationFactory(new Dictionary<string, string?>
        {
            ["Authentication:BuiltIn:Enabled"] = "false",
            ["Authentication:Oidc:Enabled"] = "false"
        });

        var exception = Assert.ThrowsExactly<OptionsValidationException>(() =>
        {
            using var client = factory.CreateApiClient();
        });

        CollectionAssert.Contains(exception.Failures.ToArray(),
            "At least one authentication method must be enabled (BuiltIn or OIDC).");
    }

    [TestMethod]
    [DataRow("Authority")]
    [DataRow("ClientId")]
    [DataRow("ClientSecret")]
    public void Start_WhenEnabledOidcIsIncomplete_FailsValidation(string missingSetting)
    {
        var settings = CreateOidcSettings();
        settings[$"Authentication:Oidc:{missingSetting}"] = " ";
        using var factory = new NotableWebApplicationFactory(settings);

        var exception = Assert.ThrowsExactly<OptionsValidationException>(() =>
        {
            using var client = factory.CreateApiClient();
        });

        CollectionAssert.Contains(exception.Failures.ToArray(), "OIDC requires Authority, ClientId and ClientSecret.");
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