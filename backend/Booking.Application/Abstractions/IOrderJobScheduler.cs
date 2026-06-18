namespace Booking.Application.Abstractions;

public interface IOrderJobScheduler
{
    void EnqueueOrderProcessing(Guid orderId);
}
