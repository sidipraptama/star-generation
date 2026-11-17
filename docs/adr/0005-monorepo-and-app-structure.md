# 0005. Monorepo and application structure

Status: accepted

## Context

The deliverable is one repository containing the database schema, the seed and the web app, runnable from a fresh clone.

## Decision

- pnpm workspace: `apps/web` (Next.js App Router), `supabase/` (migrations, seed, pgTAP tests), `docs/`.
- Supabase runs locally in Docker ([ADR 0006](0006-docker-compose-stack.md)). Migrations are the source of truth; `database.types.ts` is generated from them and committed.
- Server Components read data with the user's session; Server Actions call the database functions. Role areas are route groups guarded by a layout that checks the role (`/admin`, `/tutor`, `/student`).
- `proxy.ts` only refreshes the auth cookie and redirects anonymous visitors. Authorization is never decided there.
- `cacheComponents` is turned off. Every page is per-user and must be fresh, so there is nothing to cache and the extra Suspense rules would add complexity without benefit.
- Tailwind v4 with theme tokens in CSS (`@theme`), a small hand-written UI kit, and `lucide-react` for icons. No component library.
- Tests: pgTAP for business rules and RLS, Vitest for pure helpers.

## Consequences

- Reviewers need Docker. The README lists the exact commands.
- No secrets are needed: the local anon key is a public demo value.
