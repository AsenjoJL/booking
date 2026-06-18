using Booking.Application.Exceptions;
using Microsoft.Extensions.Logging;
using StackExchange.Redis;

namespace Booking.Infrastructure.Services;

public sealed class RedisInventoryLockService(
    IConnectionMultiplexer redis,
    ILogger<RedisInventoryLockService> logger) : IInventoryLockService
{
    private static readonly TimeSpan LockTtl = TimeSpan.FromSeconds(15);
    private static readonly TimeSpan RetryDelay = TimeSpan.FromMilliseconds(75);
    private const int MaxAttempts = 20;

    private static readonly LuaScript ReleaseScript = LuaScript.Prepare("""
        if redis.call('get', @key) == @token then
            return redis.call('del', @key)
        end
        return 0
        """);

    public async Task<IAsyncDisposable> AcquireProductsAsync(
        IReadOnlyCollection<Guid> productIds,
        CancellationToken cancellationToken)
    {
        if (productIds.Count == 0)
        {
            return NoOpAsyncDisposable.Instance;
        }

        IDatabase? database = null;
        var lockEntries = new List<LockEntry>(productIds.Count);

        try
        {
            database = redis.GetDatabase();

            foreach (var productId in productIds.Distinct().OrderBy(id => id))
            {
                var redisKey = new RedisKey(GetInventoryLockKey(productId));
                var token = Guid.NewGuid().ToString("N");
                var acquired = false;

                for (var attempt = 0; attempt < MaxAttempts; attempt++)
                {
                    cancellationToken.ThrowIfCancellationRequested();

                    acquired = await database.StringSetAsync(
                        redisKey,
                        token,
                        LockTtl,
                        when: When.NotExists);

                    if (acquired)
                    {
                        lockEntries.Add(new LockEntry(redisKey, token));
                        break;
                    }

                    await Task.Delay(RetryDelay, cancellationToken);
                }

                if (!acquired)
                {
                    throw new ConflictException("Inventory is busy. Please try again.");
                }
            }

            return new Releaser(database, lockEntries, logger);
        }
        catch (RedisConnectionException exception)
        {
            logger.LogWarning(
                exception,
                "Redis inventory lock unavailable. Falling back to database-level locking only.");
            return NoOpAsyncDisposable.Instance;
        }
        catch (RedisTimeoutException exception)
        {
            logger.LogWarning(
                exception,
                "Redis inventory lock timed out. Falling back to database-level locking only.");
            return NoOpAsyncDisposable.Instance;
        }
        catch
        {
            if (database is not null && lockEntries.Count > 0)
            {
                await Releaser.ReleaseAsync(database, lockEntries, logger);
            }
            throw;
        }
    }

    private static string GetInventoryLockKey(Guid productId) => $"lock:inventory:{productId:N}";

    private readonly record struct LockEntry(RedisKey Key, string Token);

    private sealed class Releaser(
        IDatabase database,
        List<LockEntry> lockEntries,
        ILogger logger) : IAsyncDisposable
    {
        private bool _disposed;

        public async ValueTask DisposeAsync()
        {
            if (_disposed)
            {
                return;
            }

            _disposed = true;
            await ReleaseAsync(database, lockEntries, logger);
        }

        public static async Task ReleaseAsync(
            IDatabase database,
            List<LockEntry> lockEntries,
            ILogger logger)
        {
            foreach (var entry in lockEntries)
            {
                try
                {
                    await database.ScriptEvaluateAsync(
                        ReleaseScript,
                        new
                        {
                            key = (RedisKey)entry.Key,
                            token = (RedisValue)entry.Token
                        });
                }
                catch (Exception exception)
                {
                    logger.LogWarning(exception, "Failed to release inventory lock {LockKey}.", entry.Key);
                }
            }
        }
    }

    private sealed class NoOpAsyncDisposable : IAsyncDisposable
    {
        public static NoOpAsyncDisposable Instance { get; } = new();

        public ValueTask DisposeAsync() => ValueTask.CompletedTask;
    }
}
