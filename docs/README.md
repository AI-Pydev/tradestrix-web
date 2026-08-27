# Next.js Frontend

This is a Bootstrap-based Next.js frontend for the multi-stock FastAPI backend.

## Modernization Architecture

The cross-application modernization program is maintained in the companion API
repository under `docs/architecture/`. The frontend-specific target is
[`WEB_APPLICATION_ARCHITECTURE.md`](https://github.com/AI-Pydev/tradestrix-api/blob/main/docs/architecture/WEB_APPLICATION_ARCHITECTURE.md),
covering feature ownership, API clients, command states, real-time updates,
security, PWA cache safety, performance, testing, and incremental migration.

## Environment

Create `.env.local` from `.env.example`:

```bash
cp .env.example .env.local
```

Default backend URL:

```bash
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000/api/v1/multi-stock
NEXT_PUBLIC_BACKEND_BASE_URL=http://127.0.0.1:8000
```

For a custom domain fronting both frontend and backend through one reverse proxy, use:

```bash
NEXT_PUBLIC_API_BASE_URL=https://fullstackpythondeveloper.in/api/v1/multi-stock
NEXT_PUBLIC_BACKEND_BASE_URL=https://fullstackpythondeveloper.in
```

## Run

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

The frontend expects the FastAPI backend to already be running on port `8000`.
