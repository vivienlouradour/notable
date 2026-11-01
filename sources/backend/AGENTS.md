
# Backend — instructions

## Stack and organization

- .NET 10 / ASP.NET Core, with C# nullable reference types and implicit usings enabled.
- `Sources/`: contains all backend projects.
  - `Notable.Host` is the HTTP host and the entry point of the `Notable.slnx` solution.
  - `Notable.Core` is the application core and contains shared features and services.
  - `Notable.Identity` contains authentication and user management logic.
  - `Notable.Identity.Common` contains shared contracts and models for the identity module.
  - `Notable.CouchDb` contains the CouchDB proxy and services used by the synchronization API.
  - `Notable.Persistence` contains persistence configuration for the contexts.
- `Tests/`: contains all test projects
  - `Notable.Host.IntegrationTests.New` contains the tests.
  - `Notable.Testing`: shared testing library for host configuration, seeding and test mocks/handlers.
- NuGet versions are centralized in `Directory.Packages.props`.

## Responsibilities and configuration

- The backend is optional for local webapp operation. Do not move local persistence or an offline feature into the API without an explicit decision.
- The authentication mode is selected through `Auth:Mode` (`None` or `builtin`). The `None` mode is intended for development; all synchronization routes remain protected by `[Authorize]` in the current implementation.
- CouchDB is configured through `CouchDb:*`. Credentials, JWT keys, private URLs and secrets must come from deployment configuration, never from code or the repository.
- Preserve response and route compatibility with the Angular client and the PouchDB/CouchDB protocol.

## C# conventions

- Follow the existing projects and DI extensions; avoid new abstractions or dependencies without a demonstrated need.
- Use `async`/`await` and propagate a `CancellationToken` for I/O; validate inputs and do not expose sensitive details in errors.
- Respect nullable reference types, existing C# conventions and ASP.NET controller conventions (`[ApiController]`, route attributes, authorization).
- Keep responsibilities separate: host/configuration, authentication, CouchDB integration and controllers.
- Authentication services and the CouchDB proxy are sensitive areas: check authorization, user database isolation, forwarded headers and error handling whenever making changes.

## Code style and quality

- Follow the C# conventions defined in `.editorconfig`.
- Keep nullable reference types enabled.
- Respect Roslyn analyzer warnings.
- Run `dotnet format --verify-no-changes` before completing changes.
- Run `dotnet build` and fix compilation errors.
- Do not suppress analyzer warnings without justification.

## Tests

- Each source project has a corresponding test project (expect for ".Common", or configuration projects like `Notable.Persistence` that don't require specific test). For example `Notable.Identity` has `Notable.Identity.Tests`.
- Tests are organized by feature (User, Authentication, Sync, Status, etc..) with one folder per feature (eventually sub-folders, for exemple Authentication/Builtin). And a class per tested endpoint/usecase (login, register, CurrentUser...). Each test class contains multiple test methods covering different scenarios for that usecase.
- Test endpoints through the real HTTP pipeline using MSTest and Fluent Assertions. Organize tests by feature and follow the `// Arrange`, `// Act`, `// Assert` structure.
- Use `Notable.Testing` and `NotableTestHostBuilder` to configure the host and seed data with `WithUsers(...).BuildAsync()`. Keep real SQLite persistence, isolated per test.
- Only two test doubles are allowed: the CouchDB HTTP transport through `StubCouchDbHandler` and the authentication handler. Keep the real proxy and application services; no external service should be required.
- Use `CreateAuthenticatedClient(userId)` and `CreateUnauthenticatedClient()`. Create a separate client for each identity instead of manually changing authentication headers. Test actual login mechanisms within the Authentication feature.
- Exhaustively cover each endpoint’s behavior: successful requests, errors, edge cases, authorization, and user isolation. Verify HTTP status codes, JSON contracts, relevant headers, absence of sensitive data, and expected CouchDB calls.
- Keep tests independent and compatible with parallel execution. Use `DataRow` for variations of the same scenario.
- Do not use `TestContext`. Omit optional cancellation token arguments; use `CancellationToken.None` only when a token is required.

## Validation

From `sources/backend/`:

- Build: `dotnet build Notable.slnx`.
- All tests: `dotnet test Notable.slnx`.
- Check `docker compose config` from the repository root if the container integration is modified.

