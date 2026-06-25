using System.Text.Json.Serialization;

namespace Booking.Application.DTOs.Auth;

public sealed class AuthResponseDto
{
    public required string Token { get; init; }
    public required DateTime AccessTokenExpiresAtUtc { get; init; }
    [JsonIgnore]
    public required string RefreshToken { get; init; }
    [JsonIgnore]
    public required DateTime RefreshTokenExpiresAtUtc { get; init; }
    public required UserDto User { get; init; }
}
