# Notable — webapp

Standalone Angular application with local PouchDB persistence. The backend and CouchDB synchronization are optional.

## Development

```bash
npm ci
npm start -- --port 4200
```

Open `http://localhost:4200`. The server automatically reloads changes.

## Validation

```bash
npm run build
npm test -- --watch=false
```

Tests use Vitest with jsdom. `src/testing/test-providers.ts` provides translation and routing services and replaces persistence and synchronization with test doubles that do not access the network or IndexedDB.

The suites cover the note store (documents, dates, revisions, tags and changes), persistence and synchronization adapters, server monitoring, the logger and component interactions. Service tests explicitly override global providers to exercise the real services. `POUCHDB_FACTORY` creates PouchDB databases in production and allows simulated databases to be supplied in tests. These tests do not validate the IndexedDB engine or actual replication with CouchDB.

Component tests enable automatic change detection and wait for `fixture.whenStable()`. Timing is controlled by Vitest timers. Note data and DOM helpers are grouped in `src/testing/note-fixtures.ts`.

The `.spec.ts` files and `src/testing/` are excluded from Tailwind class detection to prevent strings used in tests from adding CSS to the production build.
