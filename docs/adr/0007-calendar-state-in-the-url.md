# 0007. Calendar state lives in the URL

Status: accepted

## Context

The schedule needs navigation (previous, next, today), a week and a month view, filters, a lesson detail dialog and add or repeat dialogs. Keeping that in client state would mean a client-side calendar library and duplicated data fetching, and no way to link to a view.

## Decision

- The page is a Server Component. `view`, `date`, filters and the open dialog (`lesson`, `add`, `repeat`) are search parameters; every control is a plain link or a GET form.
- `lib/calendar.ts` holds the date maths (Monday-first weeks, six-week month grids, lane layout for overlapping lessons) as pure, unit-tested functions on `YYYY-MM-DD` strings. WIB has no daylight saving, so a day is always 24 hours and week arithmetic is exact.
- Dialogs are `RouteDialog` / `RouteDialogForm`: a native `<dialog>` that opens on mount and navigates back to the URL without the parameter when it closes. A chip or an empty slot is just a link to the dialog.
- Phones get an agenda list instead of the grids, because a seven-column grid is unreadable at 390px.
- Chip colours come from two small pure functions in `lib/schedule.ts`, one for staff (entry written or needed) and one for students (covered by remaining hours), so every page agrees.

## Consequences

- No calendar dependency and almost no client JavaScript.
- Every state is reloadable and shareable; the browser back button closes a dialog.
- Each navigation is a server round trip. Lessons are queried only for the visible range, so it stays fast for a single class and tutor load.
