using Booking.Application.DTOs.Orders;

namespace Booking.Application.Abstractions;

public interface IOrderService
{
    Task<IReadOnlyList<OrderDto>> GetMyOrdersAsync(Guid userId, CancellationToken cancellationToken);
    Task<IReadOnlyList<OrderDto>> GetAllOrdersAsync(CancellationToken cancellationToken);
    Task<OrderDto> GetByIdAsync(Guid userId, Guid orderId, bool isAdmin, CancellationToken cancellationToken);
    Task<OrderDto> CheckoutAsync(Guid userId, CreateOrderDto request, CancellationToken cancellationToken);
    Task<OrderDto> GuestCheckoutAsync(GuestCreateOrderDto request, CancellationToken cancellationToken);
    Task<OrderDto> UpdateStatusAsync(Guid orderId, UpdateOrderStatusDto request, CancellationToken cancellationToken);
}
