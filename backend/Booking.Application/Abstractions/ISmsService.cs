namespace Booking.Application.Abstractions;

public interface ISmsService
{
    Task SendOrderConfirmationSmsAsync(
        string phoneNumber,
        string name,
        Guid orderId,
        decimal total,
        string status,
        CancellationToken cancellationToken);

    Task SendOrderStatusUpdateSmsAsync(
        string phoneNumber,
        string name,
        Guid orderId,
        string status,
        CancellationToken cancellationToken);
}
