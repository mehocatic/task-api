# Task API

RESTful API for managing tasks, built with Node.js, Express, PostgreSQL, and Docker Compose.

Migrated from SQLite to a fully containerized PostgreSQL architecture. The external contract (endpoints, request/response schemas, status codes) remains strictly identical, while the persistence layer is backed by a PostgreSQL database container and a persistent Docker volume.

## Requirements

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (running with WSL 2 backend on Windows)
- Node.js 22 (for local execution outside containers)

## Quick Start (Docker Compose)

Run the entire stack (Node.js API + PostgreSQL database) with a single command:

```bash
docker compose up -d --build
```

- API: http://localhost:3000
- Swagger Documentation: http://localhost:3000/docs
- Database Port: localhost:5432

To stop the containers:

```bash
docker compose down
```

Data persists across container restarts via the named Docker volume `taskdata`, mapped to `/var/lib/postgresql/data`.

## Environment Variables

Configuration is loaded via environment variables — using `dotenv` locally, and supplied via `compose.yaml` in Docker.

| Variable       | Description                        | Default (Local)                                | Default (Docker Compose)                |
| -------------- | ---------------------------------- | ---------------------------------------------- | --------------------------------------- |
| `DATABASE_URL` | PostgreSQL connection string       | `postgres://postgres:dev@localhost:5432/tasks` | `postgres://postgres:dev@db:5432/tasks` |
| `PORT`         | Port the Express server listens on | `3000`                                         | `3000`                                  |

(See `.env.example` for the repository template.)

## Database & Architecture

- **Engine:** PostgreSQL 16 (Alpine-based Docker image)
- **Connection:** Managed via a `pg` connection pool with asynchronous queries (async/await)
- **Reliability:** Connection retry loop in `server.js` to handle startup race conditions until PostgreSQL is ready

**Schema:**

```sql
CREATE TABLE IF NOT EXISTS tasks (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  done BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE INDEX IF NOT EXISTS idx_tasks_done ON tasks (done);
```

**Seeding:** On startup, the application checks if the table is empty and seeds three initial tasks (_Learn Express_, _Buy milk_, _Walk the dog_).

## Endpoints

| Method | Path         | Description    | Status codes  |
| ------ | ------------ | -------------- | ------------- |
| GET    | `/`          | API info       | 200           |
| GET    | `/health`    | Health check   | 200, 500      |
| GET    | `/tasks`     | List all tasks | 200, 500      |
| GET    | `/tasks/:id` | Get one task   | 200, 404, 500 |
| POST   | `/tasks`     | Create a task  | 201, 400, 500 |
| PUT    | `/tasks/:id` | Update a task  | 200, 400, 404 |
| DELETE | `/tasks/:id` | Delete a task  | 204, 404, 500 |

## Verification & Examples (cURL)

### 1. Health Check

```powershell
curl.exe -i http://localhost:3000/health
```

Response:

```
HTTP/1.1 200 OK
{"status":"ok","db":"ok"}
```

### 2. Get All Tasks

```powershell
curl.exe -i http://localhost:3000/tasks
```

Response:

```
HTTP/1.1 200 OK
[{"id":1,"title":"Learn Express","done":false},{"id":2,"title":"Buy milk","done":false},{"id":3,"title":"Walk the dog","done":false}]
```

### 3. Create a Task (Persistence Test)

> **Note for Windows PowerShell:** escape double quotes with a backtick (`` ` ``) to keep the JSON payload intact.

```powershell
curl.exe -i -X POST http://localhost:3000/tasks -H "Content-Type: application/json" -d "{`"title`": `"Persistence test task`"}"
```

Response:

```
HTTP/1.1 201 Created
{"id":4,"title":"Persistence test task","done":false}
```

### 4. Delete a Task

```powershell
curl.exe -i -X DELETE http://localhost:3000/tasks/4
```

Response:

```
HTTP/1.1 204 No Content
```

## Persistence Verification

Persistence was validated with the following steps:

1. Created task #4 (`Persistence test task`) via `POST /tasks`.
2. Stopped and removed all containers with `docker compose down`.
3. Relaunched the stack with `docker compose up -d`.
4. Queried `GET /tasks`: task #4 remained present, persisted via the `taskdata` volume.

## Swagger UI

Interactive OpenAPI/Swagger documentation is available at:

http://localhost:3000/docs

## AI vs Me (Stage 7 — AI Rematch)

In Stage 7, I generated an alternative implementation of the Task API using Claude, to review its architecture against my hand-written submission. The AI-generated code and test setup are stored separately in the `ai-version/` directory.

### My Prompt

> "Build a RESTful Task API using Node.js and Express in JavaScript. Keep tasks in-memory as an array (no database, no file persistence). Each task has `id` (number), `title` (string), and `done` (boolean).
>
> Implement 5 CRUD endpoints: `GET /tasks`, `GET /tasks/:id`, `POST /tasks`, `PUT /tasks/:id`, `DELETE /tasks/:id`.
>
> Return proper HTTP status codes (200, 201, 204, 400, 404) and JSON error objects `{ "error": "..." }`. Validate that POST requires a non-empty string title, and PUT validates title (string) and done (boolean) if provided. Serve Swagger UI documentation at `/docs`."

### Code Comparison

| Feature / Aspect | My Hand-Written Implementation                                                       | Claude's AI Implementation                                                                                             |
| ---------------- | ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| Code Structure   | Single-file monolith (`server.js`), keeping routes, logic, and state in one place    | Modular architecture split across `app.js`, `server.js`, `tasks.js`, `taskStore.js`, `validators.js`, and `openapi.js` |
| OpenAPI Spec     | Reads `openapi.json` from disk using Node's `fs.readFileSync`                        | Exports a JavaScript object directly from `openapi.js`                                                                 |
| ID Generation    | `Math.max(...tasks.map(t => t.id)) + 1` — derived from existing data on every insert | Module-scoped auto-incrementing counter (`let nextId = 1`)                                                             |
| Error Handling   | Basic manual checks in route handlers                                                | Custom middleware handling malformed JSON (`SyntaxError`), non-existent routes (JSON 404), and global 500 errors       |

### AI Review Questions

**What did the AI do better — and do you understand its version well enough to explain it?**

- **Modular architecture:** Claude decoupled the app into isolated layers (validation, data store, routes, and server startup). Splitting `app.js` from `server.js` allows unit testing without binding a port, while `taskStore.js` encapsulates state.
- **ID generation trade-off:** Claude used a module-scoped counter; I used `Math.max` over existing ids. Both avoid collisions in a running process, but they differ on restart — a counter has to be seeded from existing data, while `Math.max` derives it every time.
- **HTTP/REST standards:** It automatically attached a `Location` header to `201 Created` responses and handled malformed JSON requests with a proper `400` status.

**What did it get wrong or quietly ignore from your prompt?**

- **Failed on first launch (`MODULE_NOT_FOUND`):** the AI provided imports expecting a deeply nested directory structure, but gave flat files.
- **Syntax error in destructuring:** a code snippet contained invalid ES6 destructuring, causing a syntax error until fixed.
- **Missing seed data:** it initialized an empty array instead of providing the initial example tasks.

**What did your prompt forget to specify — and what did the AI silently decide for you?**

- **Directory structure:** I didn't specify file organization, so Claude chose a multi-module setup.
- **Test suite integration:** Claude silently created helper functions (`store.reset()`) designed for automated integration tests.
- **Port collision & extra routes:** it included an `/openapi.json` route alongside `/docs`.

## LLM triage endpoint (FlyRank A17)

See `JOB-CARD.md` for what the endpoint does.

**Provider note:** the LLM client is configured only through three environment variables
(`LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL`). Switching from a local Ollama model to a hosted
provider means changing those three values – no code changes. That's why the provider is
never hard-coded.

**Stage 2 observation:** on an ambiguous input ("fix the thing with the login maybe idk"),
the model classified it as "bug" with low confidence (0.4) instead of falling back to
category "other" as the prompt instructs. The low confidence signal still works, but the
category rule isn't followed perfectly on every ambiguous case.
