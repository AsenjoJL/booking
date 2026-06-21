using Booking.Api.Extensions;
using Booking.Application.Abstractions;
using Booking.Application.DTOs.Orders;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Logging;

namespace Booking.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[EnableRateLimiting("write")]
public sealed class OrdersController(
    IOrderService orderService,
    ILogger<OrdersController> logger) : ControllerBase
{
    [HttpPost("guest")]
    [AllowAnonymous]
    [EnableRateLimiting("checkout")]
    public async Task<ActionResult<OrderDto>> GuestCheckout(
        [FromBody] GuestCreateOrderDto request,
        CancellationToken cancellationToken)
    {
        logger.LogInformation(
            "Guest checkout request received for email {GuestEmail}.",
            request.GuestEmail);
        var result = await orderService.GuestCheckoutAsync(request, cancellationToken);
        return Created($"/api/orders/{result.Id}", result);
    }

    [Authorize]
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<OrderDto>>> GetMine(CancellationToken cancellationToken)
    {
        var result = await orderService.GetMyOrdersAsync(User.GetRequiredUserId(), cancellationToken);
        return Ok(result);
    }

    [Authorize]
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<OrderDto>> GetById(Guid id, CancellationToken cancellationToken)
    {
        var result = await orderService.GetByIdAsync(
            User.GetRequiredUserId(),
            id,
            User.IsInRole("Admin"),
            cancellationToken);
        return Ok(result);
    }

    [Authorize]
    [HttpPost]
    [EnableRateLimiting("checkout")]
    public async Task<ActionResult<OrderDto>> Checkout(
        [FromBody] CreateOrderDto request,
        CancellationToken cancellationToken)
    {
        var userId = User.GetRequiredUserId();
        logger.LogInformation(
            "Checkout request received for user {UserId} with address {AddressId}.",
            userId,
            request.ShippingAddressId);
        var result = await orderService.CheckoutAsync(userId, request, cancellationToken);
        return Created($"/api/orders/{result.Id}", result);
    }

    [HttpGet("admin/all")]
    [Authorize(Roles = "Admin")]
    [EnableRateLimiting("admin")]
    public async Task<ActionResult<IReadOnlyList<OrderDto>>> GetAll(CancellationToken cancellationToken)
    {
        var result = await orderService.GetAllOrdersAsync(cancellationToken);
        return Ok(result);
    }

    [HttpPatch("{id:guid}/status")]
    [Authorize(Roles = "Admin")]
    [EnableRateLimiting("admin")]
    public async Task<ActionResult<OrderDto>> UpdateStatus(
        Guid id,
        [FromBody] UpdateOrderStatusDto request,
        CancellationToken cancellationToken)
    {
        var result = await orderService.UpdateStatusAsync(id, request, cancellationToken);
        return Ok(result);
    }
}
