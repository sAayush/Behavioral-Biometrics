using System.Security.Claims;
using IdentityService.Data;
using IdentityService.Dtos;
using IdentityService.Models;
using Microsoft.EntityFrameworkCore;

namespace IdentityService.Services
{
    public class AuthService : IAuthService
    {
        private readonly AppDbContext _context;
        private readonly ITokenService _tokenService;
        private readonly ILogger<AuthService> _logger;
        private readonly IConfiguration _configuration;

        public AuthService(
            AppDbContext context,
            ITokenService tokenService,
            ILogger<AuthService> logger,
            IConfiguration configuration
        )
        {
            _context = context;
            _tokenService = tokenService;
            _logger = logger;
            _configuration = configuration;
        }

        public async Task<AuthResponse> RegisterAsync(RegisterRequest request)
        {
            // Check if user already exists
            var existingUser = await _context.Users.FirstOrDefaultAsync(u =>
                u.Email == request.Email.ToLowerInvariant()
            );

            if (existingUser != null)
            {
                throw new InvalidOperationException("User with this email already exists");
            }

            // Hash password
            var passwordHash = BCrypt.Net.BCrypt.HashPassword(request.Password);

            // Create new user
            var user = new User
            {
                Email = request.Email.ToLowerInvariant(),
                PasswordHash = passwordHash,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                IsActive = true,
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            _logger.LogInformation("User registered successfully: {Email}", user.Email);

            // Generate tokens
            var accessToken = _tokenService.GenerateAccessToken(user);
            var refreshToken = _tokenService.GenerateRefreshToken();

            // Get refresh token expiration from config
            var refreshTokenExpirationDays = int.Parse(
                _configuration["JwtSettings:RefreshTokenExpirationDays"]
                    ?? Environment.GetEnvironmentVariable("JWT_REFRESH_TOKEN_EXPIRATION_DAYS")
                    ?? "7"
            );
            var refreshTokenExpiresAt = DateTime.UtcNow.AddDays(refreshTokenExpirationDays);

            // Store refresh token
            var refreshTokenEntity = new RefreshToken
            {
                UserId = user.Id,
                Token = refreshToken,
                ExpiresAt = refreshTokenExpiresAt,
                CreatedAt = DateTime.UtcNow,
            };

            _context.RefreshTokens.Add(refreshTokenEntity);
            await _context.SaveChangesAsync();

            // Get access token expiration
            var accessTokenExpirationMinutes = int.Parse(
                _configuration["JwtSettings:AccessTokenExpirationMinutes"]
                    ?? Environment.GetEnvironmentVariable("JWT_ACCESS_TOKEN_EXPIRATION_MINUTES")
                    ?? "15"
            );
            var accessTokenExpiresAt = DateTime.UtcNow.AddMinutes(accessTokenExpirationMinutes);

            return new AuthResponse
            {
                AccessToken = accessToken,
                RefreshToken = refreshToken,
                Email = user.Email,
                UserId = user.Id,
                AccessTokenExpiresAt = accessTokenExpiresAt,
                RefreshTokenExpiresAt = refreshTokenExpiresAt,
            };
        }

        public async Task<AuthResponse> LoginAsync(LoginRequest request)
        {
            // Find user by email
            var user = await _context.Users.FirstOrDefaultAsync(u =>
                u.Email == request.Email.ToLowerInvariant()
            );

            if (user == null)
            {
                throw new UnauthorizedAccessException("Invalid email or password");
            }

            // Check if user is active
            if (!user.IsActive)
            {
                throw new UnauthorizedAccessException("User account is inactive");
            }

            // Verify password
            var isPasswordValid = BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash);

            if (!isPasswordValid)
            {
                _logger.LogWarning("Failed login attempt for email: {Email}", request.Email);
                throw new UnauthorizedAccessException("Invalid email or password");
            }

            // Update last login time
            user.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            _logger.LogInformation("User logged in successfully: {Email}", user.Email);

            // Generate tokens
            var accessToken = _tokenService.GenerateAccessToken(user);
            var refreshToken = _tokenService.GenerateRefreshToken();

            // Get refresh token expiration from config
            var refreshTokenExpirationDays = int.Parse(
                _configuration["JwtSettings:RefreshTokenExpirationDays"]
                    ?? Environment.GetEnvironmentVariable("JWT_REFRESH_TOKEN_EXPIRATION_DAYS")
                    ?? "7"
            );
            var refreshTokenExpiresAt = DateTime.UtcNow.AddDays(refreshTokenExpirationDays);

            // Revoke old refresh tokens for this user (optional: keep last N tokens)
            var oldTokens = await _context
                .RefreshTokens.Where(rt => rt.UserId == user.Id && user.IsActive)
                .ToListAsync();

            foreach (var oldToken in oldTokens)
            {
                oldToken.IsRevoked = true;
                oldToken.RevokedAt = DateTime.UtcNow;
            }

            // Store new refresh token
            var refreshTokenEntity = new RefreshToken
            {
                UserId = user.Id,
                Token = refreshToken,
                ExpiresAt = refreshTokenExpiresAt,
                CreatedAt = DateTime.UtcNow,
            };

            _context.RefreshTokens.Add(refreshTokenEntity);
            await _context.SaveChangesAsync();

            // Get access token expiration
            var accessTokenExpirationMinutes = int.Parse(
                _configuration["JwtSettings:AccessTokenExpirationMinutes"]
                    ?? Environment.GetEnvironmentVariable("JWT_ACCESS_TOKEN_EXPIRATION_MINUTES")
                    ?? "15"
            );
            var accessTokenExpiresAt = DateTime.UtcNow.AddMinutes(accessTokenExpirationMinutes);

            return new AuthResponse
            {
                AccessToken = accessToken,
                RefreshToken = refreshToken,
                Email = user.Email,
                UserId = user.Id,
                AccessTokenExpiresAt = accessTokenExpiresAt,
                RefreshTokenExpiresAt = refreshTokenExpiresAt,
            };
        }

        public async Task<AuthResponse> RefreshTokenAsync(RefreshTokenRequest request)
        {
            var refreshTokenEntity = await _context
                .RefreshTokens.Include(rt => rt.User)
                .FirstOrDefaultAsync(rt => rt.Token == request.RefreshToken);

            if (refreshTokenEntity == null || !refreshTokenEntity.IsActive)
            {
                throw new UnauthorizedAccessException("Invalid or expired refresh token");
            }

            var user = refreshTokenEntity.User;
            if (user == null || !user.IsActive)
            {
                throw new UnauthorizedAccessException("User account is inactive");
            }

            // Generate new tokens
            var newAccessToken = _tokenService.GenerateAccessToken(user);
            var newRefreshToken = _tokenService.GenerateRefreshToken();

            // Revoke old refresh token
            refreshTokenEntity.IsRevoked = true;
            refreshTokenEntity.RevokedAt = DateTime.UtcNow;

            // Get refresh token expiration from config
            var refreshTokenExpirationDays = int.Parse(
                _configuration["JwtSettings:RefreshTokenExpirationDays"]
                    ?? Environment.GetEnvironmentVariable("JWT_REFRESH_TOKEN_EXPIRATION_DAYS")
                    ?? "7"
            );
            var refreshTokenExpiresAt = DateTime.UtcNow.AddDays(refreshTokenExpirationDays);

            // Store new refresh token
            var newRefreshTokenEntity = new RefreshToken
            {
                UserId = user.Id,
                Token = newRefreshToken,
                ExpiresAt = refreshTokenExpiresAt,
                CreatedAt = DateTime.UtcNow,
            };

            _context.RefreshTokens.Add(newRefreshTokenEntity);
            await _context.SaveChangesAsync();

            // Get access token expiration
            var accessTokenExpirationMinutes = int.Parse(
                _configuration["JwtSettings:AccessTokenExpirationMinutes"]
                    ?? Environment.GetEnvironmentVariable("JWT_ACCESS_TOKEN_EXPIRATION_MINUTES")
                    ?? "15"
            );
            var accessTokenExpiresAt = DateTime.UtcNow.AddMinutes(accessTokenExpirationMinutes);

            _logger.LogInformation("Token refreshed for user: {Email}", user.Email);

            return new AuthResponse
            {
                AccessToken = newAccessToken,
                RefreshToken = newRefreshToken,
                Email = user.Email,
                UserId = user.Id,
                AccessTokenExpiresAt = accessTokenExpiresAt,
                RefreshTokenExpiresAt = refreshTokenExpiresAt,
            };
        }

        public async Task RevokeTokenAsync(string refreshToken)
        {
            var refreshTokenEntity = await _context.RefreshTokens.FirstOrDefaultAsync(rt =>
                rt.Token == refreshToken
            );

            if (refreshTokenEntity != null && refreshTokenEntity.IsActive)
            {
                refreshTokenEntity.IsRevoked = true;
                refreshTokenEntity.RevokedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();

                _logger.LogInformation(
                    "Refresh token revoked for user: {UserId}",
                    refreshTokenEntity.UserId
                );
            }
        }

        public async Task LogoutUserAsync(string email)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == email);
            if (user == null)
            {
                _logger.LogWarning("User not found: {Email}", email);
                throw new UnauthorizedAccessException("User not found");
            }
            user.IsActive = false;
            await _context.SaveChangesAsync();
            _logger.LogInformation("User logged out successfully: {Email}", email);
        }
    }
}
