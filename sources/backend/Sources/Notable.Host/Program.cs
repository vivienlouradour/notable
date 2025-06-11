using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;

using Notable.CouchDb;
using Notable.Host.Middlewares;

using System.Text;

namespace Notable.Host
{
    public class Program
    {
        public static void Main(string[] args)
        {
            var builder = WebApplication.CreateBuilder(args);

            builder.Services
                .AddControllers()
                .HideBuiltInLoginControllerIfNecessary(builder.Configuration);
            
            builder.Services.AddOpenApiDocument();

            builder.Services
                .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
                .AddJwtBearer(options =>
                {
                    options.TokenValidationParameters = new TokenValidationParameters
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
            builder.Services.AddHttpClient();
            builder.Services.AddHttpContextAccessor();
            
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

            builder.Services.AddCouchDb();
            builder.Services.ConfigureNotableAuth(builder.Configuration);

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

            app.MapControllers();

            app.Run();
        }
    }
}
