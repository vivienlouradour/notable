using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.Data;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.Options;

using Notable.Identity.Users;

namespace Notable.Identity.Authentication.BuiltIn;

internal static class BuiltInEndpoints
{
    public static IEndpointRouteBuilder MapBuiltInEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/builtin");

        group.MapPost("/login", LoginAsync)
            .AllowAnonymous()
            .Produces(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status403Forbidden)
            .WithName("AuthBuiltIn_Login");

        group.MapPost("/register", RegisterAsync)
            .AllowAnonymous()
            .Produces(StatusCodes.Status201Created)
            .ProducesProblem(StatusCodes.Status403Forbidden)
            .WithName("AuthBuiltIn_Register");

        return group;
    }

    private static async Task<IResult> LoginAsync(LoginRequest request, SignInManager<ApplicationUser> signInManager, IOptions<AuthenticationOptions> options)
    {
        if (!options.Value.BuiltIn.Enabled)
        {
            return Results.Problem(
                statusCode: StatusCodes.Status403Forbidden,
                title: "Built-in authentication is disabled.");
        }

        var user = await signInManager.UserManager.FindByEmailAsync(request.Email);

        if (user is null)
        {
            return Results.Unauthorized();
        }

        var result = await signInManager.PasswordSignInAsync(user, request.Password, isPersistent: false, lockoutOnFailure: true);

        return result.Succeeded
            ? Results.Ok()
            : Results.Unauthorized();
    }

    private static async Task<IResult> RegisterAsync(RegisterRequest request, TimeProvider timeProvider, UserManager<ApplicationUser> userManager, IOptions<AuthenticationOptions> options)
    {
        var builtIn = options.Value.BuiltIn;
        if (!builtIn.Enabled)
        {
            return Results.Problem(
                statusCode: StatusCodes.Status403Forbidden,
                title: "Built-in authentication is disabled.");
        }

        if (!builtIn.AllowRegistration)
        {
            return Results.Problem(
                statusCode: StatusCodes.Status403Forbidden,
                title: "Registration is disabled.");
        }

        var user = new ApplicationUser
        {
            UserName = request.Email,
            Email = request.Email,
            CreatedAt = timeProvider.GetUtcNow().DateTime
        };

        var result = await userManager.CreateAsync(user, request.Password);

        if (!result.Succeeded)
        {
            return Results.ValidationProblem(
                result.Errors
                    .GroupBy(error => error.Code)
                    .ToDictionary(
                        group => group.Key,
                        group => group
                            .Select(error => error.Description)
                            .ToArray()));
        }

        return Results.Created($"/auth/users/{user.Id}", new { user.Id });
    }
}
