using System.ComponentModel.DataAnnotations;

namespace IdentityService.Dtos
{
    public class RefreshTokenRequest
    {
        [Required(ErrorMessage = "Refresh token is required")]
        public required string RefreshToken { get; set; }
    }
}
