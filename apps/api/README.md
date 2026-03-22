# AgriPulse API

## Supabase: `P1001 Can't reach database server at db.*.supabase.co:5432`

That hostname is the **direct** Postgres URL. Many networks cannot reach it (IPv6-only DNS, firewalls). **Do not use it locally** unless you have Supabase **IPv4 add-on** or an IPv6-capable network.

### Fix (copy from Dashboard — do not guess the host)

1. Open **[Supabase Dashboard](https://supabase.com/dashboard)** → your project → **Connect** (top) or **Project Settings → Database**.
2. Under **Connection string**, choose **ORM** / **Prisma** (or **Session pooler**).
3. Copy the URI whose host ends with **`pooler.supabase.com`** (often `aws-0-<region>.pooler.supabase.com`), **not** `db.<ref>.supabase.co`.
4. Session pooler usually uses port **5432** on that pooler host. Transaction mode uses **6543** and needs `?pgbouncer=true`.

Put that string in **both** `DATABASE_URL` and `DIRECT_URL` in `apps/api/.env` (see `.env.example`). Username is often `postgres.<project-ref>`, not only `postgres`.

### Prisma + two URLs (this repo)

`schema.prisma` uses:

- `DATABASE_URL` — runtime (can be transaction pooler `6543` + `pgbouncer=true` in production).
- `DIRECT_URL` — migrations (`migrate deploy`, `db push`). If `db.*:5432` fails on your Mac, set `DIRECT_URL` to the **session pooler** URL (same family as above), **not** to `db.*.supabase.co`.

### Commands (run one line at a time)

In **zsh**, lines starting with `#` are comments; pasting `npx prisma ...` and then `# or during...` makes zsh try to run `#` as a command → `command not found: #`. Run:

```bash
cd apps/api
npx prisma generate
npx prisma migrate deploy
```

**`migrate deploy` vs empty DB:** If you see `No migration found in prisma/migrations`, the repo had no migration files—nothing gets created. This project includes `prisma/migrations/20260315120000_init` so `migrate deploy` creates all tables.

If you prefer syncing without migration history (dev only): `npx prisma db push`.

Use `npx prisma migrate dev` locally when you change `schema.prisma` and want new migration files.

### Local PostgreSQL

```env
DATABASE_URL="postgresql://user:password@localhost:5432/agripulse?schema=public"
DIRECT_URL="postgresql://user:password@localhost:5432/agripulse?schema=public"
```
