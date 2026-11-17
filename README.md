# Star Generation: Group Class Enrollment & Billing

Role-based web app for group classes. Admins create classes and review logbooks, tutors schedule lessons and write monthly logbooks, students enroll, pay and follow their progress.

- Stack: TypeScript, Node.js, Next.js (App Router), Tailwind CSS v4, Supabase Auth and PostgreSQL, pnpm workspaces, Docker Compose
- Docs: [ARCHITECTURE.md](ARCHITECTURE.md) · [Decisions](docs/DECISIONS.md) · [ADRs](docs/adr) · [Delivery plan](docs/plan.md)

## Run it from a fresh clone

The only requirement is [Docker](https://www.docker.com/products/docker-desktop) with Compose.

```bash
docker compose up --build
```

Open http://localhost:3000. The first run downloads the images and builds the app, which takes a few minutes. Compose starts everything in the right order: Postgres, Supabase Auth (GoTrue), Supabase Storage, the migrations and seed, the REST API (PostgREST), an nginx gateway and the Next.js app.

```bash
docker compose down        # stop, keeping the data
docker compose down -v     # stop and wipe the data (the seed is loaded again on the next start)
```

| Service | Address |
| --- | --- |
| Web app | http://localhost:3000 |
| API gateway (`/auth/v1`, `/rest/v1`, `/storage/v1`) | http://localhost:54321 |
| Postgres | `localhost:54322`, user `postgres`, password `postgres` |

The compose file ships with public demo values for the database password, JWT secret and the anon and service keys so it works out of the box on your own machine. Set `POSTGRES_PASSWORD`, `JWT_SECRET`, `ANON_KEY` and `SERVICE_ROLE_KEY` in the environment to change them (both keys must be JWTs signed with the secret).

Updating from an older checkout: run `docker compose down -v` once, because the storage service needs its database role set up when the database is first created.

### Developing the app

Run only the backend in Docker and the app on your machine (hot reload). Needs Node.js 22+ and [pnpm](https://pnpm.io) 12:

```bash
pnpm install
pnpm db:start   # db, auth, storage, migrations, API and gateway in the background
pnpm dev        # http://localhost:3000
```

No `.env` file is needed: outside production the app falls back to the local gateway above. A production build has no fallback, so give it `SUPABASE_URL` and `SUPABASE_ANON_KEY` (the compose `web` service does this for you).

## Seeded logins

Every account uses the password `Password123!`. There is no sign-up flow.

| Role    | Name           | Email                               |
| ------- | -------------- | ----------------------------------- |
| Admin   | Rina Admin     | `admin@stargeneration.test`         |
| Tutor   | Budi Santoso   | `tutor.budi@stargeneration.test`    |
| Tutor   | Sari Wulandari | `tutor.sari@stargeneration.test`    |
| Student | Alya Putri     | `student.alya@stargeneration.test`  |
| Student | Dimas Pratama  | `student.dimas@stargeneration.test` |
| Student | Citra Lestari  | `student.citra@stargeneration.test` |

The seed also contains one class, **English Conversation - Group A**, taught by Budi with capacity 2, student rate Rp150,000/hour and tutor rate Rp100,000/hour. Three students for two seats lets you see the capacity rule: the third student to enroll is refused.

### Optional demo history

With the stack running:

```bash
pnpm db:demo
```

Adds Alya and Dimas as paying students, last month's approved logbook (with tutor earnings), two recent lessons that still need logbook entries, and two lessons next month. Dates are relative to today, so it works on any day. Run `docker compose down -v` and start again to go back to the plain seed.

Open **Schedule** in any role for the week and month calendar. As Budi, click an empty slot to add a lesson or use **Repeat weekly** to create a whole series; as Alya, upcoming lessons that her remaining hours no longer cover are flagged.

Invoices can carry an optional proof of payment: as Alya, open **Invoices** and use **Add proof of payment** on an unpaid invoice (JPG, PNG or WebP, up to 5 MB); as Rina, the proof shows in the invoices table and in **Mark as paid**, and a paid invoice shows who approved it.

A good walkthrough: sign in as Budi, write entries for the two recent lessons, submit the logbook (all lessons of the month must have ended and have an entry), then sign in as Rina to preview the earnings and approve it, and finally as Alya to read it.

## Tests and commands

| Command                       | What it does                                                          |
| ----------------------------- | --------------------------------------------------------------------- |
| `pnpm db:test`                | pgTAP tests for business rules and row level security (in Docker)     |
| `pnpm test`                   | Vitest unit tests (formatting, WIB handling, calendar, options paging, number, date and time fields)        |
| `pnpm typecheck` / `pnpm lint` | TypeScript and ESLint                                                |
| `pnpm up` / `pnpm down`       | Shortcuts for `docker compose up --build` and `docker compose down`   |
| `pnpm db:start`               | Start only the backend services in the background                     |
| `pnpm db:reset`               | Wipe the data and start the backend again with a fresh seed           |
| `pnpm db:demo`                | Load the optional demo history                                        |
| `pnpm db:types`               | Regenerate `apps/web/src/lib/database.types.ts` from the database (in Docker) |

The [Supabase CLI](https://supabase.com/docs/guides/cli) is optional: `supabase/config.toml` still works with `supabase start` if you prefer it (pass its publishable key as `SUPABASE_ANON_KEY`). Nothing in the normal workflow needs it.

## Repository layout

```
apps/web/        Next.js app (app/ routes per role, components/ui kit, lib/ helpers) and its Dockerfile
docker/          nginx gateway config, role passwords, migrate script
docker-compose.yml
supabase/
  migrations/    schema, security (RLS) and business-rule functions
  tests/         pgTAP tests
  seed.sql       required seed data
  demo.sql       optional demo history
docs/            decisions, ADRs and the delivery plan
```
