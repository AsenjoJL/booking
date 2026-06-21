using Booking.Domain.Enums;

namespace Booking.Domain.Entities;

public sealed class Order
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid? UserId { get; set; }
    public User? User { get; set; }
    public Guid? ShippingAddressId { get; set; }
    public Address? ShippingAddress { get; set; }
    public Guid? BillingAddressId { get; set; }
    public Address? BillingAddress { get; set; }
    public string? GuestEmail { get; set; }
    public string? GuestRecipientName { get; set; }
    public string? GuestPhoneNumber { get; set; }
    public string? ShippingLabel { get; set; }
    public string? ShippingRecipientName { get; set; }
    public string? ShippingLine1 { get; set; }
    public string? ShippingLine2 { get; set; }
    public string? ShippingCity { get; set; }
    public string? ShippingStateOrProvince { get; set; }
    public string? ShippingPostalCode { get; set; }
    public string? ShippingCountry { get; set; }
    public string? ShippingPhoneNumber { get; set; }
    public string? BillingLabel { get; set; }
    public string? BillingRecipientName { get; set; }
    public string? BillingLine1 { get; set; }
    public string? BillingLine2 { get; set; }
    public string? BillingCity { get; set; }
    public string? BillingStateOrProvince { get; set; }
    public string? BillingPostalCode { get; set; }
    public string? BillingCountry { get; set; }
    public string? BillingPhoneNumber { get; set; }
    public decimal Subtotal { get; set; }
    public decimal Discount { get; set; }
    public decimal ShippingFee { get; set; }
    public decimal Tax { get; set; }
    public decimal Total { get; set; }
    public OrderStatus Status { get; set; } = OrderStatus.PendingPayment;
    public PaymentMethod PaymentMethod { get; set; } = PaymentMethod.CashOnDelivery;
    public PaymentStatus PaymentStatus { get; set; } = PaymentStatus.Pending;
    public string? CouponCode { get; set; }
    public string IdempotencyKey { get; set; } = string.Empty;
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime? ExpiresAtUtc { get; set; }
    public DateTime? InventoryCommittedAtUtc { get; set; }
    public DateTime? InventoryReleasedAtUtc { get; set; }
    public string ConcurrencyStamp { get; set; } = Guid.NewGuid().ToString("N");
    public ICollection<OrderItem> Items { get; set; } = new List<OrderItem>();
}
