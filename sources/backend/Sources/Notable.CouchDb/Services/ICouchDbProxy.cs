using Microsoft.AspNetCore.Http;

namespace Notable.CouchDb.Services
{
    public interface ICouchDbProxy
    {
        Task<HttpResponseMessage> ProxyRequestToUserDatabaseAsync(HttpRequest request, string? route, CancellationToken cancellationToken);
    }
}
