using Microsoft.Extensions.DependencyInjection;

using Notable.Auth.Services;

namespace Notable.Auth
{
    public static class DependencyInjection
    {
        /// <summary>
        /// Add notable base authentication services
        /// </summary>
        /// <param name="services"></param>
        /// <param name="configuration"></param>
        /// <returns></returns>
        public static IServiceCollection AddBaseAuth(this IServiceCollection services)
        {
            services.AddTransient<ICurrentUser, CurrentUser>();

            return services;
        }
    }
}
