using Notable.Auth.BuiltIn.Models.Domain;
using Notable.Auth.Models.Domain;
using Notable.Auth.Services;

namespace Notable.Auth.BuiltIn
{
    internal class BuiltInAuthService : IAuthService
    {
        public Task<AuthConfigBase> GetConfigurationAsync(CancellationToken cancellationToken)
        {
            return Task.FromResult<AuthConfigBase>(new BuiltInAuthConfig());
        }

        public Task<string> LoginAsync(LoginRequest loginRequest, CancellationToken cancellationToken)
        {
            throw new NotImplementedException();
        }
    }
}
