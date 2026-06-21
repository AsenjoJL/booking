namespace Booking.Application.DTOs.Cart;

public sealed class CartItemDto
{
    public required Guid Id { get; init; }
    public required Guid ProductId { get; init; }
    public Guid? ProductVariantId { get; init; }
    public string? Sku { get; init; }
    public required string ProductName { get; init; }
    public required decimal UnitPrice { get; init; }
    public required int Quantity { get; init; }
    public required int AvailableStock { get; init; }
    public string? ImageUrl { get; init; }
    public required string ConcurrencyStamp { get; init; }
}
