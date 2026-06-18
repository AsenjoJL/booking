namespace Booking.Application.DTOs.Products;

public sealed class BulkUpdateProductVisibilityItemDto
{
    public Guid ProductId { get; init; }
    public bool IsActive { get; init; }
    public string? ConcurrencyStamp { get; init; }
}
