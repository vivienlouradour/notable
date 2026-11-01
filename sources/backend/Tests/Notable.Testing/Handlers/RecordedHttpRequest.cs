namespace Notable.Testing.Handlers;

/// <summary>
/// Captures outgoing request data so assertions do not depend on the original request's lifetime.
/// </summary>
public sealed record RecordedHttpRequest(
    HttpMethod Method,
    Uri? Uri,
    string? Body,
    IReadOnlyDictionary<string, string[]> Headers,
    IReadOnlyDictionary<string, string[]> ContentHeaders,
    bool CanBeCanceled);
