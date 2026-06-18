using Booking.Application.Abstractions;
using Booking.Application.DTOs.Common;
using Booking.Application.DTOs.Products;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace Booking.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public sealed class ProductsController(IProductService productService) : ControllerBase
{
    [HttpGet]
    [AllowAnonymous]
    public async Task<ActionResult<PagedResultDto<ProductSummaryDto>>> GetAll(
        [FromQuery] ProductListQueryDto query,
        CancellationToken cancellationToken)
    {
        var result = await productService.GetProductsAsync(query, cancellationToken);
        return Ok(result);
    }

    [HttpGet("admin")]
    [Authorize(Roles = "Admin")]
    [EnableRateLimiting("admin")]
    public async Task<ActionResult<PagedResultDto<ProductSummaryDto>>> GetAdminAll(
        [FromQuery] ProductListQueryDto query,
        CancellationToken cancellationToken)
    {
        var result = await productService.GetAdminProductsAsync(query, cancellationToken);
        return Ok(result);
    }

    [HttpGet("{slug}")]
    [AllowAnonymous]
    public async Task<ActionResult<ProductDetailDto>> GetBySlug(string slug, CancellationToken cancellationToken)
    {
        var result = await productService.GetBySlugAsync(slug, cancellationToken);
        return Ok(result);
    }

    [HttpGet("admin/{slug}")]
    [Authorize(Roles = "Admin")]
    [EnableRateLimiting("admin")]
    public async Task<ActionResult<ProductDetailDto>> GetAdminBySlug(string slug, CancellationToken cancellationToken)
    {
        var result = await productService.GetAdminBySlugAsync(slug, cancellationToken);
        return Ok(result);
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    [EnableRateLimiting("admin")]
    public async Task<ActionResult<ProductDetailDto>> Create(
        [FromBody] UpsertProductDto request,
        CancellationToken cancellationToken)
    {
        var result = await productService.CreateAsync(request, cancellationToken);
        return CreatedAtAction(nameof(GetBySlug), new { slug = result.Slug }, result);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Admin")]
    [EnableRateLimiting("admin")]
    public async Task<ActionResult<ProductDetailDto>> Update(
        Guid id,
        [FromBody] UpsertProductDto request,
        CancellationToken cancellationToken)
    {
        var result = await productService.UpdateAsync(id, request, cancellationToken);
        return Ok(result);
    }

    [HttpPost("bulk-stock")]
    [Authorize(Roles = "Admin")]
    [EnableRateLimiting("admin")]
    public async Task<ActionResult<IReadOnlyList<ProductDetailDto>>> BulkUpdateStock(
        [FromBody] BulkUpdateProductStockDto request,
        CancellationToken cancellationToken)
    {
        var result = await productService.BulkUpdateStockAsync(request, cancellationToken);
        return Ok(result);
    }

    [HttpPost("bulk-visibility")]
    [Authorize(Roles = "Admin")]
    [EnableRateLimiting("admin")]
    public async Task<ActionResult<IReadOnlyList<ProductDetailDto>>> BulkUpdateVisibility(
        [FromBody] BulkUpdateProductVisibilityDto request,
        CancellationToken cancellationToken)
    {
        var result = await productService.BulkUpdateVisibilityAsync(request, cancellationToken);
        return Ok(result);
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Admin")]
    [EnableRateLimiting("admin")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        await productService.DeleteAsync(id, cancellationToken);
        return NoContent();
    }
}
