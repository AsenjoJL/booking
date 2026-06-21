using Booking.Application.DTOs.Products;
using Booking.Domain.Entities;

namespace Booking.Infrastructure.Services;

public interface IInventoryLedgerService
{
    Task<(ProductVariant Variant, InventoryRecord Inventory, Warehouse Warehouse)> GetOrCreateDefaultInventoryAsync(
        Product product,
        CancellationToken cancellationToken);

    int GetAvailableQuantity(InventoryRecord inventory);

    Task SyncProductSnapshotAsync(
        Product product,
        ProductVariant variant,
        InventoryRecord inventory,
        CancellationToken cancellationToken);

    Task<InventorySnapshotDto> GetInventorySnapshotAsync(Guid productId, CancellationToken cancellationToken);

    Task<IReadOnlyList<InventoryMovementDto>> GetInventoryHistoryAsync(Guid productId, CancellationToken cancellationToken);

    Task<InventorySnapshotDto> AdjustInventoryAsync(
        Guid productId,
        int targetPiecesOnHand,
        int targetPiecesReserved,
        string? note,
        CancellationToken cancellationToken);

    Task ReserveAsync(
        Product product,
        int quantity,
        string referenceType,
        Guid? referenceId,
        string? note,
        CancellationToken cancellationToken);

    Task CommitReservationAsync(
        Product product,
        int quantity,
        string referenceType,
        Guid? referenceId,
        string? note,
        CancellationToken cancellationToken);

    Task ReleaseReservationAsync(
        Product product,
        int quantity,
        string referenceType,
        Guid? referenceId,
        string? note,
        CancellationToken cancellationToken);
}
