using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;

using Notable.Auth.Exceptions;
using Notable.Auth.Services;

using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;

namespace Notable.CouchDb.Services
{
    internal class CouchDbProxy : ICouchDbProxy
    {
        private readonly HttpClient httpClient;
        private readonly ICurrentUser currentUser;
        private readonly string couchDbBaseUrl;

        public CouchDbProxy(HttpClient httpClient, IConfiguration configuration, ICurrentUser currentUser)
        {
            this.httpClient = httpClient;
            this.currentUser = currentUser;
            couchDbBaseUrl = configuration["CouchDb:BaseUrl"] ?? "";

            // CouchDb authentication
            var byteArray = Encoding.ASCII.GetBytes($"{configuration["CouchDb:User"]}:{configuration["CouchDb:Password"]}");
            this.httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Basic", Convert.ToBase64String(byteArray));
        }

        public async Task<HttpResponseMessage> ProxyRequestToUserDatabaseAsync(HttpRequest request, string? route, CancellationToken cancellationToken)
        {
            // Get the authenticated user
            var user = currentUser.User ?? throw new NotAuthenticatedException();

            // Rebuild complete url to CouchDb
            var dbUrl = CouchDbHelper.GetUserDbUrl(this.couchDbBaseUrl, user);
            await EnsureDbExistsAsync(dbUrl, cancellationToken);

            var targetUrl = $"{dbUrl}/{route}";

            // Copty the incoming request
            var method = new HttpMethod(request.Method);
            var requestMessage = new HttpRequestMessage(method, targetUrl);

            if (request.ContentLength > 0)
                requestMessage.Content = new StreamContent(request.Body);

            // Copy headers
            foreach (var header in request.Headers)
            {
                if (!requestMessage.Headers.TryAddWithoutValidation(header.Key, [.. header.Value]) && requestMessage.Content != null)
                {
                    requestMessage.Content.Headers.TryAddWithoutValidation(header.Key, [.. header.Value]);
                }
            }

            // Send request to couchdb
            var response = await httpClient.SendAsync(requestMessage, HttpCompletionOption.ResponseHeadersRead, cancellationToken);

            return response;
        }

        public async Task EnsureDbExistsAsync(string dbUrl, CancellationToken cancellationToken)
        {
            var alreadyExisting = (await httpClient.GetAsync(dbUrl, cancellationToken)).IsSuccessStatusCode;
            if (alreadyExisting)
                return;

            var create = await httpClient.PutAsync(dbUrl, null, cancellationToken);
            if (!create.IsSuccessStatusCode)
                throw new Exception($"CouchDB database creation failed : {create.StatusCode}");

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
            var security = await httpClient.PutAsync(securityUrl, json, cancellationToken);
            if (!security.IsSuccessStatusCode)
                throw new Exception($"Permission on new database failed : {security.StatusCode}");
        }
    }
}
