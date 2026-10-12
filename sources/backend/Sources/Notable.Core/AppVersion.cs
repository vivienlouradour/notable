using System.Reflection;

namespace Notable.Core
{
    public static class AppVersion
    {
        private const string UnknownVersion = "Unknown";
        private static readonly string? fullValue = typeof(AppVersion).Assembly.GetCustomAttribute<AssemblyInformationalVersionAttribute>()?.InformationalVersion;
        
        public static readonly string Version = fullValue?.Split('+')[0] ?? UnknownVersion;
        public static readonly string FullVersion = fullValue ?? UnknownVersion;
        public static readonly string AssemblyVersion = typeof(AppVersion).Assembly.GetName().Version?.ToString() ?? UnknownVersion;
    }
}
