import { isPast, wibInstant } from "@/lib/time";

export type LessonRow = {
  id: string;
  class_id: string;
  start_at: string;
  end_at: string;
  status: "scheduled" | "cancelled";
};

export type LogbookStatus = "draft" | "changes_requested" | "submitted" | "approved";

export function isEditable(status: LogbookStatus | undefined) {
  return status === undefined || status === "draft" || status === "changes_requested";
}

export function monthSlug(month: string) {
  return month.slice(0, 7);
}

export function monthFromSlug(slug: string) {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(slug) ? `${slug}-01` : null;
}

/** Instants covering one WIB calendar month, for range filters. */
export function monthRange(month: string) {
  const [year, number] = month.split("-").map(Number);
  const next =
    number === 12 ? `${year + 1}-01-01` : `${year}-${String(number + 1).padStart(2, "0")}-01`;
  return { from: wibInstant(month, "00:00"), to: wibInstant(next, "00:00") };
}

/** Mirrors the checks in the `submit_logbook` database function. */
export function logbookProgress(lessons: LessonRow[], loggedLessonIds: ReadonlySet<string>) {
  const active = lessons.filter((lesson) => lesson.status === "scheduled");
  const unfinished = active.filter((lesson) => !isPast(lesson.end_at)).length;
  const logged = active.filter((lesson) => loggedLessonIds.has(lesson.id)).length;
  const missing = active.filter(
    (lesson) => isPast(lesson.end_at) && !loggedLessonIds.has(lesson.id),
  ).length;

  return {
    total: active.length,
    logged,
    unfinished,
    missing,
    ready: active.length > 0 && unfinished === 0 && missing === 0,
  };
}
