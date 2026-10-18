using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.Configuration;

namespace Notable.Persistence.UnitTests;

[TestClass]
public sealed class DatabaseConfigurationTests
{
    [TestMethod]
    [DataRow(null)]
    [DataRow("sqlite")]
    [DataRow("SQLITE")]
    [DataRow("Sqlite")]
    public void ConfigureDatabase_ForSupportedOrDefaultProvider_UsesConfiguredSqliteConnection(string? provider)
    {
        // Arrange
        var configuration = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["Database:Provider"] = provider,
            ["ConnectionStrings:Default"] = "Data Source=:memory:"
        }).Build();
        var options = new DbContextOptionsBuilder();

        // Act
        options.ConfigureDatabase(configuration, "Identity");

        using var context = new DbContext(options.Options);
        var relationalOptions = options.Options.Extensions.OfType<RelationalOptionsExtension>().Single();
        // Assert
        context.Database.ProviderName.Should().Be("Microsoft.EntityFrameworkCore.Sqlite");
        relationalOptions.ConnectionString.Should().Be("Data Source=:memory:");
        relationalOptions.MigrationsHistoryTableName.Should().Be("__IdentityMigrationsHistory");
    }

    [TestMethod]
    [DataRow("Identity", "__IdentityMigrationsHistory")]
    [DataRow("OtherModule", "__OtherModuleMigrationsHistory")]
    public void ConfigureDatabase_IsolatesMigrationHistoryByModule(string module, string expectedTable)
    {
        // Arrange
        var options = new DbContextOptionsBuilder();
        var configuration = new ConfigurationBuilder().Build();

        // Act
        options.ConfigureDatabase(configuration, module);

        var relationalOptions = options.Options.Extensions.OfType<RelationalOptionsExtension>().Single();
        // Assert
        relationalOptions.MigrationsHistoryTableName.Should().Be(expectedTable);
    }

    [TestMethod]
    [DataRow("postgresql")]
    [DataRow("sqlserver")]
    [DataRow("")]
    public void ConfigureDatabase_ForUnsupportedProvider_FailsBeforeDatabaseAccess(string provider)
    {
        // Arrange
        var options = new DbContextOptionsBuilder();
        var configuration = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["Database:Provider"] = provider
        }).Build();

        // Act
        Action act = () => options.ConfigureDatabase(configuration, "Identity");

        // Assert
        var exception = act.Should().ThrowExactly<InvalidOperationException>().Which;

        exception.Message.Should().Be($"Unsupported database provider: {provider}");
        options.Options.Extensions.Any(extension => extension.Info.IsDatabaseProvider).Should().BeFalse();
    }
}