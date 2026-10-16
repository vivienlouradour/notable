using Notable.Identity.Authentication.BuiltIn;
using Notable.Identity.Authentication.Oidc;

namespace Notable.Identity.Authentication;

internal sealed record AuthenticationOptions
{
    public static string SectionName => "Authentication";
    public BuiltInAuthenticationOptions BuiltIn { get; set; } = new();

    public OidcAuthenticationOptions Oidc { get; set; } = new();
}
