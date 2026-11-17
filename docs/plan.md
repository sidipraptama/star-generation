# Delivery plan

Single-day build. Rules are enforced in the database first, the UI follows. Each milestone is one or a few commits.

| # | Milestone | Scope | Status |
|---|-----------|-------|--------|
| 0 | Repo and tooling | pnpm workspace, Next.js app, Supabase local config, docs skeleton | done |
| 1 | Database foundation | extensions, enums, `profiles`, `private` helpers, default privileges | todo |
| 2 | Classes and billing | classes, rate tables, enrollments, invoices, catalog view, RPCs, RLS | todo |
| 3 | Lessons and hours | lessons, overlap constraint, hour ledger, schedule/cancel RPCs | todo |
| 4 | Logbooks and earnings | logbooks, entries, review flow, earnings, approve RPCs | todo |
| 5 | Seed data | required seed (1 admin, 2 tutors, 3 students, 1 class) and optional demo history | todo |
| 6 | pgTAP tests | one test file per rule group, run with `pnpm db:test` | todo |
| 7 | App shell | auth, role routing, design tokens, UI kit, layout | todo |
| 8 | Admin views | classes, students, invoices, schedule, logbook review | todo |
| 9 | Tutor views | classes, scheduling, logbook writing, earnings | todo |
| 10 | Student views | catalog and enrollment, my classes, invoices, hours, logbooks | todo |
| 11 | Docs and hardening | README, ARCHITECTURE, DECISIONS, end-to-end manual pass | todo |

## Out of scope for now

- Product improvements (kept for a later pass, tracked in `DECISIONS.md`).
- Email or WhatsApp notifications, payment gateway, parent accounts.

## Definition of done

- `supabase db reset` builds the schema and seed from scratch.
- `pnpm db:test` passes.
- `pnpm typecheck`, `pnpm lint` and `pnpm test` pass.
- Every rule in the brief is enforced in the database and covered by a test.
