using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Logging;

using Notable.CouchDb.Helpers;
using Notable.Host;
using Notable.Identity.Persistence;
using Notable.Identity.Users;
using Notable.Testing.Handlers;

namespace Notable.Testing;

public class NotableTestHost : WebApplicationFactory<Program>
{
    private readonly IReadOnlyDictionary<string, string?> _settings;
    private readonly TimeProvider? _timeProvider;
    private readonly SqliteConnection _identityConnection = new("Data Source=:memory:");
    private readonly StubCouchDbHandler? _couchDbHandler;

    internal NotableTestHost(IReadOnlyDictionary<string, string?> settings, TimeProvider? timeProvider, StubCouchDbHandler? couchDbHandler)
    {
        _settings = settings;
        _timeProvider = timeProvider;
        _couchDbHandler = couchDbHandler;
    }

    public HttpClient CreateAuthenticatedClient(Guid userId) => this.CreateClient(userId.ToString());

    public HttpClient CreateUnauthenticatedClient() => this.CreateClient();

    internal async Task SeedUsersAsync(TestUser[] users)
    {
        await using var scope = this.Services.CreateAsyncScope();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();

        foreach (var user in users)
        {
            var appUser = new ApplicationUser
            {
                Id = user.Id,
                Email = user.Email,
                UserName = user.Email,
            };

            var result = string.IsNullOrWhiteSpace(user.Password)
                ? await userManager.CreateAsync(appUser)
                : await userManager.CreateAsync(appUser, user.Password);

            if (!result.Succeeded)
            {
                throw new InvalidOperationException($"Test user {user.Id} could not be seeded: {string.Join(", ", result.Errors.Select(error => error.Code))}");
            }
        }
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");

        // Keep test failures in the test output instead of writing to the Windows event log.
        builder.ConfigureLogging(logging => logging.ClearProviders().AddConsole());

        // Host settings are available when Program reads configuration before builder.Build().
        foreach (var settings in _settings)
        {
            builder.UseSetting(settings.Key, settings.Value);
        }

        builder.ConfigureTestServices(services =>
        {
            services.AddEndpointsApiExplorer();
            services.AddDataProtection().UseEphemeralDataProtectionProvider();

            // Open the SQLite connection and register the IdentityDbContext with it. This ensures that the in-memory database persists for the lifetime of the test host
            _identityConnection.Open();
            services.AddDbContext<IdentityDbContext>(options => options.UseSqlite(_identityConnection));

            services.AddAuthentication(options => options.DefaultAuthenticateScheme = TestAuthenticationHandler.SchemeName)
                .AddScheme<AuthenticationSchemeOptions, TestAuthenticationHandler>(TestAuthenticationHandler.SchemeName, _ => { });

            if (_timeProvider is not null)
            {
                services.RemoveAll<TimeProvider>();
                services.AddSingleton(_timeProvider);
            }

            if (_couchDbHandler is not null)
            {
                services.AddHttpClient(CouchDbHttpClientNames.Proxy).ConfigurePrimaryHttpMessageHandler(() => _couchDbHandler);
            }
        });
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);
        if (disposing)
        {
            _identityConnection?.Dispose();
        }
    }

    private HttpClient CreateClient(string? userId = null)
    {
        var client = this.CreateClient(new WebApplicationFactoryClientOptions
        {
            BaseAddress = new Uri("https://localhost"),
            AllowAutoRedirect = false,
            HandleCookies = false
        });

        if (userId is not null)
        {
            client.DefaultRequestHeaders.Add(TestAuthenticationHandler.UserIdHeader, userId);
        }

        return client;
    }
}
