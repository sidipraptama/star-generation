import "server-only";
import { z } from "zod";
import type { CalendarChip, LegendItem } from "@/components/calendar/types";
import { staffChipState } from "@/lib/schedule";
import { createClient } from "@/lib/supabase/server";
import { wibInstant } from "@/lib/time";

export const scheduleLegend: LegendItem[] = [
  { tone: "scheduled", label: "Upcoming" },
  { tone: "done", label: "Logbook entry written" },
  { tone: "attention", label: "Entry needed" },
  { tone: "cancelled", label: "Cancelled" },
];

export type ScheduleFilters = { tutor?: string; class?: string };

export function uuidOrUndefined(value: string | undefined) {
  const parsed = z.uuid().safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

/** Lessons starting in [from, to), both WIB dates, as calendar chips. */
export async function getLessonChips(
  from: string,
  to: string,
  filters: ScheduleFilters = {},
): Promise<CalendarChip[]> {
  const db = await createClient();

  let query = db
    .from("lessons")
    .select(
      "id, start_at, end_at, status, series_id, classes(name), profiles!lessons_tutor_id_fkey(full_name), logbook_entries(id)",
    )
    .gte("start_at", wibInstant(from, "00:00"))
    .lt("start_at", wibInstant(to, "00:00"))
    .order("start_at");

  if (filters.tutor) query = query.eq("tutor_id", filters.tutor);
  if (filters.class) query = query.eq("class_id", filters.class);

  const { data } = await query;

  return (data ?? []).map((lesson) => ({
    id: lesson.id,
    startAt: lesson.start_at,
    endAt: lesson.end_at,
    title: lesson.classes.name,
    subtitle: lesson.profiles.full_name,
    repeats: lesson.series_id !== null,
    ...staffChipState(lesson, lesson.logbook_entries !== null),
  }));
}

export type LessonDetail = {
  id: string;
  classId: string;
  className: string;
  tutorName: string;
  startAt: string;
  endAt: string;
  status: "scheduled" | "cancelled";
  cancelReason: string | null;
  inSeries: boolean;
  upcomingInSeries: number;
  hasEntry: boolean;
};

export async function getLessonDetail(id: string): Promise<LessonDetail | null> {
  const db = await createClient();

  const { data } = await db
    .from("lessons")
    .select(
      "id, class_id, start_at, end_at, status, series_id, cancel_reason, classes(name), profiles!lessons_tutor_id_fkey(full_name), logbook_entries(id)",
    )
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;

  let upcomingInSeries = 0;
  if (data.series_id) {
    const { count } = await db
      .from("lessons")
      .select("id", { count: "exact", head: true })
      .eq("series_id", data.series_id)
      .eq("status", "scheduled")
      .gte("start_at", data.start_at)
      .gt("end_at", new Date().toISOString());
    upcomingInSeries = count ?? 0;
  }

  return {
    id: data.id,
    classId: data.class_id,
    className: data.classes.name,
    tutorName: data.profiles.full_name,
    startAt: data.start_at,
    endAt: data.end_at,
    status: data.status,
    cancelReason: data.cancel_reason,
    inSeries: data.series_id !== null,
    upcomingInSeries,
    hasEntry: data.logbook_entries !== null,
  };
}
