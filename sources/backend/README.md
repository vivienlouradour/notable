# Backend

From this directory:

```sh
dotnet build Notable.slnx
dotnet test Notable.slnx
dotnet format Notable.slnx --verify-no-changes --no-restore
```

## HTTP tests by module

The solution uses the projects in `Tests/`. Each test project references `Notable.Testing`, a shared library that starts the real HTTP host with `NotableTestHostBuilder`.  
| Project | Behaviors covered |
| --- | --- |
| `Notable.Core.Tests` | Public version at `/` and `/status/version`, health at `/status/health`, JSON contracts and HTTP methods. |
| `Notable.CouchDb.Tests` | Methods, paths, query strings, UTF-8 bodies, headers, CouchDB status codes, database creation and permissions, user isolation, errors, continuous streaming and client cancellation. |
| `Notable.Host.Tests` | 401/500 errors without internal details, transport errors, cancellation without client disconnection, CORS and unknown routes. |
| `Notable.Identity.Tests` | Public profile and isolation, authentication methods, registration and validation, duplicates, login, session cookies, lockout, logout and HTTP methods. |

SQLite, migrations, Identity, application services and the CouchDB proxy are real. Each host has its own in-memory SQLite connection and ephemeral data protection keys.  
The only mocks/handlers are the authentication handler and `StubCouchDbHandler`, which replaces only the outgoing CouchDB HTTP transport.  
A test that expects no CouchDB calls uses a handler with no configured response and verifies that its request log remains empty.  
No test requires Docker, CouchDB or an OIDC provider available over the network.  

Run a module:

```sh
dotnet test Tests/Notable.Identity.Tests/Notable.Identity.Tests.csproj
```

## Migration

```sh
dotnet ef migrations add MigrationName --project Sources/Notable.Identity --startup-project Sources/Notable.Host --context IdentityDbContext --output-dir Persistence/Migrations
```
