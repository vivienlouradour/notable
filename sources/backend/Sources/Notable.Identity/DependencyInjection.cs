using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

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
    public static IServiceCollection AddIdentityServices(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddDbContext<IdentityDbContext>(options => options.ConfigureDatabase(configuration, "Identity"));
        services.AddIdentityCore<ApplicationUser>()
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
            ).Validate(options => !options.Oidc.Enabled ||
                (!string.IsNullOrWhiteSpace(options.Oidc.Authority) &&
                 !string.IsNullOrWhiteSpace(options.Oidc.ClientId) &&
                 !string.IsNullOrWhiteSpace(options.Oidc.ClientSecret)),
            "OIDC requires Authority, ClientId and ClientSecret."
            ).ValidateOnStart();

        services.AddNotableAuthentication(authOptions);

        services.AddAuthorization();
        services.AddHttpContextAccessor();

        services.AddTransient<ICurrentUser, CurrentUser>();

        return services;
    }

    public static IEndpointRouteBuilder MapIdentityEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapAuthenticationEndpoints();

        return app;
    }

    private static void AddNotableAuthentication(this IServiceCollection services, AuthenticationOptions authOptions)
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
               options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
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
