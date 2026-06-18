namespace Booking.Infrastructure.Services;

public sealed class NoOpInventoryLockService : IInventoryLockService
{
    private sealed class Releaser : IAsyncDisposable
    {
        public ValueTask DisposeAsync() => ValueTask.CompletedTask;
    }

    public Task<IAsyncDisposable> AcquireProductsAsync(
        IReadOnlyCollection<Guid> productIds,
        CancellationToken cancellationToken)
    {
        return Task.FromResult<IAsyncDisposable>(new Releaser());
    }
}
