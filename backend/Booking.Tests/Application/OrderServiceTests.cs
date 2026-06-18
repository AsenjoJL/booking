using Booking.Application.DTOs.Orders;
using Booking.Application.Abstractions;
using Booking.Domain.Entities;
using Booking.Infrastructure.Data;
using Booking.Infrastructure.Services;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;

namespace Booking.Tests.Application;

public sealed class OrderServiceTests : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly DbContextOptions<BookingDbContext> _options;
    private readonly IDistributedCache _cache;

    public OrderServiceTests()
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
    public async Task CheckoutAsync_DecrementsStock_AndClearsCart()
    {
        await using var context = new BookingDbContext(_options);
        var fixture = await SeedFixtureAsync(context);
        var service = CreateOrderService(context);

        var result = await service.CheckoutAsync(
            fixture.UserId,
            new CreateOrderDto
            {
                ShippingAddressId = fixture.AddressId,
                IdempotencyKey = "checkout-1"
            },
            CancellationToken.None);

        Assert.Single(result.Items);
        Assert.Equal(2, result.Items[0].Quantity);
        Assert.Equal("PendingPayment", result.Status);
        Assert.Equal("CashOnDelivery", result.PaymentMethod);
        Assert.Equal("Pending", result.PaymentStatus);
        Assert.Equal(0, await context.CartItems.CountAsync());

        var product = await context.Products.SingleAsync(x => x.Id == fixture.ProductId);
        Assert.Equal(3, product.StockQuantity);
    }

    [Fact]
    public async Task CheckoutAsync_IsIdempotent_ForRepeatedKey()
    {
        await using var context = new BookingDbContext(_options);
        var fixture = await SeedFixtureAsync(context);
        var service = CreateOrderService(context);

        var request = new CreateOrderDto
        {
            ShippingAddressId = fixture.AddressId,
            IdempotencyKey = "repeat-key"
        };

        var first = await service.CheckoutAsync(fixture.UserId, request, CancellationToken.None);
        var second = await service.CheckoutAsync(fixture.UserId, request, CancellationToken.None);

        Assert.Equal(first.Id, second.Id);
        Assert.Equal(1, await context.Orders.CountAsync());
        Assert.Equal(first.Total, second.Total);

        var product = await context.Products.SingleAsync(x => x.Id == fixture.ProductId);
        Assert.Equal(3, product.StockQuantity);
    }

    [Fact]
    public async Task CheckoutAsync_ReturnsOrder_WhenBackgroundSchedulingFails()
    {
        await using var context = new BookingDbContext(_options);
        var fixture = await SeedFixtureAsync(context);
        var service = new OrderService(
            context,
            _cache,
            new ThrowingOrderJobScheduler(),
            new NoOpInventoryLockService(),
            NullLogger<OrderService>.Instance,
            new CacheMetricsCollector());

        var result = await service.CheckoutAsync(
            fixture.UserId,
            new CreateOrderDto
            {
                ShippingAddressId = fixture.AddressId,
                IdempotencyKey = "scheduler-failure"
            },
            CancellationToken.None);

        Assert.NotEqual(Guid.Empty, result.Id);
        Assert.Equal(1, await context.Orders.CountAsync());
    }

    public void Dispose()
    {
        _connection.Dispose();
    }

    private OrderService CreateOrderService(BookingDbContext context)
    {
        return new OrderService(
            context,
            _cache,
            new NoOpOrderJobScheduler(),
            new NoOpInventoryLockService(),
            NullLogger<OrderService>.Instance,
            new CacheMetricsCollector());
    }

    private static async Task<(Guid UserId, Guid AddressId, Guid ProductId)> SeedFixtureAsync(BookingDbContext context)
    {
        context.OrderItems.RemoveRange(context.OrderItems);
        context.Orders.RemoveRange(context.Orders);
        context.CartItems.RemoveRange(context.CartItems);
        context.ProductImages.RemoveRange(context.ProductImages);
        context.Products.RemoveRange(context.Products);
        context.Categories.RemoveRange(context.Categories);
        context.Addresses.RemoveRange(context.Addresses);
        context.Users.RemoveRange(context.Users);
        await context.SaveChangesAsync();

        var user = new User
        {
            Id = Guid.NewGuid(),
            UserName = "customer@test.local",
            Email = "customer@test.local",
            FirstName = "Demo",
            LastName = "Customer"
        };

        var category = new Category
        {
            Name = "Apparel",
            Slug = "apparel"
        };

        var product = new Product
        {
            Name = "Inventory Safe Jacket",
            Slug = "inventory-safe-jacket",
            Description = "Test product",
            Price = 50m,
            StockQuantity = 5,
            Category = category
        };

        var address = new Address
        {
            UserId = user.Id,
            User = user,
            Label = "Home",
            RecipientName = "Demo Customer",
            Line1 = "123 Test Street",
            City = "Test City",
            StateOrProvince = "Test State",
            PostalCode = "1000",
            Country = "Philippines",
            PhoneNumber = "+63 900 000 0000",
            IsDefaultShipping = true
        };

        context.Users.Add(user);
        context.Categories.Add(category);
        context.Products.Add(product);
        context.Addresses.Add(address);
        await context.SaveChangesAsync();

        context.CartItems.Add(new CartItem
        {
            UserId = user.Id,
            ProductId = product.Id,
            Quantity = 2
        });

        await context.SaveChangesAsync();
        return (user.Id, address.Id, product.Id);
    }

    private sealed class NoOpOrderJobScheduler : IOrderJobScheduler
    {
        public void EnqueueOrderProcessing(Guid orderId)
        {
        }
    }

    private sealed class ThrowingOrderJobScheduler : IOrderJobScheduler
    {
        public void EnqueueOrderProcessing(Guid orderId)
        {
            throw new InvalidOperationException("Scheduler unavailable");
        }
    }
}
