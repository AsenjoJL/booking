using Booking.Application.Abstractions;
using Booking.Infrastructure.Identity;
using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using MimeKit;

namespace Booking.Infrastructure.Services;

public sealed class EmailService(
    IOptions<SmtpOptions> options,
    ILogger<EmailService> logger) : IEmailService
{
    private readonly SmtpOptions _smtp = options.Value;

    public async Task SendEmailVerificationAsync(
        string toEmail,
        string toName,
        string verificationLink,
        CancellationToken cancellationToken)
    {
        var subject = "Verify your email address — Booking Store";
        var body = BuildVerificationEmailHtml(toName, verificationLink);
        await SendAsync(toEmail, toName, subject, body, cancellationToken);
    }

    public async Task SendOrderConfirmationAsync(
        string toEmail,
        string toName,
        Guid orderId,
        decimal total,
        string status,
        CancellationToken cancellationToken)
    {
        var subject = $"✅ Order Confirmed — #{orderId.ToString()[..8].ToUpperInvariant()}";
        var body = BuildOrderConfirmationHtml(toName, orderId, total, status);
        await SendAsync(toEmail, toName, subject, body, cancellationToken);
    }

    public async Task SendOrderStatusUpdateAsync(
        string toEmail,
        string toName,
        Guid orderId,
        string newStatus,
        CancellationToken cancellationToken)
    {
        var (emoji, subject) = newStatus.ToLowerInvariant() switch
        {
            "confirmed"  => ("✅", "Your order has been confirmed"),
            "processing" => ("⚙️",  "Your order is being processed"),
            "shipped"    => ("🚚", "Your order is on its way!"),
            "delivered"  => ("📦", "Your order has been delivered"),
            "cancelled"  => ("❌", "Your order has been cancelled"),
            "refunded"   => ("💰", "Your refund has been processed"),
            _            => ("📋", $"Order status updated to {newStatus}")
        };

        var fullSubject = $"{emoji} {subject} — #{orderId.ToString()[..8].ToUpperInvariant()}";
        var body = BuildOrderStatusHtml(toName, orderId, newStatus, subject);
        await SendAsync(toEmail, toName, fullSubject, body, cancellationToken);
    }

    private async Task SendAsync(
        string toEmail,
        string toName,
        string subject,
        string htmlBody,
        CancellationToken cancellationToken)
    {
        try
        {
            var message = new MimeMessage();
            message.From.Add(new MailboxAddress(_smtp.FromName, _smtp.FromEmail));
            message.To.Add(new MailboxAddress(toName, toEmail));
            message.Subject = subject;
            message.Body = new TextPart("html") { Text = htmlBody };

            using var client = new SmtpClient();
            client.Timeout = 3000; // Force a strict 3-second timeout, bypassing the OS 21-second TCP SYN timeout

            var secureOption = _smtp.UseSsl
                ? SecureSocketOptions.SslOnConnect
                : SecureSocketOptions.StartTlsWhenAvailable;

            await client.ConnectAsync(_smtp.Host, _smtp.Port, secureOption, cancellationToken);

            if (!string.IsNullOrWhiteSpace(_smtp.Username))
            {
                await client.AuthenticateAsync(_smtp.Username, _smtp.Password, cancellationToken);
            }

            await client.SendAsync(message, cancellationToken);
            await client.DisconnectAsync(true, cancellationToken);

            logger.LogInformation("Email sent to {ToEmail} with subject '{Subject}'.", toEmail, subject);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to send email to {ToEmail} with subject '{Subject}'.", toEmail, subject);
            throw;
        }
    }

    private static string BuildVerificationEmailHtml(string name, string link) => $"""
        <!DOCTYPE html>
        <html lang="en">
        <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
        <body style="margin:0;padding:0;background:#f4f4f5;font-family:system-ui,-apple-system,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
            <tr><td align="center">
              <table width="520" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08);">
                <tr><td style="background:linear-gradient(135deg,#1e1b4b 0%,#312e81 100%);padding:32px 40px;">
                  <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;letter-spacing:-.5px;">🛍️ Clothing Store</h1>
                </td></tr>
                <tr><td style="padding:40px;">
                  <h2 style="margin:0 0 12px;font-size:20px;color:#111827;">Verify your email, {name}</h2>
                  <p style="margin:0 0 28px;color:#6b7280;line-height:1.6;">Thanks for creating an account! Click the button below to confirm your email address and activate your account.</p>
                  <a href="{link}" style="display:inline-block;padding:14px 32px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;">Verify Email Address</a>
                  <p style="margin:28px 0 0;color:#9ca3af;font-size:13px;">This link expires in <strong>24 hours</strong>. If you didn't create an account, you can safely ignore this email.</p>
                  <hr style="margin:28px 0;border:none;border-top:1px solid #e5e7eb;">
                  <p style="margin:0;color:#d1d5db;font-size:12px;">If the button doesn't work, copy and paste this link:<br><span style="color:#6b7280;word-break:break-all;">{link}</span></p>
                </td></tr>
              </table>
            </td></tr>
          </table>
        </body>
        </html>
        """;

    private static string BuildOrderConfirmationHtml(string name, Guid orderId, decimal total, string status) => $"""
        <!DOCTYPE html>
        <html lang="en">
        <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
        <body style="margin:0;padding:0;background:#f4f4f5;font-family:system-ui,-apple-system,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
            <tr><td align="center">
              <table width="520" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08);">
                <tr><td style="background:linear-gradient(135deg,#1e1b4b 0%,#312e81 100%);padding:32px 40px;">
                  <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;">🛍️ Clothing Store</h1>
                </td></tr>
                <tr><td style="padding:40px;">
                  <h2 style="margin:0 0 8px;font-size:20px;color:#111827;">✅ Order Confirmed!</h2>
                  <p style="margin:0 0 24px;color:#6b7280;line-height:1.6;">Hi {name}, your order has been placed successfully.</p>
                  <table width="100%" cellpadding="12" style="background:#f9fafb;border-radius:8px;border:1px solid #e5e7eb;">
                    <tr><td style="color:#6b7280;font-size:13px;">Order ID</td><td align="right" style="font-weight:600;color:#111827;font-size:13px;">#{orderId.ToString()[..8].ToUpperInvariant()}</td></tr>
                    <tr><td style="color:#6b7280;font-size:13px;border-top:1px solid #e5e7eb;">Status</td><td align="right" style="font-weight:600;color:#4f46e5;font-size:13px;border-top:1px solid #e5e7eb;">{status}</td></tr>
                    <tr><td style="color:#6b7280;font-size:13px;border-top:1px solid #e5e7eb;">Total</td><td align="right" style="font-weight:700;color:#111827;font-size:16px;border-top:1px solid #e5e7eb;">₱{total:N2}</td></tr>
                  </table>
                  <p style="margin:28px 0 0;color:#9ca3af;font-size:13px;">We'll send you another email when the status of your order changes.</p>
                </td></tr>
              </table>
            </td></tr>
          </table>
        </body>
        </html>
        """;

    private static string BuildOrderStatusHtml(string name, Guid orderId, string status, string headline) => $"""
        <!DOCTYPE html>
        <html lang="en">
        <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
        <body style="margin:0;padding:0;background:#f4f4f5;font-family:system-ui,-apple-system,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
            <tr><td align="center">
              <table width="520" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08);">
                <tr><td style="background:linear-gradient(135deg,#1e1b4b 0%,#312e81 100%);padding:32px 40px;">
                  <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;">🛍️ Clothing Store</h1>
                </td></tr>
                <tr><td style="padding:40px;">
                  <h2 style="margin:0 0 8px;font-size:20px;color:#111827;">{headline}</h2>
                  <p style="margin:0 0 24px;color:#6b7280;line-height:1.6;">Hi {name}, your order status has been updated.</p>
                  <table width="100%" cellpadding="12" style="background:#f9fafb;border-radius:8px;border:1px solid #e5e7eb;">
                    <tr><td style="color:#6b7280;font-size:13px;">Order ID</td><td align="right" style="font-weight:600;color:#111827;font-size:13px;">#{orderId.ToString()[..8].ToUpperInvariant()}</td></tr>
                    <tr><td style="color:#6b7280;font-size:13px;border-top:1px solid #e5e7eb;">New Status</td><td align="right" style="font-weight:600;color:#4f46e5;font-size:13px;border-top:1px solid #e5e7eb;">{status}</td></tr>
                  </table>
                  <p style="margin:28px 0 0;color:#9ca3af;font-size:13px;">If you have questions about your order, please contact our support team.</p>
                </td></tr>
              </table>
            </td></tr>
          </table>
        </body>
        </html>
        """;
}
