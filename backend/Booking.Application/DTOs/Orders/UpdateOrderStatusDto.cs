namespace Booking.Application.DTOs.Orders;

public sealed class UpdateOrderStatusDto
{
    public string Status { get; init; } = string.Empty;
    public string? ConcurrencyStamp { get; init; }
}
