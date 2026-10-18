using System.Net;
using System.Net.Http.Headers;

using Microsoft.Extensions.Configuration;

using Notable.CouchDb.Services;

namespace Notable.CouchDb.UnitTests.Infrastructure;

internal sealed class ProxyTestFixture : IDisposable
{
    private readonly Queue<HttpResponseMessage> _responses = new();
    private readonly List<HttpResponseMessage> _ownedResponses = [];
    private readonly HttpClient _client;

    public Guid UserId { get; }
    public string Password { get; } = Guid.NewGuid().ToString();
    public string DatabaseUrl => $"https://couchdb.invalid/db_user_{UserId}";
    public CouchDbProxy Proxy { get; }
    public List<RecordedRequest> Requests { get; } = [];
    public Func<CancellationToken, Task<HttpResponseMessage>>? RespondAsync { get; set; }

    public ProxyTestFixture(Guid? userId = null)
    {
        UserId = userId ?? Guid.NewGuid();
        _client = new HttpClient(new RecordingHandler(this));
        var configuration = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["CouchDb:BaseUrl"] = "https://couchdb.invalid",
            ["CouchDb:User"] = "api_user",
            ["CouchDb:Password"] = Password
        }).Build();
        Proxy = new CouchDbProxy(_client, configuration, new FixedCurrentUser(UserId));
    }

    public HttpResponseMessage Enqueue(HttpStatusCode statusCode, HttpContent? content = null)
    {
        var response = new HttpResponseMessage(statusCode);
        if (content is not null)
        {
            response.Content = content;
        }

        _responses.Enqueue(response);
        _ownedResponses.Add(response);
        return response;
    }

    public void Dispose()
    {
        _client.Dispose();
        foreach (var response in _ownedResponses)
        {
            response.Dispose();
        }
    }

    private sealed class RecordingHandler(ProxyTestFixture fixture) : HttpMessageHandler
    {
        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            cancellationToken.ThrowIfCancellationRequested();
            var body = request.Content is null ? null : await request.Content.ReadAsStringAsync(cancellationToken);
            fixture.Requests.Add(new RecordedRequest(request.Method, request.RequestUri, body,
                request.Content?.Headers.ContentType?.ToString(), request.Headers.Authorization,
                request.Headers.IfMatch.ToString(), cancellationToken.CanBeCanceled));

            return fixture.RespondAsync is null
                ? fixture._responses.Dequeue()
                : await fixture.RespondAsync(cancellationToken);
        }
    }
}

internal sealed record RecordedRequest(HttpMethod Method, Uri? Uri, string? Body, string? ContentType,
    AuthenticationHeaderValue? Authorization, string IfMatch, bool CanBeCanceled);