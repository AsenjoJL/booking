namespace Booking.Application.DTOs.Products;

public sealed class AdjustInventoryDto
{
    public required int QtyOnHand { get; init; }
    public int QtyReserved { get; init; }
    public string? Note { get; init; }
}
