namespace Booking.Infrastructure.Identity;

public sealed class SmsOptions
{
    public const string SectionName = "Sms";
    
    public string ApiToken { get; set; } = string.Empty;
}
