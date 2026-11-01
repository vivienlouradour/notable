using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;

using Notable.CouchDb.Services;

namespace Notable.CouchDb;

public static class CouchDbEndpoints
{
    public static IEndpointRouteBuilder MapCouchDbEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/sync")
            .WithTags("Sync")
            .WithName("Sync")
            .WithGroupName("Sync")
            .RequireAuthorization();

        group.MapMethods(
            "/{**catchAll}",
            [
                HttpMethods.Get,
                HttpMethods.Post,
                HttpMethods.Put,
                HttpMethods.Delete,
                HttpMethods.Options,
                HttpMethods.Patch
            ],
            ProxyAsync);

        return app;
    }

    private static async Task ProxyAsync(string? catchAll, HttpContext context, ICouchDbProxy couchDbProxy, CancellationToken cancellationToken)
    {
        var route = $"{catchAll}{context.Request.QueryString.Value}";
        var response = await couchDbProxy.ProxyRequestToUserDatabaseAsync(context.Request, route, cancellationToken);

        context.Response.StatusCode = (int)response.StatusCode;

        foreach (var header in response.Headers)
        {
            context.Response.Headers[header.Key] = header.Value.ToArray();
        }

        foreach (var header in response.Content.Headers)
        {
            context.Response.Headers[header.Key] = header.Value.ToArray();
        }

        context.Response.Headers.Remove("transfer-encoding");

        await response.Content.CopyToAsync(context.Response.Body, cancellationToken);
    }
}
