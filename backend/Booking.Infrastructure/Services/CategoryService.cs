using Booking.Application.Abstractions;
using Booking.Application.DTOs.Categories;
using Booking.Application.Exceptions;
using Booking.Domain.Entities;
using Booking.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Logging;
using System.Text.Json;

namespace Booking.Infrastructure.Services;

public sealed class CategoryService(
    BookingDbContext dbContext,
    IDistributedCache cache,
    ILogger<CategoryService> logger,
    ICacheMetricsCollector cacheMetrics) : ICategoryService
{
    private static readonly DistributedCacheEntryOptions CacheOptions = new()
    {
        AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(15)
    };

    private const string CategoriesCacheKey = "categories:list";

    public async Task<IReadOnlyList<CategoryDto>> GetCategoriesAsync(CancellationToken cancellationToken)
    {
        var cached = await TryGetAsync(cancellationToken);
        if (cached is not null)
        {
            cacheMetrics.RecordHit("categories:list");
            logger.LogDebug("Category cache hit for key {CacheKey}.", CategoriesCacheKey);
            return cached;
        }
        cacheMetrics.RecordMiss("categories:list");
        logger.LogDebug("Category cache miss for key {CacheKey}.", CategoriesCacheKey);

        var categories = await dbContext.Categories
            .AsNoTracking()
            .OrderBy(x => x.Name)
            .ToListAsync(cancellationToken);

        var result = categories.Select(x => x.ToDto()).ToList();
        await TrySetAsync(result, cancellationToken);
        return result;
    }

    public async Task<CategoryDto> CreateAsync(UpsertCategoryDto request, CancellationToken cancellationToken)
    {
        await EnsureUniqueSlugAsync(request.Slug, null, cancellationToken);
        await EnsureParentExistsAsync(request.ParentCategoryId, cancellationToken);

        var category = new Category
        {
            Name = request.Name.Trim(),
            Slug = request.Slug.Trim().ToLowerInvariant(),
            ParentCategoryId = request.ParentCategoryId
        };

        dbContext.Categories.Add(category);
        await dbContext.SaveChangesAsync(cancellationToken);
        await TryRemoveAsync(cancellationToken);
        return category.ToDto();
    }

    public async Task<CategoryDto> UpdateAsync(Guid categoryId, UpsertCategoryDto request, CancellationToken cancellationToken)
    {
        var category = await dbContext.Categories
            .FirstOrDefaultAsync(x => x.Id == categoryId, cancellationToken)
            ?? throw new NotFoundException("Category not found.");

        if (request.ParentCategoryId == categoryId)
        {
            throw new ValidationException("Category cannot be its own parent.");
        }

        await EnsureUniqueSlugAsync(request.Slug, categoryId, cancellationToken);
        await EnsureParentExistsAsync(request.ParentCategoryId, cancellationToken);

        category.Name = request.Name.Trim();
        category.Slug = request.Slug.Trim().ToLowerInvariant();
        category.ParentCategoryId = request.ParentCategoryId;

        await dbContext.SaveChangesAsync(cancellationToken);
        await TryRemoveAsync(cancellationToken);
        return category.ToDto();
    }

    public async Task DeleteAsync(Guid categoryId, CancellationToken cancellationToken)
    {
        var category = await dbContext.Categories
            .Include(x => x.Children)
            .Include(x => x.Products)
            .FirstOrDefaultAsync(x => x.Id == categoryId, cancellationToken)
            ?? throw new NotFoundException("Category not found.");

        if (category.Children.Count > 0)
        {
            throw new ConflictException("Remove child categories before deleting this category.");
        }

        if (category.Products.Count > 0)
        {
            throw new ConflictException("Move or delete products before deleting this category.");
        }

        dbContext.Categories.Remove(category);
        await dbContext.SaveChangesAsync(cancellationToken);
        await TryRemoveAsync(cancellationToken);
    }

    private async Task<IReadOnlyList<CategoryDto>?> TryGetAsync(CancellationToken cancellationToken)
    {
        try
        {
            var cached = await cache.GetStringAsync(CategoriesCacheKey, cancellationToken);
            if (string.IsNullOrWhiteSpace(cached))
            {
                return null;
            }

            return JsonSerializer.Deserialize<List<CategoryDto>>(cached);
        }
        catch (Exception exception)
        {
            logger.LogWarning(exception, "Category cache read failed.");
            return null;
        }
    }

    private async Task TrySetAsync(IReadOnlyList<CategoryDto> categories, CancellationToken cancellationToken)
    {
        try
        {
            await cache.SetStringAsync(
                CategoriesCacheKey,
                JsonSerializer.Serialize(categories),
                CacheOptions,
                cancellationToken);
        }
        catch (Exception exception)
        {
            logger.LogWarning(exception, "Category cache write failed.");
        }
    }

    private async Task TryRemoveAsync(CancellationToken cancellationToken)
    {
        try
        {
            await cache.RemoveAsync(CategoriesCacheKey, cancellationToken);
        }
        catch (Exception exception)
        {
            logger.LogWarning(exception, "Category cache invalidation failed.");
        }
    }

    private async Task EnsureUniqueSlugAsync(string slug, Guid? categoryId, CancellationToken cancellationToken)
    {
        var normalizedSlug = slug.Trim().ToLowerInvariant();
        var exists = await dbContext.Categories.AnyAsync(
            x => x.Slug == normalizedSlug && (!categoryId.HasValue || x.Id != categoryId.Value),
            cancellationToken);

        if (exists)
        {
            throw new ConflictException("Category slug already exists.");
        }
    }

    private async Task EnsureParentExistsAsync(Guid? parentCategoryId, CancellationToken cancellationToken)
    {
        if (!parentCategoryId.HasValue)
        {
            return;
        }

        var exists = await dbContext.Categories.AnyAsync(x => x.Id == parentCategoryId.Value, cancellationToken);
        if (!exists)
        {
            throw new NotFoundException("Parent category not found.");
        }
    }
}
