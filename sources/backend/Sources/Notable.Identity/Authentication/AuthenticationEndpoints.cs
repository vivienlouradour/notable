using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.Options;

using Notable.Identity.Authentication.BuiltIn;
using Notable.Identity.Authentication.Oidc;
using Notable.Identity.Users;

namespace Notable.Identity.Authentication;

internal static class AuthenticationEndpoints
{
    public static IEndpointRouteBuilder MapAuthenticationEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/auth")
            .WithTags("Auth");

        group.MapGet("/methods", GetAuthenticationMethods)
            .AllowAnonymous()
            .WithName("Auth_GetMethods");

        group.MapGet("/me", GetCurrentUserAsync)
            .RequireAuthorization()
            .WithName("Auth_Me");

        group.MapPost("/logout", LogoutAsync)
            .RequireAuthorization()
            .WithName("Auth_Logout");

        group.MapBuiltInEndpoints();
        group.MapOidcEndpoints();

        return app;
    }

    private static AuthenticationMethodsResponse GetAuthenticationMethods(IOptions<AuthenticationOptions> options)
    {
        var authOptions = options.Value;
        return new AuthenticationMethodsResponse(
                new BuiltInMethodResponse(authOptions.BuiltIn.Enabled, authOptions.BuiltIn.Enabled && authOptions.BuiltIn.AllowRegistration),
                new OidcMethodResponse(authOptions.Oidc.Enabled, authOptions.Oidc.DisplayName));
    }

    private static async Task<ApplicationUserDto> GetCurrentUserAsync(UserService userService)
    {
        return await userService.GetCurrentUserAsync();
    }

    private static async Task<IResult> LogoutAsync(SignInManager<ApplicationUser> signInManager)
    {
        await signInManager.SignOutAsync();

        return TypedResults.NoContent();
    }
}

public sealed record AuthenticationMethodsResponse(BuiltInMethodResponse BuiltInMethodResponse, OidcMethodResponse OidcMethodResponse);
public sealed record BuiltInMethodResponse(bool Enabled, bool AllowRegistration);
public sealed record OidcMethodResponse(bool Enabled, string DisplayName);
