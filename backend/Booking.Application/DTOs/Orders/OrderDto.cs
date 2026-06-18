namespace Booking.Application.DTOs.Orders;

public sealed class OrderDto
{
    public required Guid Id { get; init; }
    public required string Status { get; init; }
    public required string PaymentMethod { get; init; }
    public required string PaymentStatus { get; init; }
    public required Guid ShippingAddressId { get; init; }
    public Guid? BillingAddressId { get; init; }
    public required decimal Subtotal { get; init; }
    public required decimal Discount { get; init; }
    public required decimal ShippingFee { get; init; }
    public required decimal Tax { get; init; }
    public required decimal Total { get; init; }
    public string? CouponCode { get; init; }
    public required DateTime CreatedAtUtc { get; init; }
    public DateTime? ExpiresAtUtc { get; init; }
    public required string ConcurrencyStamp { get; init; }
    public required IReadOnlyList<OrderItemDto> Items { get; init; }
}
