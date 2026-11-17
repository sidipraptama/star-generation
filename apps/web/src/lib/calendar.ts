export type CalendarView = "week" | "month";

const DAY_MS = 86_400_000;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const toUtc = (date: string) => new Date(`${date}T00:00:00Z`);
const toIso = (value: Date) => value.toISOString().slice(0, 10);

export function isValidDate(value: string | undefined): value is string {
  if (!value || !DATE_PATTERN.test(value)) return false;
  const parsed = toUtc(value);
  return !Number.isNaN(parsed.getTime()) && toIso(parsed) === value;
}

export function addDays(date: string, days: number) {
  return toIso(new Date(toUtc(date).getTime() + days * DAY_MS));
}

/** ISO weekday: 1 = Monday ... 7 = Sunday. */
export function isoWeekday(date: string) {
  return ((toUtc(date).getUTCDay() + 6) % 7) + 1;
}

export function weekStart(date: string) {
  return addDays(date, 1 - isoWeekday(date));
}

export function monthStart(date: string) {
  return `${date.slice(0, 7)}-01`;
}

export function addMonths(date: string, months: number) {
  const [year, month] = date.split("-").map(Number);
  const index = year * 12 + (month - 1) + months;
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}-01`;
}

/** Same day of the month in another month, or its last day when that month is shorter. */
export function shiftMonth(date: string, months: number) {
  const first = addMonths(date, months);
  const [year, month] = first.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const day = Math.min(Number(date.slice(8, 10)), lastDay);
  return `${first.slice(0, 8)}${String(day).padStart(2, "0")}`;
}

export function parseCalendarParams(params: { view?: string; date?: string }, today: string) {
  return {
    view: (params.view === "month" ? "month" : "week") as CalendarView,
    date: isValidDate(params.date) ? params.date : today,
  };
}

/** Week view: Monday to Sunday. Month view: six full weeks so the grid never changes height. */
export function visibleDays(view: CalendarView, date: string) {
  const first = view === "week" ? weekStart(date) : weekStart(monthStart(date));
  return Array.from({ length: view === "week" ? 7 : 42 }, (_, index) => addDays(first, index));
}

/** Half-open date range [from, to) covered by the view. */
export function visibleRange(view: CalendarView, date: string) {
  const days = visibleDays(view, date);
  return { from: days[0], to: addDays(days[days.length - 1], 1) };
}

export function shiftDate(view: CalendarView, date: string, direction: -1 | 1) {
  return view === "week" ? addDays(date, 7 * direction) : addMonths(date, direction);
}

const monthYear = new Intl.DateTimeFormat("en-GB", {
  timeZone: "UTC",
  month: "long",
  year: "numeric",
});
const dayMonth = new Intl.DateTimeFormat("en-GB", {
  timeZone: "UTC",
  day: "numeric",
  month: "short",
});
const dayMonthYear = new Intl.DateTimeFormat("en-GB", {
  timeZone: "UTC",
  day: "numeric",
  month: "short",
  year: "numeric",
});
const weekday = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", weekday: "short" });
const longDay = new Intl.DateTimeFormat("en-GB", {
  timeZone: "UTC",
  weekday: "long",
  day: "numeric",
  month: "long",
});

export function rangeTitle(view: CalendarView, date: string) {
  if (view === "month") return monthYear.format(toUtc(date));

  const start = weekStart(date);
  const end = addDays(start, 6);
  if (start.slice(0, 7) === end.slice(0, 7)) {
    return `${toUtc(start).getUTCDate()}–${dayMonthYear.format(toUtc(end))}`;
  }
  if (start.slice(0, 4) === end.slice(0, 4)) {
    return `${dayMonth.format(toUtc(start))} – ${dayMonthYear.format(toUtc(end))}`;
  }
  return `${dayMonthYear.format(toUtc(start))} – ${dayMonthYear.format(toUtc(end))}`;
}

const fullDate = new Intl.DateTimeFormat("en-GB", {
  timeZone: "UTC",
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
});

export const fullDateLabel = (date: string) => fullDate.format(toUtc(date));
export const weekdayLabel = (date: string) => weekday.format(toUtc(date));
export const dayOfMonth = (date: string) => toUtc(date).getUTCDate();
export const longDayLabel = (date: string) => longDay.format(toUtc(date));

export function buildHref(basePath: string, params: Record<string, string | undefined>) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) query.set(key, value);
  }
  const text = query.toString();
  return text ? `${basePath}?${text}` : basePath;
}

export function countOccurrences(first: string, until: string, weekdays: number[]) {
  if (!isValidDate(first) || !isValidDate(until) || until < first) return 0;

  let count = 0;
  let day = first;
  for (let step = 0; step < 400 && day <= until; step++) {
    if (weekdays.includes(isoWeekday(day))) count++;
    day = addDays(day, 1);
  }
  return count;
}

export type Placed<T> = { item: T; lane: number; lanes: number };

/** Puts overlapping items side by side: each connected overlap group shares its lane count. */
export function layoutDay<T extends { startMinutes: number; endMinutes: number }>(
  items: T[],
): Placed<T>[] {
  const sorted = [...items].sort(
    (a, b) => a.startMinutes - b.startMinutes || a.endMinutes - b.endMinutes,
  );
  const placed: Placed<T>[] = [];

  let cluster: Placed<T>[] = [];
  let laneEnds: number[] = [];
  let clusterEnd = -1;

  const closeCluster = () => {
    for (const entry of cluster) entry.lanes = laneEnds.length;
    placed.push(...cluster);
    cluster = [];
    laneEnds = [];
  };

  for (const item of sorted) {
    if (cluster.length > 0 && item.startMinutes >= clusterEnd) closeCluster();

    let lane = laneEnds.findIndex((end) => end <= item.startMinutes);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(item.endMinutes);
    } else {
      laneEnds[lane] = item.endMinutes;
    }
    clusterEnd = Math.max(clusterEnd, item.endMinutes);
    cluster.push({ item, lane, lanes: 1 });
  }
  closeCluster();

  return placed;
}
