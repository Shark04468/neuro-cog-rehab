# api-server

Core HTTP API service for the cognitive rehabilitation support platform. The
service boundary is auxiliary training, state assessment, training records, and
trend review. It does not provide diagnosis, cure claims, or guaranteed outcome
statements.

## Runtime APIs

Current Node HTTP runtime exposes:

- `GET /health`
- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /auth/me`
- `POST /profiles`
- `GET /profiles/:profileId`
- `PATCH /profiles/:profileId`
- `POST /profiles/:profileId/archive`
- `POST /training-records`
- `GET /training-records`
- `POST /training-prescriptions`
- `GET /training-prescriptions`
- `GET /training-prescriptions/active?userProfileId=...`
- `GET /training-prescriptions/:id`
- `POST /reports`
- `GET /reports`
- `GET /reports/:id`
- `POST /training-data-exports/deidentified`
- `GET /operation-logs`

## Run

```bash
corepack pnpm --filter @neuro-cog-rehab/api-server build
corepack pnpm --filter @neuro-cog-rehab/api-server start
```

Default local address:

```text
http://127.0.0.1:3001
```

Health check:

```bash
curl http://127.0.0.1:3001/health
```

## Environment Variables

- `API_HOST`: default `127.0.0.1`.
- `API_PORT`: default `3001`.
- `API_TOKEN_SECRET`: token signing secret, at least 32 characters.
- `API_CORS_ORIGINS`: comma-separated frontend origins.
- `VITE_API_BASE_URL`: frontend API base URL.
- `API_STORAGE_MODE`: `memory` or `postgres`. `memory` forces in-memory storage. If omitted, `API_DATABASE_URL` auto-enables PostgreSQL.
- `API_DATABASE_URL` / `DATABASE_URL`: PostgreSQL connection string. `DATABASE_URL` is used only when `API_STORAGE_MODE=postgres`.
- `API_POSTGRES_AUTO_MIGRATE`: default `true`. Set `false` when migrations are managed outside the service.

## PostgreSQL Persistence

When PostgreSQL mode is enabled, the following runtime data is persisted:

- accounts, sessions, token revocation, and profile access bindings;
- user training profiles;
- training record summaries;
- active training prescription versions;
- generated report metadata and trend summaries;
- deidentified training data export audit logs;
- append-only operation logs.

The persisted EEG scope is still summary-only. Raw EEG frames are intentionally
not stored by this API server.

```bash
set API_STORAGE_MODE=postgres
set API_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/neuro_cog_rehab
corepack pnpm --filter @neuro-cog-rehab/api-server build
corepack pnpm --filter @neuro-cog-rehab/api-server start
```

Optional manual migrations:

```bash
psql "%API_DATABASE_URL%" -f services/api-server/sql/001_api_training_records.sql
psql "%API_DATABASE_URL%" -f services/api-server/sql/002_api_core_persistence.sql
```

## Current Boundaries

- Memory mode remains available for unit tests and demo flows.
- PostgreSQL mode now persists the existing api-server runtime data listed above.
- Training prescription and report APIs are available in api-server and can run against memory or PostgreSQL repositories.
- Therapist-web has typed clients for saving prescriptions and loading report summaries, while several dashboard/detail views still fall back to mock/demo fixtures until their dedicated list/detail APIs are added.
- Music library and live EEG UI still need real API/WebSocket integration in later rounds.
