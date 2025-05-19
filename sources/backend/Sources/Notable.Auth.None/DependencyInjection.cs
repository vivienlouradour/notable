using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;

using Notable.Auth.Models;
using Notable.Auth.None.Models;
using Notable.Auth.Services;

using System.Security.Claims;

namespace Notable.Auth.None
{
    public static class DependencyInjection
    {
        public static IServiceCollection AddNoneAuth(this IServiceCollection services)
        {
            services.AddTransient<IAuthService, NoneAuthService>();
            services.AddTransient<IAuthConfigMapper, NoneAuthConfigMapper>();

            return services;
        }

        public static IApplicationBuilder UseNoneAuth(this IApplicationBuilder builder)
        {
            // Inject a fictive user so any request can pass through authentication mecanism
            return builder.Use(async (context, next) =>
            {
                var identity = new ClaimsIdentity([new Claim(ClaimTypes.Name, "Anonymous")], "None");
                
                context.User = new ClaimsPrincipal(identity);

                await next();
            });
        }
    }
}
