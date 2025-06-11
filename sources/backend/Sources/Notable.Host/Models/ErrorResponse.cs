namespace Notable.Host.Models
{
    public readonly struct ErrorResponse
    {
        public string Message { get; init; }

        public required int StatusCode { get; init; }
    }
}
