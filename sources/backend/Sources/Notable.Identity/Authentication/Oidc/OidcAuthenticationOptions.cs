namespace Notable.Identity.Authentication.Oidc;

internal sealed record OidcAuthenticationOptions
{
    public bool Enabled { get; set; } = false;

    public string? Authority { get; set; }

    public string? ClientId { get; set; }

    public string? ClientSecret { get; set; }

    public string DisplayName { get; set; } = "OpenID Connect";

    public bool AutoProvisionUsers { get; set; } = true;
}
