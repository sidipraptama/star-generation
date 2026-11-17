# 0009. Date, time and number fields on the same panel

Status: accepted

## Context

Native date, time and number inputs look different in every browser and operating system, cannot take the design system, and show a 12-hour clock or a different date order depending on the visitor's locale. This product is used by tutors, parents and admins who are not technical, and all times are WIB. Rates also need an `Rp` prefix, thousands separators and steps that make sense for money.

## Decision

`components/ui/picker.tsx` holds what every dropdown-style field shares: `usePopover` (open state, placement above or below the trigger, closing on an outside click or when focus leaves, repositioning on scroll and resize) and `Picker` (the trigger button, a real form input for the value so `required` and server actions work unchanged, and the top-layer popover panel). `Combobox`, `DatePicker` and `TimePicker` are built on it, so they look and behave the same: Escape closes only the panel, and the panel works inside a modal dialog.

- **`DatePicker`** shows a month grid that starts on Monday like the schedule calendar. It supports `min` and `max` (days outside are dimmed and cannot be chosen, and the month arrows stop), highlights today, and has a Today button. Keyboard: arrows move by a day or a week, PageUp and PageDown by a month, Home and End to the start and end of the week, Enter picks. Dates are plain `YYYY-MM-DD` strings, so no time zone can shift them, and "today" is the WIB date.
- **`TimePicker`** shows a list in 15-minute steps that opens scrolled to the chosen time (08:00 when empty). The box on top filters the list as you type and also accepts any time, such as `1630`, `9.30` or `16:07`. The value is a 24-hour `HH:mm` string.
- **`NumberInput`** has an optional prefix and unit, thousands separators while typing, and minus and plus buttons (and arrow keys) that move by a step: Rp10.000 for rates, one for seats and hours. It submits the plain integer.
- Form field names and formats do not change, so the server actions, zod schemas and database rules are untouched.

## Consequences

- One look for every field, and the same date and time format whatever the browser language is.
- More UI code to maintain instead of the browser's. The pure parts (month maths, time parsing, stepping) are unit tested and the behaviour is covered by browser tests.
- No year dropdown or range selection: the month arrows are enough for lessons scheduled a few months ahead.
- The Popover API needs a browser from 2024 or later, as for the combobox.
