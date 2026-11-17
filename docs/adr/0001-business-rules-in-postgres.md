# 0001. Business rules live in PostgreSQL

Status: accepted

## Context

The brief requires rules to hold "including through the API". Supabase exposes every table over PostgREST, so any rule that only exists in the Next.js code can be bypassed with a direct request and a valid token.

## Decision

- Structural invariants are table constraints: foreign keys, `check`, `unique`, and an exclusion constraint for tutor schedule overlap.
- State changes (enroll, mark paid, schedule, submit, approve, ...) are `security definer` functions in `public`. Each one checks the caller's role, locks the rows it changes, validates the transition and writes in one transaction.
- Clients get `select` only on tables. `insert`, `update` and `delete` are revoked from `anon` and `authenticated`, so the functions are the only write path.
- The Next.js app calls these functions with the signed-in user's session. It never holds the service-role key.

## Consequences

- One place to read and test each rule, and the UI cannot weaken it.
- Functions return user-readable messages through `raise exception`; the app shows them as form errors.
- Slightly more SQL than a CRUD-over-tables approach, but far fewer places to get authorization wrong.
