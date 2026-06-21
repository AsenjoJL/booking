using Booking.Domain.Enums;
using Booking.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Logging;

namespace Booking.Infrastructure.Services;

public sealed class OrderProcessingJob(
    BookingDbContext dbContext,
    IDistributedCache cache,
    ILogger<OrderProcessingJob> logger) : IOrderProcessingJob
{
    public async Task ProcessAsync(Guid orderId)
    {
        var order = await dbContext.Orders
            .FirstOrDefaultAsync(x => x.Id == orderId);

        if (order is null)
        {
            logger.LogWarning("Order processing job skipped because order {OrderId} was not found.", orderId);
            return;
        }

        if (order.Status != OrderStatus.Confirmed)
        {
            logger.LogInformation(
                "Order processing job skipped because order {OrderId} is already in status {OrderStatus}.",
                orderId,
                order.Status);
            return;
        }

        order.Status = OrderStatus.Processing;
        order.ConcurrencyStamp = Guid.NewGuid().ToString("N");
        await dbContext.SaveChangesAsync();

        await InvalidateOrderCachesAsync(order.UserId, order.Id);

        logger.LogInformation(
            "Order {OrderId} moved to {OrderStatus} by background job.",
            order.Id,
            order.Status);
    }

    private async Task InvalidateOrderCachesAsync(Guid? userId, Guid orderId)
    {
        var cacheKeys = new List<string>
        {
            "orders:admin:all",
            $"orders:admin:item:{orderId:N}"
        };

        if (userId.HasValue)
        {
            cacheKeys.Add($"orders:user:{userId.Value:N}");
            cacheKeys.Add($"orders:user:{userId.Value:N}:item:{orderId:N}");
        }

        foreach (var key in cacheKeys)
        {
            try
            {
                await cache.RemoveAsync(key);
            }
            catch (Exception exception)
            {
                logger.LogWarning(exception, "Order cache invalidation failed for key {CacheKey}.", key);
            }
        }
    }
}
