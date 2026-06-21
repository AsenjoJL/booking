using Booking.Application.DTOs.Categories;
using Booking.Application.DTOs.Products;
using Booking.Application.Exceptions;
using Booking.Domain.Entities;
using Booking.Infrastructure.Data;
using Booking.Infrastructure.Services;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;

namespace Booking.Tests.Application;

public sealed class InventoryServiceTests : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly DbContextOptions<BookingDbContext> _options;
    private readonly IDistributedCache _cache;

    public InventoryServiceTests()
    {
        _connection = new SqliteConnection("Data Source=:memory:");
        _connection.Open();
        _options = new DbContextOptionsBuilder<BookingDbContext>()
            .UseSqlite(_connection)
            .Options;

        var services = new ServiceCollection();
        services.AddDistributedMemoryCache();
        _cache = services.BuildServiceProvider().GetRequiredService<IDistributedCache>();

        using var context = new BookingDbContext(_options);
        context.Database.EnsureCreated();
    }

    [Fact]
    public async Task GetAdminProductsAsync_IncludesInactiveProducts_WhilePublicDoesNot()
    {
        await using var context = new BookingDbContext(_options);
        var fixture = await SeedInventoryAsync(context);
        var service = CreateProductService(context);

        var publicProducts = await service.GetProductsAsync(new ProductListQueryDto(), CancellationToken.None);
        var adminProducts = await service.GetAdminProductsAsync(new ProductListQueryDto(), CancellationToken.None);

        Assert.Single(publicProducts.Items);
        Assert.Equal(2, adminProducts.Items.Count);
        Assert.DoesNotContain(publicProducts.Items, item => item.Slug == fixture.HiddenSlug);
        Assert.Contains(adminProducts.Items, item => item.Slug == fixture.HiddenSlug);
    }

    [Fact]
    public async Task BulkUpdateVisibilityAsync_UpdatesProductsAndReturnsNewState()
    {
        await using var context = new BookingDbContext(_options);
        var fixture = await SeedInventoryAsync(context);
        var service = CreateProductService(context);
        var visibleProduct = await context.Products.SingleAsync(x => x.Slug == fixture.VisibleSlug);
        var originalConcurrencyStamp = visibleProduct.ConcurrencyStamp;

        var result = await service.BulkUpdateVisibilityAsync(
            new BulkUpdateProductVisibilityDto
            {
                Items =
                [
                    new BulkUpdateProductVisibilityItemDto
                    {
                        ProductId = visibleProduct.Id,
                        IsActive = false,
                        ConcurrencyStamp = visibleProduct.ConcurrencyStamp
                    }
                ]
            },
            CancellationToken.None);

        Assert.Single(result);
        Assert.False(result[0].IsActive);

        await using var verificationContext = new BookingDbContext(_options);
        var reloaded = await verificationContext.Products.SingleAsync(x => x.Id == visibleProduct.Id);
        Assert.False(reloaded.IsActive);
        Assert.NotEqual(originalConcurrencyStamp, reloaded.ConcurrencyStamp);
    }

    [Fact]
    public async Task UpdateAsync_NormalizesImageGallery_AndSetsSinglePrimary()
    {
        await using var seedContext = new BookingDbContext(_options);
        var fixture = await SeedInventoryAsync(seedContext);
        var product = await seedContext.Products
            .AsNoTracking()
            .Include(x => x.Images)
            .SingleAsync(x => x.Slug == fixture.VisibleSlug);

        await using var context = new BookingDbContext(_options);
        var service = CreateProductService(context);

        var result = await service.UpdateAsync(
            product.Id,
            new UpsertProductDto
            {
                Name = product.Name,
                Slug = product.Slug,
                Description = product.Description,
                Price = product.Price,
                SalePrice = product.SalePrice,
                StockQuantity = product.StockQuantity,
                IsActive = product.IsActive,
                CategoryId = product.CategoryId,
                ConcurrencyStamp = product.ConcurrencyStamp,
                Images =
                [
                    new UpsertProductImageDto
                    {
                        ImageUrl = "https://example.com/secondary.jpg",
                        IsPrimary = false,
                        SortOrder = 5
                    },
                    new UpsertProductImageDto
                    {
                        ImageUrl = "https://example.com/primary.jpg",
                        IsPrimary = true,
                        SortOrder = 1
                    }
                ]
            },
            CancellationToken.None);

        Assert.Equal(2, result.Images.Count);
        Assert.Equal("https://example.com/primary.jpg", result.ImageUrl);
        Assert.Equal("https://example.com/primary.jpg", result.Images[0].ImageUrl);
        Assert.True(result.Images[0].IsPrimary);
        Assert.False(result.Images[1].IsPrimary);
        Assert.Equal(0, result.Images[0].SortOrder);
        Assert.Equal(1, result.Images[1].SortOrder);
    }

    [Fact]
    public async Task DeleteAsync_ForCategoryWithProducts_ThrowsConflict()
    {
        await using var context = new BookingDbContext(_options);
        var fixture = await SeedInventoryAsync(context);
        var service = new CategoryService(context);

        var exception = await Assert.ThrowsAsync<ConflictException>(() =>
            service.DeleteAsync(fixture.CategoryId, CancellationToken.None));

        Assert.Contains("Move or delete products", exception.Message);
    }

    public void Dispose()
    {
        _connection.Dispose();
    }

    private ProductService CreateProductService(BookingDbContext context)
    {
        var inventoryLedger = new InventoryLedgerService(
            context,
            _cache,
            NullLogger<InventoryLedgerService>.Instance);

        return new ProductService(
            context,
            _cache,
            new NoOpInventoryLockService(),
            inventoryLedger,
            NullLogger<ProductService>.Instance,
            new CacheMetricsCollector());
    }

    private static async Task<(Guid CategoryId, string VisibleSlug, string HiddenSlug)> SeedInventoryAsync(
        BookingDbContext context)
    {
        context.OrderItems.RemoveRange(context.OrderItems);
        context.Orders.RemoveRange(context.Orders);
        context.CartItems.RemoveRange(context.CartItems);
        context.ProductImages.RemoveRange(context.ProductImages);
        context.Products.RemoveRange(context.Products);
        context.Categories.RemoveRange(context.Categories);
        await context.SaveChangesAsync();

        var category = new Category
        {
            Name = "Apparel",
            Slug = "apparel"
        };

        var visibleProduct = new Product
        {
            Name = "Visible Jacket",
            Slug = "visible-jacket",
            Description = "Visible catalog product",
            Price = 125m,
            StockQuantity = 8,
            IsActive = true,
            Category = category,
            Images =
            {
                new ProductImage
                {
                    ImageUrl = "https://example.com/original.jpg",
                    IsPrimary = true,
                    SortOrder = 0
                }
            }
        };

        var hiddenProduct = new Product
        {
            Name = "Hidden Jacket",
            Slug = "hidden-jacket",
            Description = "Hidden catalog product",
            Price = 140m,
            StockQuantity = 4,
            IsActive = false,
            Category = category
        };

        context.Categories.Add(category);
        context.Products.AddRange(visibleProduct, hiddenProduct);
        await context.SaveChangesAsync();

        return (category.Id, visibleProduct.Slug, hiddenProduct.Slug);
    }
}
