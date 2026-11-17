import Link from "next/link";
import clsx from "clsx";
import { Plus } from "lucide-react";
import { ChipLink } from "@/components/calendar/chip";
import type { CalendarChip } from "@/components/calendar/types";
import { dayOfMonth, longDayLabel, visibleDays, weekdayLabel } from "@/lib/calendar";
import { wibDateOf } from "@/lib/time";

const MAX_CHIPS = 3;

type MonthViewProps = {
  date: string;
  today: string;
  chips: CalendarChip[];
  chipHref: (id: string) => string;
  weekHref: (day: string) => string;
  addHref?: (day: string) => string;
};

export function MonthView({ date, today, chips, chipHref, weekHref, addHref }: MonthViewProps) {
  const days = visibleDays("month", date);
  const month = date.slice(0, 7);

  const byDay = new Map<string, CalendarChip[]>();
  for (const chip of [...chips].sort((a, b) => a.startAt.localeCompare(b.startAt))) {
    const day = wibDateOf(chip.startAt);
    byDay.set(day, [...(byDay.get(day) ?? []), chip]);
  }

  return (
    <div className="border-cloud rounded-card overflow-hidden border bg-white">
      <div className="border-cloud grid grid-cols-7 border-b">
        {days.slice(0, 7).map((day) => (
          <p
            key={day}
            className="text-muted bg-cloud/30 px-2 py-2 text-center text-xs font-semibold uppercase"
          >
            {weekdayLabel(day)}
          </p>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const dayChips = byDay.get(day) ?? [];
          const inMonth = day.startsWith(month);

          return (
            <div
              key={day}
              className={clsx(
                "border-cloud group relative min-h-28 space-y-1 border-r border-b p-1.5 [&:nth-child(7n)]:border-r-0",
                !inMonth && "bg-cloud/20",
              )}
            >
              <div className="flex items-center justify-between">
                <span
                  className={clsx(
                    "grid size-6 place-items-center rounded-full text-xs font-semibold",
                    day === today ? "bg-gold" : inMonth ? "" : "text-muted",
                  )}
                >
                  {dayOfMonth(day)}
                </span>
                {addHref && day >= today && (
                  <Link
                    href={addHref(day)}
                    scroll={false}
                    prefetch={false}
                    aria-label={`Add a lesson on ${longDayLabel(day)}`}
                    className="text-muted hover:bg-gold/30 hover:text-navy rounded-full p-1 opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                  >
                    <Plus className="size-3.5" aria-hidden />
                  </Link>
                )}
              </div>
              {dayChips.slice(0, MAX_CHIPS).map((chip) => (
                <ChipLink key={chip.id} chip={chip} href={chipHref(chip.id)} dense />
              ))}
              {dayChips.length > MAX_CHIPS && (
                <Link
                  href={weekHref(day)}
                  className="text-muted hover:text-navy block px-1 text-xs font-semibold"
                >
                  +{dayChips.length - MAX_CHIPS} more
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
