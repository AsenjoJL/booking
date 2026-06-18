namespace Booking.Application.DTOs.Products;

public sealed class BulkUpdateProductVisibilityDto
{
    public IReadOnlyList<BulkUpdateProductVisibilityItemDto> Items { get; init; } = [];
}
