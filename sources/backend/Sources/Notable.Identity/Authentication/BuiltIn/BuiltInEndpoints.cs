using Microsoft.AspNetCore.Routing;

namespace Notable.Identity.Authentication.BuiltIn;

internal static class BuiltInEndpoints
{
    public static IEndpointRouteBuilder MapBuiltInEndpoints(this IEndpointRouteBuilder app, AuthenticationOptions authOptions)
    {
        if (!authOptions.BuiltIn.Enabled)
        {
            return app;
        }

        // Map built-in authentication endpoints
        return app;
    }
}
