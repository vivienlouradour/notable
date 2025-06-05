using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.DependencyInjection;

using Notable.Auth.Models;
using Notable.Auth.None.Models;
using Notable.Auth.Services;

namespace Notable.Auth.None
{
    public static class DependencyInjection
    {
        public static IServiceCollection AddNoneAuth(this IServiceCollection services)
        {
            services.AddTransient<IAuthService, NoneAuthService>();
            services.AddTransient<IAuthConfigMapper, NoneAuthConfigMapper>();

            services.AddAuthentication("NoneScheme")
                .AddScheme<AuthenticationSchemeOptions, NoneAuthHandler>("NoneScheme", options => { });
            
            return services;
        }
    }
}
