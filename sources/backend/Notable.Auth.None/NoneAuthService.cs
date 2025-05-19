using Notable.Auth.Exceptions;
using Notable.Auth.Models.Domain;
using Notable.Auth.None.Models.Domain;
using Notable.Auth.Services;

namespace Notable.Auth.None
{
    public class NoneAuthService : IAuthService
    {
        public Task<AuthConfigBase> GetConfigurationAsync(CancellationToken cancellationToken)
        {
            return Task.FromResult<AuthConfigBase>(new NoneAuthConfig());
        }

        public Task<string> LoginAsync(LoginRequest loginRequest, CancellationToken cancellationToken)
        {
            throw AuthInvalidOperationException.NoLogin;
        }
    }
}
