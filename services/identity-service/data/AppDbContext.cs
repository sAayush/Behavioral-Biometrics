using IdentityService.Models;
using Microsoft.EntityFrameworkCore;

namespace IdentityService.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options)
            : base(options) { }

        // This tells EF Core about our "users" table
        public required DbSet<User> Users { get; set; }

        // Refresh tokens table
        public required DbSet<RefreshToken> RefreshTokens { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            // This ensures our "auth" schema is used
            modelBuilder.HasDefaultSchema("auth");
            base.OnModelCreating(modelBuilder);
        }
    }
}
