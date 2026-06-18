namespace Booking.Application.DTOs.Cart;

public sealed class MergeCartDto
{
    public required IReadOnlyList<MergeCartItemDto> Items { get; init; }
    public string? IdempotencyKey { get; init; }
}

public sealed class MergeCartItemDto
{
    public Guid ProductId { get; init; }
    public int Quantity { get; init; }
}
