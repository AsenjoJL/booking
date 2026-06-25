using System.IO;

namespace Booking.Application.Abstractions;

public interface IStorageService
{
    Task<string> UploadImageAsync(Stream fileStream, string fileName, string contentType, CancellationToken cancellationToken);
}
