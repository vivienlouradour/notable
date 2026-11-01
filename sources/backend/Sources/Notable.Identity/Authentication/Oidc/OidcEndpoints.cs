using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Routing;

namespace Notable.Identity.Authentication.Oidc;

internal static class OidcEndpoints
{
    public static IEndpointRouteBuilder MapOidcEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/oidc");

        group.MapGet("/login", LoginAsync)
            .AllowAnonymous()
            .WithName("AuthOidc_Login");

        // /callback

        return app;
    }

    private static Task LoginAsync(CancellationToken cancellationToken)
    {
        return Task.CompletedTask;
    }
}
