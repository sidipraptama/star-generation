import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { CalendarChip, LegendItem } from "@/components/calendar/types";
import type { Database } from "@/lib/database.types";
import { staffChipState } from "@/lib/schedule";
import { wibInstant } from "@/lib/time";
import { row, rows } from "../_lib/data";

type Db = SupabaseClient<Database>;

export const scheduleLegend: LegendItem[] = [
  { tone: "scheduled", label: "Upcoming" },
  { tone: "done", label: "Logbook entry written" },
  { tone: "attention", label: "Entry needed" },
  { tone: "cancelled", label: "Cancelled" },
];

/** Chips for every lesson that starts in the date range [from, to). */
export async function getScheduleChips(db: Db, range: { from: string; to: string }) {
  const lessons = rows(
    await db
      .from("lessons")
      .select("id, start_at, end_at, status, series_id, classes(name)")
      .gte("start_at", wibInstant(range.from, "00:00"))
      .lt("start_at", wibInstant(range.to, "00:00"))
      .order("start_at"),
  );

  const entries =
    lessons.length > 0
      ? rows(
          await db
            .from("logbook_entries")
            .select("lesson_id")
            .in(
              "lesson_id",
              lessons.map((lesson) => lesson.id),
            ),
        )
      : [];
  const written = new Set(entries.map((entry) => entry.lesson_id));

  return lessons.map((lesson): CalendarChip => {
    const { tone, note } = staffChipState(lesson, written.has(lesson.id));
    return {
      id: lesson.id,
      startAt: lesson.start_at,
      endAt: lesson.end_at,
      title: lesson.classes?.name ?? "Class",
      tone,
      note,
      repeats: lesson.series_id !== null,
    };
  });
}

export async function getLessonDetail(db: Db, lessonId: string) {
  const lesson = row(
    await db
      .from("lessons")
      .select("id, class_id, start_at, end_at, status, series_id, cancel_reason, classes(name)")
      .eq("id", lessonId)
      .maybeSingle(),
  );
  if (!lesson) return null;

  const entry = row(
    await db.from("logbook_entries").select("id").eq("lesson_id", lessonId).maybeSingle(),
  );
  return { lesson, hasEntry: entry !== null };
}
