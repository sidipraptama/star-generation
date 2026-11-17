# Architecture

Next.js renders the three role areas and calls PostgreSQL (Supabase) as the signed-in user. Business rules live in the database, so they hold even for direct API calls ([ADR 0001](docs/adr/0001-business-rules-in-postgres.md)).

```
Browser → Server Component / Server Action (zod) → Supabase API as the user → SQL function / RLS-filtered select → tables
```

## Data model

```mermaid
erDiagram
  profiles ||--o{ classes : "teaches"
  classes ||--|| class_student_rates : has
  classes ||--|| class_tutor_rates : has
  classes ||--o{ enrollments : has
  profiles ||--o{ enrollments : "student"
  enrollments ||--o{ invoices : bills
  classes ||--o{ lessons : schedules
  lessons ||--|| lesson_rates : "tutor rate snapshot"
  classes ||--o{ logbooks : "one per month"
  logbooks ||--o{ logbook_entries : contains
  lessons ||--o| logbook_entries : "one entry"
  logbooks ||--o{ earnings : approves
  lessons ||--o| earnings : "paid once"
```

Derived, not stored: `hour_ledger` and `enrollment_balances` (purchases minus delivered lessons, [ADR 0003](docs/adr/0003-derived-hour-ledger.md)). `class_catalog` is the student storefront.

## Where each rule is enforced

| Rule | Enforced by |
| --- | --- |
| No duplicate enrollment | partial unique index on `(class_id, student_id)` and a check in `enroll()` |
| Capacity | `enroll()` locks the class row before counting seats; `update_class()` refuses a lower capacity |
| End after start, max 8h, whole minutes | `check` constraints on `lessons` |
| Tutor lessons cannot overlap | exclusion constraint on `(tutor_id, time range)` for scheduled lessons |
| One logbook per class per month, one entry per lesson | `unique (class_id, month)` and `unique (lesson_id)` |
| Entry only for an ended, non-cancelled lesson of that month | trigger `guard_logbook_entry` |
| Approved logbook is read-only | same trigger plus status guards in the functions |
| Only admins approve; approving twice adds nothing | role check and `for update` status guard in `approve_logbook()`, `unique (lesson_id)` on `earnings` |
| Students only see paid classes; logbooks hidden until approved | RLS policies using `private` helper functions |
| Tutors never see student rates; only admin and the tutor see earnings | rates and earnings in separate tables with their own policies, [ADR 0002](docs/adr/0002-visibility-with-rls.md) |
| Only the write paths above exist | `insert/update/delete` revoked from `anon` and `authenticated` |

pgTAP tests in `supabase/tests/database` impersonate each seeded user to prove these rules.

## Application structure

- `app/admin`, `app/tutor`, `app/student`: one route group per role. Each layout calls `requireRole()`; pages read data with the user's session.
- Server Actions are one-liners over `rpcAction()` (`lib/action.ts`): validate with zod, call one database function, translate database errors into plain messages.
- `proxy.ts` only refreshes the session cookie and redirects visitors who are not signed in.

## Design system

- Tokens live in `app/globals.css` under `@theme`: navy `#2F3F5F`, gold `#F1C019`, surface `#FAFDFF`, cloud `#E0E2E7`, muted `#6E7585`, success `#0AB848`, danger `#FF2819`, 6px card radius, DM Sans. Darker `-ink` variants of success, danger and gold are used for small text to keep contrast readable.
- `components/ui` is a small hand-written kit: `Button`, `Card`, `Table`, `Badge` / `StatusBadge` (one place maps every status to a label, tone and icon), `Field` controls, `Alert`, `EmptyState`, `Stat`, `HoursMeter`.
- Mutations use two patterns: `ActionForm` (inline, shows errors) and `DialogForm` (a confirmation or short form in a native `<dialog>`).
- `components/layout`: sidebar on desktop, bottom tabs on mobile, one `AppShell` shared by all roles.
- Copy is plain English, every action has an icon and a visible label, and money and hours are always formatted through `lib/format.ts` (rupiah, `1h 30m`, WIB).
