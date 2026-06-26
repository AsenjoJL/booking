namespace Booking.Application.Exceptions;

public sealed class EmailDeliveryException(string message) : Exception(message);
