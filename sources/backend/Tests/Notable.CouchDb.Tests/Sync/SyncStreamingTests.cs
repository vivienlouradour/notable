using System.IO.Pipelines;
using System.Net;
using System.Net.Http.Headers;
using System.Text;

using Notable.Testing;
using Notable.Testing.Handlers;

namespace Notable.CouchDb.Tests.Sync;

[TestClass]
public sealed class SyncStreamingTests
{
    [TestMethod]
    public async Task Sync_WithContinuousFeed_DeliversFirstChangeBeforeFeedCompletes()
    {
        // Arrange
        var pipe = new Pipe();
        using var content = new StreamContent(pipe.Reader.AsStream());
        content.Headers.ContentType = new MediaTypeHeaderValue("application/x-ndjson");
        using var couchDb = new StubCouchDbHandler();
        couchDb.Enqueue(HttpStatusCode.OK);
        couchDb.Enqueue(HttpStatusCode.OK, content);
        var userId = Guid.NewGuid();
        using var host = await NotableTestHostBuilder.Default.WithCouchDbHandler(couchDb)
            .WithUsers(new TestUser(userId, "stream@example.com")).BuildAsync();
        using var client = host.CreateAuthenticatedClient(userId);
        client.Timeout = TimeSpan.FromSeconds(10);
        await pipe.Writer.WriteAsync(Encoding.UTF8.GetBytes("{\"seq\":1}\n"));

        // Act
        try
        {
            using var response = await client.GetAsync("/sync/_changes?feed=continuous&since=0", HttpCompletionOption.ResponseHeadersRead);
            using var reader = new StreamReader(await response.Content.ReadAsStreamAsync());
            var firstLine = await reader.ReadLineAsync().WaitAsync(TimeSpan.FromSeconds(10));
            await pipe.Writer.WriteAsync(Encoding.UTF8.GetBytes("{\"seq\":2}\n"));
            await pipe.Writer.CompleteAsync();
            var remaining = await reader.ReadToEndAsync().WaitAsync(TimeSpan.FromSeconds(10));

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.OK);
            (response.Content.Headers.ContentType?.MediaType).Should().Be("application/x-ndjson");
            firstLine.Should().Be("{\"seq\":1}");
            remaining.Should().Be("{\"seq\":2}\n");
            couchDb.Requests.Should().HaveCount(2);
            couchDb.Requests[1].Uri!.Query.Should().Be("?feed=continuous&since=0");
        }
        finally
        {
            await pipe.Writer.CompleteAsync();
        }
    }

    [TestMethod]
    public async Task Sync_WhenClientCancels_CancelsCouchDbTransport()
    {
        // Arrange
        var started = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        var cancelled = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        using var couchDb = new StubCouchDbHandler
        {
            RespondAsync = async (request, token) =>
            {
                if (!request.RequestUri!.AbsolutePath.EndsWith("/_changes", StringComparison.Ordinal))
                {
                    return new HttpResponseMessage(HttpStatusCode.OK);
                }
                started.TrySetResult();
                try
                {
                    await Task.Delay(Timeout.InfiniteTimeSpan, token);
                }
                catch (OperationCanceledException)
                {
                    cancelled.TrySetResult();
                    throw;
                }
                return new HttpResponseMessage(HttpStatusCode.OK);
            }
        };
        var userId = Guid.NewGuid();
        using var host = await NotableTestHostBuilder.Default.WithCouchDbHandler(couchDb)
            .WithUsers(new TestUser(userId, "cancel@example.com")).BuildAsync();
        using var client = host.CreateAuthenticatedClient(userId);
        using var cancellation = new CancellationTokenSource(TimeSpan.FromSeconds(10));

        // Act
        var pending = client.GetAsync("/sync/_changes?feed=longpoll", cancellation.Token);
        await started.Task.WaitAsync(TimeSpan.FromSeconds(10));
        await cancellation.CancelAsync();
        Func<Task> act = async () => { using var response = await pending; };

        // Assert
        await act.Should().ThrowAsync<OperationCanceledException>();
        await cancelled.Task.WaitAsync(TimeSpan.FromSeconds(10));
        couchDb.Requests.Should().HaveCount(2).And.OnlyContain(request => request.CanBeCanceled);
    }
}
