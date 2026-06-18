namespace Booking.Application.DTOs.Products;

public sealed class UpsertProductImageDto
{
    public string ImageUrl { get; init; } = string.Empty;
    public bool IsPrimary { get; init; }
    public int SortOrder { get; init; }
}
