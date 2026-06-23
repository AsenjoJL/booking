using Booking.Application.DTOs.Products;
using Booking.Application.Exceptions;
using Booking.Domain.Entities;
using Booking.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Logging;
using System.Text.Json;

namespace Booking.Infrastructure.Services;

public sealed class InventoryLedgerService(
    BookingDbContext dbContext,
    IDistributedCache cache,
    ILogger<InventoryLedgerService> logger) : IInventoryLedgerService
{
    private const string DefaultWarehouseCode = "MAIN";
    private static readonly DistributedCacheEntryOptions InventoryCacheOptions = new()
    {
        AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(3)
    };

    public async Task<(ProductVariant Variant, InventoryRecord Inventory, Warehouse Warehouse)> GetOrCreateDefaultInventoryAsync(
        Product product,
        CancellationToken cancellationToken)
    {
        var warehouse = await GetOrCreateDefaultWarehouseAsync(cancellationToken);

        var variant = await dbContext.ProductVariants
            .FirstOrDefaultAsync(x => x.ProductId == product.Id && x.IsDefault, cancellationToken);

        if (variant is null)
        {
            variant = new ProductVariant
            {
                ProductId = product.Id,
                Sku = BuildDefaultSku(product),
                Price = product.Price,
                SalePrice = product.SalePrice,
                Status = product.Status,
                IsDefault = true,
                LowStockThreshold = 5
            };

            dbContext.ProductVariants.Add(variant);
            await dbContext.SaveChangesAsync(cancellationToken);
        }

        var inventory = await dbContext.InventoryRecords
            .FirstOrDefaultAsync(
                x => x.ProductVariantId == variant.Id && x.WarehouseId == warehouse.Id,
                cancellationToken);

        if (inventory is null)
        {
            inventory = new InventoryRecord
            {
                ProductVariantId = variant.Id,
                WarehouseId = warehouse.Id,
                PiecesOnHand = Math.Max(product.StockQuantity, 0),
                PiecesReserved = 0
            };

            dbContext.InventoryRecords.Add(inventory);
            await dbContext.SaveChangesAsync(cancellationToken);

            if (inventory.PiecesOnHand > 0)
            {
                dbContext.InventoryMovements.Add(new InventoryMovement
                {
                    ProductVariantId = variant.Id,
                    WarehouseId = warehouse.Id,
                    MovementType = "BootstrapStock",
                    PiecesDelta = inventory.PiecesOnHand,
                    PiecesOnHandAfter = inventory.PiecesOnHand,
                    PiecesReservedAfter = inventory.PiecesReserved,
                    ReferenceType = "ProductBootstrap",
                    ReferenceId = product.Id,
                    Note = "Backfilled from product stock quantity."
                });

                await dbContext.SaveChangesAsync(cancellationToken);
            }
        }

        return (variant, inventory, warehouse);
    }

    public int GetAvailableQuantity(InventoryRecord inventory)
    {
        return Math.Max(0, inventory.PiecesOnHand - inventory.PiecesReserved);
    }

    public async Task SyncProductSnapshotAsync(
        Product product,
        ProductVariant variant,
        InventoryRecord inventory,
        CancellationToken cancellationToken)
    {
        product.Price = variant.Price;
        product.SalePrice = variant.SalePrice;
        product.StockQuantity = GetAvailableQuantity(inventory);
        product.Status = NormalizeProductStatus(product.Status, inventory);
        product.ConcurrencyStamp = Guid.NewGuid().ToString("N");

        await dbContext.SaveChangesAsync(cancellationToken);
        await InvalidateInventoryCacheAsync(product.Id, cancellationToken);
    }

    public async Task<InventorySnapshotDto> GetInventorySnapshotAsync(Guid productId, CancellationToken cancellationToken)
    {
        var cacheKey = GetInventorySnapshotCacheKey(productId);
        var cached = await TryGetStringAsync(cacheKey, cancellationToken);
        if (!string.IsNullOrWhiteSpace(cached))
        {
            var dto = JsonSerializer.Deserialize<InventorySnapshotDto>(cached);
            if (dto is not null)
            {
                return dto;
            }
        }

        var product = await dbContext.Products.FirstOrDefaultAsync(x => x.Id == productId && !x.IsDeleted, cancellationToken)
            ?? throw new NotFoundException("Product not found.");

        var (variant, inventory, warehouse) = await GetOrCreateDefaultInventoryAsync(product, cancellationToken);
        var categoryName = await dbContext.Categories
            .Where(x => x.Id == product.CategoryId)
            .Select(x => x.Name)
            .FirstAsync(cancellationToken);
        var result = ToInventorySnapshotDto(product, categoryName, variant, inventory, warehouse);
        await TrySetStringAsync(cacheKey, JsonSerializer.Serialize(result), cancellationToken);
        return result;
    }

    public async Task<IReadOnlyList<InventoryMovementDto>> GetInventoryHistoryAsync(Guid productId, CancellationToken cancellationToken)
    {
        var product = await dbContext.Products.FirstOrDefaultAsync(x => x.Id == productId && !x.IsDeleted, cancellationToken)
            ?? throw new NotFoundException("Product not found.");

        var (variant, _, warehouse) = await GetOrCreateDefaultInventoryAsync(product, cancellationToken);
        var movements = await dbContext.InventoryMovements
            .AsNoTracking()
            .Where(x => x.ProductVariantId == variant.Id)
            .OrderByDescending(x => x.CreatedAtUtc)
            .Take(200)
            .ToListAsync(cancellationToken);

        return movements
            .Select(x => new InventoryMovementDto
            {
                Id = x.Id,
                ProductVariantId = x.ProductVariantId,
                Sku = variant.Sku,
                WarehouseCode = warehouse.Code,
                MovementType = x.MovementType,
                QtyDelta = x.PiecesDelta,
                QtyOnHandAfter = x.PiecesOnHandAfter,
                QtyReservedAfter = x.PiecesReservedAfter,
                ReferenceType = x.ReferenceType,
                ReferenceId = x.ReferenceId,
                Note = x.Note,
                CreatedAtUtc = x.CreatedAtUtc
            })
            .ToList();
    }

    public async Task<InventorySnapshotDto> AdjustInventoryAsync(
        Guid productId,
        int targetPiecesOnHand,
        int targetPiecesReserved,
        string? note,
        CancellationToken cancellationToken)
    {
        if (targetPiecesOnHand < 0)
        {
            throw new ValidationException("Inventory quantity cannot be negative.");
        }

        if (targetPiecesReserved < 0)
        {
            throw new ValidationException("Reserved quantity cannot be negative.");
        }

        if (targetPiecesReserved > targetPiecesOnHand)
        {
            throw new ValidationException("Reserved quantity cannot be greater than current stock.");
        }

        var product = await dbContext.Products.FirstOrDefaultAsync(x => x.Id == productId && !x.IsDeleted, cancellationToken)
            ?? throw new NotFoundException("Product not found.");

        var (variant, inventory, warehouse) = await GetOrCreateLockedInventoryAsync(product, cancellationToken);
        var delta = targetPiecesOnHand - inventory.PiecesOnHand;
        inventory.PiecesOnHand = targetPiecesOnHand;
        inventory.PiecesReserved = targetPiecesReserved;
        inventory.UpdatedAtUtc = DateTime.UtcNow;
        inventory.ConcurrencyStamp = Guid.NewGuid().ToString("N");

        dbContext.InventoryMovements.Add(new InventoryMovement
        {
            ProductVariantId = variant.Id,
            WarehouseId = warehouse.Id,
            MovementType = delta >= 0 ? "StockIn" : "Adjustment",
            PiecesDelta = delta,
            PiecesOnHandAfter = inventory.PiecesOnHand,
            PiecesReservedAfter = inventory.PiecesReserved,
            ReferenceType = "AdminAdjustment",
            ReferenceId = product.Id,
            Note = note
        });

        await SyncProductSnapshotAsync(product, variant, inventory, cancellationToken);
        var categoryName = await dbContext.Categories
            .Where(x => x.Id == product.CategoryId)
            .Select(x => x.Name)
            .FirstAsync(cancellationToken);
        var dto = ToInventorySnapshotDto(product, categoryName, variant, inventory, warehouse);
        await TrySetStringAsync(GetInventorySnapshotCacheKey(productId), JsonSerializer.Serialize(dto), cancellationToken);
        return dto;
    }

    public async Task ReserveAsync(
        Product product,
        int quantity,
        string referenceType,
        Guid? referenceId,
        string? note,
        CancellationToken cancellationToken)
    {
        var (variant, inventory, warehouse) = await GetOrCreateLockedInventoryAsync(product, cancellationToken);
        if (GetAvailableQuantity(inventory) < quantity)
        {
            throw new ConflictException($"Insufficient stock for '{product.Name}'.");
        }

        inventory.PiecesReserved += quantity;
        inventory.UpdatedAtUtc = DateTime.UtcNow;
        inventory.ConcurrencyStamp = Guid.NewGuid().ToString("N");

        dbContext.InventoryMovements.Add(new InventoryMovement
        {
            ProductVariantId = variant.Id,
            WarehouseId = warehouse.Id,
            MovementType = "Reserve",
            PiecesDelta = quantity,
            PiecesOnHandAfter = inventory.PiecesOnHand,
            PiecesReservedAfter = inventory.PiecesReserved,
            ReferenceType = referenceType,
            ReferenceId = referenceId,
            Note = note
        });

        await SyncProductSnapshotAsync(product, variant, inventory, cancellationToken);
    }

    public async Task CommitReservationAsync(
        Product product,
        int quantity,
        string referenceType,
        Guid? referenceId,
        string? note,
        CancellationToken cancellationToken)
    {
        var (variant, inventory, warehouse) = await GetOrCreateLockedInventoryAsync(product, cancellationToken);
        if (inventory.PiecesReserved < quantity)
        {
            throw new ConflictException($"Reserved stock is lower than the requested deduction for '{product.Name}'.");
        }

        inventory.PiecesReserved -= quantity;
        inventory.PiecesOnHand -= quantity;
        inventory.UpdatedAtUtc = DateTime.UtcNow;
        inventory.ConcurrencyStamp = Guid.NewGuid().ToString("N");

        dbContext.InventoryMovements.Add(new InventoryMovement
        {
            ProductVariantId = variant.Id,
            WarehouseId = warehouse.Id,
            MovementType = "StockOut",
            PiecesDelta = -quantity,
            PiecesOnHandAfter = inventory.PiecesOnHand,
            PiecesReservedAfter = inventory.PiecesReserved,
            ReferenceType = referenceType,
            ReferenceId = referenceId,
            Note = note
        });

        await SyncProductSnapshotAsync(product, variant, inventory, cancellationToken);
    }

    public async Task ReleaseReservationAsync(
        Product product,
        int quantity,
        string referenceType,
        Guid? referenceId,
        string? note,
        CancellationToken cancellationToken)
    {
        var (variant, inventory, warehouse) = await GetOrCreateLockedInventoryAsync(product, cancellationToken);
        if (inventory.PiecesReserved < quantity)
        {
            throw new ConflictException($"Reserved stock is lower than the requested release for '{product.Name}'.");
        }

        inventory.PiecesReserved -= quantity;
        inventory.UpdatedAtUtc = DateTime.UtcNow;
        inventory.ConcurrencyStamp = Guid.NewGuid().ToString("N");

        dbContext.InventoryMovements.Add(new InventoryMovement
        {
            ProductVariantId = variant.Id,
            WarehouseId = warehouse.Id,
            MovementType = "Release",
            PiecesDelta = -quantity,
            PiecesOnHandAfter = inventory.PiecesOnHand,
            PiecesReservedAfter = inventory.PiecesReserved,
            ReferenceType = referenceType,
            ReferenceId = referenceId,
            Note = note
        });

        await SyncProductSnapshotAsync(product, variant, inventory, cancellationToken);
    }

    private async Task<(ProductVariant Variant, InventoryRecord Inventory, Warehouse Warehouse)> GetOrCreateLockedInventoryAsync(
        Product product,
        CancellationToken cancellationToken)
    {
        var (variant, _, warehouse) = await GetOrCreateDefaultInventoryAsync(product, cancellationToken);

        var lockedInventory = dbContext.Database.IsNpgsql()
            ? await dbContext.InventoryRecords
                .FromSqlInterpolated($@"SELECT * FROM ""InventoryRecords"" WHERE ""ProductVariantId"" = {variant.Id} AND ""WarehouseId"" = {warehouse.Id} FOR UPDATE")
                .FirstAsync(cancellationToken)
            : await dbContext.InventoryRecords
                .FirstAsync(x => x.ProductVariantId == variant.Id && x.WarehouseId == warehouse.Id, cancellationToken);

        var lockedVariant = dbContext.Database.IsNpgsql()
            ? await dbContext.ProductVariants
                .FromSqlInterpolated($@"SELECT * FROM ""ProductVariants"" WHERE ""Id"" = {variant.Id} FOR UPDATE")
                .FirstAsync(cancellationToken)
            : await dbContext.ProductVariants.FirstAsync(x => x.Id == variant.Id, cancellationToken);

        return (lockedVariant, lockedInventory, warehouse);
    }

    private async Task<Warehouse> GetOrCreateDefaultWarehouseAsync(CancellationToken cancellationToken)
    {
        var warehouse = await dbContext.Warehouses.FirstOrDefaultAsync(x => x.Code == DefaultWarehouseCode, cancellationToken);
        if (warehouse is not null)
        {
            return warehouse;
        }

        warehouse = new Warehouse
        {
            Name = "Main Warehouse",
            Code = DefaultWarehouseCode,
            IsActive = true
        };

        dbContext.Warehouses.Add(warehouse);
        await dbContext.SaveChangesAsync(cancellationToken);
        return warehouse;
    }

    private static string BuildDefaultSku(Product product)
    {
        var slug = string.Concat(product.Slug
            .Where(char.IsLetterOrDigit))
            .ToUpperInvariant();

        if (slug.Length > 12)
        {
            slug = slug[..12];
        }

        return $"{slug}-{product.Id.ToString("N")[..8].ToUpperInvariant()}";
    }

    private static string NormalizeProductStatus(string currentStatus, InventoryRecord inventory)
    {
        var normalized = string.IsNullOrWhiteSpace(currentStatus) ? "Draft" : currentStatus.Trim();
        if (string.Equals(normalized, "Archived", StringComparison.OrdinalIgnoreCase) ||
            string.Equals(normalized, "Deleted", StringComparison.OrdinalIgnoreCase) ||
            string.Equals(normalized, "Draft", StringComparison.OrdinalIgnoreCase))
        {
            return normalized;
        }

        return inventory.PiecesOnHand - inventory.PiecesReserved <= 0 ? "OutOfStock" : "Active";
    }

    private static InventorySnapshotDto ToInventorySnapshotDto(
        Product product,
        string categoryName,
        ProductVariant variant,
        InventoryRecord inventory,
        Warehouse warehouse)
    {
        var piecesAvailable = Math.Max(0, inventory.PiecesOnHand - inventory.PiecesReserved);
        return new InventorySnapshotDto
        {
            ProductId = product.Id,
            ProductVariantId = variant.Id,
            ProductName = product.Name,
            Category = categoryName,
            Sku = variant.Sku,
            Color = variant.Color,
            Size = variant.Size,
            WarehouseCode = warehouse.Code,
            QtyOnHand = inventory.PiecesOnHand,
            QtyReserved = inventory.PiecesReserved,
            QtyAvailable = piecesAvailable,
            LowStockThreshold = variant.LowStockThreshold,
            IsLowStock = piecesAvailable <= variant.LowStockThreshold,
            UpdatedAtUtc = inventory.UpdatedAtUtc
        };
    }

    private static string GetInventorySnapshotCacheKey(Guid productId) => $"inventory:snapshot:{productId:N}";

    private async Task InvalidateInventoryCacheAsync(Guid productId, CancellationToken cancellationToken)
    {
        try
        {
            await cache.RemoveAsync(GetInventorySnapshotCacheKey(productId), cancellationToken);
        }
        catch (Exception exception)
        {
            logger.LogWarning(exception, "Inventory cache invalidation failed for product {ProductId}.", productId);
        }
    }

    private async Task<string?> TryGetStringAsync(string key, CancellationToken cancellationToken)
    {
        try
        {
            return await cache.GetStringAsync(key, cancellationToken);
        }
        catch (Exception exception)
        {
            logger.LogWarning(exception, "Inventory cache read failed for key {CacheKey}.", key);
            return null;
        }
    }

    private async Task TrySetStringAsync(string key, string value, CancellationToken cancellationToken)
    {
        try
        {
            await cache.SetStringAsync(key, value, InventoryCacheOptions, cancellationToken);
        }
        catch (Exception exception)
        {
            logger.LogWarning(exception, "Inventory cache write failed for key {CacheKey}.", key);
        }
    }
}
