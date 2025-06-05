using Microsoft.AspNetCore.Mvc;

namespace Notable.Auth.BuiltIn
{
    [ApiController]
    [Route("[controller]")]
    public class LoginController : ControllerBase
    {
        // Login should be here
        [HttpGet]
        public string Test()
        {
            return "test";
        }
    }
}
