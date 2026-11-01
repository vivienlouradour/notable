using System.Reflection;

namespace Notable.Core;

public static class AppVersion
{
    private const string UnknownVersion = "Unknown";
    private static readonly string? s_fullValue = typeof(AppVersion).Assembly.GetCustomAttribute<AssemblyInformationalVersionAttribute>()?.InformationalVersion;

    public static readonly string Version = s_fullValue?.Split('+')[0] ?? UnknownVersion;
    public static readonly string FullVersion = s_fullValue ?? UnknownVersion;
    public static readonly string AssemblyVersion = typeof(AppVersion).Assembly.GetName().Version?.ToString() ?? UnknownVersion;
}
