using System.Net;

namespace Notable.CouchDb.UnitTests.Infrastructure;

internal sealed class UnreadableHttpContent : HttpContent
{
    public bool WasRead { get; private set; }

    protected override Task SerializeToStreamAsync(Stream stream, TransportContext? context)
    {
        WasRead = true;
        throw new InvalidOperationException("The proxy must return response headers without buffering the body.");
    }

    protected override bool TryComputeLength(out long length)
    {
        length = 0;
        return false;
    }
}