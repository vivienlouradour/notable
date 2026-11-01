
# Notable — general instructions

## Goal and constraints

Notable is a self-hostable, offline-first and privacy-first note-taking application. The application must remain usable without a backend or network access; CouchDB synchronization is an optional capability. Favor simple, lightweight solutions compatible with these constraints.

## Overall architecture

The application is split between an Angular frontend and a .NET backend.
The backend is a CouchDB proxy and contains no business logic. It is responsible for cloud backup of frontend data and authentication.
Business logic resides in the frontend.

## Organization

- `sources/webapp/`: Angular application, UI, business models and local PouchDB persistence. (See `webapp/AGENTS.md` for frontend-specific instructions)
- `sources/backend/`: ASP.NET Core solution, authentication and CouchDB proxy/synchronization.  See `backend/AGENTS.md` for backend-specific instructions.
- `docker-compose.yaml`: webapp/backend/CouchDB development environment; check service names and versions before modifying it.

## Contribution rules

- Follow the existing architecture and conventions; keep changes focused.
- Do not make the backend mandatory for a client-side feature.
- Never add secrets, passwords or JWT keys to the repository; use deployment configuration.
- Any API contract change must preserve compatibility with the offline client and synchronization.
- Update the documentation if the architecture, configuration or public behavior changes.
- When modifying backend API contracts, regenerate
  the Angular API client using `npm run api:generate`.
- Never manually modify generated API files.
