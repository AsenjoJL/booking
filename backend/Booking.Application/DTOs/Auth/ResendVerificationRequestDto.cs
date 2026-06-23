namespace Booking.Application.DTOs.Auth;

public sealed class ResendVerificationRequestDto
{
    public string Email { get; init; } = string.Empty;
}
