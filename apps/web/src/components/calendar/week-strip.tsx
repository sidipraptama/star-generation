import Link from "next/link";
import clsx from "clsx";
import { ArrowRight } from "lucide-react";
import { AgendaView } from "@/components/calendar/agenda-view";
import { ChipLink } from "@/components/calendar/chip";
import { Legend } from "@/components/calendar/legend";
import type { CalendarChip, LegendItem } from "@/components/calendar/types";
import { Card } from "@/components/ui/card";
import { dayOfMonth, visibleDays, weekdayLabel } from "@/lib/calendar";
import { wibDateOf } from "@/lib/time";

type WeekStripProps = {
  today: string;
  chips: CalendarChip[];
  legend: LegendItem[];
  scheduleHref: string;
  chipHref: (id: string) => string;
};

/** Compact "this week" overview for dashboards: no hour grid, just who teaches what on which day. */
export function WeekStrip({ today, chips, legend, scheduleHref, chipHref }: WeekStripProps) {
  const days = visibleDays("week", today);
  const byDay = new Map<string, CalendarChip[]>();
  for (const chip of [...chips].sort((a, b) => a.startAt.localeCompare(b.startAt))) {
    const day = wibDateOf(chip.startAt);
    byDay.set(day, [...(byDay.get(day) ?? []), chip]);
  }

  return (
    <Card
      title="This week"
      action={
        <Link
          href={scheduleHref}
          className="text-navy hover:bg-navy/5 rounded-card inline-flex items-center gap-1 px-2 py-1 text-sm font-semibold"
        >
          Open full schedule
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      }
    >
      <div className="space-y-4">
        <div className="hidden grid-cols-7 gap-2 md:grid">
          {days.map((day) => (
            <div
              key={day}
              className={clsx(
                "rounded-card min-h-24 space-y-1.5 border p-2",
                day === today ? "border-gold bg-gold/15" : "border-cloud",
              )}
            >
              <p className="text-muted text-xs font-semibold uppercase">
                {weekdayLabel(day)} <span className="text-navy text-sm">{dayOfMonth(day)}</span>
              </p>
              {(byDay.get(day) ?? []).map((chip) => (
                <ChipLink key={chip.id} chip={chip} href={chipHref(chip.id)} dense />
              ))}
            </div>
          ))}
        </div>
        <AgendaView className="md:hidden" today={today} chips={chips} chipHref={chipHref} />
        <Legend items={legend} />
      </div>
    </Card>
  );
}
