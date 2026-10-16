using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;

using Notable.Identity.Authentication.BuiltIn;
using Notable.Identity.Authentication.Oidc;

namespace Notable.Identity.Authentication;

internal static class AuthenticationEndpoints
{
    public static IEndpointRouteBuilder MapAuthenticationEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/auth")
            .WithTags("Auth");

        var authOptions = app.ServiceProvider.GetRequiredService<IOptions<AuthenticationOptions>>().Value;

        group.MapGet("/methods", GetAuthenticationMethods)
            .WithName("Auth_GetMethods");

        // /auth/me
        // /auth/logout

        group.MapBuiltInEndpoints();
        group.MapOidcEndpoints();

        return app;
    }

    private static AuthenticationMethodsResponse GetAuthenticationMethods(IOptions<AuthenticationOptions> options)
    {
        var authOptions = options.Value;
        return new AuthenticationMethodsResponse(
                new BuiltInMethodResponse(authOptions.BuiltIn.Enabled, authOptions.BuiltIn.AllowRegistration),
                new OidcMethodResponse(authOptions.Oidc.Enabled, authOptions.Oidc.DisplayName));
    }
}

public sealed record AuthenticationMethodsResponse(BuiltInMethodResponse BuiltInMethodResponse, OidcMethodResponse OidcMethodResponse);
public sealed record BuiltInMethodResponse(bool Enabled, bool AllowRegistration);
public sealed record OidcMethodResponse(bool Enabled, string DisplayName);
