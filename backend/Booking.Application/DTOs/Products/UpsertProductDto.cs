namespace Booking.Application.DTOs.Products;

public sealed class UpsertProductDto
{
    public string Name { get; init; } = string.Empty;
    public string Slug { get; init; } = string.Empty;
    public string Description { get; init; } = string.Empty;
    public string? Brand { get; init; }
    public string? Status { get; init; }
    public string? Sku { get; init; }
    public string? Color { get; init; }
    public string? Size { get; init; }
    public decimal Price { get; init; }
    public decimal? SalePrice { get; init; }
    public int StockQuantity { get; init; }
    public int LowStockThreshold { get; init; } = 5;
    public bool IsActive { get; init; } = true;
    public Guid CategoryId { get; init; }
    public string? ImageUrl { get; init; }
    public IReadOnlyList<UpsertProductImageDto> Images { get; init; } = [];
    public string? ConcurrencyStamp { get; init; }
}
