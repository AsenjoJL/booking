namespace Booking.Application.DTOs.Auth;

public sealed class UpdateProfileRequestDto
{
    public string FirstName { get; init; } = string.Empty;
    public string LastName { get; init; } = string.Empty;
}
