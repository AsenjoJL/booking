namespace Booking.Application.DTOs.Auth;

public sealed class RevokeRefreshTokenRequestDto
{
    public string RefreshToken { get; init; } = string.Empty;
}
