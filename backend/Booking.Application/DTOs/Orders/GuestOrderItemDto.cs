namespace Booking.Application.DTOs.Orders;

public sealed class GuestOrderItemDto
{
    public Guid ProductId { get; init; }
    public int Quantity { get; init; }
}
