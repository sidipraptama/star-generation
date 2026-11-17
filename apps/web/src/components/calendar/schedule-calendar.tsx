import Link from "next/link";
import clsx from "clsx";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AgendaView } from "@/components/calendar/agenda-view";
import { Legend } from "@/components/calendar/legend";
import { MonthView } from "@/components/calendar/month-view";
import type { CalendarChip, LegendItem } from "@/components/calendar/types";
import { WeekView } from "@/components/calendar/week-view";
import { buttonClass } from "@/components/ui/button";
import { buildHref, rangeTitle, shiftDate, type CalendarView } from "@/lib/calendar";

type ScheduleCalendarProps = {
  view: CalendarView;
  date: string;
  today: string;
  basePath: string;
  /** Extra query parameters to keep on every link, such as filters. */
  params?: Record<string, string | undefined>;
  chips: CalendarChip[];
  legend: LegendItem[];
  /** Filter controls shown next to the navigation. */
  filters?: React.ReactNode;
  /** Set to make empty slots clickable (tutors only). */
  canAdd?: boolean;
};

export function ScheduleCalendar({
  view,
  date,
  today,
  basePath,
  params = {},
  chips,
  legend,
  filters,
  canAdd,
}: ScheduleCalendarProps) {
  const hrefFor = (overrides: Record<string, string | undefined>) =>
    buildHref(basePath, { ...params, view, date, ...overrides });

  const chipHref = (id: string) => hrefFor({ lesson: id });
  const weekHref = (day: string) => hrefFor({ view: "week", date: day });
  const addHref = canAdd
    ? (day: string, time?: string) => hrefFor({ add: time ? `${day}T${time}` : day })
    : undefined;

  const toggle = (target: CalendarView, label: string) => (
    <Link
      href={hrefFor({ view: target })}
      aria-current={view === target ? "page" : undefined}
      className={clsx(
        "px-3 py-1.5 text-sm font-semibold",
        view === target ? "bg-navy text-white" : "text-navy hover:bg-navy/5",
      )}
    >
      {label}
    </Link>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link
            href={hrefFor({ date: shiftDate(view, date, -1) })}
            aria-label={view === "week" ? "Previous week" : "Previous month"}
            className={buttonClass("secondary", "sm")}
          >
            <ChevronLeft className="size-4" aria-hidden />
          </Link>
          <Link href={hrefFor({ date: today })} className={buttonClass("secondary", "sm")}>
            Today
          </Link>
          <Link
            href={hrefFor({ date: shiftDate(view, date, 1) })}
            aria-label={view === "week" ? "Next week" : "Next month"}
            className={buttonClass("secondary", "sm")}
          >
            <ChevronRight className="size-4" aria-hidden />
          </Link>
          <h2 className="ml-2 text-lg font-bold">{rangeTitle(view, date)}</h2>
        </div>
        <div className="border-cloud rounded-card flex overflow-hidden border bg-white">
          {toggle("week", "Week")}
          {toggle("month", "Month")}
        </div>
      </div>

      {filters}
      <Legend items={legend} />

      <div className="hidden md:block">
        {view === "week" ? (
          <WeekView date={date} today={today} chips={chips} chipHref={chipHref} addHref={addHref} />
        ) : (
          <MonthView
            date={date}
            today={today}
            chips={chips}
            chipHref={chipHref}
            weekHref={weekHref}
            addHref={addHref}
          />
        )}
      </div>
      <AgendaView className="md:hidden" today={today} chips={chips} chipHref={chipHref} />
    </div>
  );
}
