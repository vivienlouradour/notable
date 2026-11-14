using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

using Notable.Identity.Persistence;

namespace Notable.Identity.Tests.User;

[TestClass]
public sealed class IdentityMigrationTests
{
    [TestMethod]
    [DataRow("Existing User", "existing@example.com", "Existing User")]
    [DataRow(null, "existing@example.com", "existing@example.com")]
    [DataRow(null, null, "")]
    public async Task Migrate_ExistingUser_PreservesAccountAndInitializesDisplayName(string? userName, string? email, string displayName)
    {
        // Arrange
        await using var connection = new SqliteConnection("Data Source=:memory:");
        await connection.OpenAsync();
        var options = new DbContextOptionsBuilder<IdentityDbContext>().UseSqlite(connection).Options;
        await using var database = new IdentityDbContext(options);
        await database.GetService<IMigrator>().MigrateAsync("20261015223044_InitialIdentity");
        var userId = Guid.NewGuid();
        var createdAt = new DateTime(2026, 10, 15, 12, 0, 0, DateTimeKind.Utc);
        await database.Database.ExecuteSqlInterpolatedAsync($"""
            INSERT INTO "AspNetUsers"
                ("Id", "UserName", "Email", "CreatedAt", "EmailConfirmed", "PhoneNumberConfirmed",
                 "TwoFactorEnabled", "LockoutEnabled", "AccessFailedCount")
            VALUES ({userId}, {userName}, {email}, {createdAt}, 0, 0, 0, 0, 0);
            """);

        // Act
        await database.Database.MigrateAsync();
        var user = await database.Users.SingleAsync();

        // Assert
        user.Id.Should().Be(userId);
        user.UserName.Should().Be(userName);
        user.Email.Should().Be(email);
        user.CreatedAt.Should().Be(createdAt);
        user.DisplayName.Should().Be(displayName);
        database.Database.HasPendingModelChanges().Should().BeFalse();
        (await database.Database.GetPendingMigrationsAsync()).Should().BeEmpty();
    }
}
