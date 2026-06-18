namespace Booking.Application.DTOs.Cart;

public sealed class UpdateCartItemQuantityDto
{
    public int Quantity { get; init; }
    public string? ConcurrencyStamp { get; init; }
}
