# MediCare — Pharmacy Management & POS

MediCare is a multi-tenant pharmacy management app built with Next.js, React, TypeScript, and Supabase. Each pharmacy has a private owner dashboard and manager POS workspace. Pharmacy records are scoped by PostgreSQL row-level security (RLS); managers are invited by their owner and can only access their pharmacy.

## Set up Supabase

1. Create a Supabase project and enable email/password authentication.
2. Copy `.env.example` to `.env.local` and add the project URL and anon key:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

3. Apply `supabase/migrations/202611020001_pharmacy_multitenancy.sql` to the project. This creates pharmacy and profile records, tenant-scoped pharmacy data, RLS policies, owner-account provisioning, and the transactional POS functions.
4. Configure the Supabase Auth site URL and redirect allowlist for your deployment, including `/login` and `/auth/update-password`. Configure email delivery for owner verification, password resets, and manager invitations.
5. Deploy the manager invitation Edge Function from this directory using the Supabase CLI:

   ```powershell
   supabase link --project-ref YOUR_PROJECT_REF
   supabase db push
   supabase functions deploy invite-manager
   supabase secrets set APP_ORIGIN=https://your-pharmacy-app.example
   ```

   Supabase provides the function URL, anon key, and service-role key to Edge Functions. Keep the service-role key server-side; never add it to `.env.local` or a `NEXT_PUBLIC_*` variable. `APP_ORIGIN` must exactly match the app origin (for local testing, use `http://localhost:3000`). Add that origin and the `/auth/update-password` redirect to the Supabase Auth URL allowlist.

6. Install dependencies and run the app:

   ```powershell
   npm install
   npm run dev
   ```

   Open `http://localhost:3000`.

## Pharmacy accounts and roles

- An owner registers at `/signup`. Supabase creates the pharmacy and its admin profile together.
- The owner signs in to `/admin/dashboard`, manages pharmacy data, and invites managers from **Administration → Users**.
- The manager receives an email invitation, sets a password, and signs in to the pharmacy POS at `/manager/store`.
- Manager sales are validated and recorded in a database transaction. Stock and eligible batches are decremented together; the sale, payment, and audit record are written to the same pharmacy.
- Managers cannot administer pharmacy accounts or change inventory through the database API. RLS enforces tenant and role boundaries independently of the UI.

There are no shared demo credentials. Each account is created through Supabase Auth.

## Live data

Dashboard metrics, charts, lists, search results, inventory alerts, reports, and manager product browsing load from the signed-in pharmacy's records. Product, category, brand, manufacturer, supplier, and customer management; manager invitations; pharmacy and profile settings; and checkout persist to Supabase. The remaining prototype actions that are not backed by a saved form or database operation should not be treated as production workflows.

The app loads a pharmacy's records in pages and the database indexes records by pharmacy and entity. This is a starting point for a 500+ pharmacy SaaS deployment, not a capacity certification: choose an appropriate Supabase plan, add monitoring/backups, and load-test expected record volumes before onboarding customers. Billing/subscriptions and payment processing are not connected.

## Project structure

```text
src/
├── app/
│   ├── login/                 # Supabase sign-in
│   ├── signup/                # Pharmacy owner registration
│   ├── auth/update-password/  # Password recovery
│   ├── admin/                 # Owner ERP dashboard and management pages
│   └── manager/               # Pharmacy manager POS
├── components/
│   ├── ui/                    # Shared UI controls
│   ├── layout/                # Role-aware shell and navigation
│   └── dashboard/             # Charts and dashboard components
└── lib/
    ├── auth.tsx               # Supabase Auth and pharmacy profile
    ├── pharmacyData.tsx       # Tenant-scoped data access and mutations
    ├── dataRuntime.ts         # Live pharmacy data and derived metrics
    ├── data.ts                # Demo fallback and typed live data views
    └── types.ts               # Pharmacy domain types

supabase/
├── migrations/                # Tenant schema, RLS, and POS transactions
└── functions/invite-manager/  # Owner-authorized manager email invitations
```
