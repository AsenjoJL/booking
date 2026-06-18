using Booking.Application.DTOs.Addresses;

namespace Booking.Application.Abstractions;

public interface IAddressService
{
    Task<IReadOnlyList<AddressDto>> GetMyAddressesAsync(Guid userId, CancellationToken cancellationToken);
    Task<AddressDto> CreateAsync(Guid userId, UpsertAddressDto request, CancellationToken cancellationToken);
    Task<AddressDto> UpdateAsync(Guid userId, Guid addressId, UpsertAddressDto request, CancellationToken cancellationToken);
    Task DeleteAsync(Guid userId, Guid addressId, CancellationToken cancellationToken);
}
