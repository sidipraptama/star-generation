# 0004. Time and money representation

Status: accepted

## Context

Lessons are scheduled in WIB (UTC+7, no daylight saving). Money is Indonesian rupiah, which has no minor unit in practice. A 50 minute lesson at Rp100,000 per hour is Rp83,333.33, so rounding must be explicit.

## Decision

- All instants are `timestamptz`. The UI sends and shows WIB (`+07:00` / `Asia/Jakarta`); the database never stores local time.
- "Month" of a lesson is the calendar month of its start time in `Asia/Jakarta`, computed by `private.wib_month()`.
- Money is a whole number of rupiah (`integer`). Rates, invoice amounts and earnings are never floats.
- Earning for a lesson is `round(rate × minutes / 60)` computed once, in SQL, in `private.lesson_earning()`. The admin preview calls the same function as the approval.
- Rates are snapshotted when they are used: on the invoice at enrollment, and on the lesson at scheduling.

## Consequences

- Changing a class rate never rewrites history.
- A lesson that crosses midnight on the last day of a month belongs to the month it started in.
- Rounding differences are at most Rp0.50 per lesson and are documented in `DECISIONS.md`.
