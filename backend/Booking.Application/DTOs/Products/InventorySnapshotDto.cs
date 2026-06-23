namespace Booking.Application.DTOs.Products;

public sealed class InventorySnapshotDto
{
    public required Guid ProductId { get; init; }
    public required Guid ProductVariantId { get; init; }
    public required string ProductName { get; init; }
    public required string Category { get; init; }
    public required string Sku { get; init; }
    public string? Color { get; init; }
    public string? Size { get; init; }
    public required string WarehouseCode { get; init; }
    public required int QtyOnHand { get; init; }
    public required int QtyReserved { get; init; }
    public required int QtyAvailable { get; init; }
    public required int LowStockThreshold { get; init; }
    public required bool IsLowStock { get; init; }
    public required DateTime UpdatedAtUtc { get; init; }
}
