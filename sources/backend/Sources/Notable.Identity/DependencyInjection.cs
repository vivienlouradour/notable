using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

using Notable.Identity.Authentication;
using Notable.Identity.Common;
using Notable.Identity.Persistence;
using Notable.Identity.Users;
using Notable.Persistence;

using AuthenticationOptions = Notable.Identity.Authentication.AuthenticationOptions;

namespace Notable.Identity;

public static class DependencyInjection
{
    /// <summary>
    /// Add notable base authentication services
    /// </summary>
    /// <param name="services"></param>
    /// <param name="configuration"></param>
    /// <returns></returns>
    public static IServiceCollection AddIdentityServices(this IServiceCollection services, IHostEnvironment environment, IConfiguration configuration)
    {
        services.AddDbContext<IdentityDbContext>(options => options.ConfigureDatabase(configuration, "Identity"));

        services.AddIdentityCore<ApplicationUser>(options =>
            {
                options.ClaimsIdentity.UserIdClaimType = NotableClaimTypes.UserId;
                options.User.RequireUniqueEmail = true;

                options.Password.RequiredLength = 9;
                options.Password.RequireDigit = true;
                options.Password.RequireUppercase = true;
                options.Password.RequireLowercase = true;
                options.Password.RequireNonAlphanumeric = true;
            })
            .AddRoles<IdentityRole<Guid>>()
            .AddEntityFrameworkStores<IdentityDbContext>()
            .AddSignInManager();

        var authOptions = configuration.GetSection(AuthenticationOptions.SectionName)
            .Get<AuthenticationOptions>() ?? new AuthenticationOptions();

        services.AddOptions<AuthenticationOptions>()
            .Configure(options =>
            {
                options.BuiltIn = authOptions.BuiltIn;
                options.Oidc = authOptions.Oidc;
            }).Validate(
                options => options.BuiltIn.Enabled || options.Oidc.Enabled,
                "At least one authentication method must be enabled (BuiltIn or OIDC)."
            ).Validate(
                options => options.BuiltIn.Enabled || !options.BuiltIn.AllowRegistration,
                "Built-in registration is only allowed if built-in authentication is enabled."
            ).Validate(options => !options.Oidc.Enabled ||
                (!string.IsNullOrWhiteSpace(options.Oidc.Authority) &&
                 !string.IsNullOrWhiteSpace(options.Oidc.ClientId) &&
                 !string.IsNullOrWhiteSpace(options.Oidc.ClientSecret)),
            "OIDC requires Authority, ClientId and ClientSecret."
            ).ValidateOnStart();

        services.AddNotableAuthentication(environment, authOptions);

        services.AddAuthorization();
        services.AddHttpContextAccessor();

        services.AddScoped<ICurrentUser, CurrentUser>();
        services.AddScoped<UserService>();

        return services;
    }

    public static IEndpointRouteBuilder MapIdentityEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapAuthenticationEndpoints();

        return app;
    }

    public static async Task MigrateIdentityDatabaseAsync(this IHost host, CancellationToken cancellationToken = default)
    {
        await using var scope = host.Services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<IdentityDbContext>();

        await context.Database.MigrateAsync(cancellationToken);
    }

    private static void AddNotableAuthentication(this IServiceCollection services, IHostEnvironment environment, AuthenticationOptions authOptions)
    {
        var authentication = services
            .AddAuthentication(options =>
            {
                options.DefaultScheme = IdentityConstants.ApplicationScheme;
                options.DefaultChallengeScheme = IdentityConstants.ApplicationScheme;
            });

        authentication.AddCookie(
               IdentityConstants.ApplicationScheme,
               options =>
               {
                   options.Cookie.Name = "Notable.Auth";
                   options.Cookie.HttpOnly = true;
                   options.Cookie.SecurePolicy = environment.IsDevelopment()
                       ? CookieSecurePolicy.SameAsRequest
                       : CookieSecurePolicy.Always;
                   options.Cookie.SameSite = SameSiteMode.Lax;

                   // Api should not redirect to login page, instead return 401 Unauthorized
                   options.Events.OnRedirectToLogin = context =>
                   {
                       context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                       return Task.CompletedTask;
                   };

                   options.Events.OnRedirectToAccessDenied = context =>
                   {
                       context.Response.StatusCode = StatusCodes.Status403Forbidden;
                       return Task.CompletedTask;
                   };
               });

        if (authOptions.Oidc.Enabled)
        {
            authentication.AddOpenIdConnect(
                "NotableOidc",
                options =>
                {
                    options.Authority = authOptions.Oidc.Authority;
                    options.ClientId = authOptions.Oidc.ClientId;
                    options.ClientSecret = authOptions.Oidc.ClientSecret;

                    options.ResponseType = "code";
                    options.UsePkce = true;

                    options.SignInScheme =
                        IdentityConstants.ApplicationScheme;

                    options.SaveTokens = false;
                });
        }
    }
}
