namespace Notable.Identity.Authentication.BuiltIn;

internal class BuiltInAuthenticationOptions
{
    public bool Enabled { get; set; } = true;

    public bool AllowRegistration { get; set; } = false;
}
