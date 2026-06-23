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
public sealed class AuthController(IAuthService authService) : ControllerBase
{
    [HttpPost("register")]
    [AllowAnonymous]
    public async Task<ActionResult<AuthResponseDto>> Register(
        [FromBody] RegisterRequestDto request,
        CancellationToken cancellationToken)
    {
        var response = await authService.RegisterAsync(request, cancellationToken);
        return Ok(response);
    }

    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<ActionResult<AuthResponseDto>> Login(
        [FromBody] LoginRequestDto request,
        CancellationToken cancellationToken)
    {
        var response = await authService.LoginAsync(request, cancellationToken);
        return Ok(response);
    }

    [HttpPost("refresh")]
    [AllowAnonymous]
    public async Task<ActionResult<AuthResponseDto>> Refresh(
        [FromBody] RefreshTokenRequestDto request,
        CancellationToken cancellationToken)
    {
        var response = await authService.RefreshAsync(request, cancellationToken);
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
    [Authorize]
    public async Task<IActionResult> Logout(
        [FromBody] RevokeRefreshTokenRequestDto request,
        CancellationToken cancellationToken)
    {
        await authService.RevokeRefreshTokenAsync(User.GetRequiredUserId(), request, cancellationToken);
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
        await authService.ResendVerificationEmailAsync(request.Email, cancellationToken);
        return Ok(new { message = "Verification email sent. Please check your inbox." });
    }
}
