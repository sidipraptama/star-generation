# Delivery plan

Rules are enforced in the database first, the UI follows. Each milestone is one or a few commits.

## Milestones

| #   | Milestone                      | Scope                                                                                                     | Status |
| --- | ------------------------------ | --------------------------------------------------------------------------------------------------------- | ------ |
| 0   | Repo and tooling               | pnpm workspace, Next.js app, Supabase config, docs skeleton                                               | done   |
| 1   | Database foundation            | extensions, enums, `profiles`, `private` helpers, default privileges                                      | done   |
| 2   | Classes and billing            | classes, rate tables, enrollments, invoices, catalog view, RPCs, RLS                                      | done   |
| 3   | Lessons and hours              | lessons, overlap constraint, hour ledger, schedule and cancel RPCs                                        | done   |
| 4   | Logbooks and earnings          | logbooks, entries, review flow, earnings, approval                                                        | done   |
| 5   | Seed data                      | required seed (1 admin, 2 tutors, 3 students, 1 class), optional demo history                             | done   |
| 6   | pgTAP tests                    | one file per rule group, `pnpm db:test`                                                                   | done   |
| 7   | App shell                      | auth, role routing, design tokens, UI kit, layout                                                         | done   |
| 8   | Admin views                    | classes, students, invoices, schedule, logbook review                                                     | done   |
| 9   | Tutor views                    | classes, scheduling, logbook writing, earnings                                                            | done   |
| 10  | Student views                  | catalog and enrollment, my classes, invoices, hours, logbooks                                             | done   |
| 11  | Docs and hardening             | README, ARCHITECTURE, DECISIONS, manual pass                                                              | done   |
| 12  | Docker Compose                 | one command runs db, auth, API, gateway and app; tests run in Docker                                      | done   |
| 13  | Calendar and recurring lessons | week and month calendar, weekly series, series cancel, hours forecast, all roles                          | done   |
| 14  | Fixed sidebar and combobox     | pinned sidebar; searchable dropdown with paged server-side options                                        | done   |
| 15  | Number fields                  | `Rp` prefix, unit suffix, thousands separators, steppers (Rp10.000 for rates)                             | done   |
| 16  | Date and time pickers          | custom date picker (month grid, min and max, keyboard) and time picker (15-minute list or typed time)     | done   |
| 17  | Payment proofs                 | optional proof in private storage; approved-by name for admins and students                               | done   |
| 18  | Lists at scale                 | search, filters, pagination on every list, in the database; stats views; Cancel invoice disabled up front | done   |

## Verification

| Check          | Command                       | Result                                                                                                                    |
| -------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Database rules | `pnpm db:test` (Docker)       | 172 pgTAP assertions: access control, billing, lessons, recurring lessons, logbooks, earnings, payment proofs, list views |
| Unit tests     | `pnpm test`                   | 89 Vitest tests: formatting, WIB, calendar maths, hour coverage, paging and search helpers, fields, proofs, logbook rules |
| Types and lint | `pnpm typecheck`, `pnpm lint` | clean                                                                                                                     |
| Production run | `docker compose up --build`   | builds and runs                                                                                                           |

Browser tests (Playwright, run against the production build; the scripts are not in the repo):

| Suite                                           | Steps | Covers                                                                                                                                                                                 |
| ----------------------------------------------- | ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Role journeys                                   | 24    | enroll, pay, schedule, overlap refusal, write, submit, request changes, approve, student read                                                                                          |
| Calendar                                        | 10    | weekly series, clash refusal, slot to add, series cancel, admin filter, hours coverage, phone layout                                                                                   |
| Sidebar and combobox                            | 9     | pinned sidebar, paging while scrolling, server-side search, keyboard, inside a dialog, required                                                                                        |
| Number, date, time fields                       | 18    | stepping, typing, month navigation, min dates, keyboard, Escape in a dialog, submitted values, phone                                                                                   |
| Payment proofs                                  | 17    | wrong type and oversize refused, preview, upload, replace (old file deleted), access per role, approve with and without proof, approved-by                                             |
| Lists at scale (4,800 invoices, `pnpm db:bulk`) | 23    | pages, page past the end, search while typing, filters, tabs keep the search, odd characters, disabled Cancel with reason, counts match the database. A search renders in about 100 ms |

## Out of scope

| Item                                                        | Why                                    |
| ----------------------------------------------------------- | -------------------------------------- |
| Email or WhatsApp notifications, payment gateway            | Not in the brief; payment is simulated |
| Parent accounts                                             | Not in the brief                       |
| Ideas in [DECISIONS.md](DECISIONS.md#next-with-another-day) | Kept for a later pass                  |

## Definition of done

| Check                                          | How                                                          |
| ---------------------------------------------- | ------------------------------------------------------------ |
| A fresh clone runs with one command            | `docker compose up --build`, then sign in with a seeded user |
| The schema and seed build from scratch         | `pnpm db:reset`                                              |
| Every rule in the brief is enforced and tested | `pnpm db:test` passes                                        |
| Code is clean                                  | `pnpm typecheck`, `pnpm lint`, `pnpm test` pass              |
