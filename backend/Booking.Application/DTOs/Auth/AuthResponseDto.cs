namespace Booking.Application.DTOs.Auth;

public sealed class AuthResponseDto
{
    public required string Token { get; init; }
    public required DateTime AccessTokenExpiresAtUtc { get; init; }
    public required string RefreshToken { get; init; }
    public required DateTime RefreshTokenExpiresAtUtc { get; init; }
    public required UserDto User { get; init; }
}
