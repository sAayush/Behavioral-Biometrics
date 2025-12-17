using IdentityService.Dtos;

namespace IdentityService.Services
{
    public interface IAuthService
    {
        Task<AuthResponse> RegisterAsync(RegisterRequest request);
        Task<AuthResponse> LoginAsync(LoginRequest request);
        Task<AuthResponse> RefreshTokenAsync(RefreshTokenRequest request);
        Task RevokeTokenAsync(string refreshToken);
        Task LogoutUserAsync(string email);
    }
}
