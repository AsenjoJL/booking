namespace Booking.Application.DTOs.Cart;

public sealed class AddCartItemDto
{
    public Guid ProductId { get; init; }
    public Guid? ProductVariantId { get; init; }
    public int Quantity { get; init; } = 1;
    public string? IdempotencyKey { get; init; }
}
