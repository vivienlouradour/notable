using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Notable.Identity.Persistence.Migrations;

/// <inheritdoc />
public partial class AddUserDisplayName : Migration
{
    /// <inheritdoc />
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<string>(
            name: "DisplayName",
            table: "AspNetUsers",
            type: "TEXT",
            nullable: false,
            defaultValue: "");

        migrationBuilder.Sql("""
            UPDATE "AspNetUsers"
            SET "DisplayName" = COALESCE("UserName", "Email", '');
            """);
    }

    /// <inheritdoc />
    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(
            name: "DisplayName",
            table: "AspNetUsers");
    }
}
