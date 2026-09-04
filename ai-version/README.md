# Task API

RESTful CRUD API for tasks. Node.js + Express, in-memory storage, Swagger UI at `/docs`.

## Run

```bash
npm install
npm start        # http://localhost:3000
npm run dev      # same, with --watch auto-restart
```

Port comes from `PORT`, defaults to `3000`.

## Endpoints

| Method | Path | Success | Errors |
|---|---|---|---|
| GET | `/` | 200 — API info | — |
| GET | `/health` | 200 — status, uptime, timestamp | — |
| GET | `/tasks` | 200 — array of tasks | — |
| GET | `/tasks/:id` | 200 — task | 404 |
| POST | `/tasks` | 201 — created task + `Location` header | 400 |
| PUT | `/tasks/:id` | 200 — updated task | 400, 404 |
| DELETE | `/tasks/:id` | 204 — empty body | 404 |
| GET | `/docs` | Swagger UI | — |
| GET | `/openapi.json` | 200 — raw OpenAPI 3 spec | — |

Task shape: `{ "id": 1, "title": "Write docs", "done": false }`
Errors always: `{ "error": "..." }`

### Validation rules

- **POST** — `title` required, must be a non-empty string (whitespace-only rejected). Trimmed before storing. `done` always starts `false`.
- **PUT** — `title` and `done` both optional, but at least one must be present. `title` must be a non-empty string if given, `done` must be a boolean if given.
- Body is validated before the store lookup, so a bad payload on a nonexistent ID returns 400, not 404.

## Structure

```
src/
  server.js            entry point — binds the port
  app.js               express wiring, /, /health, swagger, error handlers
  validators.js        pure body/param validation, no express dependency
  routes/tasks.js      the 5 CRUD handlers
  store/taskStore.js   in-memory array + auto-increment counter
  docs/openapi.js      OpenAPI 3 spec object
```

`app.js` exports the app without calling `listen()` — `server.js` does that. This split
lets a test runner (supertest) mount the app without occupying a port.

## Design notes

- **IDs use a counter, not `tasks.length + 1`.** With length-based IDs, deleting a task
  makes the next insert reuse a live ID. Test in the smoke run: create 1 and 2, delete 1,
  create again → gets ID 3.
- **Non-numeric IDs return 404, not 400.** `/tasks/abc` falls through the strict
  `/^\d+$/` check to `NaN`, finds nothing, and 404s. If you prefer 400 for malformed IDs,
  that's a one-line change in `parseId` plus a guard in each route.
- **Malformed JSON returns 400.** `express.json()` throws a `SyntaxError` with `body` set;
  the error handler catches it. Without that, Express would return a 500 HTML page.
- **404 for unknown routes is JSON.** Otherwise clients would have to parse HTML for
  some errors and JSON for others.

## Not included

State lives in a module-level array, so it resets on every restart and does not survive
across multiple processes — fine for the stated scope, but it is the first thing to
replace if this ever runs behind more than one worker.

No test suite is included. If you want one, `supertest` + `node:test` covers this in about
60 lines, and `store.reset()` is already exported for per-test isolation.
