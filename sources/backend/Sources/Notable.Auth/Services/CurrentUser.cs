using Microsoft.AspNetCore.Http;

using Notable.Auth.Models.Domain;

using System.Security.Claims;

namespace Notable.Auth.Services
{
    internal class CurrentUser(IHttpContextAccessor httpContextAccessor) : ICurrentUser
    {
        private readonly IHttpContextAccessor httpContextAccessor = httpContextAccessor;

        public User? User => MapUser(this.httpContextAccessor.HttpContext?.User);

        private static User? MapUser(ClaimsPrincipal? claims)
        {
            var name = claims?.FindFirst(ClaimTypes.Name)?.Value;
            if (name == null)
            {
                return null;
            }

            return new User { Name = name };
        }
    }
}
