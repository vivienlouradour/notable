using Microsoft.AspNetCore.Mvc.ApplicationParts;

using Notable.Auth;
using Notable.Auth.BuiltIn;
using Notable.Auth.BuiltIn.Models.Domain;
using Notable.Auth.None;
using Notable.Host.Exceptions;

using System.Reflection;

namespace Notable.Host
{
    public static class ServiceCollectionExtensions
    {
        public static IServiceCollection ConfigureNotableAuth(this IServiceCollection services, IConfiguration configuration)
        {
            services.AddBaseAuth();

            if (configuration.HasAuthModeConfigured("none"))
            {
                services.AddNoneAuth();
            }
            else if (configuration.HasAuthModeConfigured("builtin"))
            {
                services.AddBuiltInAuth();
            }
            else
            {
                throw new ConfigurationException("No auth mode configured");
            }
            
            return services;
        }

        public static IMvcBuilder HideBuiltInLoginControllerIfNecessary(this IMvcBuilder mvcBuilder, IConfiguration configuration)
        {
            if (!configuration.HasAuthModeConfigured("builtin"))
            {
                mvcBuilder.DeleteAssemblyControllers(typeof(BuiltInAuthConfig).Assembly);
            }

            return mvcBuilder;
        }

        private static void DeleteAssemblyControllers(this IMvcBuilder mvcBuilder, Assembly assembly)
        {
            mvcBuilder.ConfigureApplicationPartManager(apm =>
            {
                // Delete all controllers from assembly 
                var builtInAuthPart = apm.ApplicationParts
                    .OfType<AssemblyPart>()
                    .FirstOrDefault(p => p.Assembly == assembly);

                if (builtInAuthPart != null)
                {
                    apm.ApplicationParts.Remove(builtInAuthPart);
                }
            });
        }
    }
}
