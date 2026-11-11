# MediCare — Pharmacy Management & POS (PharmacySaas)

A multi-tenant pharmacy management + point-of-sale SaaS. Each pharmacy is an
isolated tenant; data is protected at the database layer with Postgres
Row-Level Security, so one pharmacy can never see another's data.

## Tech stack

- **Next.js 16** (App Router, route handlers, middleware/proxy) + **React 19**
- **Supabase** — Postgres, Auth, and Row-Level Security
- **Tailwind CSS 4**, **Recharts**
- **Cloudinary** for image uploads (server-validated)

## Roles

Sign in is role-based from a single login page (`/login`):

| Role | Area | Capability |
|------|------|------------|
| **Super Admin** | `/control` | Registers pharmacies + owner accounts, manages subscriptions/status. No public self-signup. |
| **Owner (admin)** | `/admin` | Full ERP: inventory, purchasing, suppliers, reports, staff, settings. |
| **Manager** | `/manager` | POS only: store, sales, returns, prescriptions, billing customers. |

Role access is enforced on the **server** (`src/proxy.ts` + per-RPC checks), not
just hidden in the UI.

## Project layout

```
.
└── frontend/          ← the Next.js app (set this as the Vercel Root Directory)
    ├── src/
    ├── supabase/migrations/   ← SQL migrations, applied in filename order
    └── .env.example           ← copy to .env.local and fill in
```

## Local development

Prerequisites: **Node 20+** and a Supabase project.

```bash
cd frontend
npm install
cp .env.example .env.local      # then fill in real values (see below)
npm run dev                     # http://localhost:3000
```

### Environment variables

Create `frontend/.env.local` from `.env.example`:

| Variable | Scope | Notes |
|----------|-------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | public | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | **server-only** | Used by admin API routes; never sent to the browser |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | public | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | **server-only** | Cloudinary key |
| `CLOUDINARY_API_SECRET` | **server-only** | Cloudinary secret |

> `.env.local` is git-ignored — never commit real secrets. Only the
> placeholder `.env.example` is tracked.

### Database migrations

Apply the SQL files in `frontend/supabase/migrations/` **in filename order**
via the Supabase SQL editor (or the Supabase CLI). They are additive and
idempotent (safe to re-run).

## Deploy to Vercel

1. **Import** the repo at [vercel.com](https://vercel.com) → Add New → Project.
2. **Set Root Directory to `frontend`.** The Next.js app lives in a subfolder,
   so Vercel must point there. (This is a dashboard setting — it can't live in a
   repo file.) Framework auto-detects as **Next.js**.
3. **Add the environment variables** from the table above with your real values
   (they are not in the repo).
4. **Deploy.** Pushes to `main` auto-deploy to production; other branches get
   preview deployments.

### After the first deploy

In **Supabase → Authentication → URL Configuration**, set the **Site URL** to
your Vercel domain and add it to the **Redirect URLs** allowlist
(`https://your-app.vercel.app/**`, plus `http://localhost:3000/**` for local),
so login redirects and password-reset links resolve correctly.

For password-reset / invite emails to actually deliver in production, configure
**custom SMTP** in Supabase → Authentication → Emails (the built-in email
service is development-only).
