# Task API

RESTful API for managing tasks, built with Node.js, Express, containerized PostgreSQL, and Docker Compose.

Migrated from SQLite to a fully containerized PostgreSQL architecture. The external contract (endpoints, schemas, status codes) remains strictly identical, while the persistence layer is backed by a PostgreSQL database container and persistent Docker volume.

## Requirements

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (running with WSL 2 backend on Windows)
- Node.js 22 (for local development outside containers)

## Quick Start (Docker Compose)

The entire application stack (Node.js API + PostgreSQL database) runs with a single command:

```bash
docker compose up -d --build
```

## LLM triage endpoint (FlyRank A17)

Work in progress. See `JOB-CARD.md` for what the endpoint does.

**Provider note:** the LLM client is configured only through three environment variables
(`LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL`). Switching from a local Ollama model to a hosted
provider means changing those three values – no code changes. That's why the provider is
never hard-coded.