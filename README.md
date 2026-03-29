# AgriPulse Hub

Youth-focused Agri-Tech for Nigeria and Rwanda — mentorship, marketplace, crop analytics, and Agri-Learning in one platform.

## Links

| | URL |
|---|-----|
| **Live app** | [https://agri-pulse-web-mu.vercel.app/](https://agri-pulse-web-mu.vercel.app/) |
| **Demo video** | [https://youtu.be/dGjr-xKpPtA](https://youtu.be/dGjr-xKpPtA) |

## Monorepo layout

| Path | Description |
|------|-------------|
| **`apps/web`** | Next.js 14 frontend |
| **`apps/api`** | Express API, Prisma, PostgreSQL |

---

## Local setup (step by step)

Follow these steps in order on macOS, Linux, or Windows (use PowerShell or Git Bash where paths differ).

### 1. Prerequisites

- **Node.js** — Use **Node 20 LTS** or newer (the API targets Node 20 types; newer LTS is fine).
- **npm** — Comes with Node; npm 9+ works well with workspaces.
- **PostgreSQL** — A running PostgreSQL instance you can connect to (local install, Docker, or a hosted DB such as [Supabase](https://supabase.com)). Create an empty database (for example `agripulse`) and note the connection string.

### 2. Clone the repository

```bash
git clone https://github.com/Goketech/agri-pulse.git
cd agri-pulse
```

### 3. Install dependencies (monorepo root)

From the **repository root** (`agri-pulse/`):

```bash
npm install
```

This installs dependencies for all workspaces (`apps/web`, `apps/api`, and any `packages/*`).

### 4. Configure the API environment

The API loads variables from **`apps/api/.env`** (when you run scripts via `npm run dev:api` or `npm --workspace api run …`, the working directory is `apps/api`).

1. Copy the example file from the repo root into the API app:

   ```bash
   cp .env.example apps/api/.env
   ```

2. Edit **`apps/api/.env`** and set the values described in [Environment variables (API)](#environment-variables-api) below. At minimum for a working stack you need valid **`DATABASE_URL`**, **`DIRECT_URL`**, and a strong **`JWT_SECRET`**.

### 5. Create the database schema

Still with a configured `apps/api/.env`, run Prisma from the API workspace:

```bash
cd apps/api
npm run db:generate
npm run db:deploy
```

- **`db:generate`** — Generates the Prisma Client into `node_modules`.
- **`db:deploy`** — Applies existing SQL migrations in `apps/api/prisma/migrations/` to your database.

If you prefer to sync the schema without migration history (quick experiments only):

```bash
npm run db:push
```

For **Supabase** or connection issues (IPv6, pooler vs direct host), see [apps/api/README.md](apps/api/README.md).

### 6. Seed demo data (recommended)

Demo users, listings, and learning content:

```bash
# from apps/api
npm run db:seed
```

Optional seed-related inputs:

- **`DEMO_PASSWORD`** in `apps/api/.env` — Default password for demo accounts if you do not pass `--demo-password`.
- CLI: `npm run db:seed -- --demo-password 'YourSecurePassword'` (overrides the env default for that run).

Return to the repo root when finished:

```bash
cd ../..
```

### 7. Configure the web app (optional)

The frontend defaults to **`http://localhost:4000`** for API calls. Override only if your API runs elsewhere.

Create **`apps/web/.env.local`**:

```bash
# Example — only needed if the API is not on localhost:4000
NEXT_PUBLIC_API_URL=http://localhost:4000
```

`NEXT_PUBLIC_*` variables are embedded at **build time**; restart `next dev` after changing them.

### 8. Run web and API together

From the **repository root**:

```bash
npm run dev
```

This runs **`dev:web`** and **`dev:api`** in parallel:

- **Web** — [http://localhost:3000](http://localhost:3000) (Next.js)
- **API** — [http://localhost:4000](http://localhost:4000) (or the port set by `PORT` in `apps/api/.env`)
- Health check — [http://localhost:4000/health](http://localhost:4000/health)

Run only one app if needed:

```bash
npm run dev:web
npm run dev:api
```

### 9. Log in with demo accounts (after seed)

Use emails created by the seed script (for example `ada.cassava@agripulse.demo`) and the password from **`DEMO_PASSWORD`** or `DemoPass123!` if you did not set either. See [apps/api/prisma/seed.ts](apps/api/prisma/seed.ts) for the full demo user list.

---

## Environment variables (API)

All of these belong in **`apps/api/.env`**. The canonical template is [`.env.example`](.env.example) at the repo root.

| Variable | Required for local run? | Purpose |
|----------|-------------------------|---------|
| **`DATABASE_URL`** | **Yes** | PostgreSQL URL used by Prisma for queries. With Supabase, prefer the **Session pooler** URI (host like `*.pooler.supabase.com`, often port **6543**). Must include `?schema=public` if your public schema is not the default search path. |
| **`DIRECT_URL`** | **Yes** | Prisma **migrations** connection. For local Postgres, often the same as `DATABASE_URL`. For Supabase, use the **direct** `db.*.supabase.co:5432` URL when reachable, or the pooler URL if direct 5432 fails from your network (see `apps/api/README.md`). |
| **`JWT_SECRET`** | **Strongly recommended** | Secret for signing JWT access tokens. If unset, the API falls back to a weak dev default — **do not use that in production**. |
| **`PORT`** | No | API listen port. Default **4000**. |
| **`FRONTEND_URL`** | No | Allowed CORS origin (browser requests from the Next app). Default behavior allows **`*`** if unset — convenient for local dev, tighten for production (e.g. `https://your-app.vercel.app`). Also used as Paystack **`callback_url`** base when initializing payments. |
| **`OPENAI_API_KEY`** | No | Enables AI-powered mentorship features. Without it, related endpoints will not use OpenAI. |
| **`PAYSTACK_SECRET_KEY`** | No | Nigeria payment flows (Paystack). Without it, payment initialization that depends on Paystack will not work against the live API. |
| **`AT_API_KEY`** | No | Africa’s Talking — SMS notifications. |
| **`AT_USERNAME`** | No | Africa’s Talking username; used together with **`AT_API_KEY`**. |
| **`DEMO_PASSWORD`** | No | Default password for seeded demo users when running `npm run db:seed` without `--demo-password`. |

---

## Environment variables (web)

| Variable | File | Required? | Purpose |
|----------|------|-----------|---------|
| **`NEXT_PUBLIC_API_URL`** | `apps/web/.env.local` | No | Base URL of the API (no trailing slash). Defaults to **`http://localhost:4000`**. Set in production to your deployed API origin (e.g. `https://api.example.com`). |

---

## Production-style commands

From **`apps/api`** after `npm run build` at the API workspace:

```bash
npm run start
```

Build everything from the monorepo root:

```bash
npm run build
```

Deploy the web app to Vercel (or similar): set **`NEXT_PUBLIC_API_URL`** to your public API URL. Deploy the API separately and set all **API** variables on that host. Keep **`FRONTEND_URL`** and **`JWT_SECRET`** aligned with your real frontend origin and a cryptographically random secret.

---

## Further reading

- [apps/api/README.md](apps/api/README.md) — Prisma, Supabase pooler vs direct URL, troubleshooting.
- Root [`.env.example`](.env.example) — Copy-paste template for `apps/api/.env`.
