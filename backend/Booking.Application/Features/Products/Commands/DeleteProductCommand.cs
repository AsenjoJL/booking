using System;
using MediatR;

namespace Booking.Application.Features.Products.Commands;

public sealed record DeleteProductCommand(
    Guid ProductId
) : IRequest;
