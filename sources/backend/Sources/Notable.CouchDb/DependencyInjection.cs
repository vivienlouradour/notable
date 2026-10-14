using Microsoft.Extensions.DependencyInjection;

using Notable.CouchDb.Services;

namespace Notable.CouchDb
{
    public static class DependencyInjection
    {
        public static IServiceCollection AddCouchDbServices(this IServiceCollection services)
        {
            services.AddTransient<ICouchDbProxy, CouchDbProxy>();

            return services;
        }
    }
}
