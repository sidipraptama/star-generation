const WIB_OFFSET_HOURS = 7;
const HOUR_MS = 3_600_000;

function shiftToWib(instant: string | Date) {
  return new Date(new Date(instant).getTime() + WIB_OFFSET_HOURS * HOUR_MS);
}

/** Builds an ISO instant from a date and time typed in WIB, e.g. ("2026-11-17", "16:00"). */
export function wibInstant(date: string, time: string) {
  return `${date}T${time}:00+07:00`;
}

/** First day of the WIB calendar month containing the instant, as YYYY-MM-01. */
export function wibMonthOf(instant: string | Date) {
  return `${shiftToWib(instant).toISOString().slice(0, 7)}-01`;
}

export function todayInWib() {
  return shiftToWib(new Date()).toISOString().slice(0, 10);
}

export function isPast(instant: string) {
  return new Date(instant).getTime() <= Date.now();
}
