using Booking.Application.Abstractions;
using Booking.Application.DTOs.Common;
using Booking.Application.DTOs.Products;
using Booking.Application.Exceptions;
using Booking.Domain.Entities;
using Booking.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Logging;
using System.Text.Json;

namespace Booking.Infrastructure.Services;

public sealed class ProductService(
    BookingDbContext dbContext,
    IDistributedCache cache,
    IInventoryLockService inventoryLockService,
    ILogger<ProductService> logger,
    ICacheMetricsCollector cacheMetrics) : IProductService
{
    private static readonly DistributedCacheEntryOptions CacheOptions = new()
    {
        AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(3)
    };

    public async Task<PagedResultDto<ProductSummaryDto>> GetProductsAsync(
        ProductListQueryDto query,
        CancellationToken cancellationToken)
    {
        return await GetProductsCoreAsync(query, includeInactive: false, cancellationToken);
    }

    public async Task<PagedResultDto<ProductSummaryDto>> GetAdminProductsAsync(
        ProductListQueryDto query,
        CancellationToken cancellationToken)
    {
        return await GetProductsCoreAsync(query, includeInactive: true, cancellationToken);
    }

    private async Task<PagedResultDto<ProductSummaryDto>> GetProductsCoreAsync(
        ProductListQueryDto query,
        bool includeInactive,
        CancellationToken cancellationToken)
    {
        var page = Math.Max(query.Page, 1);
        var pageSize = Math.Clamp(query.PageSize, 1, 50);
        var catalogVersion = await GetCatalogVersionAsync(cancellationToken);
        var cacheKey = $"products:list:v{catalogVersion}:{(includeInactive ? "admin" : "public")}:{query.Search?.Trim().ToLowerInvariant() ?? "-"}:{query.Category?.Trim().ToLowerInvariant() ?? "-"}:{page}:{pageSize}";
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
            .Include(x => x.Category)
            .Include(x => x.Images)
            .AsQueryable();

        if (!includeInactive)
        {
            products = products.Where(x => x.IsActive);
        }

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var search = query.Search.Trim().ToLower();
            products = products.Where(x =>
                x.Name.ToLower().Contains(search) ||
                x.Description.ToLower().Contains(search));
        }

        if (!string.IsNullOrWhiteSpace(query.Category))
        {
            var category = query.Category.Trim().ToLower();
            products = products.Where(x => x.Category.Slug.ToLower() == category);
        }

        var totalCount = await products.CountAsync(cancellationToken);
        var items = await products
            .OrderByDescending(x => x.CreatedAtUtc)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        var resultToCache = new PagedResultDto<ProductSummaryDto>
        {
            Items = items.Select(x => x.ToSummaryDto()).ToList(),
            Page = page,
            PageSize = pageSize,
            TotalCount = totalCount
        };

        await TrySetStringAsync(cacheKey, JsonSerializer.Serialize(resultToCache), cancellationToken);
        return resultToCache;
    }

    public async Task<ProductDetailDto> GetBySlugAsync(string slug, CancellationToken cancellationToken)
    {
        return await GetBySlugCoreAsync(slug, includeInactive: false, cancellationToken);
    }

    public async Task<ProductDetailDto> GetAdminBySlugAsync(string slug, CancellationToken cancellationToken)
    {
        return await GetBySlugCoreAsync(slug, includeInactive: true, cancellationToken);
    }

    private async Task<ProductDetailDto> GetBySlugCoreAsync(
        string slug,
        bool includeInactive,
        CancellationToken cancellationToken)
    {
        var catalogVersion = await GetCatalogVersionAsync(cancellationToken);
        var cacheKey = $"products:detail:v{catalogVersion}:{(includeInactive ? "admin" : "public")}:{slug}";
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

        var product = await LoadProductQuery()
            .FirstOrDefaultAsync(x => x.Slug == slug && (includeInactive || x.IsActive), cancellationToken)
            ?? throw new NotFoundException("Product not found.");

        var dto = product.ToDetailDto();
        await TrySetStringAsync(cacheKey, JsonSerializer.Serialize(dto), cancellationToken);
        return dto;
    }

    public async Task<ProductDetailDto> CreateAsync(UpsertProductDto request, CancellationToken cancellationToken)
    {
        var category = await dbContext.Categories
            .FirstOrDefaultAsync(x => x.Id == request.CategoryId, cancellationToken)
            ?? throw new NotFoundException("Category not found.");

        if (await dbContext.Products.AnyAsync(x => x.Slug == request.Slug, cancellationToken))
        {
            throw new ConflictException("Product slug already exists.");
        }

        var product = new Product
        {
            Name = request.Name.Trim(),
            Slug = request.Slug.Trim().ToLowerInvariant(),
            Description = request.Description.Trim(),
            Price = request.Price,
            SalePrice = request.SalePrice,
            StockQuantity = request.StockQuantity,
            IsActive = request.IsActive,
            CategoryId = category.Id
        };

        ApplyProductImages(product, request);

        dbContext.Products.Add(product);
        await dbContext.SaveChangesAsync(cancellationToken);
        await BumpCatalogVersionAsync(cancellationToken);

        var created = await LoadProductQuery()
            .FirstAsync(x => x.Id == product.Id, cancellationToken);

        return created.ToDetailDto();
    }

    public async Task<ProductDetailDto> UpdateAsync(Guid productId, UpsertProductDto request, CancellationToken cancellationToken)
    {
        var product = await dbContext.Products
            .Include(x => x.Images)
            .Include(x => x.Category)
            .FirstOrDefaultAsync(x => x.Id == productId, cancellationToken)
            ?? throw new NotFoundException("Product not found.");

        var category = await dbContext.Categories
            .FirstOrDefaultAsync(x => x.Id == request.CategoryId, cancellationToken)
            ?? throw new NotFoundException("Category not found.");

        if (!string.Equals(product.ConcurrencyStamp, request.ConcurrencyStamp, StringComparison.Ordinal))
        {
            throw new ConcurrencyException("Product was updated by another request.");
        }

        dbContext.Entry(product).Property(x => x.ConcurrencyStamp).OriginalValue =
            request.ConcurrencyStamp ?? product.ConcurrencyStamp;

        var slugExists = await dbContext.Products.AnyAsync(
            x => x.Id != productId && x.Slug == request.Slug,
            cancellationToken);

        if (slugExists)
        {
            throw new ConflictException("Product slug already exists.");
        }

        product.Name = request.Name.Trim();
        product.Slug = request.Slug.Trim().ToLowerInvariant();
        product.Description = request.Description.Trim();
        product.Price = request.Price;
        product.SalePrice = request.SalePrice;
        product.StockQuantity = request.StockQuantity;
        product.IsActive = request.IsActive;
        product.CategoryId = category.Id;
        product.ConcurrencyStamp = Guid.NewGuid().ToString("N");

        await dbContext.SaveChangesAsync(cancellationToken);
        await dbContext.ProductImages
            .Where(x => x.ProductId == product.Id)
            .ExecuteDeleteAsync(cancellationToken);

        var replacementImages = BuildProductImages(request);
        if (replacementImages.Count > 0)
        {
            foreach (var image in replacementImages)
            {
                image.ProductId = product.Id;
            }

            dbContext.ProductImages.AddRange(replacementImages);
            await dbContext.SaveChangesAsync(cancellationToken);
        }

        await BumpCatalogVersionAsync(cancellationToken);
        var updated = await LoadProductQuery().FirstAsync(x => x.Id == product.Id, cancellationToken);
        return updated.ToDetailDto();
    }

    public async Task<IReadOnlyList<ProductDetailDto>> BulkUpdateStockAsync(
        BulkUpdateProductStockDto request,
        CancellationToken cancellationToken)
    {
        if (request.Items.Count == 0)
        {
            throw new ValidationException("At least one stock update is required.");
        }

        var productIds = request.Items.Select(x => x.ProductId).Distinct().ToList();
        await using var inventoryLock = await inventoryLockService.AcquireProductsAsync(productIds, cancellationToken);

        var products = await dbContext.Products
            .Include(x => x.Category)
            .Include(x => x.Images)
            .Where(x => productIds.Contains(x.Id))
            .ToListAsync(cancellationToken);

        if (products.Count != productIds.Count)
        {
            throw new NotFoundException("One or more products were not found.");
        }

        foreach (var item in request.Items)
        {
            if (item.StockQuantity < 0)
            {
                throw new ValidationException("Stock quantity cannot be negative.");
            }

            var product = products.First(x => x.Id == item.ProductId);
            if (!string.IsNullOrWhiteSpace(item.ConcurrencyStamp) &&
                !string.Equals(product.ConcurrencyStamp, item.ConcurrencyStamp, StringComparison.Ordinal))
            {
                throw new ConcurrencyException($"Product '{product.Name}' was updated by another request.");
            }

            if (!string.IsNullOrWhiteSpace(item.ConcurrencyStamp))
            {
                dbContext.Entry(product).Property(x => x.ConcurrencyStamp).OriginalValue = item.ConcurrencyStamp;
            }

            product.StockQuantity = item.StockQuantity;
            product.ConcurrencyStamp = Guid.NewGuid().ToString("N");
        }

        await dbContext.SaveChangesAsync(cancellationToken);
        await BumpCatalogVersionAsync(cancellationToken);

        return products.Select(x => x.ToDetailDto()).ToList();
    }

    public async Task<IReadOnlyList<ProductDetailDto>> BulkUpdateVisibilityAsync(
        BulkUpdateProductVisibilityDto request,
        CancellationToken cancellationToken)
    {
        if (request.Items.Count == 0)
        {
            throw new ValidationException("At least one visibility update is required.");
        }

        var productIds = request.Items.Select(x => x.ProductId).Distinct().ToList();
        var products = await dbContext.Products
            .Include(x => x.Category)
            .Include(x => x.Images)
            .Where(x => productIds.Contains(x.Id))
            .ToListAsync(cancellationToken);

        if (products.Count != productIds.Count)
        {
            throw new NotFoundException("One or more products were not found.");
        }

        foreach (var item in request.Items)
        {
            var product = products.First(x => x.Id == item.ProductId);
            if (!string.IsNullOrWhiteSpace(item.ConcurrencyStamp) &&
                !string.Equals(product.ConcurrencyStamp, item.ConcurrencyStamp, StringComparison.Ordinal))
            {
                throw new ConcurrencyException($"Product '{product.Name}' was updated by another request.");
            }

            if (!string.IsNullOrWhiteSpace(item.ConcurrencyStamp))
            {
                dbContext.Entry(product).Property(x => x.ConcurrencyStamp).OriginalValue = item.ConcurrencyStamp;
            }

            product.IsActive = item.IsActive;
            product.ConcurrencyStamp = Guid.NewGuid().ToString("N");
        }

        await dbContext.SaveChangesAsync(cancellationToken);
        await BumpCatalogVersionAsync(cancellationToken);
        return products.Select(x => x.ToDetailDto()).ToList();
    }

    public async Task DeleteAsync(Guid productId, CancellationToken cancellationToken)
    {
        var product = await dbContext.Products.FirstOrDefaultAsync(x => x.Id == productId, cancellationToken)
            ?? throw new NotFoundException("Product not found.");

        dbContext.Products.Remove(product);
        await dbContext.SaveChangesAsync(cancellationToken);
        await BumpCatalogVersionAsync(cancellationToken);
    }

    private IQueryable<Product> LoadProductQuery() =>
        dbContext.Products
            .AsNoTracking()
            .Include(x => x.Category)
            .Include(x => x.Images);

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

    private async Task BumpCatalogVersionAsync(CancellationToken cancellationToken)
    {
        const string versionKey = "products:catalog:version";
        await TrySetStringAsync(
            versionKey,
            DateTimeOffset.UtcNow.ToUnixTimeMilliseconds().ToString(),
            cancellationToken);
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

    private static void ApplyProductImages(
        Product product,
        UpsertProductDto request,
        BookingDbContext? dbContext = null)
    {
        var existingImages = product.Images.ToList();
        foreach (var existingImage in existingImages)
        {
            product.Images.Remove(existingImage);
            dbContext?.ProductImages.Remove(existingImage);
        }

        var requestedImages = BuildProductImages(request);

        if (requestedImages.Count > 0)
        {
            var primaryIndex = requestedImages.FindIndex(x => x.IsPrimary);
            primaryIndex = primaryIndex >= 0 ? primaryIndex : 0;

            for (var index = 0; index < requestedImages.Count; index++)
            {
                requestedImages[index].IsPrimary = index == primaryIndex;
                requestedImages[index].SortOrder = index;
                product.Images.Add(requestedImages[index]);
            }
        }
    }

    private static List<ProductImage> BuildProductImages(UpsertProductDto request)
    {
        var requestedImages = request.Images
            .Where(x => !string.IsNullOrWhiteSpace(x.ImageUrl))
            .Select((image, index) => new ProductImage
            {
                ImageUrl = image.ImageUrl.Trim(),
                IsPrimary = image.IsPrimary,
                SortOrder = image.SortOrder == 0 ? index : image.SortOrder
            })
            .OrderBy(x => x.SortOrder)
            .ToList();

        if (requestedImages.Count == 0 && !string.IsNullOrWhiteSpace(request.ImageUrl))
        {
            requestedImages.Add(new ProductImage
            {
                ImageUrl = request.ImageUrl.Trim(),
                IsPrimary = true,
                SortOrder = 0
            });
        }

        if (requestedImages.Count > 0)
        {
            var primaryIndex = requestedImages.FindIndex(x => x.IsPrimary);
            primaryIndex = primaryIndex >= 0 ? primaryIndex : 0;

            for (var index = 0; index < requestedImages.Count; index++)
            {
                requestedImages[index].IsPrimary = index == primaryIndex;
                requestedImages[index].SortOrder = index;
            }
        }

        return requestedImages;
    }
}
