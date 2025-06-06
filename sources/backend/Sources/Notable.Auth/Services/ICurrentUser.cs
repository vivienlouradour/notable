using Notable.Auth.Models.Domain;

namespace Notable.Auth.Services
{
    public interface ICurrentUser
    {
        /// <summary>
        /// Gets the authenticated user, null if not authenticated.
        /// </summary>
        public User? User { get; }
    }
}
