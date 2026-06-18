using Booking.Application.Abstractions;
using Booking.Application.DTOs.Orders;
using Booking.Application.Exceptions;
using Booking.Domain.Entities;
using Booking.Domain.Enums;
using Booking.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Logging;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace Booking.Infrastructure.Services;

public sealed class OrderService(
    BookingDbContext dbContext,
    IDistributedCache cache,
    IOrderJobScheduler orderJobScheduler,
    IInventoryLockService inventoryLockService,
    ILogger<OrderService> logger,
    ICacheMetricsCollector cacheMetrics) : IOrderService
{
    private const decimal FreeShippingThreshold = 1500m;
    private const decimal StandardShippingFee = 120m;
    private const decimal VatRate = 0.12m;
    private static readonly TimeSpan CheckoutExpirationWindow = TimeSpan.FromHours(24);

    private static readonly DistributedCacheEntryOptions CheckoutCacheOptions = new()
    {
        AbsoluteExpirationRelativeToNow = TimeSpan.FromHours(24)
    };
    private static readonly DistributedCacheEntryOptions OrdersCacheOptions = new()
    {
        AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(5)
    };

    public async Task<IReadOnlyList<OrderDto>> GetMyOrdersAsync(Guid userId, CancellationToken cancellationToken)
    {
        var cacheKey = GetMyOrdersCacheKey(userId);
        var cachedOrders = await TryGetCachedOrderListAsync(cacheKey, cancellationToken);
        if (cachedOrders is not null)
        {
            cacheMetrics.RecordHit("orders:user:list");
            logger.LogDebug("My orders cache hit for user {UserId}.", userId);
            return cachedOrders;
        }
        cacheMetrics.RecordMiss("orders:user:list");
        logger.LogDebug("My orders cache miss for user {UserId}.", userId);

        var orders = await LoadOrdersQuery()
            .Where(x => x.UserId == userId)
            .OrderByDescending(x => x.CreatedAtUtc)
            .ToListAsync(cancellationToken);

        var result = orders.Select(x => x.ToDto()).ToList();
        await TryCacheOrderListAsync(cacheKey, result, cancellationToken);
        return result;
    }

    public async Task<IReadOnlyList<OrderDto>> GetAllOrdersAsync(CancellationToken cancellationToken)
    {
        const string cacheKey = "orders:admin:all";
        var cachedOrders = await TryGetCachedOrderListAsync(cacheKey, cancellationToken);
        if (cachedOrders is not null)
        {
            cacheMetrics.RecordHit("orders:admin:list");
            logger.LogDebug("Admin orders cache hit for key {CacheKey}.", cacheKey);
            return cachedOrders;
        }
        cacheMetrics.RecordMiss("orders:admin:list");
        logger.LogDebug("Admin orders cache miss for key {CacheKey}.", cacheKey);

        var orders = await LoadOrdersQuery()
            .OrderByDescending(x => x.CreatedAtUtc)
            .ToListAsync(cancellationToken);

        var result = orders.Select(x => x.ToDto()).ToList();
        await TryCacheOrderListAsync(cacheKey, result, cancellationToken);
        return result;
    }

    public async Task<OrderDto> GetByIdAsync(
        Guid userId,
        Guid orderId,
        bool isAdmin,
        CancellationToken cancellationToken)
    {
        var cacheKey = GetOrderByIdCacheKey(userId, orderId, isAdmin);
        var cachedOrder = await TryGetCachedOrderAsync(cacheKey, cancellationToken);
        if (cachedOrder is not null)
        {
            cacheMetrics.RecordHit("orders:item");
            logger.LogDebug("Order detail cache hit for key {CacheKey}.", cacheKey);
            return cachedOrder;
        }
        cacheMetrics.RecordMiss("orders:item");
        logger.LogDebug("Order detail cache miss for key {CacheKey}.", cacheKey);

        var order = await LoadOrdersQuery()
            .FirstOrDefaultAsync(x => x.Id == orderId, cancellationToken)
            ?? throw new NotFoundException("Order not found.");

        if (!isAdmin && order.UserId != userId)
        {
            throw new AppUnauthorizedException("You do not have access to this order.");
        }

        var dto = order.ToDto();
        await TryCacheOrderAsync(cacheKey, dto, OrdersCacheOptions, cancellationToken);
        return dto;
    }

    public async Task<OrderDto> CheckoutAsync(Guid userId, CreateOrderDto request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.IdempotencyKey))
        {
            throw new ValidationException("Idempotency key is required.");
        }

        var paymentMethod = ResolvePaymentMethod(request.PaymentMethod);

        logger.LogInformation(
            "Checkout started for user {UserId} with address {AddressId}, payment method {PaymentMethod}, and idempotency key {IdempotencyKey}.",
            userId,
            request.ShippingAddressId,
            paymentMethod,
            request.IdempotencyKey);

        var cacheKey = GetCheckoutCacheKey(userId, request.IdempotencyKey);
        var cachedOrder = await TryGetCachedOrderAsync(cacheKey, cancellationToken);
        if (cachedOrder is not null)
        {
            cacheMetrics.RecordHit("orders:checkout:idempotency");
            logger.LogDebug("Checkout idempotency cache hit for user {UserId}.", userId);
            return cachedOrder;
        }
        cacheMetrics.RecordMiss("orders:checkout:idempotency");

        var executionStrategy = dbContext.Database.CreateExecutionStrategy();
        return await executionStrategy.ExecuteAsync(async () =>
        {
            await using var transaction = await dbContext.Database.BeginTransactionAsync(cancellationToken);
            await AcquireCheckoutLockAsync(userId, request.IdempotencyKey, cancellationToken);
            logger.LogDebug("Checkout transaction and advisory lock acquired for user {UserId}.", userId);

            var existingOrder = await dbContext.Orders
                .Include(x => x.Items)
                .FirstOrDefaultAsync(
                    x => x.UserId == userId && x.IdempotencyKey == request.IdempotencyKey,
                    cancellationToken);

            if (existingOrder is not null)
            {
                logger.LogInformation(
                    "Checkout reused existing order {OrderId} for user {UserId} and idempotency key {IdempotencyKey}.",
                    existingOrder.Id,
                    userId,
                    request.IdempotencyKey);
                var existingOrderDto = existingOrder.ToDto();
                await TryCacheOrderAsync(cacheKey, existingOrderDto, cancellationToken);
                return existingOrderDto;
            }

            var address = await dbContext.Addresses
                .FirstOrDefaultAsync(x => x.Id == request.ShippingAddressId && x.UserId == userId, cancellationToken)
                ?? throw new NotFoundException("Shipping address not found.");
            logger.LogDebug("Checkout shipping address {AddressId} loaded for user {UserId}.", address.Id, userId);

            var billingAddressId = request.BillingAddressId ?? request.ShippingAddressId;
            var billingAddress = await dbContext.Addresses
                .FirstOrDefaultAsync(x => x.Id == billingAddressId && x.UserId == userId, cancellationToken)
                ?? throw new NotFoundException("Billing address not found.");

            var cartItems = await dbContext.CartItems
                .Include(x => x.Product)
                .Where(x => x.UserId == userId)
                .OrderBy(x => x.ProductId)
                .ToListAsync(cancellationToken);
            logger.LogDebug("Checkout loaded {CartItemCount} cart items for user {UserId}.", cartItems.Count, userId);

            if (cartItems.Count == 0)
            {
                throw new ConflictException("Cart is empty.");
            }

            await using var inventoryLock = await inventoryLockService.AcquireProductsAsync(
                cartItems.Select(x => x.ProductId).ToList(),
                cancellationToken);

            var lockedProducts = new Dictionary<Guid, Product>();
            foreach (var cartItem in cartItems)
            {
                var locked = await LockProductAsync(cartItem.ProductId, cancellationToken)
                    ?? throw new NotFoundException("Product not found during checkout.");
                lockedProducts[locked.Id] = locked;
            }

            decimal subtotal = 0;
            foreach (var cartItem in cartItems)
            {
                var product = lockedProducts[cartItem.ProductId];
                if (!product.IsActive)
                {
                    throw new ConflictException($"Product '{product.Name}' is inactive.");
                }

                if (cartItem.Quantity > product.StockQuantity)
                {
                    throw new ConflictException($"Insufficient stock for '{product.Name}'.");
                }

                subtotal += (product.SalePrice ?? product.Price) * cartItem.Quantity;
            }
            logger.LogDebug("Checkout subtotal {Subtotal} calculated for user {UserId}.", subtotal, userId);

            decimal discount = 0;
            string? appliedCoupon = null;
            if (!string.IsNullOrWhiteSpace(request.CouponCode))
            {
                var coupon = await LockCouponAsync(request.CouponCode, cancellationToken);
                if (coupon is null || !coupon.IsActive || (coupon.ExpiresAtUtc.HasValue && coupon.ExpiresAtUtc < DateTime.UtcNow))
                {
                    throw new ConflictException("Coupon is invalid or expired.");
                }

                discount = Math.Min(coupon.DiscountAmount, subtotal);
                appliedCoupon = coupon.Code;
                logger.LogDebug(
                    "Checkout coupon {CouponCode} applied for user {UserId} with discount {Discount}.",
                    appliedCoupon,
                    userId,
                    discount);
            }

            subtotal = RoundCurrency(subtotal);
            discount = RoundCurrency(discount);
            var discountedSubtotal = Math.Max(0m, subtotal - discount);
            var shippingFee = CalculateShippingFee(discountedSubtotal);
            var tax = CalculateTax(discountedSubtotal);
            var total = RoundCurrency(discountedSubtotal + shippingFee + tax);
            var expiresAtUtc = DateTime.UtcNow.Add(CheckoutExpirationWindow);

            var order = new Order
            {
                UserId = userId,
                ShippingAddressId = address.Id,
                BillingAddressId = billingAddress.Id,
                Subtotal = subtotal,
                Discount = discount,
                ShippingFee = shippingFee,
                Tax = tax,
                Total = total,
                Status = OrderStatus.PendingPayment,
                PaymentMethod = paymentMethod,
                PaymentStatus = PaymentStatus.Pending,
                CouponCode = appliedCoupon,
                IdempotencyKey = request.IdempotencyKey.Trim(),
                ExpiresAtUtc = expiresAtUtc
            };

            foreach (var cartItem in cartItems)
            {
                var product = lockedProducts[cartItem.ProductId];
                var unitPrice = product.SalePrice ?? product.Price;

                product.StockQuantity -= cartItem.Quantity;
                product.ConcurrencyStamp = Guid.NewGuid().ToString("N");

                order.Items.Add(new OrderItem
                {
                    ProductId = product.Id,
                    ProductName = product.Name,
                    Quantity = cartItem.Quantity,
                    UnitPrice = unitPrice,
                    LineTotal = unitPrice * cartItem.Quantity
                });
            }

            dbContext.Orders.Add(order);
            dbContext.CartItems.RemoveRange(cartItems);
            await dbContext.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
            logger.LogInformation(
                "Checkout committed order {OrderId} for user {UserId} with total {Total}.",
                order.Id,
                userId,
                order.Total);

            var created = await LoadOrdersQuery().FirstAsync(x => x.Id == order.Id, cancellationToken);
            var createdDto = created.ToDto();
            await InvalidateOrderCachesAsync(created.UserId, created.Id, cancellationToken);
            await TryCacheOrderAsync(cacheKey, createdDto, cancellationToken);
            logger.LogInformation("Checkout completed for order {OrderId} and user {UserId}.", created.Id, userId);
            return createdDto;
        });
    }

    public async Task<OrderDto> UpdateStatusAsync(Guid orderId, UpdateOrderStatusDto request, CancellationToken cancellationToken)
    {
        var order = await dbContext.Orders
            .Include(x => x.Items)
            .FirstOrDefaultAsync(x => x.Id == orderId, cancellationToken)
            ?? throw new NotFoundException("Order not found.");

        if (!string.IsNullOrWhiteSpace(request.ConcurrencyStamp) &&
            !string.Equals(order.ConcurrencyStamp, request.ConcurrencyStamp, StringComparison.Ordinal))
        {
            throw new ConcurrencyException("Order was updated by another request.");
        }

        if (!Enum.TryParse<OrderStatus>(request.Status, true, out var status))
        {
            throw new ValidationException("Unknown order status.");
        }

        EnsureOrderStatusTransition(order, status);

        order.Status = status;
        order.PaymentStatus = ResolvePaymentStatusForStatus(status, order.PaymentStatus);
        if (status is OrderStatus.Cancelled or OrderStatus.Expired)
        {
            order.ExpiresAtUtc ??= DateTime.UtcNow;
        }

        order.ConcurrencyStamp = Guid.NewGuid().ToString("N");
        await dbContext.SaveChangesAsync(cancellationToken);
        var dto = order.ToDto();
        await InvalidateOrderCachesAsync(order.UserId, order.Id, cancellationToken);

        if (status == OrderStatus.Confirmed)
        {
            try
            {
                orderJobScheduler.EnqueueOrderProcessing(order.Id);
            }
            catch (Exception exception)
            {
                logger.LogWarning(
                    exception,
                    "Order {OrderId} was confirmed but background processing could not be scheduled.",
                    order.Id);
            }
        }

        return dto;
    }

    private static PaymentMethod ResolvePaymentMethod(string? paymentMethod)
    {
        if (string.IsNullOrWhiteSpace(paymentMethod))
        {
            return PaymentMethod.CashOnDelivery;
        }

        if (!Enum.TryParse<PaymentMethod>(paymentMethod, true, out var parsedMethod))
        {
            throw new ValidationException("Unknown payment method.");
        }

        if (parsedMethod != PaymentMethod.CashOnDelivery)
        {
            throw new ValidationException("Only CashOnDelivery is currently supported.");
        }

        return parsedMethod;
    }

    private static decimal CalculateShippingFee(decimal discountedSubtotal)
    {
        return RoundCurrency(discountedSubtotal >= FreeShippingThreshold ? 0m : StandardShippingFee);
    }

    private static decimal CalculateTax(decimal discountedSubtotal)
    {
        return RoundCurrency(discountedSubtotal * VatRate);
    }

    private static decimal RoundCurrency(decimal value)
    {
        return decimal.Round(value, 2, MidpointRounding.AwayFromZero);
    }

    private static PaymentStatus ResolvePaymentStatusForStatus(OrderStatus status, PaymentStatus currentStatus)
    {
        return status switch
        {
            OrderStatus.Delivered => PaymentStatus.Collected,
            OrderStatus.Cancelled or OrderStatus.Expired => PaymentStatus.Cancelled,
            OrderStatus.Refunded => PaymentStatus.Refunded,
            _ => currentStatus
        };
    }

    private static void EnsureOrderStatusTransition(Order order, OrderStatus nextStatus)
    {
        if (order.Status == nextStatus)
        {
            return;
        }

        var allowed = order.Status switch
        {
            OrderStatus.PendingPayment => new[] { OrderStatus.Confirmed, OrderStatus.Cancelled, OrderStatus.Expired },
            OrderStatus.Pending => new[] { OrderStatus.Confirmed, OrderStatus.Cancelled, OrderStatus.Expired },
            OrderStatus.Confirmed => new[] { OrderStatus.Processing, OrderStatus.Cancelled, OrderStatus.Expired },
            OrderStatus.Processing => new[] { OrderStatus.Shipped, OrderStatus.Cancelled },
            OrderStatus.Shipped => new[] { OrderStatus.Delivered, OrderStatus.Cancelled },
            OrderStatus.Delivered => new[] { OrderStatus.Refunded },
            OrderStatus.Paid => new[] { OrderStatus.Processing, OrderStatus.Cancelled },
            _ => Array.Empty<OrderStatus>()
        };

        if (!allowed.Contains(nextStatus))
        {
            throw new ConflictException(
                $"Order in status '{order.Status}' cannot transition to '{nextStatus}'.");
        }
    }

    private IQueryable<Order> LoadOrdersQuery() =>
        dbContext.Orders
            .AsNoTracking()
            .Include(x => x.Items);

    private async Task AcquireCheckoutLockAsync(Guid userId, string idempotencyKey, CancellationToken cancellationToken)
    {
        if (!dbContext.Database.IsNpgsql())
        {
            return;
        }

        var lockKey = GetAdvisoryLockKey(userId, idempotencyKey);
        await dbContext.Database.ExecuteSqlInterpolatedAsync(
            $@"SELECT pg_advisory_xact_lock({lockKey.key1}, {lockKey.key2})",
            cancellationToken);
    }

    private async Task<Product?> LockProductAsync(Guid productId, CancellationToken cancellationToken)
    {
        if (dbContext.Database.IsNpgsql())
        {
            return await dbContext.Products
                .FromSqlInterpolated($@"SELECT * FROM ""Products"" WHERE ""Id"" = {productId} FOR UPDATE")
                .FirstOrDefaultAsync(cancellationToken);
        }

        return await dbContext.Products.FirstOrDefaultAsync(x => x.Id == productId, cancellationToken);
    }

    private async Task<Coupon?> LockCouponAsync(string couponCode, CancellationToken cancellationToken)
    {
        if (dbContext.Database.IsNpgsql())
        {
            return await dbContext.Coupons
                .FromSqlInterpolated($@"SELECT * FROM ""Coupons"" WHERE ""Code"" = {couponCode} FOR UPDATE")
                .FirstOrDefaultAsync(cancellationToken);
        }

        return await dbContext.Coupons.FirstOrDefaultAsync(x => x.Code == couponCode, cancellationToken);
    }

    private static (int key1, int key2) GetAdvisoryLockKey(Guid userId, string idempotencyKey)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes($"{userId:N}:{idempotencyKey.Trim()}"));
        return (BitConverter.ToInt32(bytes, 0), BitConverter.ToInt32(bytes, 4));
    }

    private static string GetCheckoutCacheKey(Guid userId, string idempotencyKey)
    {
        return $"checkout:{userId:N}:{idempotencyKey.Trim()}";
    }

    private static string GetMyOrdersCacheKey(Guid userId)
    {
        return $"orders:user:{userId:N}";
    }

    private static string GetOrderByIdCacheKey(Guid userId, Guid orderId, bool isAdmin)
    {
        return isAdmin
            ? $"orders:admin:item:{orderId:N}"
            : $"orders:user:{userId:N}:item:{orderId:N}";
    }

    private async Task<OrderDto?> TryGetCachedOrderAsync(string cacheKey, CancellationToken cancellationToken)
    {
        try
        {
            var cached = await cache.GetStringAsync(cacheKey, cancellationToken);
            if (string.IsNullOrWhiteSpace(cached))
            {
                return null;
            }

            return JsonSerializer.Deserialize<OrderDto>(cached);
        }
        catch (Exception exception)
        {
            logger.LogWarning(exception, "Checkout cache read failed for key {CacheKey}.", cacheKey);
            return null;
        }
    }

    private async Task TryCacheOrderAsync(string cacheKey, OrderDto order, CancellationToken cancellationToken)
    {
        await TryCacheOrderAsync(cacheKey, order, CheckoutCacheOptions, cancellationToken);
    }

    private async Task TryCacheOrderAsync(
        string cacheKey,
        OrderDto order,
        DistributedCacheEntryOptions options,
        CancellationToken cancellationToken)
    {
        try
        {
            await cache.SetStringAsync(
                cacheKey,
                JsonSerializer.Serialize(order),
                options,
                cancellationToken);
        }
        catch (Exception exception)
        {
            logger.LogWarning(exception, "Checkout cache write failed for key {CacheKey}.", cacheKey);
        }
    }

    private async Task<IReadOnlyList<OrderDto>?> TryGetCachedOrderListAsync(string cacheKey, CancellationToken cancellationToken)
    {
        try
        {
            var cached = await cache.GetStringAsync(cacheKey, cancellationToken);
            if (string.IsNullOrWhiteSpace(cached))
            {
                return null;
            }

            return JsonSerializer.Deserialize<List<OrderDto>>(cached);
        }
        catch (Exception exception)
        {
            logger.LogWarning(exception, "Order list cache read failed for key {CacheKey}.", cacheKey);
            return null;
        }
    }

    private async Task TryCacheOrderListAsync(
        string cacheKey,
        IReadOnlyList<OrderDto> orders,
        CancellationToken cancellationToken)
    {
        try
        {
            await cache.SetStringAsync(
                cacheKey,
                JsonSerializer.Serialize(orders),
                OrdersCacheOptions,
                cancellationToken);
        }
        catch (Exception exception)
        {
            logger.LogWarning(exception, "Order list cache write failed for key {CacheKey}.", cacheKey);
        }
    }

    private async Task InvalidateOrderCachesAsync(Guid userId, Guid orderId, CancellationToken cancellationToken)
    {
        var cacheKeys = new[]
        {
            GetMyOrdersCacheKey(userId),
            "orders:admin:all",
            GetOrderByIdCacheKey(userId, orderId, isAdmin: false),
            GetOrderByIdCacheKey(userId, orderId, isAdmin: true)
        };

        foreach (var key in cacheKeys)
        {
            try
            {
                await cache.RemoveAsync(key, cancellationToken);
            }
            catch (Exception exception)
            {
                logger.LogWarning(exception, "Order cache invalidation failed for key {CacheKey}.", key);
            }
        }
    }
}
