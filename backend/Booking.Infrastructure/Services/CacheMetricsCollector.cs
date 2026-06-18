using System.Collections.Concurrent;

namespace Booking.Infrastructure.Services;

public interface ICacheMetricsCollector
{
    void RecordHit(string cacheName);
    void RecordMiss(string cacheName);
    IReadOnlyList<CacheMetricSnapshot> GetSnapshot();
}

public sealed class CacheMetricsCollector : ICacheMetricsCollector
{
    private readonly ConcurrentDictionary<string, CacheMetricCounter> _counters = new(StringComparer.OrdinalIgnoreCase);

    public void RecordHit(string cacheName)
    {
        var counter = _counters.GetOrAdd(cacheName, _ => new CacheMetricCounter());
        counter.RecordHit();
    }

    public void RecordMiss(string cacheName)
    {
        var counter = _counters.GetOrAdd(cacheName, _ => new CacheMetricCounter());
        counter.RecordMiss();
    }

    public IReadOnlyList<CacheMetricSnapshot> GetSnapshot()
    {
        return _counters
            .OrderBy(entry => entry.Key, StringComparer.OrdinalIgnoreCase)
            .Select(entry => entry.Value.ToSnapshot(entry.Key))
            .ToList();
    }

    private sealed class CacheMetricCounter
    {
        private long _hits;
        private long _misses;

        public void RecordHit() => Interlocked.Increment(ref _hits);

        public void RecordMiss() => Interlocked.Increment(ref _misses);

        public CacheMetricSnapshot ToSnapshot(string cacheName)
        {
            var hits = Interlocked.Read(ref _hits);
            var misses = Interlocked.Read(ref _misses);
            var total = hits + misses;

            return new CacheMetricSnapshot
            {
                CacheName = cacheName,
                Hits = hits,
                Misses = misses,
                Total = total,
                HitRate = total == 0 ? 0 : Math.Round((double)hits / total, 4)
            };
        }
    }
}

public sealed class CacheMetricSnapshot
{
    public required string CacheName { get; init; }
    public required long Hits { get; init; }
    public required long Misses { get; init; }
    public required long Total { get; init; }
    public required double HitRate { get; init; }
}
