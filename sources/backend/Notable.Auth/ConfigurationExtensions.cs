using Microsoft.Extensions.Configuration;

namespace Notable.Auth
{
    public static class ConfigurationExtensions
    {
        public static bool HasAuthModeConfigured(this IConfiguration configuration, string authMode)
        {
            var configuredAuthMode = configuration["auth:mode"];

            return string.Compare(configuredAuthMode, authMode, true) == 0;
        }
    }
}
