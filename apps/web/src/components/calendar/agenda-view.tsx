import { CalendarOff } from "lucide-react";
import clsx from "clsx";
import { ChipLink } from "@/components/calendar/chip";
import type { CalendarChip } from "@/components/calendar/types";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { longDayLabel } from "@/lib/calendar";
import { wibDateOf } from "@/lib/time";

type AgendaViewProps = {
  today: string;
  chips: CalendarChip[];
  chipHref: (id: string) => string;
  className?: string;
};

/** Day-by-day list; the calendar grids are too cramped for a phone, so small screens use this. */
export function AgendaView({ today, chips, chipHref, className }: AgendaViewProps) {
  const byDay = new Map<string, CalendarChip[]>();
  for (const chip of [...chips].sort((a, b) => a.startAt.localeCompare(b.startAt))) {
    const day = wibDateOf(chip.startAt);
    byDay.set(day, [...(byDay.get(day) ?? []), chip]);
  }

  if (byDay.size === 0) {
    return (
      <div className={clsx("border-cloud rounded-card border bg-white", className)}>
        <EmptyState icon={CalendarOff} title="No lessons in this period" />
      </div>
    );
  }

  return (
    <div className={clsx("space-y-4", className)}>
      {[...byDay.entries()].map(([day, dayChips]) => (
        <section key={day}>
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
            {longDayLabel(day)}
            {day === today && <Badge tone="warning">Today</Badge>}
          </h3>
          <ul className="space-y-2">
            {dayChips.map((chip) => (
              <li key={chip.id}>
                <ChipLink chip={chip} href={chipHref(chip.id)} className="px-3 py-2 text-sm" />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
