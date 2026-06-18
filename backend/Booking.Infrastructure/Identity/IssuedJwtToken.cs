using Booking.Application.DTOs.Auth;

namespace Booking.Infrastructure.Identity;

public sealed class IssuedJwtToken
{
    public required string Token { get; init; }
    public required DateTime ExpiresAtUtc { get; init; }
    public required UserDto User { get; init; }
}
