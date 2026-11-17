# 0003. Hour balance is derived from a ledger

Status: accepted

## Context

Admins cannot see how many hours each student has left. A stored `hours_left` counter drifts as soon as a lesson is cancelled, an invoice is voided, or a job fails to run. There is no scheduler in the local stack to deduct hours when lessons end.

## Decision

- A student's hour ledger is a function, `private.hour_ledger_lines(enrollment_id)`, returning:
  - `+ hours × 60` minutes for every paid invoice;
  - `- duration` minutes for every non-cancelled lesson of the class that has already ended and started after the enrollment was activated.
- The balance is the sum of those lines. Nothing is stored, so it cannot be wrong, and it needs no cron job.
- `hour_ledger` and `enrollment_balances` are `security_invoker` views over that function, so RLS decides who sees which enrollment.
- Voiding a paid invoice is refused when it would push the balance below zero.

## Consequences

- Usage follows the lesson schedule, not logbook approval: a student is charged when the lesson is delivered, a tutor is paid after review.
- A balance can go negative if a student keeps attending at zero hours. It is shown as zero hours left and the next invoice pays off the difference.
- Ledger lines are readable by the student, which doubles as an audit trail.
