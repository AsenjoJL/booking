using System.Collections.Generic;
using Booking.Application.DTOs.Products;
using MediatR;

namespace Booking.Application.Features.Products.Commands;

public sealed record BulkUpdateStockCommand(
    BulkUpdateProductStockDto RequestDto
) : IRequest<IReadOnlyList<ProductDetailDto>>;
