using Booking.Application.Abstractions;
using Booking.Application.DTOs.Addresses;
using Booking.Application.Exceptions;
using Booking.Domain.Entities;
using Booking.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Logging;
using System.Text.Json;

namespace Booking.Infrastructure.Services;

public sealed class AddressService(
    BookingDbContext dbContext,
    IDistributedCache cache,
    ILogger<AddressService> logger,
    ICacheMetricsCollector cacheMetrics) : IAddressService
{
    private static readonly DistributedCacheEntryOptions CacheOptions = new()
    {
        AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(10)
    };

    public async Task<IReadOnlyList<AddressDto>> GetMyAddressesAsync(Guid userId, CancellationToken cancellationToken)
    {
        var cacheKey = GetCacheKey(userId);
        var cached = await TryGetAsync(cacheKey, cancellationToken);
        if (cached is not null)
        {
            cacheMetrics.RecordHit("addresses:list");
            logger.LogDebug("Address cache hit for user {UserId}.", userId);
            return cached;
        }
        cacheMetrics.RecordMiss("addresses:list");
        logger.LogDebug("Address cache miss for user {UserId}.", userId);

        var addresses = await dbContext.Addresses
            .AsNoTracking()
            .Where(x => x.UserId == userId)
            .OrderByDescending(x => x.IsDefaultShipping)
            .ThenBy(x => x.Label)
            .ToListAsync(cancellationToken);

        var result = addresses.Select(x => x.ToDto()).ToList();
        await TrySetAsync(cacheKey, result, cancellationToken);
        return result;
    }

    public async Task<AddressDto> CreateAsync(Guid userId, UpsertAddressDto request, CancellationToken cancellationToken)
    {
        var normalized = NormalizeRequest(request);
        var hasExistingAddresses = await dbContext.Addresses.AnyAsync(x => x.UserId == userId, cancellationToken);
        var shouldBeDefault = normalized.IsDefaultShipping || !hasExistingAddresses;

        if (shouldBeDefault)
        {
            await ClearDefaultShippingAsync(userId, null, cancellationToken);
        }

        var address = new Address
        {
            UserId = userId,
            Label = normalized.Label,
            RecipientName = normalized.RecipientName,
            Line1 = normalized.Line1,
            Line2 = normalized.Line2,
            City = normalized.City,
            StateOrProvince = normalized.StateOrProvince,
            PostalCode = normalized.PostalCode,
            Country = normalized.Country,
            PhoneNumber = normalized.PhoneNumber,
            IsDefaultShipping = shouldBeDefault
        };

        dbContext.Addresses.Add(address);
        await dbContext.SaveChangesAsync(cancellationToken);
        await TryRemoveAsync(GetCacheKey(userId), cancellationToken);

        return address.ToDto();
    }

    public async Task<AddressDto> UpdateAsync(
        Guid userId,
        Guid addressId,
        UpsertAddressDto request,
        CancellationToken cancellationToken)
    {
        var address = await dbContext.Addresses
            .FirstOrDefaultAsync(x => x.UserId == userId && x.Id == addressId, cancellationToken)
            ?? throw new NotFoundException("Address not found.");

        var normalized = NormalizeRequest(request);
        var hasOtherDefault = await dbContext.Addresses.AnyAsync(
            x => x.UserId == userId && x.Id != addressId && x.IsDefaultShipping,
            cancellationToken);
        var shouldBeDefault = normalized.IsDefaultShipping || !hasOtherDefault;

        if (shouldBeDefault)
        {
            await ClearDefaultShippingAsync(userId, addressId, cancellationToken);
        }

        address.Label = normalized.Label;
        address.RecipientName = normalized.RecipientName;
        address.Line1 = normalized.Line1;
        address.Line2 = normalized.Line2;
        address.City = normalized.City;
        address.StateOrProvince = normalized.StateOrProvince;
        address.PostalCode = normalized.PostalCode;
        address.Country = normalized.Country;
        address.PhoneNumber = normalized.PhoneNumber;
        address.IsDefaultShipping = shouldBeDefault;

        await dbContext.SaveChangesAsync(cancellationToken);
        await TryRemoveAsync(GetCacheKey(userId), cancellationToken);
        return address.ToDto();
    }

    public async Task DeleteAsync(Guid userId, Guid addressId, CancellationToken cancellationToken)
    {
        var address = await dbContext.Addresses
            .FirstOrDefaultAsync(x => x.UserId == userId && x.Id == addressId, cancellationToken)
            ?? throw new NotFoundException("Address not found.");

        var wasDefault = address.IsDefaultShipping;
        dbContext.Addresses.Remove(address);

        if (wasDefault)
        {
            var replacementAddress = await dbContext.Addresses
                .Where(x => x.UserId == userId && x.Id != addressId)
                .OrderBy(x => x.Label)
                .FirstOrDefaultAsync(cancellationToken);

            if (replacementAddress is not null)
            {
                replacementAddress.IsDefaultShipping = true;
            }
        }

        await dbContext.SaveChangesAsync(cancellationToken);
        await TryRemoveAsync(GetCacheKey(userId), cancellationToken);
    }

    private static string GetCacheKey(Guid userId) => $"addresses:{userId:N}";

    private async Task<IReadOnlyList<AddressDto>?> TryGetAsync(string cacheKey, CancellationToken cancellationToken)
    {
        try
        {
            var cached = await cache.GetStringAsync(cacheKey, cancellationToken);
            if (string.IsNullOrWhiteSpace(cached))
            {
                return null;
            }

            return JsonSerializer.Deserialize<List<AddressDto>>(cached);
        }
        catch (Exception exception)
        {
            logger.LogWarning(exception, "Address cache read failed for key {CacheKey}.", cacheKey);
            return null;
        }
    }

    private async Task TrySetAsync(string cacheKey, IReadOnlyList<AddressDto> addresses, CancellationToken cancellationToken)
    {
        try
        {
            await cache.SetStringAsync(
                cacheKey,
                JsonSerializer.Serialize(addresses),
                CacheOptions,
                cancellationToken);
        }
        catch (Exception exception)
        {
            logger.LogWarning(exception, "Address cache write failed for key {CacheKey}.", cacheKey);
        }
    }

    private async Task TryRemoveAsync(string cacheKey, CancellationToken cancellationToken)
    {
        try
        {
            await cache.RemoveAsync(cacheKey, cancellationToken);
        }
        catch (Exception exception)
        {
            logger.LogWarning(exception, "Address cache invalidation failed for key {CacheKey}.", cacheKey);
        }
    }

    private async Task ClearDefaultShippingAsync(Guid userId, Guid? excludedAddressId, CancellationToken cancellationToken)
    {
        var existingDefaults = await dbContext.Addresses
            .Where(x => x.UserId == userId && x.IsDefaultShipping && (!excludedAddressId.HasValue || x.Id != excludedAddressId.Value))
            .ToListAsync(cancellationToken);

        foreach (var existingDefault in existingDefaults)
        {
            existingDefault.IsDefaultShipping = false;
        }
    }

    private static UpsertAddressDto NormalizeRequest(UpsertAddressDto request)
    {
        var normalized = new UpsertAddressDto
        {
            Label = request.Label.Trim(),
            RecipientName = request.RecipientName.Trim(),
            Line1 = request.Line1.Trim(),
            Line2 = string.IsNullOrWhiteSpace(request.Line2) ? null : request.Line2.Trim(),
            City = request.City.Trim(),
            StateOrProvince = request.StateOrProvince.Trim(),
            PostalCode = request.PostalCode.Trim(),
            Country = request.Country.Trim(),
            PhoneNumber = request.PhoneNumber.Trim(),
            IsDefaultShipping = request.IsDefaultShipping
        };

        if (string.IsNullOrWhiteSpace(normalized.Label)
            || string.IsNullOrWhiteSpace(normalized.RecipientName)
            || string.IsNullOrWhiteSpace(normalized.Line1)
            || string.IsNullOrWhiteSpace(normalized.City)
            || string.IsNullOrWhiteSpace(normalized.StateOrProvince)
            || string.IsNullOrWhiteSpace(normalized.PostalCode)
            || string.IsNullOrWhiteSpace(normalized.Country)
            || string.IsNullOrWhiteSpace(normalized.PhoneNumber))
        {
            throw new ValidationException("All required address fields must be filled in.");
        }

        return normalized;
    }
}
