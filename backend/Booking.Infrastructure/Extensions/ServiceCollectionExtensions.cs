using Booking.Application.Abstractions;
using Booking.Domain.Entities;
using Booking.Infrastructure.Data;
using Booking.Infrastructure.Identity;
using Booking.Infrastructure.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using StackExchange.Redis;

namespace Booking.Infrastructure.Extensions;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString =
            configuration.GetConnectionString("DefaultConnection")
            ?? "Host=localhost;Port=5432;Database=booking;Username=postgres;Password=postgres";

        services.AddDbContext<BookingDbContext>(options =>
            options.UseNpgsql(connectionString, npgsql => npgsql.EnableRetryOnFailure()));

        services.AddIdentityCore<User>(options =>
            {
                options.User.RequireUniqueEmail = true;
                options.Password.RequireDigit = true;
                options.Password.RequiredLength = 8;
                options.Password.RequireUppercase = true;
                options.Password.RequireLowercase = true;
                options.Password.RequireNonAlphanumeric = false;
                options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(10);
                options.Lockout.MaxFailedAccessAttempts = 5;
                options.Lockout.AllowedForNewUsers = true;
            })
            .AddRoles<IdentityRole<Guid>>()
            .AddEntityFrameworkStores<BookingDbContext>();

        var jwtSection = configuration.GetSection(JwtOptions.SectionName);
        services.Configure<JwtOptions>(options =>
        {
            options.Issuer = jwtSection["Issuer"] ?? string.Empty;
            options.Audience = jwtSection["Audience"] ?? string.Empty;
            options.Key = jwtSection["Key"] ?? string.Empty;
            options.AccessTokenLifetimeMinutes =
                int.TryParse(jwtSection["AccessTokenLifetimeMinutes"], out var accessTokenLifetimeMinutes)
                    ? accessTokenLifetimeMinutes
                    : 30;
            options.RefreshTokenLifetimeDays =
                int.TryParse(jwtSection["RefreshTokenLifetimeDays"], out var refreshTokenLifetimeDays)
                    ? refreshTokenLifetimeDays
                    : 14;
        });

        var redisEnabled = !bool.TryParse(configuration["Redis:Enabled"], out var parsedRedisEnabled) || parsedRedisEnabled;
        if (redisEnabled)
        {
            services.AddSingleton<IConnectionMultiplexer>(_ =>
            {
                var redisConnectionString = configuration["Redis:ConnectionString"]
                    ?? "127.0.0.1:6379,abortConnect=false,connectTimeout=1000,syncTimeout=1000";

                return ConnectionMultiplexer.Connect(redisConnectionString);
            });

            services.AddSingleton<IInventoryLockService, RedisInventoryLockService>();
        }
        else
        {
            services.AddSingleton<IInventoryLockService, NoOpInventoryLockService>();
        }

        services.AddSingleton<ICacheMetricsCollector, CacheMetricsCollector>();
        services.AddScoped<IInventoryLedgerService, InventoryLedgerService>();
        services.AddScoped<JwtTokenFactory>();
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IAddressService, AddressService>();
        services.AddScoped<ICategoryService, CategoryService>();
        services.AddScoped<IOrderProcessingJob, OrderProcessingJob>();
        services.AddScoped<IProductService, ProductService>();
        services.AddSingleton<CartCacheQueue>();
        services.AddSingleton<ICartCacheQueue>(serviceProvider => serviceProvider.GetRequiredService<CartCacheQueue>());
        services.AddScoped<ICartService, CartService>();
        services.AddScoped<IOrderService, OrderService>();

        return services;
    }
}
