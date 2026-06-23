namespace Booking.Domain.Entities;

public sealed class OrderNotificationLog
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid OrderId { get; set; }
    public Order Order { get; set; } = null!;
    public string PhoneNumber { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty; // "Success" or "Failed"
    public DateTime SentAtUtc { get; set; } = DateTime.UtcNow;
    public string? ErrorMessage { get; set; }
}
