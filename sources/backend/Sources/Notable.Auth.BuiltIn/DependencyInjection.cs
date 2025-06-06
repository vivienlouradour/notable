using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;

using Notable.Auth.BuiltIn.Models;
using Notable.Auth.Models;
using Notable.Auth.Services;

using System.Text;
namespace Notable.Auth.BuiltIn
{
    public static class DependencyInjection
    {
        public static IServiceCollection AddBuiltInAuth(this IServiceCollection services)
        {
            services.AddTransient<IAuthService, BuiltInAuthService>();
            services.AddTransient<IAuthConfigMapper, BuiltInAuthConfigMapper>();

            services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
                   .AddJwtBearer(options =>
                   {
                       options.TokenValidationParameters = new Microsoft.IdentityModel.Tokens.TokenValidationParameters
                       {
                           ValidateIssuer = true,
                           ValidateAudience = true,
                           ValidateLifetime = true,
                           ValidateIssuerSigningKey = true,
                           ValidIssuer = "Jwt:Issuer",
                           ValidAudience = "Jwt:Audience",
                           IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes("Jwt:Key"))
                       };
                   });

            return services;
        }
    }
}
