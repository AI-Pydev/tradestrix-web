# Next.js Frontend

This is a Bootstrap-based Next.js frontend for the multi-stock FastAPI backend.

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
