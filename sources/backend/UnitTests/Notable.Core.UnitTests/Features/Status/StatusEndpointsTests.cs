using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.Logging;

using Notable.Core.Features.Status;

namespace Notable.Core.UnitTests.Features.Status;

[TestClass]
public sealed class StatusEndpointsTests
{
    [TestMethod]
    [DataRow("/", "GetHealth")]
    [DataRow("/status/version", "Status_GetVersion")]
    [DataRow("/status/health", "Status_GetHealth")]
    public async Task MapStatusEndpoints_RegistersNamedGetRouteRequiringAuthorization(string path, string name)
    {
        // Arrange
        var builder = WebApplication.CreateSlimBuilder();
        builder.Logging.ClearProviders();
        await using var app = builder.Build();

        // Act
        var result = app.MapStatusEndpoints();
        var endpoints = ((IEndpointRouteBuilder)app).DataSources.SelectMany(source => source.Endpoints).OfType<RouteEndpoint>();
        var endpoint = endpoints.Single(candidate => candidate.RoutePattern.RawText == path);

        // Assert
        result.Should().BeSameAs(app);
        endpoint.Metadata.GetMetadata<IAuthorizeData>().Should().NotBeNull();
        endpoint.Metadata.GetMetadata<IAllowAnonymous>().Should().BeNull();
        (endpoint.Metadata.GetMetadata<IEndpointNameMetadata>()?.EndpointName).Should().Be(name);
        (endpoint.Metadata.GetMetadata<HttpMethodMetadata>()?.HttpMethods.ToArray()).Should().Equal(new[] { "GET" });
    }
}