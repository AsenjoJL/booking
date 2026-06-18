namespace Booking.Application.DTOs.Cart;

public sealed class CartDto
{
    public required IReadOnlyList<CartItemDto> Items { get; init; }
    public required decimal Subtotal { get; init; }
}
