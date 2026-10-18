using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.OpenIdConnect;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;

using Notable.Identity.Common;
using Notable.Identity.Users;

using NotableAuthenticationOptions = Notable.Identity.Authentication.AuthenticationOptions;

namespace Notable.Identity.UnitTests.Authentication;

[TestClass]
public sealed class AuthenticationConfigurationTests
{
    [TestMethod]
    public void AddIdentityServices_WithoutConfiguration_EnablesBuiltInWithoutRegistration()
    {
        // Arrange
        using var provider = CreateProvider();

        // Act
        var options = provider.GetRequiredService<IOptions<NotableAuthenticationOptions>>().Value;

        // Assert
        options.BuiltIn.Enabled.Should().BeTrue();
        options.BuiltIn.AllowRegistration.Should().BeFalse();
        options.Oidc.Enabled.Should().BeFalse();
        provider.GetRequiredService<ICurrentUser>().Should().BeAssignableTo<CurrentUser>();
    }

    [TestMethod]
    [DataRow(true, false)]
    [DataRow(false, true)]
    [DataRow(true, true)]
    public async Task AddIdentityServices_WithValidMethods_RegistersOnlyEnabledOidcScheme(bool builtInEnabled, bool oidcEnabled)
    {
        // Arrange
        var settings = CreateOidcSettings();
        settings["Authentication:BuiltIn:Enabled"] = builtInEnabled.ToString();
        settings["Authentication:BuiltIn:AllowRegistration"] = "true";
        settings["Authentication:Oidc:Enabled"] = oidcEnabled.ToString();
        using var provider = CreateProvider(settings);

        // Act
        var options = provider.GetRequiredService<IOptions<NotableAuthenticationOptions>>().Value;
        var schemes = await provider.GetRequiredService<IAuthenticationSchemeProvider>().GetAllSchemesAsync();

        // Assert
        options.BuiltIn.Enabled.Should().Be(builtInEnabled);
        options.BuiltIn.AllowRegistration.Should().BeTrue();
        options.Oidc.Enabled.Should().Be(oidcEnabled);
        (schemes.Any(scheme => scheme.Name == "NotableOidc")).Should().Be(oidcEnabled);
        (schemes.Any(scheme => scheme.Name == IdentityConstants.ApplicationScheme)).Should().BeTrue();
    }

    [TestMethod]
    public void AddIdentityServices_WithNoEnabledMethod_RejectsOptions()
    {
        // Arrange
        using var provider = CreateProvider(new Dictionary<string, string?>
        {
            ["Authentication:BuiltIn:Enabled"] = "false",
            ["Authentication:Oidc:Enabled"] = "false"
        });

        // Act
        Func<object?> act = () =>
            provider.GetRequiredService<IOptions<NotableAuthenticationOptions>>().Value;

        // Assert
        var exception = act.Should().ThrowExactly<OptionsValidationException>().Which;

        exception.Failures.ToArray().Should().Contain("At least one authentication method must be enabled (BuiltIn or OIDC).");
    }

    [TestMethod]
    [DataRow("Authority", null)]
    [DataRow("Authority", "")]
    [DataRow("Authority", " ")]
    [DataRow("ClientId", null)]
    [DataRow("ClientId", "")]
    [DataRow("ClientId", " ")]
    [DataRow("ClientSecret", null)]
    [DataRow("ClientSecret", "")]
    [DataRow("ClientSecret", " ")]
    public void AddIdentityServices_WithIncompleteEnabledOidc_RejectsOptions(string setting, string? value)
    {
        // Arrange
        var settings = CreateOidcSettings();
        settings[$"Authentication:Oidc:{setting}"] = value;
        using var provider = CreateProvider(settings);

        // Act
        Func<object?> act = () =>
            provider.GetRequiredService<IOptions<NotableAuthenticationOptions>>().Value;

        // Assert
        var exception = act.Should().ThrowExactly<OptionsValidationException>().Which;

        exception.Failures.ToArray().Should().Contain("OIDC requires Authority, ClientId and ClientSecret.");
    }

    [TestMethod]
    public void AddIdentityServices_WithOidcDisabled_DoesNotRequireOidcCredentials()
    {
        // Arrange
        using var provider = CreateProvider(new Dictionary<string, string?>
        {
            ["Authentication:Oidc:Enabled"] = "false",
            ["Authentication:Oidc:Authority"] = "",
            ["Authentication:Oidc:ClientId"] = "",
            ["Authentication:Oidc:ClientSecret"] = ""
        });

        // Act
        var options = provider.GetRequiredService<IOptions<NotableAuthenticationOptions>>().Value;

        // Assert
        options.Oidc.Enabled.Should().BeFalse();
    }

    [TestMethod]
    public void AddIdentityServices_ConfiguresSecureApplicationCookieAndDefaultScheme()
    {
        // Arrange
        using var provider = CreateProvider();

        // Act
        var options = provider.GetRequiredService<IOptionsMonitor<CookieAuthenticationOptions>>().Get(IdentityConstants.ApplicationScheme);
        var authentication = provider.GetRequiredService<IOptions<AuthenticationOptions>>().Value;

        // Assert
        options.Cookie.Name.Should().Be("Notable.Auth");
        options.Cookie.HttpOnly.Should().BeTrue();
        options.Cookie.SecurePolicy.Should().Be(CookieSecurePolicy.Always);
        options.Cookie.SameSite.Should().Be(SameSiteMode.Lax);
        authentication.DefaultScheme.Should().Be(IdentityConstants.ApplicationScheme);
        authentication.DefaultChallengeScheme.Should().Be(IdentityConstants.ApplicationScheme);
    }

    [TestMethod]
    [DataRow(401)]
    [DataRow(403)]
    public async Task ApplicationCookie_WhenAccessIsRejected_ReturnsStatusInsteadOfRedirect(int statusCode)
    {
        // Arrange
        using var provider = CreateProvider();
        var options = provider.GetRequiredService<IOptionsMonitor<CookieAuthenticationOptions>>().Get(IdentityConstants.ApplicationScheme);
        var context = new DefaultHttpContext { RequestServices = provider };
        var scheme = new AuthenticationScheme(IdentityConstants.ApplicationScheme, null, typeof(CookieAuthenticationHandler));
        var redirect = new RedirectContext<CookieAuthenticationOptions>(context, scheme, options,
            new AuthenticationProperties(), "https://localhost/login");

        // Act
        if (statusCode == 401)
        {
            await options.Events.RedirectToLogin(redirect);
        }
        else
        {
            await options.Events.RedirectToAccessDenied(redirect);
        }

        // Assert
        context.Response.StatusCode.Should().Be(statusCode);
        context.Response.Headers.ContainsKey("Location").Should().BeFalse();
    }

    [TestMethod]
    public void AddIdentityServices_WithOidc_ConfiguresCodeFlowWithPkceAndNoTokenStorage()
    {
        // Arrange
        var settings = CreateOidcSettings();
        using var provider = CreateProvider(settings);

        // Act
        var options = provider.GetRequiredService<IOptionsMonitor<OpenIdConnectOptions>>().Get("NotableOidc");

        // Assert
        options.Authority.Should().Be("https://identity.invalid");
        options.ClientId.Should().Be("unit-tests");
        options.ClientSecret.Should().Be(settings["Authentication:Oidc:ClientSecret"]);
        options.ResponseType.Should().Be("code");
        options.UsePkce.Should().BeTrue();
        options.SaveTokens.Should().BeFalse();
        options.SignInScheme.Should().Be(IdentityConstants.ApplicationScheme);
    }

    private static ServiceProvider CreateProvider(Dictionary<string, string?>? settings = null)
    {
        var configuration = new ConfigurationBuilder().AddInMemoryCollection(settings ?? []).Build();
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddDataProtection().UseEphemeralDataProtectionProvider();
        services.AddIdentityServices(configuration);
        return services.BuildServiceProvider();
    }

    private static Dictionary<string, string?> CreateOidcSettings()
    {
        return new Dictionary<string, string?>
        {
            ["Authentication:Oidc:Enabled"] = "true",
            ["Authentication:Oidc:Authority"] = "https://identity.invalid",
            ["Authentication:Oidc:ClientId"] = "unit-tests",
            ["Authentication:Oidc:ClientSecret"] = Guid.NewGuid().ToString()
        };
    }
}