using Booking.Application.Abstractions;
using Booking.Application.DTOs.Cart;
using Booking.Application.Exceptions;
using Booking.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Logging;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace Booking.Infrastructure.Services;

public sealed class CartService(
    BookingDbContext dbContext,
    IDistributedCache cache,
    ICartCacheQueue cartCacheQueue,
    ILogger<CartService> logger,
    ICacheMetricsCollector cacheMetrics) : ICartService
{
    private static readonly DistributedCacheEntryOptions CartCacheOptions = new()
    {
        AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(10)
    };

    public async Task<CartDto> GetCartAsync(Guid userId, CancellationToken cancellationToken)
    {
        var cacheKey = GetCartCacheKey(userId);
        var cachedCart = await TryGetCachedCartAsync(cacheKey, cancellationToken);
        if (cachedCart is not null)
        {
            cacheMetrics.RecordHit("cart");
            logger.LogDebug("Cart cache hit for user {UserId}.", userId);
            return cachedCart;
        }
        cacheMetrics.RecordMiss("cart");
        logger.LogDebug("Cart cache miss for user {UserId}.", userId);

        var items = await LoadCartItemsQuery(userId)
            .ToListAsync(cancellationToken);

        var cart = ToCart(items);
        await TrySetCachedCartAsync(cacheKey, cart, cancellationToken);
        return cart;
    }

    public async Task<CartDto> AddItemAsync(Guid userId, AddCartItemDto request, CancellationToken cancellationToken)
    {
        if (request.Quantity <= 0)
        {
            throw new ValidationException("Quantity must be greater than zero.");
        }

        var idempotencyCacheKey = GetCartAddIdempotencyCacheKey(userId, request.IdempotencyKey);
        if (idempotencyCacheKey is not null)
        {
            var cachedCart = await TryGetCachedCartAsync(idempotencyCacheKey, cancellationToken);
            if (cachedCart is not null)
            {
                cacheMetrics.RecordHit("cart:add:idempotency");
                logger.LogDebug("Cart add idempotency cache hit for user {UserId}.", userId);
                return cachedCart;
            }
        }
        if (idempotencyCacheKey is not null)
        {
            cacheMetrics.RecordMiss("cart:add:idempotency");
        }

        var executionStrategy = dbContext.Database.CreateExecutionStrategy();
        return await executionStrategy.ExecuteAsync(async () =>
        {
            await using var transaction = await dbContext.Database.BeginTransactionAsync(cancellationToken);

            if (!string.IsNullOrWhiteSpace(request.IdempotencyKey))
            {
                await AcquireAddItemLockAsync(userId, request.IdempotencyKey, cancellationToken);

                if (idempotencyCacheKey is not null)
                {
                    var duplicateCart = await TryGetCachedCartAsync(idempotencyCacheKey, cancellationToken);
                    if (duplicateCart is not null)
                    {
                        await transaction.CommitAsync(cancellationToken);
                        return duplicateCart;
                    }
                }
            }

            var product = await LockProductAsync(request.ProductId, cancellationToken)
                ?? throw new NotFoundException("Product not found.");

            if (!product.IsActive)
            {
                throw new ConflictException("Product is inactive.");
            }

            var cartItem = await LockCartItemAsync(userId, request.ProductId, cancellationToken);
            var newQuantity = request.Quantity + (cartItem?.Quantity ?? 0);

            if (newQuantity > product.StockQuantity)
            {
                throw new ConflictException("Requested quantity exceeds available stock.");
            }

            if (cartItem is null)
            {
                dbContext.CartItems.Add(new Domain.Entities.CartItem
                {
                    UserId = userId,
                    ProductId = request.ProductId,
                    Quantity = request.Quantity
                });
            }
            else
            {
                cartItem.Quantity = newQuantity;
                cartItem.UpdatedAtUtc = DateTime.UtcNow;
                cartItem.ConcurrencyStamp = Guid.NewGuid().ToString("N");
            }

            await dbContext.SaveChangesAsync(cancellationToken);
            var items = await LoadCartItemsQuery(userId).ToListAsync(cancellationToken);
            var cart = ToCart(items);

            await transaction.CommitAsync(cancellationToken);
            await TryInvalidateCartCacheAsync(userId, cancellationToken);
            await QueueCartRefreshAsync(userId, cart, request.IdempotencyKey, cancellationToken);
            return cart;
        });
    }

    public async Task<CartDto> MergeCartAsync(Guid userId, MergeCartDto request, CancellationToken cancellationToken)
    {
        if (request.Items.Count == 0)
        {
            return await GetCartAsync(userId, cancellationToken);
        }

        if (request.Items.Any(item => item.Quantity <= 0))
        {
            throw new ValidationException("Quantity must be greater than zero.");
        }

        var normalizedItems = request.Items
            .GroupBy(item => item.ProductId)
            .Select(group => new MergeCartItemDto
            {
                ProductId = group.Key,
                Quantity = group.Sum(item => item.Quantity)
            })
            .OrderBy(item => item.ProductId)
            .ToList();

        var idempotencyCacheKey = GetCartMergeIdempotencyCacheKey(userId, request.IdempotencyKey);
        if (idempotencyCacheKey is not null)
        {
            var cachedCart = await TryGetCachedCartAsync(idempotencyCacheKey, cancellationToken);
            if (cachedCart is not null)
            {
                cacheMetrics.RecordHit("cart:merge:idempotency");
                logger.LogDebug("Cart merge idempotency cache hit for user {UserId}.", userId);
                return cachedCart;
            }
        }
        if (idempotencyCacheKey is not null)
        {
            cacheMetrics.RecordMiss("cart:merge:idempotency");
        }

        var executionStrategy = dbContext.Database.CreateExecutionStrategy();
        return await executionStrategy.ExecuteAsync(async () =>
        {
            await using var transaction = await dbContext.Database.BeginTransactionAsync(cancellationToken);

            if (!string.IsNullOrWhiteSpace(request.IdempotencyKey))
            {
                await AcquireAddItemLockAsync(userId, $"merge:{request.IdempotencyKey}", cancellationToken);

                if (idempotencyCacheKey is not null)
                {
                    var duplicateCart = await TryGetCachedCartAsync(idempotencyCacheKey, cancellationToken);
                    if (duplicateCart is not null)
                    {
                        await transaction.CommitAsync(cancellationToken);
                        return duplicateCart;
                    }
                }
            }

            var productIds = normalizedItems.Select(item => item.ProductId).ToList();
            var lockedProducts = new Dictionary<Guid, Domain.Entities.Product>();
            foreach (var productId in productIds)
            {
                var product = await LockProductAsync(productId, cancellationToken)
                    ?? throw new NotFoundException("Product not found.");

                if (!product.IsActive)
                {
                    throw new ConflictException($"Product '{product.Name}' is inactive.");
                }

                lockedProducts[productId] = product;
            }

            var existingCartItems = new Dictionary<Guid, Domain.Entities.CartItem>();
            foreach (var productId in productIds)
            {
                var cartItem = await LockCartItemAsync(userId, productId, cancellationToken);
                if (cartItem is not null)
                {
                    existingCartItems[productId] = cartItem;
                }
            }

            foreach (var item in normalizedItems)
            {
                var product = lockedProducts[item.ProductId];
                var currentQuantity = existingCartItems.TryGetValue(item.ProductId, out var cartItem)
                    ? cartItem.Quantity
                    : 0;
                var newQuantity = currentQuantity + item.Quantity;

                if (newQuantity > product.StockQuantity)
                {
                    throw new ConflictException($"Requested quantity exceeds available stock for '{product.Name}'.");
                }

                if (cartItem is null)
                {
                    dbContext.CartItems.Add(new Domain.Entities.CartItem
                    {
                        UserId = userId,
                        ProductId = item.ProductId,
                        Quantity = item.Quantity
                    });
                    continue;
                }

                cartItem.Quantity = newQuantity;
                cartItem.UpdatedAtUtc = DateTime.UtcNow;
                cartItem.ConcurrencyStamp = Guid.NewGuid().ToString("N");
            }

            await dbContext.SaveChangesAsync(cancellationToken);
            var items = await LoadCartItemsQuery(userId).ToListAsync(cancellationToken);
            var cart = ToCart(items);

            await transaction.CommitAsync(cancellationToken);
            await TryInvalidateCartCacheAsync(userId, cancellationToken);
            await QueueCartRefreshAsync(userId, cart, request.IdempotencyKey, cancellationToken, isMerge: true);
            return cart;
        });
    }

    public async Task<CartDto> UpdateItemAsync(
        Guid userId,
        Guid cartItemId,
        UpdateCartItemQuantityDto request,
        CancellationToken cancellationToken)
    {
        if (request.Quantity <= 0)
        {
            throw new ValidationException("Quantity must be greater than zero.");
        }

        var executionStrategy = dbContext.Database.CreateExecutionStrategy();
        return await executionStrategy.ExecuteAsync(async () =>
        {
            await using var transaction = await dbContext.Database.BeginTransactionAsync(cancellationToken);

            var cartItem = await dbContext.CartItems
                .Include(x => x.Product)
                .FirstOrDefaultAsync(x => x.Id == cartItemId && x.UserId == userId, cancellationToken)
                ?? throw new NotFoundException("Cart item not found.");

            if (!string.IsNullOrWhiteSpace(request.ConcurrencyStamp) &&
                !string.Equals(cartItem.ConcurrencyStamp, request.ConcurrencyStamp, StringComparison.Ordinal))
            {
                throw new ConcurrencyException("Cart item was updated by another request.");
            }

            var product = await LockProductAsync(cartItem.ProductId, cancellationToken)
                ?? throw new NotFoundException("Product not found.");

            if (request.Quantity > product.StockQuantity)
            {
                throw new ConflictException("Requested quantity exceeds available stock.");
            }

            cartItem.Quantity = request.Quantity;
            cartItem.UpdatedAtUtc = DateTime.UtcNow;
            cartItem.ConcurrencyStamp = Guid.NewGuid().ToString("N");

            await dbContext.SaveChangesAsync(cancellationToken);
            var items = await LoadCartItemsQuery(userId).ToListAsync(cancellationToken);
            var cart = ToCart(items);

            await transaction.CommitAsync(cancellationToken);
            await TryInvalidateCartCacheAsync(userId, cancellationToken);
            await QueueCartRefreshAsync(userId, cart, idempotencyKey: null, cancellationToken);

            return cart;
        });
    }

    public async Task<CartDto> ClearAsync(Guid userId, CancellationToken cancellationToken)
    {
        var items = await dbContext.CartItems.Where(x => x.UserId == userId).ToListAsync(cancellationToken);
        dbContext.CartItems.RemoveRange(items);
        await dbContext.SaveChangesAsync(cancellationToken);
        var cart = new CartDto
        {
            Items = [],
            Subtotal = 0
        };
        await TryInvalidateCartCacheAsync(userId, cancellationToken);
        await QueueCartRefreshAsync(userId, cart, idempotencyKey: null, cancellationToken);
        return cart;
    }

    public async Task<CartDto> RemoveItemAsync(Guid userId, Guid cartItemId, CancellationToken cancellationToken)
    {
        var item = await dbContext.CartItems
            .FirstOrDefaultAsync(x => x.Id == cartItemId && x.UserId == userId, cancellationToken)
            ?? throw new NotFoundException("Cart item not found.");

        dbContext.CartItems.Remove(item);
        await dbContext.SaveChangesAsync(cancellationToken);
        var items = await LoadCartItemsQuery(userId).ToListAsync(cancellationToken);
        var cart = ToCart(items);
        await TryInvalidateCartCacheAsync(userId, cancellationToken);
        await QueueCartRefreshAsync(userId, cart, idempotencyKey: null, cancellationToken);
        return cart;
    }

    internal static string GetCartCacheKey(Guid userId) => $"cart:{userId:N}";

    internal static string? GetCartAddIdempotencyCacheKey(Guid userId, string? idempotencyKey)
    {
        return string.IsNullOrWhiteSpace(idempotencyKey)
            ? null
            : $"cart:add:{userId:N}:{idempotencyKey.Trim()}";
    }

    internal static string? GetCartMergeIdempotencyCacheKey(Guid userId, string? idempotencyKey)
    {
        return string.IsNullOrWhiteSpace(idempotencyKey)
            ? null
            : $"cart:merge:{userId:N}:{idempotencyKey.Trim()}";
    }

    private IQueryable<Domain.Entities.CartItem> LoadCartItemsQuery(Guid userId) =>
        dbContext.CartItems
            .AsNoTracking()
            .Include(x => x.Product)
            .ThenInclude(x => x.Images)
            .Where(x => x.UserId == userId)
            .OrderByDescending(x => x.UpdatedAtUtc);

    private async Task AcquireAddItemLockAsync(Guid userId, string idempotencyKey, CancellationToken cancellationToken)
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

    private async Task<Domain.Entities.Product?> LockProductAsync(Guid productId, CancellationToken cancellationToken)
    {
        if (dbContext.Database.IsNpgsql())
        {
            return await dbContext.Products
                .FromSqlInterpolated($@"SELECT * FROM ""Products"" WHERE ""Id"" = {productId} FOR UPDATE")
                .FirstOrDefaultAsync(cancellationToken);
        }

        return await dbContext.Products.FirstOrDefaultAsync(x => x.Id == productId, cancellationToken);
    }

    private async Task<Domain.Entities.CartItem?> LockCartItemAsync(
        Guid userId,
        Guid productId,
        CancellationToken cancellationToken)
    {
        if (dbContext.Database.IsNpgsql())
        {
            return await dbContext.CartItems
                .FromSqlInterpolated($@"SELECT * FROM ""CartItems"" WHERE ""UserId"" = {userId} AND ""ProductId"" = {productId} FOR UPDATE")
                .FirstOrDefaultAsync(cancellationToken);
        }

        return await dbContext.CartItems
            .FirstOrDefaultAsync(x => x.UserId == userId && x.ProductId == productId, cancellationToken);
    }

    private static (int key1, int key2) GetAdvisoryLockKey(Guid userId, string idempotencyKey)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes($"{userId:N}:{idempotencyKey.Trim()}"));
        return (BitConverter.ToInt32(bytes, 0), BitConverter.ToInt32(bytes, 4));
    }

    private async Task<CartDto?> TryGetCachedCartAsync(string cacheKey, CancellationToken cancellationToken)
    {
        try
        {
            var cached = await cache.GetStringAsync(cacheKey, cancellationToken);
            if (string.IsNullOrWhiteSpace(cached))
            {
                return null;
            }

            return JsonSerializer.Deserialize<CartDto>(cached);
        }
        catch (Exception exception)
        {
            logger.LogWarning(exception, "Cart cache read failed for key {CacheKey}.", cacheKey);
            return null;
        }
    }

    private async Task TrySetCachedCartAsync(string cacheKey, CartDto cart, CancellationToken cancellationToken)
    {
        try
        {
            await cache.SetStringAsync(
                cacheKey,
                JsonSerializer.Serialize(cart),
                CartCacheOptions,
                cancellationToken);
        }
        catch (Exception exception)
        {
            logger.LogWarning(exception, "Cart cache write failed for key {CacheKey}.", cacheKey);
        }
    }

    private async Task TryInvalidateCartCacheAsync(Guid userId, CancellationToken cancellationToken)
    {
        try
        {
            await cache.RemoveAsync(GetCartCacheKey(userId), cancellationToken);
        }
        catch (Exception exception)
        {
            logger.LogWarning(exception, "Cart cache invalidation failed for user {UserId}.", userId);
        }
    }

    private async Task QueueCartRefreshAsync(
        Guid userId,
        CartDto cart,
        string? idempotencyKey,
        CancellationToken cancellationToken,
        bool isMerge = false)
    {
        try
        {
            await cartCacheQueue.QueueRefreshAsync(
                userId,
                cart,
                isMerge && !string.IsNullOrWhiteSpace(idempotencyKey) ? $"merge:{idempotencyKey}" : idempotencyKey,
                cancellationToken);
        }
        catch (Exception exception)
        {
            logger.LogWarning(exception, "Cart background queue write failed for user {UserId}.", userId);
            await TrySetCachedCartAsync(GetCartCacheKey(userId), cart, cancellationToken);
        }
    }

    private static CartDto ToCart(IReadOnlyList<Domain.Entities.CartItem> items) =>
        new()
        {
            Items = items.Select(x => x.ToDto()).ToList(),
            Subtotal = items.Sum(x => (x.Product.SalePrice ?? x.Product.Price) * x.Quantity)
        };
}
