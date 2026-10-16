using Microsoft.AspNetCore.Authentication;

using Notable.Core.Features.Status;
using Notable.CouchDb;
using Notable.Host.Handlers;
using Notable.Host.Middlewares;
using Notable.Identity;

namespace Notable.Host
{
    public class Program
    {
        public static void Main(string[] args)
        {
            var builder = WebApplication.CreateBuilder(args);

            builder.Services.AddOpenApiDocument();
            builder.Services.AddHttpClient();

            // Cors policy
            builder.Services.AddCors(options =>
            {
                options.AddPolicy("AllowAngular", policy =>
                {
                    policy.WithOrigins("http://localhost:4200")
                          .AllowAnyHeader()
                          .AllowAnyMethod()
                          .AllowCredentials(); // TODO : Check if AllowCredentials could be removed (necessary for cookie)
                });
            });

            builder.Services.AddCouchDbServices();
            builder.Services.AddIdentityServices(builder.Configuration);

            if (builder.Environment.IsDevelopment())
            {
                builder.Services
                   .AddAuthentication(options =>
                   {
                       options.DefaultAuthenticateScheme = "Development";
                       options.DefaultChallengeScheme = "Development";
                   }).AddScheme<AuthenticationSchemeOptions, DevAuthenticationHandler>("Development", _ => { });
            }

            var app = builder.Build();

            app.UseMiddleware<ExceptionHandlingMiddleware>();

            // Configure the HTTP request pipeline.
            if (app.Environment.IsDevelopment())
            {
                app.UseOpenApi();

                app.UseSwaggerUi();
            }
            else
            {
                app.UseHttpsRedirection();
            }

            app.UseAuthentication();
            app.UseAuthorization();

            app.UseCors("AllowAngular");

            // Map application endpoints
            app.MapCouchDbEndpoints();
            app.MapIdentityEndpoints();
            app.MapStatusEndpoints();


            app.Run();
        }
    }
}
