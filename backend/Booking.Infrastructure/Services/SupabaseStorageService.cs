using System.Net.Http.Headers;
using Booking.Application.Abstractions;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace Booking.Infrastructure.Services;

public sealed class SupabaseStorageService : IStorageService
{
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;
    private readonly ILogger<SupabaseStorageService> _logger;

    public SupabaseStorageService(HttpClient httpClient, IConfiguration configuration, ILogger<SupabaseStorageService> logger)
    {
        _httpClient = httpClient;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task<string> UploadImageAsync(Stream fileStream, string fileName, string contentType, CancellationToken cancellationToken)
    {
        var supabaseUrl = _configuration["SupabaseStorage:Url"];
        var serviceRoleKey = _configuration["SupabaseStorage:ServiceRoleKey"];
        var bucketName = "product-images";

        if (string.IsNullOrWhiteSpace(supabaseUrl) || string.IsNullOrWhiteSpace(serviceRoleKey))
        {
            _logger.LogError("SupabaseStorage:Url or SupabaseStorage:ServiceRoleKey is missing in configuration.");
            throw new InvalidOperationException("Supabase storage is not configured properly.");
        }

        supabaseUrl = supabaseUrl.TrimEnd('/');
        var uploadUrl = $"{supabaseUrl}/storage/v1/object/{bucketName}/{fileName}";

        using var request = new HttpRequestMessage(HttpMethod.Post, uploadUrl);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", serviceRoleKey);
        request.Headers.Add("apikey", serviceRoleKey);

        using var content = new StreamContent(fileStream);
        content.Headers.ContentType = new MediaTypeHeaderValue(contentType);
        request.Content = content;

        var response = await _httpClient.SendAsync(request, cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            var errorBody = await response.Content.ReadAsStringAsync(cancellationToken);
            _logger.LogError("Supabase storage upload failed with status {StatusCode}: {ErrorBody}", response.StatusCode, errorBody);
            throw new Exception($"Failed to upload image to Supabase: {response.StatusCode} - {errorBody}");
        }

        var publicUrl = $"{supabaseUrl}/storage/v1/object/public/{bucketName}/{fileName}";
        return publicUrl;
    }
}
