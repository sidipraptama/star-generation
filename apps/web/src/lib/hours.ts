import { lessonMinutes } from "@/lib/format";

type UpcomingLesson = { id: string; start_at: string; end_at: string };

/**
 * Hours are used in lesson order. Returns, per lesson, whether the remaining hours still cover it;
 * the first lesson that does not fit and every lesson after it are not covered.
 */
export function coverUpcoming(balanceMinutes: number, lessons: UpcomingLesson[]) {
  let remaining = Math.max(0, balanceMinutes);
  const covered = new Map<string, boolean>();

  for (const lesson of [...lessons].sort((a, b) => a.start_at.localeCompare(b.start_at))) {
    const minutes = lessonMinutes(lesson.start_at, lesson.end_at);
    const fits = minutes <= remaining;
    covered.set(lesson.id, fits);
    remaining = fits ? remaining - minutes : 0;
  }

  return covered;
}
