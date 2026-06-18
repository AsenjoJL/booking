using Booking.Application.DTOs.Categories;

namespace Booking.Application.Abstractions;

public interface ICategoryService
{
    Task<IReadOnlyList<CategoryDto>> GetCategoriesAsync(CancellationToken cancellationToken);
    Task<CategoryDto> CreateAsync(UpsertCategoryDto request, CancellationToken cancellationToken);
    Task<CategoryDto> UpdateAsync(Guid categoryId, UpsertCategoryDto request, CancellationToken cancellationToken);
    Task DeleteAsync(Guid categoryId, CancellationToken cancellationToken);
}
