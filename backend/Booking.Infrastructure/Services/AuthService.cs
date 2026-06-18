using System.Security.Cryptography;
using System.Text;
using Booking.Application.Abstractions;
using Booking.Application.DTOs.Auth;
using Booking.Application.Exceptions;
using Booking.Domain.Entities;
using Booking.Infrastructure.Data;
using Booking.Infrastructure.Identity;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using System.Text.Json;

namespace Booking.Infrastructure.Services;

public sealed class AuthService(
    UserManager<User> userManager,
    JwtTokenFactory tokenFactory,
    BookingDbContext dbContext,
    IOptions<JwtOptions> jwtOptions,
    IDistributedCache cache,
    ILogger<AuthService> logger,
    ICacheMetricsCollector cacheMetrics) : IAuthService
{
    private readonly JwtOptions _jwtOptions = jwtOptions.Value;
    private static readonly DistributedCacheEntryOptions UserCacheOptions = new()
    {
        AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(5)
    };

    public async Task<AuthResponseDto> RegisterAsync(RegisterRequestDto request, CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();

        var existing = await userManager.FindByEmailAsync(request.Email);
        if (existing is not null)
        {
            throw new ConflictException("An account with this email already exists.");
        }

        var user = new User
        {
            UserName = request.Email,
            Email = request.Email,
            FirstName = request.FirstName.Trim(),
            LastName = request.LastName.Trim(),
            EmailConfirmed = true,
            LockoutEnabled = true
        };

        var result = await userManager.CreateAsync(user, request.Password);
        if (!result.Succeeded)
        {
            throw new ValidationException(string.Join("; ", result.Errors.Select(x => x.Description)));
        }

        await userManager.AddToRoleAsync(user, "Customer");
        return await IssueSessionAsync(user, familyId: null, cancellationToken);
    }

    public async Task<AuthResponseDto> LoginAsync(LoginRequestDto request, CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();

        var user = await userManager.FindByEmailAsync(request.Email)
            ?? throw new AppUnauthorizedException("Invalid credentials.");

        if (await userManager.IsLockedOutAsync(user))
        {
            throw new AppUnauthorizedException("Account temporarily locked. Please try again later.");
        }

        if (!await userManager.CheckPasswordAsync(user, request.Password))
        {
            await userManager.AccessFailedAsync(user);
            throw new AppUnauthorizedException("Invalid credentials.");
        }

        await userManager.ResetAccessFailedCountAsync(user);
        return await IssueSessionAsync(user, familyId: null, cancellationToken);
    }

    public async Task<AuthResponseDto> RefreshAsync(RefreshTokenRequestDto request, CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();

        if (string.IsNullOrWhiteSpace(request.RefreshToken))
        {
            throw new ValidationException("Refresh token is required.");
        }

        var tokenHash = ComputeTokenHash(request.RefreshToken);
        var refreshToken = await dbContext.RefreshTokens
            .Include(x => x.User)
            .FirstOrDefaultAsync(x => x.TokenHash == tokenHash, cancellationToken)
            ?? throw new AppUnauthorizedException("Refresh token is invalid.");

        if (refreshToken.RevokedAtUtc is not null)
        {
            await RevokeRefreshTokenFamilyAsync(refreshToken.UserId, refreshToken.FamilyId, cancellationToken);
            throw new AppUnauthorizedException("Refresh token has already been used.");
        }

        if (refreshToken.ExpiresAtUtc <= DateTime.UtcNow)
        {
            throw new AppUnauthorizedException("Refresh token expired.");
        }

        refreshToken.RevokedAtUtc = DateTime.UtcNow;
        var nextSession = await IssueSessionAsync(refreshToken.User, refreshToken.FamilyId, cancellationToken);
        refreshToken.ReplacedByTokenHash = ComputeTokenHash(nextSession.RefreshToken);
        await dbContext.SaveChangesAsync(cancellationToken);
        return nextSession;
    }

    public async Task RevokeRefreshTokenAsync(
        Guid userId,
        RevokeRefreshTokenRequestDto request,
        CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();

        if (string.IsNullOrWhiteSpace(request.RefreshToken))
        {
            throw new ValidationException("Refresh token is required.");
        }

        var tokenHash = ComputeTokenHash(request.RefreshToken);
        var refreshToken = await dbContext.RefreshTokens
            .FirstOrDefaultAsync(x => x.UserId == userId && x.TokenHash == tokenHash, cancellationToken)
            ?? throw new NotFoundException("Refresh token not found.");

        if (refreshToken.RevokedAtUtc is null)
        {
            refreshToken.RevokedAtUtc = DateTime.UtcNow;
            await dbContext.SaveChangesAsync(cancellationToken);
        }
    }

    public async Task<UserDto> GetCurrentUserAsync(Guid userId, CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();

        var cacheKey = GetCurrentUserCacheKey(userId);
        var cached = await TryGetCachedUserAsync(cacheKey, cancellationToken);
        if (cached is not null)
        {
            cacheMetrics.RecordHit("auth:user");
            logger.LogDebug("Current user cache hit for user {UserId}.", userId);
            return cached;
        }
        cacheMetrics.RecordMiss("auth:user");
        logger.LogDebug("Current user cache miss for user {UserId}.", userId);

        var user = await userManager.FindByIdAsync(userId.ToString())
            ?? throw new NotFoundException("User not found.");

        var dto = (await tokenFactory.CreateAsync(user)).User;
        await TrySetCachedUserAsync(cacheKey, dto, cancellationToken);
        return dto;
    }

    public async Task<UserDto> UpdateCurrentUserAsync(
        Guid userId,
        UpdateProfileRequestDto request,
        CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();

        var user = await userManager.FindByIdAsync(userId.ToString())
            ?? throw new NotFoundException("User not found.");

        var firstName = request.FirstName.Trim();
        var lastName = request.LastName.Trim();

        if (string.IsNullOrWhiteSpace(firstName) || string.IsNullOrWhiteSpace(lastName))
        {
            throw new ValidationException("First name and last name are required.");
        }

        user.FirstName = firstName;
        user.LastName = lastName;

        var result = await userManager.UpdateAsync(user);
        if (!result.Succeeded)
        {
            throw new ValidationException(string.Join("; ", result.Errors.Select(x => x.Description)));
        }

        var dto = (await tokenFactory.CreateAsync(user)).User;
        await TryRemoveCachedUserAsync(userId, cancellationToken);
        return dto;
    }

    private async Task<AuthResponseDto> IssueSessionAsync(
        User user,
        Guid? familyId,
        CancellationToken cancellationToken)
    {
        var accessToken = await tokenFactory.CreateAsync(user);
        var refreshTokenValue = GenerateRefreshToken();
        var refreshTokenExpiresAtUtc = DateTime.UtcNow.AddDays(Math.Max(_jwtOptions.RefreshTokenLifetimeDays, 1));

        dbContext.RefreshTokens.Add(new RefreshToken
        {
            UserId = user.Id,
            TokenHash = ComputeTokenHash(refreshTokenValue),
            FamilyId = familyId ?? Guid.NewGuid(),
            ExpiresAtUtc = refreshTokenExpiresAtUtc
        });

        await RemoveExpiredRefreshTokensAsync(user.Id, cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);

        return new AuthResponseDto
        {
            Token = accessToken.Token,
            AccessTokenExpiresAtUtc = accessToken.ExpiresAtUtc,
            RefreshToken = refreshTokenValue,
            RefreshTokenExpiresAtUtc = refreshTokenExpiresAtUtc,
            User = accessToken.User
        };
    }

    private async Task RemoveExpiredRefreshTokensAsync(Guid userId, CancellationToken cancellationToken)
    {
        var staleTokens = await dbContext.RefreshTokens
            .Where(x => x.UserId == userId && (x.ExpiresAtUtc <= DateTime.UtcNow || x.RevokedAtUtc != null))
            .ToListAsync(cancellationToken);

        if (staleTokens.Count == 0)
        {
            return;
        }

        dbContext.RefreshTokens.RemoveRange(staleTokens);
    }

    private async Task RevokeRefreshTokenFamilyAsync(Guid userId, Guid familyId, CancellationToken cancellationToken)
    {
        var tokens = await dbContext.RefreshTokens
            .Where(x => x.UserId == userId && x.FamilyId == familyId && x.RevokedAtUtc == null)
            .ToListAsync(cancellationToken);

        foreach (var token in tokens)
        {
            token.RevokedAtUtc = DateTime.UtcNow;
        }

        await dbContext.SaveChangesAsync(cancellationToken);
    }

    private static string GenerateRefreshToken()
    {
        return Convert.ToHexString(RandomNumberGenerator.GetBytes(48));
    }

    private static string ComputeTokenHash(string token)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(token.Trim()));
        return Convert.ToHexString(bytes);
    }

    private static string GetCurrentUserCacheKey(Guid userId) => $"auth:user:{userId:N}";

    private async Task<UserDto?> TryGetCachedUserAsync(string cacheKey, CancellationToken cancellationToken)
    {
        try
        {
            var cached = await cache.GetStringAsync(cacheKey, cancellationToken);
            if (string.IsNullOrWhiteSpace(cached))
            {
                return null;
            }

            return JsonSerializer.Deserialize<UserDto>(cached);
        }
        catch (Exception exception)
        {
            logger.LogWarning(exception, "Current user cache read failed for key {CacheKey}.", cacheKey);
            return null;
        }
    }

    private async Task TrySetCachedUserAsync(string cacheKey, UserDto user, CancellationToken cancellationToken)
    {
        try
        {
            await cache.SetStringAsync(
                cacheKey,
                JsonSerializer.Serialize(user),
                UserCacheOptions,
                cancellationToken);
        }
        catch (Exception exception)
        {
            logger.LogWarning(exception, "Current user cache write failed for key {CacheKey}.", cacheKey);
        }
    }

    private async Task TryRemoveCachedUserAsync(Guid userId, CancellationToken cancellationToken)
    {
        var cacheKey = GetCurrentUserCacheKey(userId);

        try
        {
            await cache.RemoveAsync(cacheKey, cancellationToken);
        }
        catch (Exception exception)
        {
            logger.LogWarning(exception, "Current user cache invalidation failed for key {CacheKey}.", cacheKey);
        }
    }
}
