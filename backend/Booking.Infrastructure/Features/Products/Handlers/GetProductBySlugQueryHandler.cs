using Booking.Application.DTOs.Products;
using Booking.Application.Exceptions;
using Booking.Application.Features.Products.Queries;
using Booking.Domain.Entities;
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

internal sealed class GetProductBySlugQueryHandler(
    BookingDbContext dbContext,
    IDistributedCache cache,
    ILogger<GetProductBySlugQueryHandler> logger,
    ICacheMetricsCollector cacheMetrics) : IRequestHandler<GetProductBySlugQuery, ProductDetailDto>
{
    private static readonly DistributedCacheEntryOptions CacheOptions = new()
    {
        AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(3)
    };

    public async Task<ProductDetailDto> Handle(GetProductBySlugQuery request, CancellationToken cancellationToken)
    {
        var catalogVersion = await GetCatalogVersionAsync(cancellationToken);
        var cacheKey = $"products:detail:v{catalogVersion}:{(request.IncludeInactive ? "admin" : "public")}:{request.Slug}";
        
        var cached = await TryGetStringAsync(cacheKey, cancellationToken);
        if (!string.IsNullOrWhiteSpace(cached))
        {
            var result = JsonSerializer.Deserialize<ProductDetailDto>(cached);
            if (result is not null)
            {
                cacheMetrics.RecordHit("products:detail");
                logger.LogDebug("Product detail cache hit for key {CacheKey}.", cacheKey);
                return result;
            }
        }
        cacheMetrics.RecordMiss("products:detail");
        logger.LogDebug("Product detail cache miss for key {CacheKey}.", cacheKey);

        var product = await dbContext.Products
            .AsNoTracking()
            .Where(x => !x.IsDeleted)
            .Include(x => x.Category)
            .Include(x => x.Images)
            .Include(x => x.Variants)
            .ThenInclude(x => x.InventoryRecords)
            .ThenInclude(x => x.Warehouse)
            .FirstOrDefaultAsync(x => x.Slug == request.Slug && (request.IncludeInactive || x.IsActive), cancellationToken)
            ?? throw new NotFoundException("Product not found.");

        var dto = product.ToDetailDto();
        await TrySetStringAsync(cacheKey, JsonSerializer.Serialize(dto), cancellationToken);
        return dto;
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
