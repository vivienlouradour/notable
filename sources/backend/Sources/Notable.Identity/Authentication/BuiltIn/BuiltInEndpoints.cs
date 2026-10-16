using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Routing;

namespace Notable.Identity.Authentication.BuiltIn;

internal static class BuiltInEndpoints
{
    public static IEndpointRouteBuilder MapBuiltInEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/builtin");

        group.MapPost("/login", LoginAsync)
            .WithName("AuthBuiltIn_Login");

        return group;
    }

    private static Task LoginAsync(CancellationToken cancellationToken)
    {
        return Task.CompletedTask;
    }
}
