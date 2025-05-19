using Microsoft.Extensions.DependencyInjection;

using Notable.Auth.BuiltIn.Models;
using Notable.Auth.Models;
using Notable.Auth.Services;

namespace Notable.Auth.BuiltIn
{
    public static class DependencyInjection
    {
        public static IServiceCollection AddBuiltInAuth(this IServiceCollection services)
        {
            services.AddTransient<IAuthService, BuiltInAuthService>();
            services.AddTransient<IAuthConfigMapper, BuiltInAuthConfigMapper>();

            return services;
        }
    }
}
