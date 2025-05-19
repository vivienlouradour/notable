using Notable.Auth.Models.Domain;
using Notable.Auth.Models.Dtos;

namespace Notable.Auth.Models
{
    public interface IAuthConfigMapper
    {
        public AuthConfigBaseDto Map(AuthConfigBase config);
    }
}
