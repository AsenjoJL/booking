namespace Booking.Application.Abstractions;

public interface IEmailService
{
    Task SendEmailVerificationAsync(
        string toEmail,
        string toName,
        string verificationLink,
        CancellationToken cancellationToken);

    Task SendOrderConfirmationAsync(
        string toEmail,
        string toName,
        Guid orderId,
        decimal total,
        string status,
        CancellationToken cancellationToken);

    Task SendOrderStatusUpdateAsync(
        string toEmail,
        string toName,
        Guid orderId,
        string newStatus,
        CancellationToken cancellationToken);
}
