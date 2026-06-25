using Booking.Application.DTOs.Addresses;
using Booking.Infrastructure.Data;
using Booking.Infrastructure.Services;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;

namespace Booking.Tests.Application;

public sealed class AddressServiceTests : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly DbContextOptions<BookingDbContext> _options;
    private readonly IDistributedCache _cache;

    public AddressServiceTests()
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
    public async Task CreateAsync_FirstAddressBecomesDefault_AndNewDefaultClearsPreviousOne()
    {
        await using var context = new BookingDbContext(_options);
        var userId = await SeedUserAsync(context);
        var service = CreateAddressService(context);

        var first = await service.CreateAsync(
            userId,
            new UpsertAddressDto
            {
                Label = "Home",
                RecipientName = "Demo Customer",
                Line1 = "123 Test Street",
                City = "Manila",
                StateOrProvince = "Metro Manila",
                PostalCode = "1000",
                Country = "Philippines",
                PhoneNumber = "+63 900 000 0000",
                IsDefaultShipping = false
            },
            CancellationToken.None);

        var second = await service.CreateAsync(
            userId,
            new UpsertAddressDto
            {
                Label = "Office",
                RecipientName = "Demo Customer",
                Line1 = "456 Work Avenue",
                City = "Makati",
                StateOrProvince = "Metro Manila",
                PostalCode = "1200",
                Country = "Philippines",
                PhoneNumber = "+63 900 000 0001",
                IsDefaultShipping = true
            },
            CancellationToken.None);

        Assert.True(first.IsDefaultShipping);
        Assert.True(second.IsDefaultShipping);

        var addresses = await service.GetMyAddressesAsync(userId, CancellationToken.None);
        Assert.Equal(2, addresses.Count);
        Assert.Single(addresses, x => x.IsDefaultShipping);
        Assert.Equal(second.Id, addresses.Single(x => x.IsDefaultShipping).Id);
    }

    [Fact]
    public async Task DeleteAsync_DefaultAddressPromotesReplacement()
    {
        await using var context = new BookingDbContext(_options);
        var userId = await SeedUserAsync(context);
        var service = CreateAddressService(context);

        var first = await service.CreateAsync(
            userId,
            new UpsertAddressDto
            {
                Label = "Home",
                RecipientName = "Demo Customer",
                Line1 = "123 Test Street",
                City = "Manila",
                StateOrProvince = "Metro Manila",
                PostalCode = "1000",
                Country = "Philippines",
                PhoneNumber = "+63 900 000 0000",
                IsDefaultShipping = true
            },
            CancellationToken.None);

        var second = await service.CreateAsync(
            userId,
            new UpsertAddressDto
            {
                Label = "Office",
                RecipientName = "Demo Customer",
                Line1 = "456 Work Avenue",
                City = "Makati",
                StateOrProvince = "Metro Manila",
                PostalCode = "1200",
                Country = "Philippines",
                PhoneNumber = "+63 900 000 0001",
                IsDefaultShipping = false
            },
            CancellationToken.None);

        await service.DeleteAsync(userId, first.Id, CancellationToken.None);

        var addresses = await service.GetMyAddressesAsync(userId, CancellationToken.None);
        Assert.Single(addresses);
        Assert.Equal(second.Id, addresses[0].Id);
        Assert.True(addresses[0].IsDefaultShipping);
    }

    public void Dispose()
    {
        _connection.Dispose();
    }

    private AddressService CreateAddressService(BookingDbContext context) =>
        new(
            context,
            _cache,
            NullLogger<AddressService>.Instance,
            new CacheMetricsCollector());

    private static async Task<Guid> SeedUserAsync(BookingDbContext context)
    {
        context.Addresses.RemoveRange(context.Addresses);
        context.Users.RemoveRange(context.Users);
        await context.SaveChangesAsync();

        var user = new Domain.Entities.User
        {
            Id = Guid.NewGuid(),
            UserName = "address-user@test.local",
            Email = "address-user@test.local",
            FirstName = "Address",
            LastName = "Tester"
        };

        context.Users.Add(user);
        await context.SaveChangesAsync();
        return user.Id;
    }
}
