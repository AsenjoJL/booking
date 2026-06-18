using Booking.Application.Abstractions;
using Booking.Infrastructure.Services;
using Hangfire;

namespace Booking.Api.Hangfire;

public sealed class HangfireOrderJobScheduler(IBackgroundJobClient backgroundJobClient) : IOrderJobScheduler
{
    public void EnqueueOrderProcessing(Guid orderId)
    {
        backgroundJobClient.Enqueue<IOrderProcessingJob>(job => job.ProcessAsync(orderId));
    }
}
