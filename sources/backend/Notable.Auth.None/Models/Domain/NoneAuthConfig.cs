using Notable.Auth.Models.Domain;

namespace Notable.Auth.None.Models.Domain
{
    public class NoneAuthConfig : AuthConfigBase
    {
        public override string Name => "none";
    }
}
