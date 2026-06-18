namespace Booking.Application.DTOs.Categories;

public sealed class CategoryDto
{
    public required Guid Id { get; init; }
    public required string Name { get; init; }
    public required string Slug { get; init; }
    public Guid? ParentCategoryId { get; init; }
}
