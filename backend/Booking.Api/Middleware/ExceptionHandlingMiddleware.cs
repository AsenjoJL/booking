using System.Net;
using System.Text.Json;
using Booking.Application.Exceptions;
using Microsoft.EntityFrameworkCore;
using Serilog;

namespace Booking.Api.Middleware;

public sealed class ExceptionHandlingMiddleware(RequestDelegate next)
{
    public async Task Invoke(HttpContext context)
    {
        try
        {
            await next(context);
        }
        catch (Exception exception)
        {
            await HandleExceptionAsync(context, exception);
        }
    }

    private static async Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        var (statusCode, message) = exception switch
        {
            ValidationException => (HttpStatusCode.BadRequest, exception.Message),
            AppUnauthorizedException => (HttpStatusCode.Unauthorized, exception.Message),
            NotFoundException => (HttpStatusCode.NotFound, exception.Message),
            ConflictException => (HttpStatusCode.Conflict, exception.Message),
            ConcurrencyException => (HttpStatusCode.Conflict, exception.Message),
            DbUpdateConcurrencyException => (HttpStatusCode.Conflict, "The resource was modified by another request."),
            _ => (HttpStatusCode.InternalServerError, "CRASH LOG: " + exception.ToString())
        };

        Log.ForContext("CorrelationId", context.TraceIdentifier)
            .ForContext("RequestPath", context.Request.Path.Value)
            .ForContext("StatusCode", (int)statusCode)
            .Error(exception, "Request failed.");

        context.Response.StatusCode = (int)statusCode;
        context.Response.ContentType = "application/json";
        context.Response.Headers[CorrelationIdMiddleware.HeaderName] = context.TraceIdentifier;

        await context.Response.WriteAsync(JsonSerializer.Serialize(new
        {
            correlationId = context.TraceIdentifier,
            error = message
        }));
    }
}
