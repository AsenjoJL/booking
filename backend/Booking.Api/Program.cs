using System.Security.Claims;
using System.Text;
using System.Threading.RateLimiting;
using Booking.Application;
using Booking.Application.Abstractions;
using Booking.Api.Hangfire;
using Booking.Api.Middleware;
using Booking.Domain.Entities;
using Booking.Infrastructure.Data;
using Booking.Infrastructure.Extensions;
using Booking.Infrastructure.Identity;
using Hangfire;
using Hangfire.PostgreSql;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Identity;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Microsoft.EntityFrameworkCore;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

ValidateProductionConfiguration(builder.Configuration, builder.Environment);

Log.Logger = new LoggerConfiguration()
    .ReadFrom.Configuration(builder.Configuration)
    .Enrich.FromLogContext()
    .Enrich.WithProperty("Application", "Booking.Api")
    .CreateLogger();

builder.Host.UseSerilog();

builder.Services.AddControllers();
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders =
        ForwardedHeaders.XForwardedFor |
        ForwardedHeaders.XForwardedProto |
        ForwardedHeaders.XForwardedHost;
    options.KnownNetworks.Clear();
    options.KnownProxies.Clear();
});
builder.Services.AddDataProtection()
    .PersistKeysToDbContext<BookingDbContext>()
    .SetApplicationName("Booking.Api");
builder.Services.AddDistributedMemoryCache();
var allowedCorsOrigins = new List<string>();
if (builder.Environment.IsDevelopment())
{
    allowedCorsOrigins.AddRange(
    [
        "http://127.0.0.1:5173",
        "http://localhost:5173",
        "https://127.0.0.1:5173",
        "https://localhost:5173"
    ]);
}

var frontendUrl = builder.Configuration["FrontendUrl"];
if (!string.IsNullOrWhiteSpace(frontendUrl))
{
    allowedCorsOrigins.Add(frontendUrl.Trim().TrimEnd('/'));
}

var configuredCorsOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>();
if (configuredCorsOrigins is { Length: > 0 })
{
    allowedCorsOrigins.AddRange(configuredCorsOrigins);
}

var normalizedAllowedCorsOrigins = allowedCorsOrigins
    .Where(origin => !string.IsNullOrWhiteSpace(origin))
    .Select(origin => origin.Trim().TrimEnd('/'))
    .ToHashSet(StringComparer.OrdinalIgnoreCase);

builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
    {
        policy
            .SetIsOriginAllowed(origin =>
            {
                if (string.IsNullOrWhiteSpace(origin))
                {
                    return false;
                }

                return normalizedAllowedCorsOrigins.Contains(origin.Trim().TrimEnd('/'));
            })
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});
var redisConnectionString = builder.Configuration["Redis:ConnectionString"];
var isDefaultLocalhost = redisConnectionString?.Contains("127.0.0.1") == true || redisConnectionString?.Contains("localhost") == true;
var isProduction = !builder.Environment.IsDevelopment();

var redisEnabled = builder.Configuration.GetValue("Redis:Enabled", true);
if (redisEnabled && isProduction && isDefaultLocalhost)
{
    redisEnabled = false; // Force disable in production if still using default localhost
}

if (redisEnabled)
{
    builder.Services.AddStackExchangeRedisCache(options =>
    {
        options.Configuration = builder.Configuration["Redis:ConnectionString"]
            ?? "127.0.0.1:6379,abortConnect=false,connectTimeout=1000,syncTimeout=1000";
        options.InstanceName = builder.Configuration["Redis:InstanceName"] ?? "booking:";
    });
}
builder.Services.AddEndpointsApiExplorer();
var hangfireConnectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? "Host=localhost;Port=5432;Database=booking;Username=postgres;Password=postgres";
builder.Services.AddHangfire(configuration => configuration
    .UseSimpleAssemblyNameTypeSerializer()
    .UseRecommendedSerializerSettings()
    .UsePostgreSqlStorage(options =>
        options.UseNpgsqlConnection(hangfireConnectionString)));
builder.Services.AddHangfireServer(options =>
{
    options.Queues = ["default", "orders"];
    options.WorkerCount = Math.Max(Environment.ProcessorCount, 2);
});
builder.Services.AddScoped<IOrderJobScheduler, HangfireOrderJobScheduler>();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Booking Ecommerce API",
        Version = "v1"
    });

    var scheme = new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Reference = new OpenApiReference
        {
            Type = ReferenceType.SecurityScheme,
            Id = JwtBearerDefaults.AuthenticationScheme
        }
    };

    options.AddSecurityDefinition(JwtBearerDefaults.AuthenticationScheme, scheme);
    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        [scheme] = Array.Empty<string>()
    });
});

builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddApplication();

var jwtOptions = builder.Configuration.GetSection(JwtOptions.SectionName).Get<JwtOptions>()
    ?? throw new InvalidOperationException("JWT configuration is missing.");

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateIssuerSigningKey = true,
            ValidateLifetime = true,
            ValidIssuer = jwtOptions.Issuer,
            ValidAudience = jwtOptions.Audience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtOptions.Key))
        };
    });

builder.Services.AddAuthorization();
builder.Services.AddRateLimiter(options =>
{
    static string GetPartitionKey(HttpContext context, string bucket)
    {
        var userId = context.User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!string.IsNullOrWhiteSpace(userId))
        {
            return $"{bucket}:user:{userId}";
        }

        var ipAddress = context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        return $"{bucket}:ip:{ipAddress}";
    }

    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.OnRejected = async (context, token) =>
    {
        if (context.Lease.TryGetMetadata(MetadataName.RetryAfter, out var retryAfter))
        {
            context.HttpContext.Response.Headers.RetryAfter = Math.Ceiling(retryAfter.TotalSeconds).ToString();
        }

        await context.HttpContext.Response.WriteAsJsonAsync(new
        {
            error = "Too many requests. Please try again shortly."
        }, token);
    };

    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(context =>
        RateLimitPartition.GetSlidingWindowLimiter(
            GetPartitionKey(context, "global"),
            _ => new SlidingWindowRateLimiterOptions
            {
                PermitLimit = 120,
                Window = TimeSpan.FromMinutes(1),
                SegmentsPerWindow = 6,
                QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                QueueLimit = 0,
                AutoReplenishment = true
            }));

    options.AddPolicy("auth", context =>
        RateLimitPartition.GetFixedWindowLimiter(
            GetPartitionKey(context, "auth"),
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 5,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0,
                AutoReplenishment = true
            }));

    options.AddPolicy("write", context =>
        RateLimitPartition.GetFixedWindowLimiter(
            GetPartitionKey(context, "write"),
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 20,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0,
                AutoReplenishment = true
            }));

    options.AddPolicy("checkout", context =>
        RateLimitPartition.GetFixedWindowLimiter(
            GetPartitionKey(context, "checkout"),
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 3,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0,
                AutoReplenishment = true
            }));

    options.AddPolicy("admin", context =>
        RateLimitPartition.GetFixedWindowLimiter(
            GetPartitionKey(context, "admin"),
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 30,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0,
                AutoReplenishment = true
            }));
});

var app = builder.Build();

app.UseMiddleware<CorrelationIdMiddleware>();
app.UseForwardedHeaders();
app.UseMiddleware<SecurityHeadersMiddleware>();
app.UseSerilogRequestLogging(options =>
{
    options.EnrichDiagnosticContext = (diagnosticContext, httpContext) =>
    {
        diagnosticContext.Set("CorrelationId", httpContext.TraceIdentifier);
        diagnosticContext.Set("RequestHost", httpContext.Request.Host.Value ?? string.Empty);
        diagnosticContext.Set("RequestScheme", httpContext.Request.Scheme ?? string.Empty);
        diagnosticContext.Set("UserAgent", httpContext.Request.Headers.UserAgent.ToString());

        var userId = httpContext.User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!string.IsNullOrWhiteSpace(userId))
        {
            diagnosticContext.Set("UserId", userId);
        }
    };
});
app.UseMiddleware<ExceptionHandlingMiddleware>();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("Frontend");
if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}
app.UseStaticFiles();
app.UseAuthentication();
app.UseRateLimiter();
app.UseAuthorization();

var dashboardEnabled =
    app.Environment.IsDevelopment() ||
    builder.Configuration.GetValue<bool>("Hangfire:DashboardEnabled");

if (dashboardEnabled)
{
    app.UseHangfireDashboard("/jobs", new DashboardOptions
    {
        Authorization = [new AdminOrLocalDashboardAuthorizationFilter(app.Environment)],
        DashboardTitle = "Booking Jobs"
    });
}

if (app.Environment.IsDevelopment())
{
    app.MapGet("/api/diagnostic", () => new { AllowedOrigins = normalizedAllowedCorsOrigins });
}

app.MapGet("/api/health/live", () => Results.Ok(new
{
    status = "healthy",
    timestampUtc = DateTime.UtcNow
}));

app.MapGet(
    "/api/health",
    async (BookingDbContext dbContext, CancellationToken cancellationToken) =>
    {
        var canConnect = await dbContext.Database.CanConnectAsync(cancellationToken);
        return canConnect
            ? Results.Ok(new { status = "ready", timestampUtc = DateTime.UtcNow })
            : Results.StatusCode(StatusCodes.Status503ServiceUnavailable);
    });

app.MapControllers();

if (args.Contains("--migrate", StringComparer.OrdinalIgnoreCase))
{
    await using var scope = app.Services.CreateAsyncScope();
    var dbContext = scope.ServiceProvider.GetRequiredService<BookingDbContext>();
    await dbContext.Database.MigrateAsync();
    return;
}

if (app.Environment.IsDevelopment())
{
    await using var scope = app.Services.CreateAsyncScope();
    var dbContext = scope.ServiceProvider.GetRequiredService<BookingDbContext>();
    var userManager = scope.ServiceProvider.GetRequiredService<UserManager<User>>();
    var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole<Guid>>>();

    await DatabaseSchemaBootstrapper.EnsureCompatibilityAsync(dbContext);
    await DatabaseSeeder.SeedAsync(dbContext, userManager, roleManager);
}

app.Run();

static void ValidateProductionConfiguration(
    IConfiguration configuration,
    IWebHostEnvironment environment)
{
    if (!environment.IsProduction())
    {
        return;
    }

    var errors = new List<string>();
    var connectionString = configuration.GetConnectionString("DefaultConnection");
    var jwtKey = configuration["Jwt:Key"];
    var frontendUrl = configuration["FrontendUrl"];
    var supabaseUrl = configuration["SupabaseStorage:Url"];
    var supabaseServiceRoleKey = configuration["SupabaseStorage:ServiceRoleKey"];
    var smtpUsername = configuration["Smtp:Username"];
    var smtpPassword = configuration["Smtp:Password"];
    var smtpFromEmail = configuration["Smtp:FromEmail"];

    if (string.IsNullOrWhiteSpace(connectionString) ||
        connectionString.Contains("localhost", StringComparison.OrdinalIgnoreCase) ||
        connectionString.Contains("127.0.0.1", StringComparison.OrdinalIgnoreCase))
    {
        errors.Add("ConnectionStrings__DefaultConnection must contain the production database connection.");
    }

    if (string.IsNullOrWhiteSpace(jwtKey) ||
        jwtKey.Length < 32 ||
        jwtKey.Contains("development", StringComparison.OrdinalIgnoreCase) ||
        jwtKey.Contains("replace-me", StringComparison.OrdinalIgnoreCase))
    {
        errors.Add("Jwt__Key must be a unique production secret of at least 32 characters.");
    }

    if (!Uri.TryCreate(frontendUrl, UriKind.Absolute, out var frontendUri) ||
        frontendUri.Scheme != Uri.UriSchemeHttps)
    {
        errors.Add("FrontendUrl must be the HTTPS URL of the deployed frontend.");
    }

    if (!Uri.TryCreate(supabaseUrl, UriKind.Absolute, out var storageUri) ||
        storageUri.Scheme != Uri.UriSchemeHttps ||
        string.IsNullOrWhiteSpace(supabaseServiceRoleKey))
    {
        errors.Add("SupabaseStorage__Url and SupabaseStorage__ServiceRoleKey are required in production.");
    }

    if (string.IsNullOrWhiteSpace(smtpUsername) ||
        string.IsNullOrWhiteSpace(smtpPassword) ||
        string.IsNullOrWhiteSpace(smtpFromEmail) ||
        IsPlaceholder(smtpUsername) ||
        IsPlaceholder(smtpPassword) ||
        IsPlaceholder(smtpFromEmail))
    {
        errors.Add("Smtp__Username, Smtp__Password, and Smtp__FromEmail are required for email verification.");
    }

    if (errors.Count > 0)
    {
        throw new InvalidOperationException(
            $"Production configuration is invalid:{Environment.NewLine}- {string.Join($"{Environment.NewLine}- ", errors)}");
    }

    static bool IsPlaceholder(string value) =>
        value.Contains("YOUR_", StringComparison.OrdinalIgnoreCase) ||
        value.Contains("REPLACE", StringComparison.OrdinalIgnoreCase) ||
        value.Contains("EXAMPLE", StringComparison.OrdinalIgnoreCase);
}
