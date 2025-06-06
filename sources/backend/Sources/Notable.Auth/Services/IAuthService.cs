using Notable.Auth.Exceptions;
using Notable.Auth.Models.Domain;

namespace Notable.Auth.Services
{
    public interface IAuthService
    {
        /// <summary>
        /// Get the auth configuration of the application
        /// </summary>
        /// <param name="cancellationToken">The cancellation token</param>
        /// <returns></returns>
        Task<AuthConfigBase> GetConfigurationAsync(CancellationToken cancellationToken);

        /// <summary>
        /// Perform login.
        /// </summary>
        /// <param name="loginRequest">The user login credentials.</param>
        /// <returns>The JWT token if login successfull.</returns>
        /// <exception cref="AuthInvalidOperationException">Throw if the authentication mode does not allow login request through API.</exception>
        Task<string> LoginAsync(LoginRequest loginRequest, CancellationToken cancellationToken);
    }
}
