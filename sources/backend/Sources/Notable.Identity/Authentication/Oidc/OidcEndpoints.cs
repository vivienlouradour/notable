using Microsoft.AspNetCore.Routing;

namespace Notable.Identity.Authentication.Oidc;

internal static class OidcEndpoints
{
    public static IEndpointRouteBuilder MapOidcEndpoints(this IEndpointRouteBuilder app, AuthenticationOptions authOptions)
    {
        if (!authOptions.Oidc.Enabled)
        {
            return app;
        }

        // Map OIDC authentication endpoints
        return app;
    }

}
