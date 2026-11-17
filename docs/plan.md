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
| 12 | Docker Compose | one command runs db, auth, API, gateway and the app; tests run in Docker | done |
| 13 | Calendar and recurring lessons | weekly recurring lessons and series cancel (DB), week and month calendar, schedule pages and overview strips for all roles | done |
| 14 | Fixed sidebar and combobox | pinned sidebar, searchable dropdown with paged server-side options replacing every native select | done |
| 15 | Clearer number fields | `Rp` prefix, unit suffix, thousands separators and − / + steppers (Rp10.000 for rates) on rates, seats and hours | done |

## Verification

- `pnpm db:test` (Docker): 114 pgTAP assertions across access control, billing, lessons, recurring lessons, logbooks and earnings.
- `pnpm test`: 45 Vitest tests for formatting, WIB handling, calendar maths, lane layout, hour coverage, option paging and logbook progress rules.
- Browser journeys for all three roles (enroll, pay, schedule, overlap refusal, logbook write, submit, request changes, approve, student read) were run with Playwright against the seeded database (24 steps), plus 10 steps for the calendar: weekly series, clash refusal, slot-to-add, series cancel, admin filter, student hours coverage and the phone layout, and 9 for the pinned sidebar and the combobox (paging while scrolling, server-side search, keyboard, inside a dialog, required validation).

## Out of scope for now

- Product improvements (kept for a later pass, tracked in `DECISIONS.md`).
- Email or WhatsApp notifications, payment gateway, parent accounts.

## Definition of done

- `supabase db reset` builds the schema and seed from scratch.
- `pnpm db:test` passes.
- `pnpm typecheck`, `pnpm lint` and `pnpm test` pass.
- Every rule in the brief is enforced in the database and covered by a test.
