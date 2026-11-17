# 0008. A custom combobox with paged options

Status: accepted

## Context

A native `<select>` cannot be searched, and it needs every option up front. Tutors, classes and students are lists that grow, so loading them all on every page render does not scale and a long unsearchable dropdown is hard to use.

## Decision

`components/ui/combobox.tsx` replaces every native select. A trigger button opens a panel with a search box and a listbox, following the ARIA combobox pattern (arrow keys, Enter, Escape, Tab, `aria-activedescendant`).

- **Two sources.** A fixed `options` list is searched in the browser and revealed 30 at a time. A `loadOptions` function is called with the search text and the number of options already loaded and returns one page of 20 plus `hasMore`; searching is done on the server (debounced) and the next page loads when the end of the list scrolls into view (an `IntersectionObserver` sentinel). Stale responses are ignored.
- **Loaders are server actions** (`app/admin/options.ts`). They run as the signed-in user, so row level security still decides what can be listed. They clamp the offset, cap the search length and escape `%` and `_`.
- **The panel is a `popover`.** It is drawn in the top layer, so dialogs and scroll containers never clip it, and because it stays a DOM descendant of the combobox it remains usable inside a modal `<dialog>`.
- **Forms.** The chosen value lives in a real input, so server actions, GET filters and `required` validation work unchanged. `submitOnSelect` submits the surrounding form for filters. A selected value that is not in the first page needs `defaultLabel`.
- Pages only look up the label of the one selected filter value instead of fetching whole lists.

## Consequences

- One look and behaviour for every dropdown, and lists of any size stay cheap.
- Date, time and number inputs remain native on purpose: the browser pickers are better than anything we would build.
- The Popover API needs a browser from 2024 or later.
