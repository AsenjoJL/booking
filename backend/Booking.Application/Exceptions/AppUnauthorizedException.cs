namespace Booking.Application.Exceptions;

public sealed class AppUnauthorizedException(string message) : Exception(message);
