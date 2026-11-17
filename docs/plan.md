# Delivery plan

Single-day build. Rules are enforced in the database first, the UI follows. Each milestone is one or a few commits.

| # | Milestone | Scope | Status |
|---|-----------|-------|--------|
| 0 | Repo and tooling | pnpm workspace, Next.js app, Supabase local config, docs skeleton | done |
| 1 | Database foundation | extensions, enums, `profiles`, `private` helpers, default privileges | done |
| 2 | Classes and billing | classes, rate tables, enrollments, invoices, catalog view, RPCs, RLS | done |
| 3 | Lessons and hours | lessons, overlap constraint, hour ledger, schedule/cancel RPCs | done |
| 4 | Logbooks and earnings | logbooks, entries, review flow, earnings, approve RPCs | done |
| 5 | Seed data | required seed (1 admin, 2 tutors, 3 students, 1 class) and optional demo history | done |
| 6 | pgTAP tests | one test file per rule group, run with `pnpm db:test` | done |
| 7 | App shell | auth, role routing, design tokens, UI kit, layout | done |
| 8 | Admin views | classes, students, invoices, schedule, logbook review | done |
| 9 | Tutor views | classes, scheduling, logbook writing, earnings | done |
| 10 | Student views | catalog and enrollment, my classes, invoices, hours, logbooks | done |
| 11 | Docs and hardening | README, ARCHITECTURE, DECISIONS, end-to-end manual pass | done |

## Verification

- `pnpm db:test`: 97 pgTAP assertions across access control, billing, lessons, logbooks and earnings.
- `pnpm test`: Vitest unit tests for formatting, WIB handling and logbook progress rules.
- Browser journeys for all three roles (enroll, pay, schedule, overlap refusal, logbook write, submit, request changes, approve, student read) were run with Playwright against the seeded database.

## Out of scope for now

- Product improvements (kept for a later pass, tracked in `DECISIONS.md`).
- Email or WhatsApp notifications, payment gateway, parent accounts.

## Definition of done

- `supabase db reset` builds the schema and seed from scratch.
- `pnpm db:test` passes.
- `pnpm typecheck`, `pnpm lint` and `pnpm test` pass.
- Every rule in the brief is enforced in the database and covered by a test.
