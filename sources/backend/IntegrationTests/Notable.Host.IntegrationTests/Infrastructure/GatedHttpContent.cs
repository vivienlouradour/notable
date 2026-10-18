using System.Net;
using System.Net.Http.Headers;
using System.Text;

namespace Notable.Host.IntegrationTests.Infrastructure;

internal sealed class GatedHttpContent : HttpContent
{
    private readonly TaskCompletionSource _continue = new(TaskCreationOptions.RunContinuationsAsynchronously);

    public GatedHttpContent()
    {
        Headers.ContentType = new MediaTypeHeaderValue("application/x-ndjson");
    }

    public void Complete()
    {
        _continue.TrySetResult();
    }

    protected override Task SerializeToStreamAsync(Stream stream, TransportContext? context)
    {
        return SerializeToStreamAsync(stream, context, CancellationToken.None);
    }

    protected override async Task SerializeToStreamAsync(Stream stream, TransportContext? context, CancellationToken cancellationToken)
    {
        await stream.WriteAsync(Encoding.UTF8.GetBytes("{\"seq\":1}\n"), cancellationToken);
        await stream.FlushAsync(cancellationToken);
        await _continue.Task.WaitAsync(cancellationToken);
        await stream.WriteAsync(Encoding.UTF8.GetBytes("{\"seq\":2}\n"), cancellationToken);
    }

    protected override bool TryComputeLength(out long length)
    {
        length = 0;
        return false;
    }

    protected override void Dispose(bool disposing)
    {
        Complete();
        base.Dispose(disposing);
    }
}