namespace Booking.Domain.Entities;

public sealed class Coupon
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Code { get; set; } = string.Empty;
    public decimal DiscountAmount { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime? ExpiresAtUtc { get; set; }
}
