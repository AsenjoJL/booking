using Booking.Application.Abstractions;
using Booking.Application.DTOs.Common;
using Booking.Application.DTOs.Products;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Booking.Application.Features.Products.Queries;

using MediatR;

namespace Booking.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public sealed class ProductsController(ISender sender, IProductService productService, IWebHostEnvironment environment) : ControllerBase
{
    [HttpGet]
    [AllowAnonymous]
    public async Task<ActionResult<PagedResultDto<ProductSummaryDto>>> GetAll(
        [FromQuery] ProductListQueryDto query,
        CancellationToken cancellationToken)
    {
        var result = await sender.Send(new GetProductsQuery(query, IncludeInactive: false), cancellationToken);
        return Ok(result);
    }

    [HttpGet("admin")]
    [Authorize(Roles = "Admin")]
    [EnableRateLimiting("admin")]
    public async Task<ActionResult<PagedResultDto<ProductSummaryDto>>> GetAdminAll(
        [FromQuery] ProductListQueryDto query,
        CancellationToken cancellationToken)
    {
        var result = await sender.Send(new GetProductsQuery(query, IncludeInactive: true), cancellationToken);
        return Ok(result);
    }

    [HttpGet("{slug}")]
    [AllowAnonymous]
    public async Task<ActionResult<ProductDetailDto>> GetBySlug(string slug, CancellationToken cancellationToken)
    {
        var result = await sender.Send(new GetProductBySlugQuery(slug, IncludeInactive: false), cancellationToken);
        return Ok(result);
    }

    [HttpGet("admin/{slug}")]
    [Authorize(Roles = "Admin")]
    [EnableRateLimiting("admin")]
    public async Task<ActionResult<ProductDetailDto>> GetAdminBySlug(string slug, CancellationToken cancellationToken)
    {
        var result = await sender.Send(new GetProductBySlugQuery(slug, IncludeInactive: true), cancellationToken);
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

    [HttpPost("upload-image")]
    [Authorize(Roles = "Admin")]
    [EnableRateLimiting("admin")]
    [RequestSizeLimit(10 * 1024 * 1024)]
    public async Task<ActionResult<object>> UploadImage(
        IFormFile file,
        CancellationToken cancellationToken)
    {
        if (file.Length <= 0)
        {
            return BadRequest(new { error = "Choose an image file to upload." });
        }

        if (file.Length > 10 * 1024 * 1024)
        {
            return BadRequest(new { error = "Image must be 10 MB or smaller." });
        }

        var allowedContentTypes = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/gif"
        };

        if (!allowedContentTypes.Contains(file.ContentType))
        {
            return BadRequest(new { error = "Only JPG, PNG, WEBP, and GIF images are allowed." });
        }

        var uploadsRoot = Path.Combine(environment.WebRootPath ?? Path.Combine(environment.ContentRootPath, "wwwroot"), "uploads", "products");
        Directory.CreateDirectory(uploadsRoot);

        var extension = Path.GetExtension(file.FileName);
        if (string.IsNullOrWhiteSpace(extension))
        {
            extension = file.ContentType switch
            {
                "image/jpeg" => ".jpg",
                "image/png" => ".png",
                "image/webp" => ".webp",
                "image/gif" => ".gif",
                _ => ".bin"
            };
        }

        var fileName = $"{Guid.NewGuid():N}{extension.ToLowerInvariant()}";
        var filePath = Path.Combine(uploadsRoot, fileName);

        await using (var stream = System.IO.File.Create(filePath))
        {
            await file.CopyToAsync(stream, cancellationToken);
        }

        var imageUrl = $"{Request.Scheme}://{Request.Host}/uploads/products/{fileName}";
        return Ok(new { imageUrl });
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

    [HttpGet("{id:guid}/inventory")]
    [Authorize(Roles = "Admin")]
    [EnableRateLimiting("admin")]
    public async Task<ActionResult<InventorySnapshotDto>> GetInventory(
        Guid id,
        CancellationToken cancellationToken)
    {
        var result = await productService.GetInventoryAsync(id, cancellationToken);
        return Ok(result);
    }

    [HttpGet("{id:guid}/inventory/history")]
    [Authorize(Roles = "Admin")]
    [EnableRateLimiting("admin")]
    public async Task<ActionResult<IReadOnlyList<InventoryMovementDto>>> GetInventoryHistory(
        Guid id,
        CancellationToken cancellationToken)
    {
        var result = await productService.GetInventoryHistoryAsync(id, cancellationToken);
        return Ok(result);
    }

    [HttpPost("{id:guid}/inventory/adjust")]
    [Authorize(Roles = "Admin")]
    [EnableRateLimiting("admin")]
    public async Task<ActionResult<InventorySnapshotDto>> AdjustInventory(
        Guid id,
        [FromBody] AdjustInventoryDto request,
        CancellationToken cancellationToken)
    {
        var result = await productService.AdjustInventoryAsync(id, request, cancellationToken);
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
