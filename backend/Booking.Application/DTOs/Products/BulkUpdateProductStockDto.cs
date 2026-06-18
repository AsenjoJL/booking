namespace Booking.Application.DTOs.Products;

public sealed class BulkUpdateProductStockDto
{
    public IReadOnlyList<BulkUpdateProductStockItemDto> Items { get; init; } = [];
}
