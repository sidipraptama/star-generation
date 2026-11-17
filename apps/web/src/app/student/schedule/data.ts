import "server-only";
import type { CalendarChip, LegendItem } from "@/components/calendar/types";
import { coverUpcoming } from "@/lib/hours";
import { studentChipState } from "@/lib/schedule";
import { createClient } from "@/lib/supabase/server";
import { wibInstant } from "@/lib/time";
import { must, type OpenEnrollment } from "../data";

export const scheduleLegend: LegendItem[] = [
  { tone: "scheduled", label: "Upcoming" },
  { tone: "done", label: "Completed" },
  { tone: "warning", label: "Not covered by your hours" },
  { tone: "cancelled", label: "Cancelled" },
];

type Upcoming = { id: string; start_at: string; end_at: string };

export type ClassCoverage = {
  enrollment: OpenEnrollment;
  upcoming: Upcoming[];
  covered: Map<string, boolean>;
  uncovered: Upcoming[];
};

/** Hours cover upcoming lessons in order; students with no hours left cannot see upcoming ones at all. */
export async function getCoverage(enrollments: OpenEnrollment[]): Promise<ClassCoverage[]> {
  if (enrollments.length === 0) return [];

  const db = await createClient();
  const lessons = must(
    await db
      .from("lessons")
      .select("id, class_id, start_at, end_at")
      .in(
        "class_id",
        enrollments.map((enrollment) => enrollment.classId),
      )
      .eq("status", "scheduled")
      .gt("end_at", new Date().toISOString())
      .order("start_at"),
  );

  return enrollments.map((enrollment) => {
    const upcoming = lessons.filter((lesson) => lesson.class_id === enrollment.classId);
    const covered = coverUpcoming(enrollment.leftMinutes, upcoming);
    return {
      enrollment,
      upcoming,
      covered,
      uncovered: upcoming.filter((lesson) => covered.get(lesson.id) === false),
    };
  });
}

function toChip(
  lesson: {
    id: string;
    start_at: string;
    end_at: string;
    status: "scheduled" | "cancelled";
    series_id: string | null;
  },
  coverage: ClassCoverage,
): CalendarChip {
  const { tone, note } = studentChipState(lesson, coverage.covered.get(lesson.id));
  return {
    id: lesson.id,
    startAt: lesson.start_at,
    endAt: lesson.end_at,
    title: coverage.enrollment.className,
    subtitle: `with ${coverage.enrollment.tutorName}`,
    note,
    tone,
    repeats: lesson.series_id !== null,
  };
}

/** Lessons starting in the date range [from, to), as calendar chips. */
export async function getScheduleChips(
  range: { from: string; to: string },
  coverage: ClassCoverage[],
): Promise<CalendarChip[]> {
  if (coverage.length === 0) return [];

  const db = await createClient();
  const lessons = must(
    await db
      .from("lessons")
      .select("id, class_id, start_at, end_at, status, series_id")
      .in(
        "class_id",
        coverage.map((entry) => entry.enrollment.classId),
      )
      .gte("start_at", wibInstant(range.from, "00:00"))
      .lt("start_at", wibInstant(range.to, "00:00"))
      .order("start_at"),
  );

  const coverageByClass = new Map(coverage.map((entry) => [entry.enrollment.classId, entry]));
  return lessons.flatMap((lesson) => {
    const entry = coverageByClass.get(lesson.class_id);
    return entry ? [toChip(lesson, entry)] : [];
  });
}

export async function getLessonDetail(id: string, coverage: ClassCoverage[]) {
  const db = await createClient();
  const { data: lesson } = await db
    .from("lessons")
    .select("id, class_id, start_at, end_at, status, series_id")
    .eq("id", id)
    .maybeSingle();

  const entry = coverage.find((item) => item.enrollment.classId === lesson?.class_id);
  if (!lesson || !entry) return null;

  return {
    lesson,
    className: entry.enrollment.className,
    tutorName: entry.enrollment.tutorName,
    covered: entry.covered.get(lesson.id),
  };
}
