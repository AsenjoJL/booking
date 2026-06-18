namespace Booking.Application.DTOs.Products;

public sealed class BulkUpdateProductStockItemDto
{
    public Guid ProductId { get; init; }
    public int StockQuantity { get; init; }
    public string? ConcurrencyStamp { get; init; }
}
