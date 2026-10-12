using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Routing;

namespace Notable.Core.Status
{
    public record AppVersionDto(
        string Version,
        string FullVersion,
        string AssemblyVersion);

    public record AppStatus(string Status);

    public static class StatusEndpoints
    {
        public static IEndpointRouteBuilder MapStatusEndpoints(this IEndpointRouteBuilder app)
        {
            var statusGroup = app.MapGroup(string.Empty)
                .WithTags("Status")
                .RequireAuthorization();

            statusGroup.MapGet("/", Version).WithName("GetHealth");

            var statusSubGroup = statusGroup.MapGroup("/status");

            statusSubGroup.MapGet("/version", Version).WithName("Status_GetVersion");
            statusSubGroup.MapGet("/health", () => TypedResults.Ok(new AppStatus("healthy"))).WithName("Status_GetHealth");

            return app;
        }

        private static Ok<AppVersionDto> Version()
        {
            return TypedResults.Ok(new AppVersionDto(
                Version: AppVersion.Version,
                FullVersion: AppVersion.FullVersion,
                AssemblyVersion: AppVersion.AssemblyVersion
            ));
        }
    }
}
