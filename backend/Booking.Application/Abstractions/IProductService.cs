using Booking.Application.DTOs.Common;
using Booking.Application.DTOs.Products;

namespace Booking.Application.Abstractions;

public interface IProductService
{
    Task<PagedResultDto<ProductSummaryDto>> GetProductsAsync(ProductListQueryDto query, CancellationToken cancellationToken);
    Task<PagedResultDto<ProductSummaryDto>> GetAdminProductsAsync(ProductListQueryDto query, CancellationToken cancellationToken);
    Task<ProductDetailDto> GetBySlugAsync(string slug, CancellationToken cancellationToken);
    Task<ProductDetailDto> GetAdminBySlugAsync(string slug, CancellationToken cancellationToken);
    Task<ProductDetailDto> CreateAsync(UpsertProductDto request, CancellationToken cancellationToken);
    Task<ProductDetailDto> UpdateAsync(Guid productId, UpsertProductDto request, CancellationToken cancellationToken);
    Task<IReadOnlyList<ProductDetailDto>> BulkUpdateStockAsync(BulkUpdateProductStockDto request, CancellationToken cancellationToken);
    Task<IReadOnlyList<ProductDetailDto>> BulkUpdateVisibilityAsync(BulkUpdateProductVisibilityDto request, CancellationToken cancellationToken);
    Task DeleteAsync(Guid productId, CancellationToken cancellationToken);
}
