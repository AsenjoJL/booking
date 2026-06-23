namespace Booking.Application.DTOs.Products;

public sealed class InventoryMovementDto
{
    public required Guid Id { get; init; }
    public required Guid ProductVariantId { get; init; }
    public required string Sku { get; init; }
    public required string WarehouseCode { get; init; }
    public required string MovementType { get; init; }
    public required int QtyDelta { get; init; }
    public required int QtyOnHandAfter { get; init; }
    public required int QtyReservedAfter { get; init; }
    public string? ReferenceType { get; init; }
    public Guid? ReferenceId { get; init; }
    public string? Note { get; init; }
    public required DateTime CreatedAtUtc { get; init; }
}
