namespace Booking.Application.DTOs.Orders;

public sealed class GuestCreateOrderDto
{
    public string GuestEmail { get; init; } = string.Empty;
    public GuestOrderAddressDto ShippingAddress { get; init; } = new();
    public GuestOrderAddressDto? BillingAddress { get; init; }
    public bool UseShippingAsBilling { get; init; } = true;
    public IReadOnlyList<GuestOrderItemDto> Items { get; init; } = Array.Empty<GuestOrderItemDto>();
    public string? CouponCode { get; init; }
    public string? PaymentMethod { get; init; }
    public string IdempotencyKey { get; init; } = string.Empty;
}
