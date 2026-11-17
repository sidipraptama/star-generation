# Decisions

The open decisions from the brief: what I chose, why, how the system enforces it, and what it costs. Technical choices live in the [ADRs](adr).

## At a glance

| #   | Question                                          | Decision                                                                                                                  |
| --- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| 1   | How is an invoice amount set and hours kept       | Packages of whole hours at the rate of that day; hours are a derived ledger in minutes                                    |
| 2   | What if a class's rate, capacity or tutor changes | Never retroactive: rates are snapshots, capacity cannot drop below seats taken, tutor change covers upcoming lessons only |
| 3   | What if hours run out, or a lesson is cancelled   | Upcoming lessons hide until a new package is paid; cancelled lessons cost and earn nothing                                |
| 4   | What if a submitted logbook has a problem         | Admin sends it back with a note; no partial approval; approved is final                                                   |
| 5   | How does an invoice become Paid                   | An admin confirms it (optional proof from the student); the system records who approved                                   |

## 1. Invoice amount and how hours are counted

| Aspect      | Detail                                                                                                                                                                                                                                                               |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Choice      | A student buys a package of whole hours (1 to 200). Invoice = `hours × class student rate at that moment`, and the rate is copied onto the invoice.                                                                                                                  |
| Hours       | Ledger in minutes: `+hours × 60` for each paid invoice, `−duration` for each delivered lesson. A lesson is delivered once it has ended, was not cancelled, and started after the enrollment was activated. Every active student is charged its length.               |
| Why         | A prepaid balance is easy to explain and to check. Copying the rate keeps old invoices stable when prices change. Deriving the balance means it cannot drift from the lessons and invoices.                                                                          |
| Enforced by | `invoices.amount` is a generated column; `enroll()` and `request_topup()` copy the rate; `private.hour_ledger_lines()` is the only definition of the balance ([ADR 0003](adr/0003-derived-hour-ledger.md)).                                                          |
| Trade-off   | Charged when a lesson ends, not when the logbook is approved (the service is already delivered); the tutor is paid after review. No attendance, so a skipped lesson still uses hours. A balance can go below zero: it shows 0 left and the next package pays it off. |

## 2. Changing a class's rate, capacity or tutor

Rule: students who have paid are never affected retroactively.

| Change   | Effect                                                                                                                                                    | Why                                        |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| Rate     | Only invoices and lessons created afterwards use it. Paid invoices and scheduled lessons keep their snapshot.                                             | Nobody is charged differently after paying |
| Capacity | Cannot go below the seats taken (enrolled or waiting for payment).                                                                                        | Never over-book a class                    |
| Tutor    | The new tutor takes over upcoming lessons only. Past lessons, their entries and earnings stay with who taught them. Refused if the new tutor has a clash. | History stays true; pay follows who taught |

| Aspect      | Detail                                                                                                                                              |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Enforced by | `update_class()` (row lock, seat count, reassignment) and the overlap exclusion constraint                                                          |
| Trade-off   | If the tutor changes mid-month, the logbook is written by whoever teaches the class when they write it; earnings still go to who taught each lesson |

## 3. Running out of hours, cancelled lessons

| Situation                      | Behaviour                                                                                                                                      |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Student has no hours left      | Keeps past lessons and approved logbooks. Upcoming lessons are hidden until a new package is paid. A top-up invoice can be requested any time. |
| A lesson is cancelled          | Uses no hours, earns nothing, cannot get a logbook entry, stops blocking the tutor's calendar                                                  |
| Who can cancel                 | The tutor until the lesson ends. An admin also, for a lesson that did not take place and has no entry.                                         |
| Scheduling into a locked month | Refused when that month's logbook is already submitted or approved                                                                             |

| Aspect      | Detail                                                                                                                                        |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Why         | Students should not pay for what did not happen, and a logbook under review must not change                                                   |
| Enforced by | RLS policy on `lessons` (`student_has_hours`), `cancel_lesson()`, `schedule_lesson()`, `lessons_tutor_no_overlap` (ignores cancelled lessons) |

## 4. A problem in a submitted logbook

| Aspect       | Detail                                                                                                                                                                                                |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Choice       | The admin sends it back with a required note ("Request changes"), status `changes_requested`. The tutor sees the note, edits and submits again. No partial approval. Approved is final and read-only. |
| Why          | One loop the tutor understands, and approval means earnings are settled                                                                                                                               |
| Out of scope | Corrections after approval: they would be a new, audited adjustment                                                                                                                                   |
| Enforced by  | Status transitions in `submit_logbook()`, `request_logbook_changes()`, `approve_logbook()`; trigger `guard_logbook_entry` blocks edits in any locked status                                           |

## 5. How an invoice becomes Paid

| Aspect                   | Detail                                                                                                                                                                                                                                                                                 |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Choice                   | Payment is simulated, like admins confirming bank transfers today. Only an admin marks an invoice paid, optionally with a reference. The first payment activates the enrollment and opens the class.                                                                                   |
| Approved by              | The system records who and when. Every paid invoice shows the admin's name to the admin and to the student.                                                                                                                                                                            |
| Proof (optional)         | A student can attach a photo or screenshot of the transfer to an unpaid invoice and replace it until paid. Never required: an admin can approve with or without it. Kept after payment, no longer editable ([ADR 0010](adr/0010-payment-proofs-in-private-storage.md)).                |
| Student cancels          | A student can cancel their own unpaid invoice                                                                                                                                                                                                                                          |
| Admin cancels a paid one | Admin only, with a mandatory reason, and only while none of its hours were used. The button is disabled up front, with the reason (for example "3h left of 12h"), instead of failing after the click. Cancelling the only paid invoice also cancels the enrollment and frees the seat. |
| Why                      | Matches how the business works today and keeps a clear audit trail                                                                                                                                                                                                                     |
| Enforced by              | `mark_invoice_paid()` and `void_invoice()` (role check, row lock, ledger test for used hours); `attach_payment_proof()` and the storage policies; `invoice_list.can_cancel` for the early answer                                                                                       |

## Improvement: a schedule you can act on

Calendar, weekly recurring lessons and an hours forecast, for all three roles.

| Pain today                                                       | What fixes it                                                                                        |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Admins cannot tell if a finished lesson has its logbook entry    | "Entry needed" flag on the calendar; filter by tutor and class                                       |
| Tutors enter every lesson by hand for classes that repeat weekly | **Repeat weekly**: pick weekdays, a time and a last date; the form shows how many lessons it creates |
| Students and admins learn "hours left" only after hours are gone | Upcoming lessons the remaining hours do not cover are flagged, with a link to add hours              |

| Role    | Gets                                                                                                                                             |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| All     | Week view (hour grid) and month view in WIB, a "This week" strip on each overview, a day list on phones, text labels with every colour, a legend |
| Admin   | Entry-needed flags; filters by tutor and class                                                                                                   |
| Tutor   | Click an empty slot to add a lesson; repeat weekly; cancel "this and all following" of a series                                                  |
| Student | "Not covered by your hours" flags; a class with zero hours explains why its upcoming lessons are hidden                                          |

| Alternative                            | Why not                                                                                                                |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Read-only calendar                     | Would only repaint the old list; the brief rules out cosmetic changes, so this one carries status and actions          |
| Profitability board, payout statements | They report on data that already exists; the schedule is where mistakes are made, so I fixed it at the source          |
| Calendar library                       | Heavy, hard to theme, and blind to our rules. Ours is under 800 lines with tested date helpers, rendered on the server |

| Rule                                                      | Why                                                                                                      |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| A series is all or nothing                                | A partial series with silently missing lessons is worse than fixing one date. The message names the date |
| At most 60 lessons and 6 months                           | Keeps one mistake small                                                                                  |
| "Cancel this and following" skips past and logged lessons | Never rewrites history                                                                                   |
| Single and recurring lessons share `private.add_lesson()` | They cannot drift apart                                                                                  |
| Forecast uses the same ledger as the balance              | The first lesson that does not fit, and every one after it, is flagged                                   |
| Calendar state lives in the URL                           | Every view and dialog is a link that can be shared or reloaded                                           |

Left out on purpose: dragging to reschedule (needs a full edit-lesson rule set), editing a series in place (cancel and recreate), recurrence beyond weekly weekdays, holiday exceptions, reminders and export, student conflicts across classes, live updates.

## Also built

| Feature                                      | Where                                                            |
| -------------------------------------------- | ---------------------------------------------------------------- |
| Searchable, paged dropdown                   | [ADR 0008](adr/0008-combobox-with-paged-options.md)              |
| Date, time and number fields                 | [ADR 0009](adr/0009-date-time-and-number-fields.md)              |
| Optional payment proof and approved-by name  | [ADR 0010](adr/0010-payment-proofs-in-private-storage.md)        |
| Search, filters and pagination on every list | [ADR 0011](adr/0011-lists-searched-and-paged-in-the-database.md) |

## Known limitations

| Limitation                                           | Why                                                            | Next step                                              |
| ---------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------ |
| Payment is simulated                                 | No gateway in scope; an admin confirms transfers like today    | A gateway or bank webhook behind `mark_invoice_paid()` |
| No attendance                                        | Every active student uses the lesson's hours                   | Attendance per student                                 |
| Browser tests are not in the repo                    | They ran from outside against the real stack                   | Commit them as `pnpm e2e`                              |
| The admin month view loads every lesson of the month | The calendar is range based; tutor and class filters narrow it | Cap or summarise per day                               |
| Search is plain substring, no typo tolerance         | `ilike` with trigram indexes is enough at this size            | Full-text search if it is needed                       |
| Proof thumbnails use the original image              | Images are capped at 5 MB                                      | Resize when uploading                                  |
| A student's own classes are not paged                | A student only has a handful                                   | Page them if that changes                              |

## Next, with another day

| Idea                                        | Why                                                                  |
| ------------------------------------------- | -------------------------------------------------------------------- |
| Attendance per student                      | Deduct hours only for students who attended                          |
| Expire unpaid invoices after a deadline     | A seat is never blocked forever                                      |
| Audited corrections after approval          | Fix an approved logbook without editing history                      |
| Payout statements per tutor and month (CSV) | Pay tutors from one document                                         |
| Class profitability board                   | See which classes earn, from data we already hold                    |
| Drag to reschedule                          | With the rule set it needs: logbook month, overlap, telling students |
| Committed browser tests                     | Keep the Playwright journeys in the repo on top of pgTAP             |
