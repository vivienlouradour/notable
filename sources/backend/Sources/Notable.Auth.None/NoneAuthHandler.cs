﻿using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

using System.Security.Claims;
using System.Text.Encodings.Web;

namespace Notable.Auth.None
{
    internal class NoneAuthHandler : AuthenticationHandler<AuthenticationSchemeOptions>
    {
        public NoneAuthHandler(IOptionsMonitor<AuthenticationSchemeOptions> options,
                       ILoggerFactory logger,
                       UrlEncoder encoder)
            : base(options, logger, encoder)
        {
        }

        protected override Task<AuthenticateResult> HandleAuthenticateAsync()
        {
            var identity = new ClaimsIdentity([new Claim(ClaimTypes.Name, "Anonymous")], Scheme.Name);
            var principal = new ClaimsPrincipal(identity);
            var ticket = new AuthenticationTicket(principal, Scheme.Name);

            return Task.FromResult(AuthenticateResult.Success(ticket));
        }
    }
}
