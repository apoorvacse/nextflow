# NextFlow

Node-based AI workflow builder (inspired by premium tools like Linear/Raycast).

Build pipelines with **Upload Image/Video**, **Crop Image**, **Extract Frame**, and **LLM** nodes. Runs are orchestrated via **Trigger.dev**, stored in **Postgres (Neon)** through **Prisma**, and the UI is built on **Next.js App Router + React Flow**.

## Features

- **Node-based editor**: drag/drop nodes, connect handles, run full or partial graphs
- **Media pipeline**:
  - Image upload via **Transloadit**
  - Video upload via **Transloadit**
  - Crop images (ffmpeg) + upload output
  - Extract video frames (ffmpeg) + upload output
- **LLM**:
  - Primary: **OpenRouter** (OpenAI-compatible)
  - Fallback: **Gemini** (optional)
- **Run history**: status, duration, node outputs/errors
- **Polished UI**: resizable sidebars, dark theme, premium dropdown, styled React Flow controls

## Tech stack

- **Frontend**: Next.js 16 (App Router), React 19, Tailwind CSS
- **Canvas**: `@xyflow/react` (React Flow)
- **Auth**: Clerk
- **Database**: Postgres (Neon) + Prisma
- **Jobs/Orchestration**: Trigger.dev v3
- **Media processing**: fluent-ffmpeg + ffmpeg/ffprobe installers
- **Uploads**: Transloadit

## Project structure

```
src/
  app/
    api/              # Next.js route handlers (/api/*)
    workflow/         # Main workflow page
  components/
    canvas/           # React Flow canvas + edges
    layout/           # Header + sidebars
    nodes/            # Node UIs (Upload, Crop, Extract, LLM, Text)
    ui/               # Reusable UI primitives (e.g. ModelDropdown)
  lib/
    api.ts            # Client API wrapper
    prisma.ts         # Prisma singleton + adapter-pg
    transloadit.ts    # Server-side Transloadit SDK wrapper
  store/
    workflowStore.ts  # Zustand store for nodes/edges/runs
  trigger/
    *.ts              # Trigger.dev tasks (orchestrator + nodes)
prisma/
  schema.prisma
trigger.config.ts
```

## Requirements

- Node.js 18+ (recommended)
- A Postgres database (Neon recommended)
- Accounts/keys:
  - Clerk
  - Transloadit
  - Trigger.dev
  - OpenRouter (optional but recommended)
  - Gemini (optional fallback)

## Quickstart (local)

1) Install dependencies:

```bash
npm install
```

2) Create `.env.local` (see **Environment Variables** below).

3) Generate Prisma client (also runs automatically on install/build):

```bash
npx prisma generate
```

4) Start the app:

```bash
npm run dev
```

Open `http://localhost:3000/workflow`.

## Environment variables

Create `.env.local` locally. **Do not commit it.**

### Database (Neon / Postgres)

| Name | Required | Notes |
|------|----------|------|
| `DATABASE_URL` | Yes | Connection string (pooled is fine) |
| `DIRECT_URL` | Recommended | Direct connection string (if you use it) |

### Clerk (Auth)

| Name | Required |
|------|----------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Yes |
| `CLERK_SECRET_KEY` | Yes |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | Yes |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | Yes |

### Trigger.dev (Jobs)

| Name | Required | Notes |
|------|----------|------|
| `TRIGGER_SECRET_KEY` | Yes | Used to authenticate triggering jobs |

### Transloadit (Uploads & media pipeline)

| Name | Required | Notes |
|------|----------|------|
| `TRANSLOADIT_KEY` | Yes | Server/worker |
| `TRANSLOADIT_SECRET` | Yes | Server/worker |
| `TRANSLOADIT_TEMPLATE_ID_IMAGE` | Yes | Server/worker |
| `TRANSLOADIT_TEMPLATE_ID_VIDEO` | Yes | Server/worker |
| `NEXT_PUBLIC_TRANSLOADIT_KEY` | Yes | Client |
| `NEXT_PUBLIC_TRANSLOADIT_TEMPLATE_ID_IMAGE` | Yes | Client |
| `NEXT_PUBLIC_TRANSLOADIT_TEMPLATE_ID_VIDEO` | Yes | Client |

### OpenRouter (LLM, recommended)

| Name | Required | Notes |
|------|----------|------|
| `OPENROUTER_API_KEY` | Recommended | Enables OpenRouter provider |
| `OPENROUTER_DEFAULT_MODEL` | Recommended | e.g. `google/gemma-4-31b-it:free` |
| `OPENROUTER_HTTP_REFERER` | Recommended in prod | e.g. your Vercel domain |

### Gemini (LLM fallback)

| Name | Required |
|------|----------|
| `GOOGLE_GENERATIVE_AI_API_KEY` | Optional |

## Running jobs locally (Trigger.dev)

This repo uses Trigger.dev tasks from `src/trigger/*` and registers them via `trigger.config.ts`.

Typical workflow:

1) Start the app:

```bash
npm run dev
```

2) Start Trigger.dev dev worker (in another terminal):

```bash
npx trigger.dev@latest dev
```

> The `.trigger/` folder is **local cache** and is intentionally ignored in git.

## Deployment

### Deploy the web app (Vercel)

1) Import the repo in Vercel.
2) Set environment variables in **Vercel → Project → Settings → Environment Variables**.
3) Deploy.

Important notes:
- The build runs `prisma generate` automatically (`postinstall` and `build` script).
- Ensure `DATABASE_URL` is set in Vercel, otherwise Prisma client generation/build may fail.

### Deploy the worker (Trigger.dev Production)

Trigger.dev runs the worker separately from Vercel.

1) In Trigger.dev dashboard: create/select project and copy the **secret key**.
2) Add env vars in **Trigger.dev → Environments → Production** (same secrets the worker needs: DB, OpenRouter/Gemini, Transloadit).
3) Deploy from your repo:

```bash
npx trigger login
npx trigger deploy
```

## Scripts

```bash
npm run dev     # start Next.js dev server
npm run build   # prisma generate + next build
npm run start   # start production server
npm run lint    # eslint
```

## Troubleshooting

### Prisma `P1001` / database unreachable

- Verify `DATABASE_URL` is correct
- Check DNS/network connectivity to your Neon host
- In production, set the same DB env vars in **both** Vercel **and** Trigger.dev

### Upload failures (Transloadit)

- Confirm `TRANSLOADIT_*` vars are set (server + worker)
- Ensure templates exist and match your Transloadit account

### OpenRouter 404/429

- 404 often means the selected model is unavailable; the app will fall back across models
- 429 means rate-limited; retries/backoff are used, but consider switching models
- In production, set `OPENROUTER_HTTP_REFERER` to your deployed domain

## Security

- Never commit secrets. `.env*` is ignored.
- `.trigger/` is local build cache and should not be committed.

## License

No license file is included yet. Add `LICENSE` if you plan to open source this project.
