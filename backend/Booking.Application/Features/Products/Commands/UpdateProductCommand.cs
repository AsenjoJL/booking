using System;
using Booking.Application.DTOs.Products;
using MediatR;

namespace Booking.Application.Features.Products.Commands;

public sealed record UpdateProductCommand(
    Guid ProductId,
    UpsertProductDto RequestDto
) : IRequest<ProductDetailDto>;
