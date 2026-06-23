using Booking.Application.DTOs.Common;
using Booking.Application.DTOs.Products;
using Booking.Application.Features.Products.Queries;
using Booking.Infrastructure.Data;
using Booking.Infrastructure.Services;
using Booking.Application.Abstractions;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Logging;
using System.Text.Json;
using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace Booking.Infrastructure.Features.Products.Handlers;

internal sealed class GetProductsQueryHandler(
    BookingDbContext dbContext,
    IDistributedCache cache,
    ILogger<GetProductsQueryHandler> logger,
    ICacheMetricsCollector cacheMetrics) : IRequestHandler<GetProductsQuery, PagedResultDto<ProductSummaryDto>>
{
    private static readonly DistributedCacheEntryOptions CacheOptions = new()
    {
        AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(3)
    };

    public async Task<PagedResultDto<ProductSummaryDto>> Handle(GetProductsQuery request, CancellationToken cancellationToken)
    {
        var query = request.QueryDto;
        var includeInactive = request.IncludeInactive;

        var page = Math.Max(query.Page, 1);
        var pageSize = Math.Clamp(query.PageSize, 1, 50);
        var catalogVersion = await GetCatalogVersionAsync(cancellationToken);
        var cacheKey = $"products:list:v{catalogVersion}:{(includeInactive ? "admin" : "public")}:{query.Search?.Trim().ToLowerInvariant() ?? "-"}:{query.Category?.Trim().ToLowerInvariant() ?? "-"}:{query.Brand?.Trim().ToLowerInvariant() ?? "-"}:{query.StockState?.Trim().ToLowerInvariant() ?? "-"}:{page}:{pageSize}";
        
        var cached = await TryGetStringAsync(cacheKey, cancellationToken);
        if (!string.IsNullOrWhiteSpace(cached))
        {
            var result = JsonSerializer.Deserialize<PagedResultDto<ProductSummaryDto>>(cached);
            if (result is not null)
            {
                cacheMetrics.RecordHit("products:list");
                logger.LogDebug("Product list cache hit for key {CacheKey}.", cacheKey);
                return result;
            }
        }
        cacheMetrics.RecordMiss("products:list");
        logger.LogDebug("Product list cache miss for key {CacheKey}.", cacheKey);

        var products = dbContext.Products
            .AsNoTracking()
            .Where(x => !x.IsDeleted)
            .AsQueryable();

        if (!includeInactive)
        {
            products = products.Where(x => x.IsActive);
        }

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var search = $"%{query.Search.Trim()}%";
            products = products.Where(x =>
                EF.Functions.ILike(x.Name, search) ||
                EF.Functions.ILike(x.Description, search) ||
                EF.Functions.ILike(x.Brand, search) ||
                x.Variants.Any(variant => EF.Functions.ILike(variant.Sku, search)));
        }

        if (!string.IsNullOrWhiteSpace(query.Brand))
        {
            var brand = query.Brand.Trim();
            products = products.Where(x => x.Brand == brand);
        }

        var projectedProducts = products
            .Select(product => new
            {
                product.Id,
                product.Name,
                product.Slug,
                Category = product.Category.Name,
                CategorySlug = product.Category.Slug,
                product.Brand,
                product.Status,
                product.Price,
                product.SalePrice,
                product.StockQuantity,
                product.IsActive,
                product.CreatedAtUtc,
                DefaultVariant = product.Variants
                    .OrderByDescending(variant => variant.IsDefault)
                    .ThenBy(variant => variant.CreatedAtUtc)
                    .Select(variant => new
                    {
                        ProductVariantId = (Guid?)variant.Id,
                        variant.Sku,
                        variant.Color,
                        variant.Size,
                        VariantPrice = (decimal?)variant.Price,
                        variant.SalePrice,
                        LowStockThreshold = (int?)variant.LowStockThreshold,
                        Inventory = variant.InventoryRecords
                            .OrderByDescending(inventory => inventory.UpdatedAtUtc)
                            .Select(inventory => new
                            {
                                QuantityOnHand = (int?)inventory.PiecesOnHand,
                                QuantityReserved = (int?)inventory.PiecesReserved
                            })
                            .FirstOrDefault()
                    })
                    .FirstOrDefault(),
                ImageUrl = product.Images
                    .OrderByDescending(image => image.IsPrimary)
                    .ThenBy(image => image.SortOrder)
                    .Select(image => image.ImageUrl)
                    .FirstOrDefault()
            });

        if (!string.IsNullOrWhiteSpace(query.Category))
        {
            var category = query.Category.Trim();
            projectedProducts = projectedProducts.Where(x =>
                x.CategorySlug == category ||
                x.Category == category);
        }

        if (!string.IsNullOrWhiteSpace(query.StockState))
        {
            var stockState = query.StockState.Trim().ToLowerInvariant();

            projectedProducts = stockState switch
            {
                "good" => projectedProducts.Where(x =>
                    ((x.DefaultVariant != null && x.DefaultVariant.Inventory != null ? x.DefaultVariant.Inventory.QuantityOnHand : null) ?? x.StockQuantity)
                    - ((x.DefaultVariant != null && x.DefaultVariant.Inventory != null ? x.DefaultVariant.Inventory.QuantityReserved : null) ?? 0)
                    > ((x.DefaultVariant != null ? x.DefaultVariant.LowStockThreshold : null) ?? 5)),
                "lowstock" or "low stock" => projectedProducts.Where(x =>
                    (((x.DefaultVariant != null && x.DefaultVariant.Inventory != null ? x.DefaultVariant.Inventory.QuantityOnHand : null) ?? x.StockQuantity)
                    - ((x.DefaultVariant != null && x.DefaultVariant.Inventory != null ? x.DefaultVariant.Inventory.QuantityReserved : null) ?? 0)) > 0
                    &&
                    (((x.DefaultVariant != null && x.DefaultVariant.Inventory != null ? x.DefaultVariant.Inventory.QuantityOnHand : null) ?? x.StockQuantity)
                    - ((x.DefaultVariant != null && x.DefaultVariant.Inventory != null ? x.DefaultVariant.Inventory.QuantityReserved : null) ?? 0))
                    <= ((x.DefaultVariant != null ? x.DefaultVariant.LowStockThreshold : null) ?? 5)),
                "outofstock" or "out of stock" => projectedProducts.Where(x =>
                    (((x.DefaultVariant != null && x.DefaultVariant.Inventory != null ? x.DefaultVariant.Inventory.QuantityOnHand : null) ?? x.StockQuantity)
                    - ((x.DefaultVariant != null && x.DefaultVariant.Inventory != null ? x.DefaultVariant.Inventory.QuantityReserved : null) ?? 0)) <= 0),
                _ => projectedProducts
            };
        }

        var totalCount = await projectedProducts.CountAsync(cancellationToken);
        var items = await projectedProducts
            .OrderByDescending(x => x.CreatedAtUtc)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(product => new ProductSummaryDto
            {
                Id = product.Id,
                ProductVariantId = product.DefaultVariant != null ? product.DefaultVariant.ProductVariantId : null,
                Name = product.Name,
                Slug = product.Slug,
                Category = product.Category,
                Brand = product.Brand,
                Status = product.Status,
                Sku = product.DefaultVariant != null ? product.DefaultVariant.Sku : null,
                Color = product.DefaultVariant != null ? product.DefaultVariant.Color : null,
                Size = product.DefaultVariant != null ? product.DefaultVariant.Size : null,
                Price = (product.DefaultVariant != null ? product.DefaultVariant.VariantPrice : null) ?? product.Price,
                SalePrice = (product.DefaultVariant != null ? product.DefaultVariant.SalePrice : null) ?? product.SalePrice,
                QuantityOnHand = (product.DefaultVariant != null && product.DefaultVariant.Inventory != null ? product.DefaultVariant.Inventory.QuantityOnHand : null) ?? product.StockQuantity,
                QuantityReserved = (product.DefaultVariant != null && product.DefaultVariant.Inventory != null ? product.DefaultVariant.Inventory.QuantityReserved : null) ?? 0,
                QuantityAvailable =
                    ((product.DefaultVariant != null && product.DefaultVariant.Inventory != null ? product.DefaultVariant.Inventory.QuantityOnHand : null) ?? product.StockQuantity)
                    - ((product.DefaultVariant != null && product.DefaultVariant.Inventory != null ? product.DefaultVariant.Inventory.QuantityReserved : null) ?? 0),
                StockQuantity =
                    ((product.DefaultVariant != null && product.DefaultVariant.Inventory != null ? product.DefaultVariant.Inventory.QuantityOnHand : null) ?? product.StockQuantity)
                    - ((product.DefaultVariant != null && product.DefaultVariant.Inventory != null ? product.DefaultVariant.Inventory.QuantityReserved : null) ?? 0),
                LowStockThreshold = (product.DefaultVariant != null ? product.DefaultVariant.LowStockThreshold : null) ?? 5,
                IsActive = product.IsActive,
                ImageUrl = product.ImageUrl
            })
            .ToListAsync(cancellationToken);

        var resultToCache = new PagedResultDto<ProductSummaryDto>
        {
            Items = items,
            Page = page,
            PageSize = pageSize,
            TotalCount = totalCount
        };

        await TrySetStringAsync(cacheKey, JsonSerializer.Serialize(resultToCache), cancellationToken);
        return resultToCache;
    }

    private async Task<string> GetCatalogVersionAsync(CancellationToken cancellationToken)
    {
        const string versionKey = "products:catalog:version";
        var version = await TryGetStringAsync(versionKey, cancellationToken);
        if (!string.IsNullOrWhiteSpace(version))
        {
            cacheMetrics.RecordHit("products:catalog:version");
            logger.LogDebug("Product catalog version cache hit for key {CacheKey}.", versionKey);
            return version;
        }

        cacheMetrics.RecordMiss("products:catalog:version");
        logger.LogDebug("Product catalog version cache miss for key {CacheKey}.", versionKey);
        version = "1";
        await TrySetStringAsync(versionKey, version, cancellationToken);
        return version;
    }

    private async Task<string?> TryGetStringAsync(string key, CancellationToken cancellationToken)
    {
        try
        {
            return await cache.GetStringAsync(key, cancellationToken);
        }
        catch (Exception exception)
        {
            logger.LogWarning(exception, "Redis-backed cache read failed for key {CacheKey}.", key);
            return null;
        }
    }

    private async Task TrySetStringAsync(string key, string value, CancellationToken cancellationToken)
    {
        try
        {
            await cache.SetStringAsync(key, value, CacheOptions, cancellationToken);
        }
        catch (Exception exception)
        {
            logger.LogWarning(exception, "Redis-backed cache write failed for key {CacheKey}.", key);
        }
    }
}
