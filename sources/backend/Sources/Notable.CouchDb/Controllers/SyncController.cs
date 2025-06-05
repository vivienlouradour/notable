using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

using Notable.Auth.Exceptions;
using Notable.CouchDb.Services;

namespace Notable.CouchDb.Controllers
{
    [ApiController]
    [Authorize]
    [Route("[controller]")]
    public class SyncController(ICouchDbProxy couchDbProxy) : ControllerBase
    {
        private readonly ICouchDbProxy couchDbProxy = couchDbProxy;

        [HttpGet("/")]
        public IActionResult RootCouchInfo()
        {
            return Ok(new
            {
                couchdb = "Welcome",
                version = "3.3.2",
                vendor = new
                {
                    name = "YourProxy"
                }
            });
        }

        [HttpGet("{**catchAll}")]
        [HttpPost("{**catchAll}")]
        [HttpPut("{**catchAll}")]
        [HttpDelete("{**catchAll}")]
        [HttpOptions("{**catchAll}")]
        [HttpPatch("{**catchAll}")]
        public async Task<IActionResult> ProxyAsync(string? catchAll, CancellationToken cancellationToken)
        {
            try
            {
                var queryString = Request.QueryString.HasValue ? Request.QueryString.Value : "";
                var route = $"{catchAll}{queryString}";
                var response = await this.couchDbProxy.ProxyRequestToUserDatabaseAsync(Request, route, cancellationToken);

                var responseStream = await response.Content.ReadAsStreamAsync();
                return new FileStreamResult(responseStream, response.Content.Headers.ContentType?.MediaType ?? "application/octet-stream");
            }
            catch(NotAuthenticatedException)
            {
                return Unauthorized("User not authenticated");
            }
        }
    }
}