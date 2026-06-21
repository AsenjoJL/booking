namespace Booking.Application.DTOs.Orders;

public sealed class GuestOrderAddressDto
{
    public string Label { get; init; } = "Guest";
    public string RecipientName { get; init; } = string.Empty;
    public string Line1 { get; init; } = string.Empty;
    public string? Line2 { get; init; }
    public string City { get; init; } = string.Empty;
    public string StateOrProvince { get; init; } = string.Empty;
    public string PostalCode { get; init; } = string.Empty;
    public string Country { get; init; } = string.Empty;
    public string PhoneNumber { get; init; } = string.Empty;
}
