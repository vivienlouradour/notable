using Notable.Testing.Handlers;

namespace Notable.Testing;

public class NotableTestHostBuilder
{
    private TimeProvider? _timeProvider;
    private StubCouchDbHandler? _couchDbHandler;
    private readonly List<TestUser> _users = [];
    private readonly Dictionary<string, string?> _settings = new()
    {
        { "Authentication:BuiltIn:Enabled", "true" },
        { "Authentication:BuiltIn:AllowRegistration", "false" },
        { "Authentication:Oidc:Enabled", "false" },
        { "Database:Provider", "sqlite" },
        { "ConnectionStrings:Default", "Data Source=:memory:" },
        { "CouchDb:BaseUrl", "https://couchdb.invalid" }
    };

    private NotableTestHostBuilder() { }

    public static NotableTestHostBuilder Default => new NotableTestHostBuilder();

    public NotableTestHostBuilder WithTimeProvider(TimeProvider timeProvider)
    {
        _timeProvider = timeProvider;
        return this;
    }

    public NotableTestHostBuilder WithBuiltInAuthentication(bool enabled, bool allowRegistration)
    {
        _settings["Authentication:BuiltIn:Enabled"] = enabled.ToString();
        _settings["Authentication:BuiltIn:AllowRegistration"] = allowRegistration.ToString();
        return this;
    }

    public NotableTestHostBuilder WithCouchDbHandler(StubCouchDbHandler handler)
    {
        _couchDbHandler = handler;
        return this;
    }

    public NotableTestHostBuilder WithUsers(params TestUser[] users)
    {
        _users.AddRange(users);
        return this;
    }

    public async Task<NotableTestHost> BuildAsync()
    {
        var host = this.BuildHost();

        if (_users.Count > 0)
        {
            try
            {
                await host.SeedUsersAsync([.. _users]);
            }
            catch
            {
                await host.DisposeAsync();
                throw;
            }
        }

        return host;
    }

    public NotableTestHost Build()
    {
        if (_users.Count > 0)
        {
            throw new InvalidOperationException("Users can only be seeded when using BuildAsync.");
        }

        return this.BuildHost();
    }
    private NotableTestHost BuildHost() => new NotableTestHost(_settings, _timeProvider, _couchDbHandler);
}
