using Booking.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace Booking.Api.Controllers;

[ApiController]
[Route("api/observability")]
[Authorize(Roles = "Admin")]
[EnableRateLimiting("admin")]
public sealed class ObservabilityController(ICacheMetricsCollector cacheMetricsCollector) : ControllerBase
{
    [HttpGet("cache")]
    public ActionResult<IReadOnlyList<CacheMetricSnapshot>> GetCacheMetrics()
    {
        return Ok(cacheMetricsCollector.GetSnapshot());
    }
}
