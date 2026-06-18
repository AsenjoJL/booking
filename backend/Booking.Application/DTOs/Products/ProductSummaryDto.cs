namespace Booking.Application.DTOs.Products;

public class ProductSummaryDto
{
    public required Guid Id { get; init; }
    public required string Name { get; init; }
    public required string Slug { get; init; }
    public required string Category { get; init; }
    public required decimal Price { get; init; }
    public decimal? SalePrice { get; init; }
    public required int StockQuantity { get; init; }
    public required bool IsActive { get; init; }
    public string? ImageUrl { get; init; }
}
