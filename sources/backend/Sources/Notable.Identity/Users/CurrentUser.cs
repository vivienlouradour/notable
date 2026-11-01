using System.Security.Claims;

using Microsoft.AspNetCore.Http;

using Notable.Identity.Common;

namespace Notable.Identity.Users;

internal sealed class CurrentUser(IHttpContextAccessor accessor) : ICurrentUser
{
    public Guid Id
    {
        get
        {
            var value = accessor.HttpContext?.User.FindFirstValue(NotableClaimTypes.UserId);

            return !Guid.TryParse(value, out var userId)
                ? throw new UnauthorizedAccessException("No authenticated Notable user.")
                : userId;
        }
    }
}
