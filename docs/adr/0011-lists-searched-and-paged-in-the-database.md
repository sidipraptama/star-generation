# 0011. Lists are searched, filtered and paged in the database

Status: accepted

## Context

Every screen used to load all of its rows and filter them in the page, and the overview pages counted by loading whole tables. That is fine for the seed data and falls over with thousands of invoices or hundreds of classes: slow pages, huge payloads, and no way to find one student or one invoice.

## Decision

Search, filters and paging are done by Postgres, and the URL is the state, like the calendar ([ADR 0007](0007-calendar-state-in-the-url.md)): `?q=alya&status=paid&class=...&page=3`. Every state is a link that can be shared or reloaded.

- **Flat views per list.** `class_list`, `invoice_list`, `logbook_list`, `student_enrollment_list`, `logbook_progress`, `earning_months` and the extended `class_catalog` join what a list needs (student, class, tutor, approver, counts, next lesson). That makes a search across several tables one `or(...)` filter instead of impossible joins, and the app never sums or counts rows itself. They are `security_invoker`, so row level security still decides what each role sees; the tests check what a tutor, a student and a visitor get from each.
- **Computed once, in SQL.** Whether a paid invoice can still be cancelled (`can_cancel`, the same rule as `void_invoice()`), a class's seats left and next lesson, and a tutor's logbook progress per month come from the views. The invoice list uses `can_cancel` to disable the button and say why instead of failing after the click.
- **Overview numbers from stats views** (`admin_stats`, `tutor_stats`) instead of loading all enrollments, lessons and earnings.
- **Indexes for the searches.** Trigram indexes on names and emails make `ilike '%text%'` fast, plus indexes on the foreign keys and the default orderings.
- **One list kit** in `components/list`: a search box that searches while you type and on Enter, a toolbar of filters built on the combobox, and pagination (previous, next, page numbers with gaps, "Showing 21–40 of 132"). The toolbar is a `next/form`, so searching is a soft navigation. Pages are 20 rows, or 12 cards.
- **Safe search text.** `orIlike()` quotes the text for PostgREST and escapes `%`, `_` and `\`, so commas, brackets and quotes cannot break the filter or act as wildcards.
- **Pages past the end** go back into range instead of showing an empty list.
- **Detail screens page each list on its own** (`?upcoming=2&past=3`), so a class with years of lessons stays small.

## Consequences

- Lists stay fast as data grows: about 100 to 250 ms to search 4,800 invoices, measured with `pnpm db:bulk`.
- The views are part of the schema to maintain. They are read only and have their own tests.
- Counting uses `count(*)` for the "of N" total, which is exact and cheap at this size; very large tables would want an estimate.
- Left out on purpose: sorting by any column (each list has one sensible order), a page-size picker, and search on a student's own invoices (status tabs and pages are enough for a person's few invoices). A student's own classes are not paged either: they only ever hold a handful.
