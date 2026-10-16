using Microsoft.AspNetCore.Identity;

namespace Notable.Identity.Users;

internal class ApplicationUser : IdentityUser<Guid>
{
    public DateTime CreatedAt { get; set; }
}
