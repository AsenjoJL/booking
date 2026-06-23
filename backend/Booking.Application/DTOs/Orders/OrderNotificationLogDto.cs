namespace Booking.Application.DTOs.Orders;

public sealed record OrderNotificationLogDto(
    Guid Id,
    Guid OrderId,
    string PhoneNumber,
    string Message,
    string Status,
    DateTime SentAtUtc,
    string? ErrorMessage
);
