namespace Booking.Application.DTOs.Products;

public class ProductSummaryDto
{
    public required Guid Id { get; init; }
    public Guid? ProductVariantId { get; init; }
    public required string Name { get; init; }
    public required string Slug { get; init; }
    public required string Category { get; init; }
    public string? Brand { get; init; }
    public string? Status { get; init; }
    public string? Sku { get; init; }
    public string? Color { get; init; }
    public string? Size { get; init; }
    public required decimal Price { get; init; }
    public decimal? SalePrice { get; init; }
    public required int StockQuantity { get; init; }
    public required int QuantityOnHand { get; init; }
    public required int QuantityReserved { get; init; }
    public required int QuantityAvailable { get; init; }
    public required int LowStockThreshold { get; init; }
    public required bool IsActive { get; init; }
    public string? ImageUrl { get; init; }
}
