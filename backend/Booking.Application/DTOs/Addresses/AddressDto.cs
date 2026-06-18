namespace Booking.Application.DTOs.Addresses;

public sealed class AddressDto
{
    public required Guid Id { get; init; }
    public required string Label { get; init; }
    public required string RecipientName { get; init; }
    public required string Line1 { get; init; }
    public string? Line2 { get; init; }
    public required string City { get; init; }
    public required string StateOrProvince { get; init; }
    public required string PostalCode { get; init; }
    public required string Country { get; init; }
    public required string PhoneNumber { get; init; }
    public required bool IsDefaultShipping { get; init; }
}
