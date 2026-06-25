using Booking.Api.Extensions;
using Booking.Application.Abstractions;
using Booking.Application.DTOs.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace Booking.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[EnableRateLimiting("auth")]
public sealed class AuthController(
    IAuthService authService,
    IWebHostEnvironment environment) : ControllerBase
{
    private const string ProductionRefreshCookieName = "__Host-booking-refresh";
    private const string DevelopmentRefreshCookieName = "booking-refresh";
    private const string RequestedWithHeader = "X-Requested-With";

    [HttpPost("register")]
    [AllowAnonymous]
    public async Task<ActionResult<RegistrationResponseDto>> Register(
        [FromBody] RegisterRequestDto request,
        CancellationToken cancellationToken)
    {
        RequireAjaxRequest();
        var response = await authService.RegisterAsync(request, cancellationToken);
        return Ok(response);
    }

    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<ActionResult<AuthResponseDto>> Login(
        [FromBody] LoginRequestDto request,
        CancellationToken cancellationToken)
    {
        RequireAjaxRequest();
        var response = await authService.LoginAsync(request, cancellationToken);
        WriteRefreshCookie(response);
        return Ok(response);
    }

    [HttpPost("refresh")]
    [AllowAnonymous]
    public async Task<ActionResult<AuthResponseDto>> Refresh(
        CancellationToken cancellationToken)
    {
        RequireAjaxRequest();
        var request = new RefreshTokenRequestDto
        {
            RefreshToken = ReadRefreshToken()
        };
        var response = await authService.RefreshAsync(request, cancellationToken);
        WriteRefreshCookie(response);
        return Ok(response);
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<ActionResult<UserDto>> Me(CancellationToken cancellationToken)
    {
        var userId = User.GetRequiredUserId();
        var response = await authService.GetCurrentUserAsync(userId, cancellationToken);
        return Ok(response);
    }

    [HttpPut("me")]
    [Authorize]
    [EnableRateLimiting("write")]
    public async Task<ActionResult<UserDto>> UpdateMe(
        [FromBody] UpdateProfileRequestDto request,
        CancellationToken cancellationToken)
    {
        var userId = User.GetRequiredUserId();
        var response = await authService.UpdateCurrentUserAsync(userId, request, cancellationToken);
        return Ok(response);
    }

    [HttpPost("logout")]
    [AllowAnonymous]
    public async Task<IActionResult> Logout(
        CancellationToken cancellationToken)
    {
        RequireAjaxRequest();
        var refreshToken = ReadRefreshToken(required: false);
        if (!string.IsNullOrWhiteSpace(refreshToken))
        {
            await authService.RevokeRefreshTokenAsync(
                new RevokeRefreshTokenRequestDto { RefreshToken = refreshToken },
                cancellationToken);
        }

        DeleteRefreshCookie();
        return NoContent();
    }

    [HttpGet("verify-email")]
    [AllowAnonymous]
    public async Task<IActionResult> VerifyEmail(
        [FromQuery] string userId,
        [FromQuery] string token,
        CancellationToken cancellationToken)
    {
        await authService.VerifyEmailAsync(userId, token, cancellationToken);
        return Ok(new { message = "Email verified successfully. You can now sign in." });
    }

    [HttpPost("resend-verification")]
    [AllowAnonymous]
    public async Task<IActionResult> ResendVerification(
        [FromBody] ResendVerificationRequestDto request,
        CancellationToken cancellationToken)
    {
        RequireAjaxRequest();
        await authService.ResendVerificationEmailAsync(request.Email, cancellationToken);
        return Ok(new { message = "Verification email sent. Please check your inbox." });
    }

    private void WriteRefreshCookie(AuthResponseDto response)
    {
        Response.Cookies.Append(
            GetRefreshCookieName(),
            response.RefreshToken,
            CreateRefreshCookieOptions(response.RefreshTokenExpiresAtUtc));
    }

    private string ReadRefreshToken(bool required = true)
    {
        if (Request.Cookies.TryGetValue(GetRefreshCookieName(), out var refreshToken) &&
            !string.IsNullOrWhiteSpace(refreshToken))
        {
            return refreshToken;
        }

        if (required)
        {
            throw new Booking.Application.Exceptions.AppUnauthorizedException(
                "Refresh session is unavailable.");
        }

        return string.Empty;
    }

    private void DeleteRefreshCookie()
    {
        Response.Cookies.Delete(
            GetRefreshCookieName(),
            CreateRefreshCookieOptions(DateTimeOffset.UnixEpoch.UtcDateTime));
    }

    private CookieOptions CreateRefreshCookieOptions(DateTime expiresAtUtc) =>
        new()
        {
            HttpOnly = true,
            Secure = !environment.IsDevelopment(),
            SameSite = SameSiteMode.Lax,
            Path = "/",
            Expires = new DateTimeOffset(
                DateTime.SpecifyKind(expiresAtUtc, DateTimeKind.Utc)),
            IsEssential = true
        };

    private string GetRefreshCookieName() =>
        environment.IsDevelopment()
            ? DevelopmentRefreshCookieName
            : ProductionRefreshCookieName;

    private void RequireAjaxRequest()
    {
        if (!string.Equals(
                Request.Headers[RequestedWithHeader],
                "XMLHttpRequest",
                StringComparison.Ordinal))
        {
            throw new Booking.Application.Exceptions.AppUnauthorizedException(
                "The request could not be verified.");
        }
    }
}
