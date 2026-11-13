using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.HttpResults;
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

    private static async Task<Results<Ok, UnauthorizedHttpResult, ProblemHttpResult>> LoginAsync(LoginRequest request, SignInManager<ApplicationUser> signInManager, IOptions<AuthenticationOptions> options)
    {
        if (!options.Value.BuiltIn.Enabled)
        {
            return TypedResults.Problem(
                statusCode: StatusCodes.Status403Forbidden,
                title: "Built-in authentication is disabled.");
        }

        var user = await signInManager.UserManager.FindByEmailAsync(request.Email);

        if (user is null)
        {
            return TypedResults.Unauthorized();
        }

        var result = await signInManager.PasswordSignInAsync(user, request.Password, isPersistent: false, lockoutOnFailure: true);

        return result.Succeeded
            ? TypedResults.Ok()
            : TypedResults.Unauthorized();
    }

    private static async Task<Results<Created<Guid>, ValidationProblem, ProblemHttpResult>> RegisterAsync(RegisterRequest request, TimeProvider timeProvider, UserManager<ApplicationUser> userManager, IOptions<AuthenticationOptions> options)
    {
        var builtIn = options.Value.BuiltIn;
        if (!builtIn.Enabled)
        {
            return TypedResults.Problem(
                statusCode: StatusCodes.Status403Forbidden,
                title: "Built-in authentication is disabled.");
        }

        if (!builtIn.AllowRegistration)
        {
            return TypedResults.Problem(
                statusCode: StatusCodes.Status403Forbidden,
                title: "Registration is disabled.");
        }

        var user = new ApplicationUser
        {
            Email = request.Email,
            UserName = request.UserName,
            CreatedAt = timeProvider.GetUtcNow().DateTime
        };

        var result = await userManager.CreateAsync(user, request.Password);

        return result.Succeeded
            ? TypedResults.Created($"/auth/users/{user.Id}", user.Id)
            : TypedResults.ValidationProblem(
                result.Errors
                    .GroupBy(error => error.Code)
                    .ToDictionary(
                        group => group.Key,
                        group => group
                            .Select(error => error.Description)
                            .ToArray()));
    }
}

internal sealed record RegisterRequest(string Email, string Password, string? UserName);
