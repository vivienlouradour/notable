
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;

using Notable.Auth;
using Notable.Auth.BuiltIn;
using Notable.Auth.None;
using Notable.Host.Exceptions;

using System.Text;

namespace Notable.Host
{
    public class Program
    {
        public static void Main(string[] args)
        {
            var builder = WebApplication.CreateBuilder(args);

            // Add services to the container.

            builder.Services.AddControllers();

            builder.Services.AddOpenApiDocument();

            // Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi

            builder.Services
                .AddOpenApi()
                .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
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

            if (builder.Configuration.HasAuthModeConfigured("none"))
            {
                builder.Services.AddNoneAuthentication();
            }
            else if (builder.Configuration.HasAuthModeConfigured("builtin"))
            {
                builder.Services.AddBuiltInAuthentication();
            }
            else
            {
                throw new ConfigurationException("No auth mode configured");
            }

            var app = builder.Build();

            // Configure the HTTP request pipeline.
            if (app.Environment.IsDevelopment())
            {
                app.UseOpenApi();

                app.UseSwaggerUi();
            }

            app.UseHttpsRedirection();

            app.UseAuthorization();


            app.MapControllers();

            app.Run();
        }
    }
}
