using Booking.Application.DTOs.Products;
using MediatR;

namespace Booking.Application.Features.Products.Queries;

public sealed record GetProductBySlugQuery(
    string Slug,
    bool IncludeInactive
) : IRequest<ProductDetailDto>;
