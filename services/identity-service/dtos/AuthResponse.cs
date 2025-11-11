namespace IdentityService.Dtos
{
    public class AuthResponse
    {
        public required string AccessToken { get; set; }
        public required string RefreshToken { get; set; }
        public required string Email { get; set; }
        public Guid UserId { get; set; }
        public DateTime AccessTokenExpiresAt { get; set; }
        public DateTime RefreshTokenExpiresAt { get; set; }
    }
}
