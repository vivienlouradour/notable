using Microsoft.Extensions.DependencyInjection;

using Notable.CouchDb.Services;

namespace Notable.CouchDb
{
    public static class DependencyInjection
    {
        public static IServiceCollection AddCouchDb(this IServiceCollection services)
        {
            services.AddTransient<ICouchDbService, CouchDbService>();
            services.AddTransient<ICouchDbProxy, CouchDbProxy>();

            return services;
        }
    }
}
