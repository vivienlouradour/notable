using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

using Notable.Auth.Models;
using Notable.Auth.Models.Domain;
using Notable.Auth.Models.Dtos;
using Notable.Auth.Services;

namespace Notable.Auth.Controllers
{
    [ApiController]
    [AllowAnonymous]
    [Route("[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly IAuthService authService;
        private readonly IAuthConfigMapper authConfigMapper;

        public AuthController(IAuthService authService, IAuthConfigMapper authConfigMapper)
        {
            this.authService = authService;
            this.authConfigMapper = authConfigMapper;
        }

        [HttpGet("config")]
        public async Task<ActionResult<AuthConfigBaseDto>> GetConfigAsync(CancellationToken cancellationToken)
        {
            var config = await this.authService.GetConfigurationAsync(cancellationToken);

            var configDto = this.authConfigMapper.Map(config);

            return Ok(configDto);
        }

        public async Task<ActionResult<string>> LoginAsync([FromBody] LoginRequestDto login, CancellationToken cancellationToken)
        {
            var loginRequest = new LoginRequest
            {
                Login = login.Login,
                Password = login.Password
            };

            var loginResponse = await this.authService.LoginAsync(loginRequest, cancellationToken);
            
            return Ok(loginResponse);
        }
    }
}
