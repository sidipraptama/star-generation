import { isValidDate } from "@/lib/calendar";

export function plusMinutes(time: string, minutes: number) {
  const [hours, rest] = time.split(":").map(Number);
  const total = Math.min(hours * 60 + rest + minutes, 24 * 60 - 1);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

/** Reads the `add` link parameter: a date, optionally followed by T and a start time. */
export function parseAddParam(value: string | undefined) {
  if (!value) return null;

  const [date, time] = value.split("T");
  if (!isValidDate(date)) return null;

  const start = time && /^([01]\d|2[0-3]):[0-5]\d$/.test(time) ? time : "";
  return { date, start, end: start ? plusMinutes(start, 90) : "" };
}
