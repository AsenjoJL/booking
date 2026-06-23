using System.Net.Http.Json;
using System.Text.RegularExpressions;
using Booking.Application.Abstractions;
using Booking.Domain.Entities;
using Booking.Domain.Enums;
using Booking.Infrastructure.Data;
using Booking.Infrastructure.Identity;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Booking.Infrastructure.Services;

public sealed partial class SmsService(
    HttpClient httpClient,
    IOptions<SmsOptions> options,
    IServiceScopeFactory scopeFactory,
    ILogger<SmsService> logger) : ISmsService
{
    private readonly SmsOptions _options = options.Value;
    private const string ApiUrl = "https://www.iprogsms.com/api/v1/sms_messages";

    [GeneratedRegex(@"^(09|\+639)\d{9}$")]
    private static partial Regex PhoneNumberRegex();

    public async Task SendOrderConfirmationSmsAsync(
        string phoneNumber,
        string name,
        Guid orderId,
        decimal total,
        string status,
        CancellationToken cancellationToken)
    {
        var shortOrderId = orderId.ToString()[..8].ToUpperInvariant();
        var message = $"Good news! Your order #{shortOrderId} has been confirmed and is now being prepared.";
        await SendSmsAsync(phoneNumber, message, orderId, cancellationToken);
    }

    public async Task SendOrderStatusUpdateSmsAsync(
        string phoneNumber,
        string name,
        Guid orderId,
        string newStatus,
        CancellationToken cancellationToken)
    {
        var shortOrderId = orderId.ToString()[..8].ToUpperInvariant();
        
        if (!Enum.TryParse<OrderStatus>(newStatus, true, out var parsedStatus))
        {
            return;
        }

        var message = parsedStatus switch
        {
            OrderStatus.Pending or OrderStatus.PendingPayment => $"Your order #{shortOrderId} has been received and is currently pending review.",
            OrderStatus.Confirmed => $"Good news! Your order #{shortOrderId} has been confirmed and is now being prepared.",
            OrderStatus.Processing => $"Your order #{shortOrderId} is currently being processed.",
            OrderStatus.Shipped => $"Your order #{shortOrderId} has been shipped and is on its way.",
            OrderStatus.OutForDelivery => $"Your order #{shortOrderId} is out for delivery and will arrive soon.",
            OrderStatus.Delivered => $"Your order #{shortOrderId} has been successfully delivered. Thank you for shopping with us.",
            OrderStatus.Cancelled => $"Your order #{shortOrderId} has been cancelled. Please contact support for assistance.",
            _ => string.Empty
        };

        if (!string.IsNullOrEmpty(message))
        {
            await SendSmsAsync(phoneNumber, message, orderId, cancellationToken);
        }
    }

    private async Task SendSmsAsync(string phoneNumber, string message, Guid orderId, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(_options.ApiToken) || _options.ApiToken == "YOUR_IPROGSMS_API_TOKEN")
        {
            logger.LogWarning("SMS sending skipped because ApiToken is not configured.");
            return;
        }

        // Clean and validate phone number
        var cleanPhone = new string(phoneNumber.Where(char.IsDigit).ToArray());
        if (cleanPhone.StartsWith("63")) cleanPhone = "+" + cleanPhone;
        
        if (!PhoneNumberRegex().IsMatch(cleanPhone))
        {
            logger.LogWarning("Invalid phone number format: {PhoneNumber}. SMS aborted.", cleanPhone);
            await LogNotificationAsync(orderId, cleanPhone, message, "Failed", "Invalid phone number format.", cancellationToken);
            return;
        }

        try
        {
            var payload = new
            {
                api_token = _options.ApiToken,
                phone_number = cleanPhone,
                message = message
            };

            var response = await httpClient.PostAsJsonAsync(ApiUrl, payload, cancellationToken);
            
            if (response.IsSuccessStatusCode)
            {
                logger.LogInformation("SMS sent successfully to {PhoneNumber}.", cleanPhone);
                await LogNotificationAsync(orderId, cleanPhone, message, "Success", null, cancellationToken);
            }
            else
            {
                var error = await response.Content.ReadAsStringAsync(cancellationToken);
                logger.LogWarning("SMS API returned non-success status: {Status}. Error: {Error}", response.StatusCode, error);
                await LogNotificationAsync(orderId, cleanPhone, message, "Failed", $"HTTP {response.StatusCode}: {error}", cancellationToken);
            }
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to send SMS to {PhoneNumber}.", cleanPhone);
            await LogNotificationAsync(orderId, cleanPhone, message, "Failed", ex.Message, cancellationToken);
            // We intentionally don't throw here to avoid crashing the background task
        }
    }

    private async Task LogNotificationAsync(Guid orderId, string phone, string message, string status, string? error, CancellationToken ct)
    {
        try
        {
            using var scope = scopeFactory.CreateScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<BookingDbContext>();
            
            dbContext.OrderNotificationLogs.Add(new OrderNotificationLog
            {
                OrderId = orderId,
                PhoneNumber = phone,
                Message = message,
                Status = status,
                ErrorMessage = error
            });
            
            await dbContext.SaveChangesAsync(ct);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to write SMS notification log to database.");
        }
    }
}
