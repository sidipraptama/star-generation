"use client";

import { useState } from "react";
import clsx from "clsx";
import { Combobox } from "@/components/ui/combobox";
import { DatePicker } from "@/components/ui/date-picker";
import { Field } from "@/components/ui/field";
import { TimePicker } from "@/components/ui/time-picker";
import { addDays, countOccurrences, isValidDate, isoWeekday } from "@/lib/calendar";

const WEEKDAYS = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 7, label: "Sun" },
];

const MAX_LESSONS = 60;
const MAX_DAYS = 183;

const shortDate = new Intl.DateTimeFormat("en-GB", {
  timeZone: "UTC",
  day: "numeric",
  month: "short",
});

const formatDay = (date: string) => shortDate.format(new Date(`${date}T00:00:00Z`));

function joinNames(names: string[]) {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

type RecurringFieldsProps = {
  classes: { id: string; name: string }[];
  defaultDate: string;
  minDate: string;
};

export function RecurringFields({ classes, defaultDate, minDate }: RecurringFieldsProps) {
  const [firstDate, setFirstDate] = useState(defaultDate);
  const [untilDate, setUntilDate] = useState(addDays(defaultDate, 27));
  const [weekdays, setWeekdays] = useState<number[]>([isoWeekday(defaultDate)]);

  const toggle = (value: number) =>
    setWeekdays((current) =>
      current.includes(value)
        ? current.filter((day) => day !== value)
        : [...current, value].sort((a, b) => a - b),
    );

  const datesValid = isValidDate(firstDate) && isValidDate(untilDate) && untilDate >= firstDate;
  const count = datesValid ? countOccurrences(firstDate, untilDate, weekdays) : 0;
  const tooLong = datesValid && untilDate > addDays(firstDate, MAX_DAYS);
  const tooMany = count > MAX_LESSONS;
  const dayNames = weekdays.map((day) => WEEKDAYS[day - 1].label);

  let summary: string;
  if (weekdays.length === 0) summary = "Choose at least one day of the week.";
  else if (!datesValid) summary = "The last date must not be before the first date.";
  else if (count === 0) summary = "No lessons fall on the chosen days between those dates.";
  else {
    summary = `Every ${joinNames(dayNames)} from ${formatDay(firstDate)} to ${formatDay(untilDate)}: ${count} ${count === 1 ? "lesson" : "lessons"}`;
  }

  return (
    <>
      {classes.length === 1 ? (
        <input type="hidden" name="classId" value={classes[0].id} />
      ) : (
        <Field label="Class" htmlFor="classId">
          <Combobox
            name="classId"
            options={classes.map((item) => ({ value: item.id, label: item.name }))}
            defaultValue={classes[0]?.id}
            searchPlaceholder="Search classes…"
            required
          />
        </Field>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Field label="First lesson on" htmlFor="firstDate">
          <DatePicker
            name="firstDate"
            min={minDate}
            required
            defaultValue={defaultDate}
            onValueChange={setFirstDate}
          />
        </Field>
        <Field label="Repeat until" htmlFor="untilDate">
          <DatePicker
            name="untilDate"
            min={firstDate}
            required
            defaultValue={untilDate}
            onValueChange={setUntilDate}
          />
        </Field>
      </div>

      <fieldset>
        <legend className="mb-1.5 text-sm font-semibold">Repeat on</legend>
        <div className="grid grid-cols-7 gap-1.5">
          {WEEKDAYS.map(({ value, label }) => {
            const selected = weekdays.includes(value);
            return (
              <button
                key={value}
                type="button"
                aria-pressed={selected}
                onClick={() => toggle(value)}
                className={clsx(
                  "rounded-card border py-2 text-sm font-semibold transition-colors",
                  selected
                    ? "border-navy bg-navy text-white"
                    : "border-cloud hover:bg-navy/5 bg-white",
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
        <input type="hidden" name="weekdays" value={weekdays.join(",")} />
      </fieldset>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Starts at" htmlFor="startTime">
          <TimePicker name="startTime" required defaultValue="16:00" />
        </Field>
        <Field label="Ends at" htmlFor="endTime">
          <TimePicker name="endTime" required defaultValue="17:30" />
        </Field>
      </div>

      <div className="rounded-card bg-gold/20 p-4" aria-live="polite">
        <p className="font-semibold">{summary}</p>
        {(tooLong || tooMany) && (
          <p className="text-danger-ink mt-1 text-sm">
            A series can have at most {MAX_LESSONS} lessons and cover at most 6 months.
          </p>
        )}
      </div>

      <p className="text-muted text-xs">
        All times are in WIB (Jakarta time). All lessons are checked together: if one of them
        overlaps with another lesson of yours or breaks a rule, none are created and you will see
        which date caused the problem.
      </p>
    </>
  );
}
