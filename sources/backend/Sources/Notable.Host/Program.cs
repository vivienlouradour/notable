using Notable.Core.Features.Status;
using Notable.CouchDb;
using Notable.Host.Middlewares;
using Notable.Identity;

namespace Notable.Host;

public class Program
{
    public static async Task Main(string[] args)
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
        builder.Services.AddIdentityServices(builder.Environment, builder.Configuration);

        if (builder.Environment.IsDevelopment())
        {
            //builder.Services
            //   .AddAuthentication(options =>
            //   {
            //       options.DefaultAuthenticateScheme = "Development";
            //       options.DefaultChallengeScheme = "Development";
            //   }).AddScheme<AuthenticationSchemeOptions, DevAuthenticationHandler>("Development", _ => { });
        }

        builder.Services.AddSingleton(TimeProvider.System);

        var app = builder.Build();

        await app.MigrateIdentityDatabaseAsync();

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

        app.UseCors("AllowAngular");

        app.UseAuthentication();
        app.UseAuthorization();

        // Map application endpoints
        app.MapCouchDbEndpoints();
        app.MapIdentityEndpoints();
        app.MapStatusEndpoints();

        await app.RunAsync();
    }
}
