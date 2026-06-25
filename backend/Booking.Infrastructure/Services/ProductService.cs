using Booking.Application.Abstractions;
using Booking.Application.DTOs.Common;
using Booking.Application.DTOs.Products;
using Booking.Application.Exceptions;
using Booking.Domain.Entities;
using Booking.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Logging;
using Npgsql;
using System.Text.Json;

namespace Booking.Infrastructure.Services;

public sealed class ProductService(
    BookingDbContext dbContext,
    IDistributedCache cache,
    IInventoryLockService inventoryLockService,
    IInventoryLedgerService inventoryLedgerService,
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
        var executionStrategy = dbContext.Database.CreateExecutionStrategy();
        return await executionStrategy.ExecuteAsync(async () =>
        {
            await using var transaction = await dbContext.Database.BeginTransactionAsync(cancellationToken);

            var category = await dbContext.Categories
                .FirstOrDefaultAsync(x => x.Id == request.CategoryId, cancellationToken)
                ?? throw new NotFoundException("Category not found.");

            var resolvedSlug = await GenerateUniqueProductSlugAsync(
                request.Slug,
                request.Name,
                excludeProductId: null,
                cancellationToken);

            var product = new Product
            {
                Name = request.Name.Trim(),
                Slug = resolvedSlug,
                Description = request.Description.Trim(),
                Brand = request.Brand?.Trim() ?? string.Empty,
                Status = NormalizeStatus(request.Status, request.IsActive, request.StockQuantity),
                Price = request.Price,
                SalePrice = request.SalePrice,
                StockQuantity = request.StockQuantity,
                IsActive = request.IsActive,
                CategoryId = category.Id
            };

            ApplyProductImages(product, request);

            dbContext.Products.Add(product);
            await SaveProductWithSlugRetryAsync(
                product,
                request.Name,
                excludeProductId: null,
                cancellationToken);
            var (variant, inventory, _) = await inventoryLedgerService.GetOrCreateDefaultInventoryAsync(product, cancellationToken);
            variant.Sku = string.IsNullOrWhiteSpace(request.Sku) ? variant.Sku : request.Sku.Trim().ToUpperInvariant();
            variant.Color = string.IsNullOrWhiteSpace(request.Color) ? null : request.Color.Trim();
            variant.Size = string.IsNullOrWhiteSpace(request.Size) ? null : request.Size.Trim();
            variant.Price = request.Price;
            variant.SalePrice = request.SalePrice;
            variant.Status = product.Status;
            variant.LowStockThreshold = Math.Max(request.LowStockThreshold, 0);
            variant.UpdatedAtUtc = DateTime.UtcNow;
            variant.ConcurrencyStamp = Guid.NewGuid().ToString("N");
            inventory.PiecesOnHand = Math.Max(request.StockQuantity, 0);
            inventory.UpdatedAtUtc = DateTime.UtcNow;
            inventory.ConcurrencyStamp = Guid.NewGuid().ToString("N");
            try
            {
                await inventoryLedgerService.SyncProductSnapshotAsync(product, variant, inventory, cancellationToken);
            }
            catch (DbUpdateException ex) when (IsUniqueSkuConflict(ex))
            {
                throw new ValidationException("The provided SKU is already in use by an active or deleted product. Please provide a different SKU.");
            }
            await BumpCatalogVersionAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);

            var created = await LoadProductQuery()
                .FirstAsync(x => x.Id == product.Id, cancellationToken);

            return created.ToDetailDto();
        });
    }

    public async Task<ProductDetailDto> UpdateAsync(Guid productId, UpsertProductDto request, CancellationToken cancellationToken)
    {
        var executionStrategy = dbContext.Database.CreateExecutionStrategy();
        return await executionStrategy.ExecuteAsync(async () =>
        {
            await using var transaction = await dbContext.Database.BeginTransactionAsync(cancellationToken);

            var product = await dbContext.Products
                .Include(x => x.Images)
                .Include(x => x.Category)
                .FirstOrDefaultAsync(x => x.Id == productId && !x.IsDeleted, cancellationToken)
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

            var resolvedSlug = await GenerateUniqueProductSlugAsync(
                request.Slug,
                request.Name,
                productId,
                cancellationToken);

            product.Name = request.Name.Trim();
            product.Slug = resolvedSlug;
            product.Description = request.Description.Trim();
            product.Brand = request.Brand?.Trim() ?? string.Empty;
            product.Status = NormalizeStatus(request.Status, request.IsActive, request.StockQuantity);
            product.Price = request.Price;
            product.SalePrice = request.SalePrice;
            product.IsActive = request.IsActive;
            product.CategoryId = category.Id;
            product.ConcurrencyStamp = Guid.NewGuid().ToString("N");

            await SaveProductWithSlugRetryAsync(
                product,
                request.Name,
                productId,
                cancellationToken);
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

            var (variant, inventory, _) = await inventoryLedgerService.GetOrCreateDefaultInventoryAsync(product, cancellationToken);
            variant.Sku = string.IsNullOrWhiteSpace(request.Sku) ? variant.Sku : request.Sku.Trim().ToUpperInvariant();
            variant.Color = string.IsNullOrWhiteSpace(request.Color) ? null : request.Color.Trim();
            variant.Size = string.IsNullOrWhiteSpace(request.Size) ? null : request.Size.Trim();
            variant.Price = request.Price;
            variant.SalePrice = request.SalePrice;
            variant.Status = product.Status;
            variant.LowStockThreshold = Math.Max(request.LowStockThreshold, 0);
            variant.UpdatedAtUtc = DateTime.UtcNow;
            variant.ConcurrencyStamp = Guid.NewGuid().ToString("N");
            inventory.PiecesOnHand = Math.Max(request.StockQuantity, 0);
            inventory.UpdatedAtUtc = DateTime.UtcNow;
            inventory.ConcurrencyStamp = Guid.NewGuid().ToString("N");
            try
            {
                await inventoryLedgerService.SyncProductSnapshotAsync(product, variant, inventory, cancellationToken);
            }
            catch (DbUpdateException ex) when (IsUniqueSkuConflict(ex))
            {
                throw new ValidationException("The provided SKU is already in use by an active or deleted product. Please provide a different SKU.");
            }

            await BumpCatalogVersionAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
            var updated = await LoadProductQuery().FirstAsync(x => x.Id == product.Id, cancellationToken);
            return updated.ToDetailDto();
        });
    }

    public async Task<IReadOnlyList<ProductDetailDto>> BulkUpdateStockAsync(
        BulkUpdateProductStockDto request,
        CancellationToken cancellationToken)
    {
        if (request.Items.Count == 0)
        {
            throw new ValidationException("At least one stock update is required.");
        }

        var executionStrategy = dbContext.Database.CreateExecutionStrategy();
        return await executionStrategy.ExecuteAsync(async () =>
        {
            await using var transaction = await dbContext.Database.BeginTransactionAsync(cancellationToken);

            var productIds = request.Items.Select(x => x.ProductId).Distinct().ToList();
            await using var inventoryLock = await inventoryLockService.AcquireProductsAsync(productIds, cancellationToken);

            var products = await dbContext.Products
                .Include(x => x.Category)
                .Include(x => x.Images)
                .Where(x => productIds.Contains(x.Id) && !x.IsDeleted)
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

                var snapshot = await inventoryLedgerService.GetInventorySnapshotAsync(product.Id, cancellationToken);
                await inventoryLedgerService.AdjustInventoryAsync(
                    product.Id,
                    item.StockQuantity,
                    snapshot.QtyReserved,
                    "Bulk stock update",
                    cancellationToken);
            }

            await BumpCatalogVersionAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);

            var refreshed = await LoadProductQuery()
                .Where(x => productIds.Contains(x.Id) && !x.IsDeleted)
                .ToListAsync(cancellationToken);

            return refreshed.Select(x => x.ToDetailDto()).ToList();
        });
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
            .Where(x => productIds.Contains(x.Id) && !x.IsDeleted)
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
        var refreshed = await LoadProductQuery()
            .Where(x => productIds.Contains(x.Id))
            .ToListAsync(cancellationToken);
        return refreshed.Select(x => x.ToDetailDto()).ToList();
    }

    public async Task<InventorySnapshotDto> GetInventoryAsync(Guid productId, CancellationToken cancellationToken)
    {
        return await inventoryLedgerService.GetInventorySnapshotAsync(productId, cancellationToken);
    }

    public async Task<IReadOnlyList<InventoryMovementDto>> GetInventoryHistoryAsync(Guid productId, CancellationToken cancellationToken)
    {
        return await inventoryLedgerService.GetInventoryHistoryAsync(productId, cancellationToken);
    }

    public async Task<InventorySnapshotDto> AdjustInventoryAsync(
        Guid productId,
        AdjustInventoryDto request,
        CancellationToken cancellationToken)
    {
        var snapshot = await inventoryLedgerService.AdjustInventoryAsync(
            productId,
            request.QtyOnHand,
            request.QtyReserved,
            request.Note,
            cancellationToken);
        await BumpCatalogVersionAsync(cancellationToken);
        return snapshot;
    }

    public async Task DeleteAsync(Guid productId, CancellationToken cancellationToken)
    {
        var deletedAtUtc = DateTime.UtcNow;
        var concurrencyStamp = Guid.NewGuid().ToString("N");

        var affectedRows = await dbContext.Products
            .Where(x => x.Id == productId && !x.IsDeleted)
            .ExecuteUpdateAsync(
                setters => setters
                    .SetProperty(x => x.IsDeleted, true)
                    .SetProperty(x => x.IsActive, false)
                    .SetProperty(x => x.Status, "Deleted")
                    .SetProperty(x => x.DeletedAtUtc, deletedAtUtc)
                    .SetProperty(x => x.ConcurrencyStamp, concurrencyStamp),
                cancellationToken);

        if (affectedRows == 0)
        {
            throw new NotFoundException("Product not found.");
        }

        await BumpCatalogVersionAsync(cancellationToken);
    }

    private IQueryable<Product> LoadProductQuery() =>
        dbContext.Products
            .AsNoTracking()
            .Where(x => !x.IsDeleted)
            .Include(x => x.Category)
            .Include(x => x.Images)
            .Include(x => x.Variants)
            .ThenInclude(x => x.InventoryRecords)
            .ThenInclude(x => x.Warehouse);

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

    private async Task<string> GenerateUniqueProductSlugAsync(
        string? requestedSlug,
        string? productName,
        Guid? excludeProductId,
        CancellationToken cancellationToken)
    {
        var baseSlug = NormalizeSlug(requestedSlug);
        if (string.IsNullOrWhiteSpace(baseSlug))
        {
            baseSlug = NormalizeSlug(productName);
        }

        if (string.IsNullOrWhiteSpace(baseSlug))
        {
            baseSlug = $"product-{Guid.NewGuid():N}"[..20];
        }

        var candidate = baseSlug;
        var suffix = 2;

        while (await dbContext.Products.AnyAsync(
                   x => x.Slug == candidate
                        && (!excludeProductId.HasValue || x.Id != excludeProductId.Value),
                   cancellationToken))
        {
            candidate = $"{baseSlug}-{suffix}";
            suffix++;
        }

        return candidate;
    }

    private async Task SaveProductWithSlugRetryAsync(
        Product product,
        string? productName,
        Guid? excludeProductId,
        CancellationToken cancellationToken)
    {
        const int maxAttempts = 3;

        for (var attempt = 1; attempt <= maxAttempts; attempt++)
        {
            try
            {
                await dbContext.SaveChangesAsync(cancellationToken);
                return;
            }
            catch (DbUpdateException exception) when (IsUniqueSlugConflict(exception) && attempt < maxAttempts)
            {
                logger.LogWarning(
                    exception,
                    "Detected concurrent slug conflict for product {ProductName}. Retrying with a new slug. Attempt {Attempt}/{MaxAttempts}.",
                    productName,
                    attempt,
                    maxAttempts);

                product.Slug = await GenerateUniqueProductSlugAsync(
                    product.Slug,
                    productName,
                    excludeProductId,
                    cancellationToken);
            }
        }
    }

    private static bool IsUniqueSlugConflict(DbUpdateException exception)
    {
        return exception.InnerException is PostgresException postgresException
               && postgresException.SqlState == "23505"
               && string.Equals(postgresException.ConstraintName, "IX_Products_Slug", StringComparison.Ordinal);
    }

    private static bool IsUniqueSkuConflict(DbUpdateException exception)
    {
        return exception.InnerException is PostgresException postgresException
               && postgresException.SqlState == "23505"
               && string.Equals(postgresException.ConstraintName, "IX_ProductVariants_Sku", StringComparison.Ordinal);
    }

    private static string NormalizeSlug(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return string.Empty;
        }

        var normalized = value.Trim().ToLowerInvariant();
        var buffer = new List<char>(normalized.Length);
        var previousWasDash = false;

        foreach (var character in normalized)
        {
            if (char.IsLetterOrDigit(character))
            {
                buffer.Add(character);
                previousWasDash = false;
                continue;
            }

            if (previousWasDash)
            {
                continue;
            }

            buffer.Add('-');
            previousWasDash = true;
        }

        return new string(buffer.ToArray()).Trim('-');
    }

    private static string NormalizeStatus(string? requestedStatus, bool isActive, int stockQuantity)
    {
        if (!string.IsNullOrWhiteSpace(requestedStatus))
        {
            return requestedStatus.Trim();
        }

        if (!isActive)
        {
            return "Draft";
        }

        return stockQuantity <= 0 ? "OutOfStock" : "Active";
    }
}
