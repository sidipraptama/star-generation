const TIME_ZONE = "Asia/Jakarta";

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: TIME_ZONE,
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
});

const timeFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

const numberFormat = new Intl.NumberFormat("id-ID");

export function formatRupiah(amount: number) {
  return `Rp${numberFormat.format(amount)}`;
}

export function formatDuration(minutes: number) {
  const total = Math.max(0, Math.round(minutes));
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  if (hours === 0) return `${rest}m`;
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
}

export function formatDate(instant: string) {
  return dateFormat.format(new Date(instant)).replace(",", "");
}

export function formatTimeRange(start: string, end: string) {
  return `${timeFormat.format(new Date(start))}–${timeFormat.format(new Date(end))}`;
}

export function formatLessonWhen(start: string, end: string) {
  return `${formatDate(start)} · ${formatTimeRange(start, end)} WIB`;
}

export function formatDateTime(instant: string) {
  return `${formatDate(instant)}, ${timeFormat.format(new Date(instant))} WIB`;
}

/** Formats a month stored as YYYY-MM-01, e.g. "November 2026". */
export function formatMonth(month: string) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    month: "long",
    year: "numeric",
  }).format(new Date(`${month}T00:00:00Z`));
}

export function lessonMinutes(start: string, end: string) {
  return Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60_000);
}
