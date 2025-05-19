using Notable.Auth.Models.Domain;
using Notable.Auth.Models.Dtos;

namespace Notable.Auth.Models
{
    public abstract class AuthConfigMapper<TConfig, TConfigDto> : IAuthConfigMapper
        where TConfig : AuthConfigBase
        where TConfigDto : AuthConfigBaseDto
    {
        public AuthConfigBaseDto Map(AuthConfigBase config)
        {
            var concreteConfig = config as TConfig ?? throw new InvalidOperationException($"Parameter is null or wrong type (expected '{typeof(TConfig)}').");

            return this.MapConfig(concreteConfig);
        }

        protected abstract TConfigDto MapConfig(TConfig config);
    }
}
