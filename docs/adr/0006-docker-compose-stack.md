# 0006. Docker Compose runs the whole stack

Status: accepted (supersedes the Supabase CLI part of [0005](0005-monorepo-and-app-structure.md))

## Context

A reviewer should be able to run the project from a fresh clone with one command and as few installed tools as possible. The Supabase CLI already starts Docker containers, but it adds a tool to install and a long first start.

## Decision

`docker compose up --build` starts:

- `db`: the Supabase Postgres image (same one the CLI uses), so roles, extensions and `auth.uid()` behave the same.
- `auth`: Supabase GoTrue with sign-ups disabled and email confirmation off.
- `storage`: Supabase Storage with a local disk volume, for private uploads such as payment proofs ([ADR 0010](0010-payment-proofs-in-private-storage.md)). It creates the `storage` schema on its first start.
- `migrate`: a one-shot container that waits for `auth` (the seed writes into tables GoTrue creates) and for `storage` (migrations add a bucket and policies), applies `supabase/migrations` in order, records them in `supabase_migrations.schema_migrations`, loads `supabase/seed.sql` on an empty database and asks PostgREST to reload its schema.
- `rest`: PostgREST, started only after `migrate` succeeded.
- `gateway`: nginx, exposing `/auth/v1`, `/rest/v1` and `/storage/v1` on one URL, which is what `supabase-js` expects.
- `web`: the Next.js app built as a standalone production image. It talks to the gateway over the compose network, so the browser never calls Supabase directly.
- `test` (profile): pg_prove runs the pgTAP suite against the same database.

The migrations, seed and tests stay in `supabase/`, unchanged and still compatible with the Supabase CLI.

## Consequences

- Only Docker is required to run the project; Node and pnpm are needed only to develop the app.
- The JWT secret and the anon and service keys are public demo values, clearly marked, and overridable through environment variables. They must never be reused outside a local machine.
- The gateway is plain nginx, not Kong, so there is no API key check at the edge. PostgREST and RLS still decide what each token can do, and the anon role has no table access.
- Studio is not included. Use any Postgres client on port 54322.
- The compose file pins the same image versions as the Supabase CLI release used during development; bump them together.
