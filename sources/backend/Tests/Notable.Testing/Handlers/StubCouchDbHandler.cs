using System.Collections.Concurrent;
using System.Net;

namespace Notable.Testing.Handlers;

/// <summary>
/// Replaces the outgoing CouchDB transport while keeping the real HTTP client and proxy.
/// Request bodies are recorded in memory; response bodies are never read by the handler.
/// </summary>
public sealed class StubCouchDbHandler : HttpMessageHandler
{
    private readonly ConcurrentQueue<HttpResponseMessage> _responses = new();
    private readonly ConcurrentQueue<RecordedHttpRequest> _requests = new();

    /// <summary>Gets a snapshot of the requests, including their bodies and headers.</summary>
    public IReadOnlyList<RecordedHttpRequest> Requests => _requests.ToArray();

    /// <summary>
    /// Gets or sets a custom responder. When set, it takes precedence over queued responses.
    /// Return a new response for each call. The request must only be used during the callback.
    /// </summary>
    public Func<HttpRequestMessage, CancellationToken, Task<HttpResponseMessage>>? RespondAsync { get; set; }

    /// <summary>
    /// Queues a response for the next request. Unsent responses are disposed with the handler;
    /// sent responses belong to the caller.
    /// </summary>
    public void Enqueue(HttpStatusCode statusCode, HttpContent? content = null)
    {
        _responses.Enqueue(new HttpResponseMessage(statusCode) { Content = content });
    }

    protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();

        var body = request.Content is null ? null : await request.Content.ReadAsStringAsync(cancellationToken);
        cancellationToken.ThrowIfCancellationRequested();

        _requests.Enqueue(new RecordedHttpRequest(
            request.Method,
            request.RequestUri,
            body,
            request.Headers.ToDictionary(header => header.Key, header => header.Value.ToArray(), StringComparer.OrdinalIgnoreCase),
            request.Content?.Headers.ToDictionary(header => header.Key, header => header.Value.ToArray(), StringComparer.OrdinalIgnoreCase)
                ?? new Dictionary<string, string[]>(StringComparer.OrdinalIgnoreCase),
            cancellationToken.CanBeCanceled));

        if (this.RespondAsync is { } respondAsync)
        {
            return await respondAsync(request, cancellationToken);
        }

        if (_responses.TryDequeue(out var response))
        {
            return response;
        }

        throw new InvalidOperationException($"No CouchDB response configured for {request.Method} {request.RequestUri}.");
    }

    protected override void Dispose(bool disposing)
    {
        if (disposing)
        {
            while (_responses.TryDequeue(out var response))
            {
                response.Dispose();
            }
        }

        base.Dispose(disposing);
    }
}
