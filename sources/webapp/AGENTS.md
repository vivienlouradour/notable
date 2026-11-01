# Webapp — instructions

## Stack and commands

- Standalone Angular 22, TypeScript 6 in strict mode, RxJS 7 and Angular Signals.
- Tailwind CSS 4 + DaisyUI for styling; `@ngx-translate` for translations in `public/i18n/`.
- PouchDB 9 in the browser; CouchDB is only the remote synchronization target.
- From this directory: `npm ci`, `npm start`, `npm run build`, `npm test -- --watch=false`.
- No linting or formatting script is currently defined in `package.json`.

## Architecture and data

Directory structure:

- `core/`: shared infrastructure, including `PouchDbService` and `SyncService`.
- `data/`: business models and stores;
- `features/`: screens and interactions by domain;
- `shared/`: reusable components.

Architecture rules:

- Components orchestrate the UI; data access and business logic remain in stores/services.
- `PouchDbService` is the gateway to the local `environment.localDbName` database. Do not assume CouchDB is available.
- `SyncService` must remain independent and able to be started/stopped; a network error must preserve local data and keep the UI usable.
- Respect PouchDB `_id` and `_rev`, conflicts and deleted documents/tombstones. Dates are serialized as strings in documents and converted in business models.
- Preserve reactive updates from both local changes and synchronization. Avoid loading full content when only summaries are needed.

## Angular conventions

- Follow the current organization and standalone components; co-locate `.ts`, `.html`, `.css` files and `.spec.ts` tests.
- Use Signals for local synchronous state and RxJS for streams/asynchronous operations; clean up subscriptions (`takeUntilDestroyed` or equivalent).
- Preserve null safety and `strictTemplates`: avoid `any` and unjustified assertions.
- Use existing routes and components before introducing an abstraction or dependency.
- Add visible text to the relevant translation files without breaking `en.json` or `fr.json`.
- Always favor Tailwind CSS and daisyUI tools, conventions, rules and components, and limit custom CSS to needs they do not cover.

## Unit tests

- Use Vitest and co-located `.spec.ts` files; use `TestBed` for components and services that require the Angular context.
- Explicitly import all Vitest APIs used from `vitest`, for example `import { beforeEach, describe, expect, it, vi } from 'vitest';`. Do not rely on global functions, even if the runner makes them available.
- Test observable behavior, edge cases and relevant errors; if expected behavior is ambiguous, ask the user before inventing it.
- Keep tests deterministic and independent of the network/backend; replace external dependencies with test doubles and clean up spies, subscriptions and timers created by tests.
- Use `async`/`await` and, for the Angular UI, `fixture.whenStable()` when needed; avoid arbitrary delays.
- Validate with `npm test -- --watch=false` from this directory.

## Code Quality

- Follow ESLint and Prettier configurations.
- After modifying frontend code:
  1. Run Prettier (`npx prettier --write`) only on files created or modified during the current task.
  2. Run `npm run check` to validate the changes.
- Fix errors introduced by your changes.
- Do not disable lint rules to bypass errors.
