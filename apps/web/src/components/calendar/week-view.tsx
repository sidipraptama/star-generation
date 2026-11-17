import Link from "next/link";
import clsx from "clsx";
import { ChipLink } from "@/components/calendar/chip";
import type { CalendarChip } from "@/components/calendar/types";
import { dayOfMonth, layoutDay, longDayLabel, visibleDays, weekdayLabel } from "@/lib/calendar";
import { isPast, wibDateOf, wibInstant, wibMinutesOfDay } from "@/lib/time";

const ROW_PX = 56;
const COLUMNS = "grid-cols-[3.5rem_repeat(7,minmax(0,1fr))]";

const pad = (hour: number) => String(hour).padStart(2, "0");

type WeekViewProps = {
  date: string;
  today: string;
  chips: CalendarChip[];
  chipHref: (id: string) => string;
  addHref?: (day: string, time: string) => string;
};

export function WeekView({ date, today, chips, chipHref, addHref }: WeekViewProps) {
  const days = visibleDays("week", date);

  const byDay = new Map<
    string,
    { chip: CalendarChip; startMinutes: number; endMinutes: number }[]
  >();
  for (const chip of chips) {
    const day = wibDateOf(chip.startAt);
    const endsSameDay = wibDateOf(chip.endAt) === day;
    const entry = {
      chip,
      startMinutes: wibMinutesOfDay(chip.startAt),
      endMinutes: endsSameDay ? wibMinutesOfDay(chip.endAt) : 24 * 60,
    };
    byDay.set(day, [...(byDay.get(day) ?? []), entry]);
  }

  const all = [...byDay.values()].flat();
  const firstHour = Math.min(7, ...all.map((entry) => Math.floor(entry.startMinutes / 60)));
  const lastHour = Math.max(21, ...all.map((entry) => Math.ceil(entry.endMinutes / 60)));
  const hours = Array.from({ length: lastHour - firstHour }, (_, index) => firstHour + index);
  const gridStart = firstHour * 60;
  const nowMinutes = wibMinutesOfDay(new Date());

  return (
    <div className="border-cloud rounded-card overflow-x-auto border bg-white">
      <div className="min-w-[760px]">
        <div className={clsx("grid", COLUMNS)}>
          <div />
          {days.map((day) => (
            <div key={day} className={clsx("px-2 py-2 text-center", day === today && "bg-gold/25")}>
              <p className="text-muted text-xs font-semibold uppercase">{weekdayLabel(day)}</p>
              <p className="text-lg font-bold">{dayOfMonth(day)}</p>
            </div>
          ))}
        </div>

        <div className={clsx("grid", COLUMNS)}>
          <div>
            {hours.map((hour) => (
              <div key={hour} className="relative" style={{ height: ROW_PX }}>
                <span className="text-muted absolute -top-2 right-2 text-[11px]">
                  {pad(hour)}:00
                </span>
              </div>
            ))}
          </div>

          {days.map((day) => (
            <div
              key={day}
              className="border-cloud relative border-l"
              style={{ height: ROW_PX * hours.length }}
            >
              {hours.map((hour, index) => {
                const time = `${pad(hour)}:00`;
                const style = { top: index * ROW_PX, height: ROW_PX };
                const open = addHref && !isPast(wibInstant(day, time));
                return open ? (
                  <Link
                    key={hour}
                    href={addHref(day, time)}
                    scroll={false}
                    prefetch={false}
                    aria-label={`Add a lesson on ${longDayLabel(day)} at ${time}`}
                    className="border-cloud/70 hover:bg-gold/15 absolute inset-x-0 border-t"
                    style={style}
                  />
                ) : (
                  <div
                    key={hour}
                    className="border-cloud/70 absolute inset-x-0 border-t"
                    style={style}
                  />
                );
              })}

              {layoutDay(byDay.get(day) ?? []).map(({ item, lane, lanes }) => (
                <div
                  key={item.chip.id}
                  className="absolute z-10 p-0.5"
                  style={{
                    top: ((item.startMinutes - gridStart) / 60) * ROW_PX,
                    height: Math.max(((item.endMinutes - item.startMinutes) / 60) * ROW_PX, 28),
                    left: `${(lane / lanes) * 100}%`,
                    width: `${100 / lanes}%`,
                  }}
                >
                  <ChipLink
                    chip={item.chip}
                    href={chipHref(item.chip.id)}
                    dense={item.endMinutes - item.startMinutes < 75}
                    className="h-full"
                  />
                </div>
              ))}

              {day === today && nowMinutes >= gridStart && nowMinutes < lastHour * 60 && (
                <div
                  className="bg-danger pointer-events-none absolute inset-x-0 z-20 h-0.5"
                  style={{ top: ((nowMinutes - gridStart) / 60) * ROW_PX }}
                  aria-hidden
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
