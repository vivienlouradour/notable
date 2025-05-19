using Notable.Auth.BuiltIn.Models.Domain;
using Notable.Auth.BuiltIn.Models.Dtos;
using Notable.Auth.Models;

namespace Notable.Auth.BuiltIn.Models
{
    public class BuiltInAuthConfigMapper : AuthConfigMapper<BuiltInAuthConfig, BuiltInAuthConfigDto>
    {
        protected override BuiltInAuthConfigDto MapConfig(BuiltInAuthConfig config) => new() { Name = config.Name };
    }
}
