using Notable.Auth.Models;
using Notable.Auth.Models.Domain;
using Notable.Auth.Models.Dtos;
using Notable.Auth.None.Models.Domain;
using Notable.Auth.None.Models.Dtos;

namespace Notable.Auth.None.Models
{
    public class NoneAuthConfigMapper : AuthConfigMapper<NoneAuthConfig, NoneAuthConfigDto>
    {
        protected override NoneAuthConfigDto MapConfig(NoneAuthConfig config) => new() { Name = config.Name };
    }
}
