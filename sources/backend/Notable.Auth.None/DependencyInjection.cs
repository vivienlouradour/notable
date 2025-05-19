using Microsoft.Extensions.DependencyInjection;

using Notable.Auth.Models;
using Notable.Auth.None.Models;
using Notable.Auth.Services;

namespace Notable.Auth.None
{
    public static class DependencyInjection
    {
        public static IServiceCollection AddNoneAuthentication(this IServiceCollection services)
        {
            services.AddTransient<IAuthService, NoneAuthService>();
            services.AddTransient<IAuthConfigMapper, NoneAuthConfigMapper>();

            // Should inject a fictive user

            return services;
        }
    }
}
