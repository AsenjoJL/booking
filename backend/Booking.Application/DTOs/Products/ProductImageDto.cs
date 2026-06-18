namespace Booking.Application.DTOs.Products;

public sealed class ProductImageDto
{
    public required Guid Id { get; init; }
    public required string ImageUrl { get; init; }
    public required bool IsPrimary { get; init; }
    public required int SortOrder { get; init; }
}
