namespace Booking.Infrastructure.Services;

public interface IInventoryLockService
{
    Task<IAsyncDisposable> AcquireProductsAsync(
        IReadOnlyCollection<Guid> productIds,
        CancellationToken cancellationToken);
}
