using Booking.Application.DTOs.Products;
using MediatR;

namespace Booking.Application.Features.Products.Commands;

public sealed record CreateProductCommand(
    UpsertProductDto RequestDto
) : IRequest<ProductDetailDto>;
