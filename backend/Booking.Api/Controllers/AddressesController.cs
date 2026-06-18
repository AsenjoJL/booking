using Booking.Api.Extensions;
using Booking.Application.Abstractions;
using Booking.Application.DTOs.Addresses;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Booking.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public sealed class AddressesController(IAddressService addressService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<AddressDto>>> GetMine(CancellationToken cancellationToken)
    {
        var result = await addressService.GetMyAddressesAsync(User.GetRequiredUserId(), cancellationToken);
        return Ok(result);
    }

    [HttpPost]
    [EnableRateLimiting("write")]
    public async Task<ActionResult<AddressDto>> Create(
        [FromBody] UpsertAddressDto request,
        CancellationToken cancellationToken)
    {
        var result = await addressService.CreateAsync(User.GetRequiredUserId(), request, cancellationToken);
        return Ok(result);
    }

    [HttpPut("{id:guid}")]
    [EnableRateLimiting("write")]
    public async Task<ActionResult<AddressDto>> Update(
        Guid id,
        [FromBody] UpsertAddressDto request,
        CancellationToken cancellationToken)
    {
        var result = await addressService.UpdateAsync(User.GetRequiredUserId(), id, request, cancellationToken);
        return Ok(result);
    }

    [HttpDelete("{id:guid}")]
    [EnableRateLimiting("write")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        await addressService.DeleteAsync(User.GetRequiredUserId(), id, cancellationToken);
        return NoContent();
    }
}
