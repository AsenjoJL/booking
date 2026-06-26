namespace Booking.Application.DTOs.Auth;

public sealed class RegistrationResponseDto
{
    public required string Email { get; init; }
    public required string Message { get; init; }
    public required bool VerificationEmailSent { get; init; }
}
