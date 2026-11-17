# Decisions

Each open decision from the brief: what I chose, how the system enforces it, and what I gave up. Technical choices are in the [ADRs](adr).

## 1. Invoice amount and how hours are counted

**Choice.** A student picks a package of whole hours (1 to 200) when enrolling. The invoice is `hours × the class student rate at that moment`, and the rate is copied onto the invoice. Hours are counted with a ledger: `+hours × 60` minutes for each paid invoice and `-duration` for each delivered lesson. A lesson is delivered when it has ended, was not cancelled, and started after the enrollment was activated. Every active student in the class is charged the lesson's length.

**Enforced by.** `invoices.amount` is a generated column; `enroll()` and `request_topup()` copy the rate; `private.hour_ledger_lines()` is the only definition of the balance ([ADR 0003](adr/0003-derived-hour-ledger.md)).

**Trade-off.** Students are charged when a lesson ends, not when the logbook is approved, because the service has been delivered. The tutor is paid after the admin review. There is no attendance tracking, so a student who skips a lesson still uses the hours. A balance can go negative if someone keeps attending at zero hours; it shows as zero left and the next package pays it off.

## 2. Changing a class's rate, capacity or tutor

**Choice.** Students who have paid are never affected retroactively.

- Rate: only invoices and lessons created afterwards use the new rate. Paid invoices and already scheduled lessons keep their snapshot.
- Capacity: cannot go below the seats already taken (enrolled or waiting for payment).
- Tutor: the new tutor takes over upcoming lessons only. Past lessons, their logbook entries and their earnings stay with the tutor who taught them. If the new tutor already has a lesson at the same time, the change is refused with a clear message.

**Enforced by.** `update_class()` (row lock, seat count, reassignment) plus the overlap exclusion constraint.

**Trade-off.** If the tutor changes mid-month, the month's logbook is written by whoever is the class tutor when they write it, while each lesson's earnings go to the tutor who taught it.

## 3. Running out of hours, cancelled lessons

**Choice.**

- A student with no hours left keeps access to past lessons and approved logbooks, but upcoming lessons are hidden until a new package is paid. They can request a top-up invoice at any time.
- A cancelled lesson uses no hours, earns nothing, cannot get a logbook entry and no longer blocks the tutor's calendar. A tutor can cancel until the lesson ends; an admin can also cancel a lesson that did not take place, as long as no entry was written for it.
- A lesson cannot be scheduled into a month whose logbook is already submitted or approved.

**Enforced by.** RLS policy on `lessons` (`student_has_hours`), `cancel_lesson()`, `schedule_lesson()`, and `lessons_tutor_no_overlap` which ignores cancelled lessons.

## 4. A problem in a submitted logbook

**Choice.** The admin sends the logbook back with a required note ("Request changes"). The status becomes `changes_requested`, the tutor sees the note, edits the entries and submits again. There is no partial approval. Once approved, a logbook is final and read-only; corrections after approval are out of scope and would be a new, audited adjustment.

**Enforced by.** Status transitions in `submit_logbook()`, `request_logbook_changes()` and `approve_logbook()`; trigger `guard_logbook_entry` blocks edits in any locked status.

## 5. How an invoice becomes Paid

**Choice.** Payment is simulated, mirroring how admins confirm bank transfers today. Only an admin can mark an invoice as paid, optionally with a payment reference; the system records who and when. The first payment activates the enrollment and opens the class. Students can cancel their own unpaid invoice. Undoing a payment is an admin-only "cancel" with a mandatory reason, and it is refused once any of the invoice's hours have been used. Cancelling the only paid invoice also cancels the enrollment and frees the seat.

**Enforced by.** `mark_invoice_paid()` and `void_invoice()`, which check the role, lock the invoice and reuse the ledger to test "hours already used".

## Improvements

Chosen improvements will be written here once agreed.

## What I would build next with another day

- Attendance per student, so hours are only deducted for students who attended.
- Expire unpaid invoices after a deadline so a seat is not blocked forever.
- Post-approval corrections as an audited adjustment instead of editing an approved logbook.
- Payout statements per tutor per month, exportable to CSV.
- Browser end-to-end tests for the three role journeys on top of the pgTAP suite.
