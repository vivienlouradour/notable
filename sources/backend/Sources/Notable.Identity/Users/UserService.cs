using Microsoft.AspNetCore.Identity;

using Notable.Identity.Common;

namespace Notable.Identity.Users;

internal class UserService(ICurrentUser currentUser, UserManager<ApplicationUser> userManager)
{
    private readonly ICurrentUser _currentUser = currentUser;
    private readonly UserManager<ApplicationUser> _userManager = userManager;

    public async Task<ApplicationUserDto> GetCurrentUserAsync()
    {
        var user = await _userManager.FindByIdAsync(_currentUser.Id.ToString())
            ?? throw new UnauthorizedAccessException("Notable user cannot be found in user manager.");

        return Map(user);
    }

    private static ApplicationUserDto Map(ApplicationUser user)
    {
        return new ApplicationUserDto(user.Id, user.Email);
    }
}
