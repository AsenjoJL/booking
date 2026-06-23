using Booking.Application.DTOs.Common;
using Booking.Application.DTOs.Products;
using MediatR;

namespace Booking.Application.Features.Products.Queries;

public sealed record GetProductsQuery(
    ProductListQueryDto QueryDto,
    bool IncludeInactive
) : IRequest<PagedResultDto<ProductSummaryDto>>;
