namespace Booking.Application.DTOs.Products;

public sealed class AdjustInventoryDto
{
    public required int PiecesOnHand { get; init; }
    public int PiecesReserved { get; init; }
    public string? Note { get; init; }
}
