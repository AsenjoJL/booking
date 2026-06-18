using Booking.Application.DTOs.Cart;

namespace Booking.Application.Abstractions;

public interface ICartService
{
    Task<CartDto> GetCartAsync(Guid userId, CancellationToken cancellationToken);
    Task<CartDto> AddItemAsync(Guid userId, AddCartItemDto request, CancellationToken cancellationToken);
    Task<CartDto> MergeCartAsync(Guid userId, MergeCartDto request, CancellationToken cancellationToken);
    Task<CartDto> UpdateItemAsync(Guid userId, Guid cartItemId, UpdateCartItemQuantityDto request, CancellationToken cancellationToken);
    Task<CartDto> ClearAsync(Guid userId, CancellationToken cancellationToken);
    Task<CartDto> RemoveItemAsync(Guid userId, Guid cartItemId, CancellationToken cancellationToken);
}
