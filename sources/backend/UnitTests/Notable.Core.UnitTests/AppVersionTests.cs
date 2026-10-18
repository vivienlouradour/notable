using System.Reflection;

namespace Notable.Core.UnitTests;

[TestClass]
public sealed class AppVersionTests
{
    [TestMethod]
    public void FullVersion_ReportsInformationalVersionOfCoreAssembly()
    {
        // Arrange
        var expected = typeof(AppVersion).Assembly.GetCustomAttribute<AssemblyInformationalVersionAttribute>();

        // Act
        var fullVersion = AppVersion.FullVersion;

        // Assert
        expected.Should().NotBeNull();
        fullVersion.Should().Be(expected!.InformationalVersion);
    }

    [TestMethod]
    public void Version_ExcludesBuildMetadataAndRemainsPartOfFullVersion()
    {
        // Arrange
        const string buildMetadataSeparator = "+";

        // Act
        var version = AppVersion.Version;
        var fullVersion = AppVersion.FullVersion;

        // Assert
        string.IsNullOrWhiteSpace(version).Should().BeFalse();
        version.Should().NotContain(buildMetadataSeparator);
        (fullVersion == version
            || fullVersion.StartsWith(version + buildMetadataSeparator, StringComparison.Ordinal)).Should().BeTrue();
    }

    [TestMethod]
    public void AssemblyVersion_ReportsVersionOfCoreAssembly()
    {
        // Arrange
        var expected = typeof(AppVersion).Assembly.GetName().Version?.ToString();

        // Act
        var assemblyVersion = AppVersion.AssemblyVersion;

        // Assert
        assemblyVersion.Should().Be(expected);
    }
}