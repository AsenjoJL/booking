namespace Booking.Application.DTOs.Orders;

public sealed class OrderItemDto
{
    public required Guid ProductId { get; init; }
    public required string ProductName { get; init; }
    public required decimal UnitPrice { get; init; }
    public required int Quantity { get; init; }
    public required decimal LineTotal { get; init; }
}
