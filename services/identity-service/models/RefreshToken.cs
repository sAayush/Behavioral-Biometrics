using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace IdentityService.Models
{
    [Table("refresh_tokens", Schema = "auth")]
    public class RefreshToken
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        [Column("user_id")]
        public Guid UserId { get; set; }

        [Required]
        [Column("token")]
        public required string Token { get; set; }

        [Column("expires_at")]
        public DateTime ExpiresAt { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("revoked_at")]
        public DateTime? RevokedAt { get; set; }

        [Column("is_revoked")]
        public bool IsRevoked { get; set; } = false;

        // Navigation property
        [ForeignKey("UserId")]
        public User? User { get; set; }

        public bool IsExpired => DateTime.UtcNow >= ExpiresAt;
        public bool IsActive => !IsRevoked && !IsExpired;
    }
}
