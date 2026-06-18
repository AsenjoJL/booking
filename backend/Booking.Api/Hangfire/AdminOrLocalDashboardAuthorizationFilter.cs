using System.Net;
using Hangfire.Annotations;
using Hangfire.Dashboard;

namespace Booking.Api.Hangfire;

public sealed class AdminOrLocalDashboardAuthorizationFilter : IDashboardAuthorizationFilter
{
    public bool Authorize([NotNull] DashboardContext context)
    {
        var httpContext = context.GetHttpContext();

        if (httpContext.User.Identity?.IsAuthenticated == true &&
            httpContext.User.IsInRole("Admin"))
        {
            return true;
        }

        var remoteIp = httpContext.Connection.RemoteIpAddress;
        return remoteIp is not null && IPAddress.IsLoopback(remoteIp);
    }
}
