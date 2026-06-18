using Booking.Api.Extensions;
using Booking.Application.Abstractions;
using Booking.Application.DTOs.Cart;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace Booking.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
[EnableRateLimiting("write")]
public sealed class CartController(ICartService cartService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<CartDto>> Get(CancellationToken cancellationToken)
    {
        var result = await cartService.GetCartAsync(User.GetRequiredUserId(), cancellationToken);
        return Ok(result);
    }

    [HttpPost("items")]
    public async Task<ActionResult<CartDto>> AddItem(
        [FromBody] AddCartItemDto request,
        CancellationToken cancellationToken)
    {
        var result = await cartService.AddItemAsync(User.GetRequiredUserId(), request, cancellationToken);
        return Ok(result);
    }

    [HttpPost("merge")]
    public async Task<ActionResult<CartDto>> Merge(
        [FromBody] MergeCartDto request,
        CancellationToken cancellationToken)
    {
        var result = await cartService.MergeCartAsync(User.GetRequiredUserId(), request, cancellationToken);
        return Ok(result);
    }

    [HttpPut("items/{id:guid}")]
    public async Task<ActionResult<CartDto>> UpdateItem(
        Guid id,
        [FromBody] UpdateCartItemQuantityDto request,
        CancellationToken cancellationToken)
    {
        var result = await cartService.UpdateItemAsync(User.GetRequiredUserId(), id, request, cancellationToken);
        return Ok(result);
    }

    [HttpDelete("items/{id:guid}")]
    public async Task<ActionResult<CartDto>> RemoveItem(Guid id, CancellationToken cancellationToken)
    {
        var result = await cartService.RemoveItemAsync(User.GetRequiredUserId(), id, cancellationToken);
        return Ok(result);
    }

    [HttpDelete]
    public async Task<ActionResult<CartDto>> Clear(CancellationToken cancellationToken)
    {
        var result = await cartService.ClearAsync(User.GetRequiredUserId(), cancellationToken);
        return Ok(result);
    }
}
