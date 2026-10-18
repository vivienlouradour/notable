using Notable.CouchDb.Helpers;
using Notable.CouchDb.UnitTests.Infrastructure;

namespace Notable.CouchDb.UnitTests.Helpers;

[TestClass]
public sealed class CouchDbHelperTests
{
    [TestMethod]
    [DataRow("https://couchdb.invalid")]
    [DataRow("https://proxy.invalid/couchdb")]
    public void GetUserDbUrl_UsesConfiguredBaseUrlAndNotableUserIdentifier(string baseUrl)
    {
        // Arrange
        var id = Guid.NewGuid();

        // Act
        var result = CouchDbHelper.GetUserDbUrl(baseUrl, new FixedCurrentUser(id));

        // Assert
        result.Should().Be($"{baseUrl}/db_user_{id:D}");
    }

    [TestMethod]
    public void GetUserDbUrl_ForDifferentUsers_ReturnsSeparateDatabases()
    {
        // Arrange
        var firstUser = new FixedCurrentUser(Guid.NewGuid());
        var secondUser = new FixedCurrentUser(Guid.NewGuid());

        // Act
        var first = CouchDbHelper.GetUserDbUrl("https://couchdb.invalid", firstUser);
        var second = CouchDbHelper.GetUserDbUrl("https://couchdb.invalid", secondUser);

        // Assert
        second.Should().NotBe(first);
    }
}