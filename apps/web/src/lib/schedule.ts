import type { ChipTone } from "@/components/calendar/types";

type LessonState = { status: "scheduled" | "cancelled"; end_at: string };
type ChipState = { tone: ChipTone; note?: string };

/** Admin and tutor view: a finished lesson is waiting for a logbook entry until one is written. */
export function staffChipState(
  lesson: LessonState,
  hasEntry: boolean,
  now = new Date(),
): ChipState {
  if (lesson.status === "cancelled") return { tone: "cancelled", note: "Cancelled" };
  if (new Date(lesson.end_at) > now) return { tone: "scheduled" };
  return hasEntry
    ? { tone: "done", note: "Entry written" }
    : { tone: "attention", note: "Entry needed" };
}

/** Student view: an upcoming lesson is flagged when the remaining hours no longer cover it. */
export function studentChipState(
  lesson: LessonState,
  covered: boolean | undefined,
  now = new Date(),
): ChipState {
  if (lesson.status === "cancelled") return { tone: "cancelled", note: "Cancelled" };
  if (new Date(lesson.end_at) <= now) return { tone: "done", note: "Completed" };
  return covered === false
    ? { tone: "warning", note: "Not covered by your hours" }
    : { tone: "scheduled" };
}
