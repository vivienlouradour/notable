using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace Notable.Persistence;

public static class DatabaseConfiguration
{
    private const string SqlLiteProvider = "sqlite";

    public static void ConfigureDatabase(this DbContextOptionsBuilder options, IConfiguration configuration, string module)
    {
        var provider = configuration["Database:Provider"]?.ToLower() ?? SqlLiteProvider;
        var connectionString = configuration.GetConnectionString("Default");
        switch (provider)
        {
            case SqlLiteProvider:
                options.UseSqlite(connectionString, sqlite => sqlite.MigrationsHistoryTable($"__{module}MigrationsHistory"));
                break;

            default:
                throw new InvalidOperationException($"Unsupported database provider: {provider}");
        }
    }
}
