namespace Booking.Application.DTOs.Categories;

public sealed class UpsertCategoryDto
{
    public string Name { get; init; } = string.Empty;
    public string Slug { get; init; } = string.Empty;
    public Guid? ParentCategoryId { get; init; }
}
