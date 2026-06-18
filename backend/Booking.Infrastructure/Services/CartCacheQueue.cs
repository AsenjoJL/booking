using System.Text.Json;
using System.Threading.Channels;
using Booking.Application.DTOs.Cart;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace Booking.Infrastructure.Services;

public interface ICartCacheQueue
{
    ValueTask QueueRefreshAsync(Guid userId, CartDto cart, string? idempotencyKey, CancellationToken cancellationToken);
}

public sealed class CartCacheQueue : ICartCacheQueue
{
    private static readonly DistributedCacheEntryOptions CartCacheOptions = new()
    {
        AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(10)
    };

    private static readonly DistributedCacheEntryOptions IdempotencyCacheOptions = new()
    {
        AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(5)
    };

    private readonly Channel<CartCacheWorkItem> _channel = Channel.CreateUnbounded<CartCacheWorkItem>(
        new UnboundedChannelOptions
        {
            SingleReader = true,
            SingleWriter = false
        });

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<CartCacheQueue> _logger;
    private readonly Task _processor;

    public CartCacheQueue(
        IServiceScopeFactory scopeFactory,
        ILogger<CartCacheQueue> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
        _processor = Task.Run(ProcessQueueAsync);
    }

    public ValueTask QueueRefreshAsync(
        Guid userId,
        CartDto cart,
        string? idempotencyKey,
        CancellationToken cancellationToken)
    {
        return _channel.Writer.WriteAsync(
            new CartCacheWorkItem(userId, cart, idempotencyKey, false),
            cancellationToken);
    }

    private async Task ProcessQueueAsync()
    {
        await foreach (var workItem in _channel.Reader.ReadAllAsync())
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var cache = scope.ServiceProvider.GetRequiredService<IDistributedCache>();
                var cartCacheKey = CartService.GetCartCacheKey(workItem.UserId);

                if (workItem.InvalidateOnly || workItem.Cart is null)
                {
                    await cache.RemoveAsync(cartCacheKey);
                    continue;
                }

                var payload = JsonSerializer.Serialize(workItem.Cart);
                await cache.SetStringAsync(cartCacheKey, payload, CartCacheOptions);

                if (!string.IsNullOrWhiteSpace(workItem.IdempotencyKey))
                {
                    var cacheKey = workItem.IdempotencyKey.StartsWith("merge:", StringComparison.Ordinal)
                        ? CartService.GetCartMergeIdempotencyCacheKey(workItem.UserId, workItem.IdempotencyKey["merge:".Length..])
                        : CartService.GetCartAddIdempotencyCacheKey(workItem.UserId, workItem.IdempotencyKey);

                    if (cacheKey is null)
                    {
                        continue;
                    }

                    await cache.SetStringAsync(
                        cacheKey,
                        payload,
                        IdempotencyCacheOptions);
                }
            }
            catch (Exception exception)
            {
                _logger.LogWarning(exception, "Background cart cache work failed.");
            }
        }
    }

    private sealed record CartCacheWorkItem(
        Guid UserId,
        CartDto? Cart,
        string? IdempotencyKey,
        bool InvalidateOnly);
}
