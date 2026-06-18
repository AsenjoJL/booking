using System.Security.Claims;
using Booking.Application.Exceptions;

namespace Booking.Api.Extensions;

public static class ClaimsPrincipalExtensions
{
    public static Guid GetRequiredUserId(this ClaimsPrincipal user)
    {
        var value = user.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(value, out var userId))
        {
            throw new AppUnauthorizedException("Missing user identifier.");
        }

        return userId;
    }
}
