namespace Booking.Infrastructure.Services;

public interface IOrderProcessingJob
{
    Task ProcessAsync(Guid orderId);
}
