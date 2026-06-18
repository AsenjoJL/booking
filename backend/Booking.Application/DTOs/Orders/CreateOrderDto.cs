namespace Booking.Application.DTOs.Orders;

public sealed class CreateOrderDto
{
    public Guid ShippingAddressId { get; init; }
    public Guid? BillingAddressId { get; init; }
    public string? CouponCode { get; init; }
    public string? PaymentMethod { get; init; }
    public string IdempotencyKey { get; init; } = string.Empty;
}
