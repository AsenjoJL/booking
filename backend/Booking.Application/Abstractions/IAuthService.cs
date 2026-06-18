using Booking.Application.DTOs.Auth;

namespace Booking.Application.Abstractions;

public interface IAuthService
{
    Task<AuthResponseDto> RegisterAsync(RegisterRequestDto request, CancellationToken cancellationToken);
    Task<AuthResponseDto> LoginAsync(LoginRequestDto request, CancellationToken cancellationToken);
    Task<AuthResponseDto> RefreshAsync(RefreshTokenRequestDto request, CancellationToken cancellationToken);
    Task RevokeRefreshTokenAsync(Guid userId, RevokeRefreshTokenRequestDto request, CancellationToken cancellationToken);
    Task<UserDto> GetCurrentUserAsync(Guid userId, CancellationToken cancellationToken);
    Task<UserDto> UpdateCurrentUserAsync(Guid userId, UpdateProfileRequestDto request, CancellationToken cancellationToken);
}
