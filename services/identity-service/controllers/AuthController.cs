using IdentityService.Dtos;
using IdentityService.Services;
using Microsoft.AspNetCore.Mvc;

namespace IdentityService.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Produces("application/json")]
    public class AuthController : ControllerBase
    {
        private readonly IAuthService _authService;
        private readonly ILogger<AuthController> _logger;

        public AuthController(IAuthService authService, ILogger<AuthController> logger)
        {
            _authService = authService;
            _logger = logger;
        }

        /// <summary>
        /// Register a new user
        /// </summary>
        /// <param name="request">User registration details</param>
        /// <returns>Authentication response with token</returns>
        /// <response code="201">User registered successfully</response>
        /// <response code="400">Invalid request data</response>
        /// <response code="409">User already exists</response>
        [HttpPost("register")]
        [ProducesResponseType(typeof(AuthResponse), StatusCodes.Status201Created)]
        [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status409Conflict)]
        public async Task<ActionResult<AuthResponse>> Register([FromBody] RegisterRequest request)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(
                    new ErrorResponse
                    {
                        Message = "Validation failed",
                        Details = string.Join(
                            ", ",
                            ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage)
                        ),
                    }
                );
            }

            try
            {
                var response = await _authService.RegisterAsync(request);
                return CreatedAtAction(nameof(Register), response);
            }
            catch (InvalidOperationException ex)
            {
                _logger.LogWarning("Registration failed: {Message}", ex.Message);
                return Conflict(new ErrorResponse { Message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during user registration");
                return StatusCode(
                    500,
                    new ErrorResponse { Message = "An error occurred during registration" }
                );
            }
        }

        /// <summary>
        /// Login with email and password
        /// </summary>
        /// <param name="request">Login credentials</param>
        /// <returns>Authentication response with token</returns>
        /// <response code="200">Login successful</response>
        /// <response code="400">Invalid request data</response>
        /// <response code="401">Invalid credentials</response>
        [HttpPost("login")]
        [ProducesResponseType(typeof(AuthResponse), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status401Unauthorized)]
        public async Task<ActionResult<AuthResponse>> Login([FromBody] LoginRequest request)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(
                    new ErrorResponse
                    {
                        Message = "Validation failed",
                        Details = string.Join(
                            ", ",
                            ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage)
                        ),
                    }
                );
            }

            try
            {
                var response = await _authService.LoginAsync(request);
                return Ok(response);
            }
            catch (UnauthorizedAccessException ex)
            {
                _logger.LogWarning("Login failed: {Message}", ex.Message);
                return Unauthorized(new ErrorResponse { Message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during user login");
                return StatusCode(
                    500,
                    new ErrorResponse { Message = "An error occurred during login" }
                );
            }
        }

        /// <summary>
        /// Refresh access token using refresh token
        /// </summary>
        /// <param name="request">Refresh token request</param>
        /// <returns>New authentication response with tokens</returns>
        /// <response code="200">Token refreshed successfully</response>
        /// <response code="400">Invalid request data</response>
        /// <response code="401">Invalid or expired refresh token</response>
        [HttpPost("refresh")]
        [ProducesResponseType(typeof(AuthResponse), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status401Unauthorized)]
        public async Task<ActionResult<AuthResponse>> RefreshToken(
            [FromBody] RefreshTokenRequest request
        )
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(
                    new ErrorResponse
                    {
                        Message = "Validation failed",
                        Details = string.Join(
                            ", ",
                            ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage)
                        ),
                    }
                );
            }

            try
            {
                var response = await _authService.RefreshTokenAsync(request);
                return Ok(response);
            }
            catch (UnauthorizedAccessException ex)
            {
                _logger.LogWarning("Token refresh failed: {Message}", ex.Message);
                return Unauthorized(new ErrorResponse { Message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during token refresh");
                return StatusCode(
                    500,
                    new ErrorResponse { Message = "An error occurred during token refresh" }
                );
            }
        }

        /// <summary>
        /// Revoke a refresh token
        /// </summary>
        /// <param name="request">Refresh token to revoke</param>
        /// <returns>Success response</returns>
        /// <response code="200">Token revoked successfully</response>
        /// <response code="400">Invalid request data</response>
        [HttpPost("revoke")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> RevokeToken([FromBody] RefreshTokenRequest request)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(
                    new ErrorResponse
                    {
                        Message = "Validation failed",
                        Details = string.Join(
                            ", ",
                            ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage)
                        ),
                    }
                );
            }

            try
            {
                await _authService.RevokeTokenAsync(request.RefreshToken);
                return Ok(new { Message = "Token revoked successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during token revocation");
                return StatusCode(
                    500,
                    new ErrorResponse { Message = "An error occurred during token revocation" }
                );
            }
        }
    }
}
