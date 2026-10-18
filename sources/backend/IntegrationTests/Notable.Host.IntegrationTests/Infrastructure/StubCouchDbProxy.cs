using System.Net;

using Microsoft.AspNetCore.Http;

using Notable.CouchDb.Services;

namespace Notable.Host.IntegrationTests.Infrastructure;

internal sealed class StubCouchDbProxy : ICouchDbProxy
{
    public int CallCount { get; private set; }

    public Func<HttpRequest, string?, CancellationToken, Task<HttpResponseMessage>> RespondAsync { get; set; }
        = (_, _, _) => Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent("{}")
        });

    public Task<HttpResponseMessage> ProxyRequestToUserDatabaseAsync(HttpRequest request, string? route, CancellationToken cancellationToken)
    {
        CallCount++;
        return RespondAsync(request, route, cancellationToken);
    }
}