namespace Booking.Application.DTOs.Products;

public sealed class ProductListQueryDto
{
    public string? Search { get; init; }
    public string? Category { get; init; }
    public string? Brand { get; init; }
    public string? StockState { get; init; }
    public int Page { get; init; } = 1;
    public int PageSize { get; init; } = 12;
}
