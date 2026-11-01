using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;

using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;

using Notable.CouchDb.Helpers;
using Notable.Identity.Common;

namespace Notable.CouchDb.Services;

internal class CouchDbProxy : ICouchDbProxy
{
    private readonly HttpClient _httpClient;
    private readonly ICurrentUser _currentUser;
    private readonly string _couchDbBaseUrl;

    public CouchDbProxy(IHttpClientFactory httpClientFactory, IConfiguration configuration, ICurrentUser currentUser)
    {
        _httpClient = httpClientFactory.CreateClient(CouchDbHttpClientNames.Proxy);
        _currentUser = currentUser;
        _couchDbBaseUrl = configuration["CouchDb:BaseUrl"] ?? "";

        // CouchDb authentication
        var byteArray = Encoding.ASCII.GetBytes($"{configuration["CouchDb:User"]}:{configuration["CouchDb:Password"]}");
        _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Basic", Convert.ToBase64String(byteArray));
    }

    public async Task<HttpResponseMessage> ProxyRequestToUserDatabaseAsync(HttpRequest request, string? route, CancellationToken cancellationToken)
    {
        // Rebuild complete url to CouchDb
        var dbUrl = CouchDbHelper.GetUserDbUrl(_couchDbBaseUrl, _currentUser);
        await this.EnsureDbExistsAsync(dbUrl, cancellationToken);

        var targetUrl = $"{dbUrl}/{route}";

        // Copty the incoming request
        var method = new HttpMethod(request.Method);
        var requestMessage = new HttpRequestMessage(method, targetUrl);

        if (request.ContentLength > 0)
        {
            requestMessage.Content = new StreamContent(request.Body);
        }

        // Copy headers
        foreach (var header in request.Headers)
        {
            if (!requestMessage.Headers.TryAddWithoutValidation(header.Key, [.. header.Value]) && requestMessage.Content != null)
            {
                requestMessage.Content.Headers.TryAddWithoutValidation(header.Key, [.. header.Value]);
            }
        }

        // Send request to couchdb
        var response = await _httpClient.SendAsync(requestMessage, HttpCompletionOption.ResponseHeadersRead, cancellationToken);

        return response;
    }

    private async Task EnsureDbExistsAsync(string dbUrl, CancellationToken cancellationToken)
    {
        var alreadyExisting = (await _httpClient.GetAsync(dbUrl, cancellationToken)).IsSuccessStatusCode;
        if (alreadyExisting)
        {
            return;
        }

        var create = await _httpClient.PutAsync(dbUrl, null, cancellationToken);
        if (!create.IsSuccessStatusCode)
        {
            throw new Exception($"CouchDB database creation failed : {create.StatusCode}");
        }

        // TODO : check permissions
        // Configure permissions
        var securityUrl = $"{dbUrl}/_security";

        var securityPayload = new
        {
            admins = new { names = new string[] { }, roles = new string[] { } },
            members = new
            {
                names = new[] { "api_user" },
                roles = new string[] { }
            }
        };

        var json = new StringContent(JsonSerializer.Serialize(securityPayload), Encoding.UTF8, "application/json");
        var security = await _httpClient.PutAsync(securityUrl, json, cancellationToken);
        if (!security.IsSuccessStatusCode)
        {
            throw new Exception($"Permission on new database failed : {security.StatusCode}");
        }
    }
}
