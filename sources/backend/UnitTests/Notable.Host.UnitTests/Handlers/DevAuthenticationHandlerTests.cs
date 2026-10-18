using System.Security.Claims;
using System.Text.Encodings.Web;

using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

using Notable.Host.Handlers;
using Notable.Identity;

namespace Notable.Host.UnitTests.Handlers;

[TestClass]
public sealed class DevAuthenticationHandlerTests
{
    [TestMethod]
    public async Task AuthenticateAsync_ProvidesDevelopmentIdentityWithStableNotableUserId()
    {
        // Arrange
        var services = new ServiceCollection();
        services.AddOptions();
        using var provider = services.BuildServiceProvider();
        var options = provider.GetRequiredService<IOptionsMonitor<AuthenticationSchemeOptions>>();
        var handler = new DevAuthenticationHandler(options, NullLoggerFactory.Instance, UrlEncoder.Default);
        var scheme = new AuthenticationScheme("Development", null, typeof(DevAuthenticationHandler));
        await handler.InitializeAsync(scheme, new DefaultHttpContext { RequestServices = provider });

        // Act
        var result = await handler.AuthenticateAsync();

        // Assert
        result.Succeeded.Should().BeTrue();
        result.Principal.Should().NotBeNull();
        result.Ticket.Should().NotBeNull();
        (result.Principal!.Identity?.IsAuthenticated).Should().BeTrue();
        result.Ticket!.AuthenticationScheme.Should().Be("Development");
        result.Principal.FindFirstValue(NotableClaimTypes.UserId).Should().Be("11111111-1111-1111-1111-111111111111");
        result.Principal.FindFirstValue(ClaimTypes.Name).Should().Be("Development User");
    }
}