using System.Security.Claims;

using Microsoft.AspNetCore.Http;

using Notable.Identity.Common;
using Notable.Identity.Users;

namespace Notable.Identity.UnitTests.Users;

[TestClass]
public sealed class CurrentUserTests
{
    [TestMethod]
    [DataRow("D")]
    [DataRow("N")]
    [DataRow("B")]
    public void Id_WithValidNotableClaim_ReturnsIdentifierThroughCommonInterface(string format)
    {
        // Arrange
        var expected = Guid.NewGuid();
        var accessor = new HttpContextAccessor { HttpContext = CreateContext(expected.ToString(format)) };
        ICurrentUser user = new CurrentUser(accessor);

        // Act
        var actualId = user.Id;

        // Assert
        actualId.Should().Be(expected);
    }

    [TestMethod]
    public void Id_WithoutHttpContext_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        ICurrentUser user = new CurrentUser(new HttpContextAccessor());

        // Act
        Func<object?> act = () => user.Id;

        // Assert
        act.Should().ThrowExactly<UnauthorizedAccessException>();
    }

    [TestMethod]
    public void Id_WithoutNotableClaim_DoesNotUseUnrelatedUserIdentifier()
    {
        // Arrange
        var context = new DefaultHttpContext
        {
            User = new ClaimsPrincipal(new ClaimsIdentity(
                [new Claim(ClaimTypes.NameIdentifier, Guid.NewGuid().ToString())], "Test"))
        };
        ICurrentUser user = new CurrentUser(new HttpContextAccessor { HttpContext = context });

        // Act
        Func<object?> act = () => user.Id;

        // Assert
        act.Should().ThrowExactly<UnauthorizedAccessException>();
    }

    [TestMethod]
    [DataRow("")]
    [DataRow(" ")]
    [DataRow("invalid-guid")]
    public void Id_WithMalformedNotableClaim_ThrowsUnauthorizedAccessException(string value)
    {
        // Arrange
        ICurrentUser user = new CurrentUser(new HttpContextAccessor { HttpContext = CreateContext(value) });

        // Act
        Func<object?> act = () => user.Id;

        // Assert
        act.Should().ThrowExactly<UnauthorizedAccessException>();
    }

    [TestMethod]
    public void Id_WhenRequestContextChanges_UsesCurrentIdentity()
    {
        // Arrange
        var firstId = Guid.NewGuid();
        var secondId = Guid.NewGuid();
        var accessor = new HttpContextAccessor { HttpContext = CreateContext(firstId.ToString()) };
        ICurrentUser user = new CurrentUser(accessor);

        // Act
        var firstUserId = user.Id;
        accessor.HttpContext = CreateContext(secondId.ToString());
        var secondUserId = user.Id;

        // Assert
        firstUserId.Should().Be(firstId);
        secondUserId.Should().Be(secondId);
    }

    private static DefaultHttpContext CreateContext(string userId)
    {
        return new DefaultHttpContext
        {
            User = new ClaimsPrincipal(new ClaimsIdentity([new Claim(NotableClaimTypes.UserId, userId)], "Test"))
        };
    }
}