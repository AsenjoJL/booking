namespace Booking.Application.DTOs.Products;

public sealed class ProductDetailDto : ProductSummaryDto
{
    public required Guid CategoryId { get; init; }
    public required string Description { get; init; }
    public required IReadOnlyList<ProductImageDto> Images { get; init; }
    public required string ConcurrencyStamp { get; init; }
    public InventorySnapshotDto? Inventory { get; init; }
}
