using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Logging;

using Notable.CouchDb.Services;

namespace Notable.Host.IntegrationTests.Infrastructure;

internal sealed class NotableWebApplicationFactory(
    IReadOnlyDictionary<string, string?>? settings = null) : WebApplicationFactory<Program>
{
    public StubCouchDbProxy Proxy { get; } = new();

    public HttpClient CreateApiClient(Guid? userId = null)
    {
        var client = CreateClient(new WebApplicationFactoryClientOptions
        {
            BaseAddress = new Uri("https://localhost"),
            AllowAutoRedirect = false,
            HandleCookies = false
        });

        if (userId.HasValue)
        {
            client.DefaultRequestHeaders.Add(TestAuthenticationHandler.UserIdHeader, userId.Value.ToString());
        }

        return client;
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        // Avoid the Development handler, which authenticates every request automatically.
        builder.UseEnvironment("Testing");
        // Keep test failures in the test output instead of writing to the Windows event log.
        builder.ConfigureLogging(logging => logging.ClearProviders().AddConsole());

        // Host settings are available when Program reads configuration before builder.Build().
        builder.UseSetting("Authentication:BuiltIn:Enabled", "true");
        builder.UseSetting("Authentication:BuiltIn:AllowRegistration", "false");
        builder.UseSetting("Authentication:Oidc:Enabled", "false");
        builder.UseSetting("Database:Provider", "sqlite");
        builder.UseSetting("ConnectionStrings:Default", "Data Source=:memory:");
        builder.UseSetting("CouchDb:BaseUrl", "https://couchdb.invalid");

        if (settings is not null)
        {
            foreach (var setting in settings)
            {
                builder.UseSetting(setting.Key, setting.Value);
            }
        }

        builder.ConfigureTestServices(services =>
        {
            services.AddDataProtection().UseEphemeralDataProtectionProvider();
            services.RemoveAll<ICouchDbProxy>();
            services.AddSingleton<ICouchDbProxy>(Proxy);

            // Keep the application's cookie challenge to exercise its real 401 behavior.
            services.AddAuthentication(options => options.DefaultAuthenticateScheme = TestAuthenticationHandler.SchemeName)
                .AddScheme<AuthenticationSchemeOptions, TestAuthenticationHandler>(TestAuthenticationHandler.SchemeName, _ => { });
        });
    }
}