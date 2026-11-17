# Star Generation: Group Class Enrollment & Billing

Role-based web app for group classes. Admins create classes and review logbooks, tutors schedule lessons and write monthly logbooks, students enroll, pay and follow their progress.

- Stack: TypeScript, Node.js, Next.js (App Router), Tailwind CSS v4, Supabase Auth and PostgreSQL, pnpm workspaces
- Docs: [ARCHITECTURE.md](ARCHITECTURE.md) · [Decisions](docs/DECISIONS.md) · [ADRs](docs/adr) · [Delivery plan](docs/plan.md)

## Requirements

- Node.js 22 or newer and [pnpm](https://pnpm.io) 12 (pinned in `packageManager`)
- [Docker](https://www.docker.com/products/docker-desktop) running
- [Supabase CLI](https://supabase.com/docs/guides/cli) 2.x

## Run it from a fresh clone

```bash
pnpm install
pnpm db:start   # starts local Supabase, applies the migrations and the seed (first run downloads images)
pnpm dev        # http://localhost:3000
```

No `.env` file is needed in development: the app falls back to the fixed local Supabase URL and publishable key printed by `supabase start`. A production build (`pnpm build && pnpm start`) has no fallback, so pass the values explicitly:

```bash
SUPABASE_URL=http://127.0.0.1:54321 SUPABASE_ANON_KEY=<publishable key from `supabase status`> pnpm --filter web start
```

The same two variables point the app at any other Supabase project.

Supabase Studio is at http://127.0.0.1:54323.

## Seeded logins

Every account uses the password `Password123!`. There is no sign-up flow.

| Role    | Name           | Email                           |
| ------- | -------------- | ------------------------------- |
| Admin   | Rina Admin     | `admin@stargeneration.test`     |
| Tutor   | Budi Santoso   | `tutor.budi@stargeneration.test`   |
| Tutor   | Sari Wulandari | `tutor.sari@stargeneration.test`   |
| Student | Alya Putri     | `student.alya@stargeneration.test`  |
| Student | Dimas Pratama  | `student.dimas@stargeneration.test` |
| Student | Citra Lestari  | `student.citra@stargeneration.test` |

The seed also contains one class, **English Conversation - Group A**, taught by Budi with capacity 2, student rate Rp150,000/hour and tutor rate Rp100,000/hour. Three students for two seats lets you see the capacity rule: the third student to enroll is refused.

### Optional demo history

```bash
pnpm db:demo
```

Adds Alya and Dimas as paying students, last month's approved logbook (with tutor earnings), two recent lessons that still need logbook entries, and two lessons next month. Dates are relative to today, so it works on any day. Run `pnpm db:reset` to go back to the plain seed.

A good walkthrough: sign in as Budi, write entries for the two recent lessons, submit the logbook (all lessons of the month must have ended and have an entry), then sign in as Rina to preview the earnings and approve it, and finally as Alya to read it.

## Commands

| Command          | What it does                                                       |
| ---------------- | ------------------------------------------------------------------ |
| `pnpm dev`       | Next.js dev server                                                 |
| `pnpm build`     | Production build                                                   |
| `pnpm typecheck` | TypeScript check                                                   |
| `pnpm lint`      | ESLint                                                             |
| `pnpm test`      | Vitest unit tests (formatting and WIB helpers)                     |
| `pnpm db:start`  | Start local Supabase and apply migrations and seed                 |
| `pnpm db:reset`  | Rebuild the database from migrations and seed                      |
| `pnpm db:test`   | pgTAP tests for business rules and row level security              |
| `pnpm db:types`  | Regenerate `apps/web/src/lib/database.types.ts` from the database  |
| `pnpm db:demo`   | Load the optional demo history                                     |
| `pnpm db:stop`   | Stop local Supabase                                                |

## Repository layout

```
apps/web/        Next.js app (app/ routes per role, components/ui kit, lib/ helpers)
supabase/
  migrations/    schema, security (RLS) and business-rule functions
  tests/         pgTAP tests
  seed.sql       required seed data
  demo.sql       optional demo history
docs/            decisions, ADRs and the delivery plan
```
