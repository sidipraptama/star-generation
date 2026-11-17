"use server";

import { z } from "zod";
import { rpcAction, type ActionState } from "@/lib/action";
import { wibInstant } from "@/lib/time";

const id = z.uuid("Something went wrong. Please reload the page and try again.");
const required = (what: string) => z.string().trim().min(1, `Please fill in ${what}.`);

const dateText = (message: string) => z.string().regex(/^\d{4}-\d{2}-\d{2}$/, message);
const timeText = (message: string) => z.string().regex(/^\d{2}:\d{2}$/, message);

const lessonSchema = z
  .object({
    classId: id,
    date: dateText("Choose the lesson date."),
    startTime: timeText("Choose a start time."),
    endTime: timeText("Choose an end time."),
  })
  .refine((lesson) => lesson.endTime > lesson.startTime, {
    message: "The lesson must end after it starts.",
    path: ["endTime"],
  });

export async function scheduleLesson(_: ActionState, formData: FormData) {
  return rpcAction(formData, lessonSchema, (db, v) =>
    db.rpc("schedule_lesson", {
      p_class_id: v.classId,
      p_start_at: wibInstant(v.date, v.startTime),
      p_end_at: wibInstant(v.date, v.endTime),
    }),
  );
}

const weeklySchema = z
  .object({
    classId: id,
    firstDate: dateText("Choose the first lesson date."),
    untilDate: dateText("Choose the last lesson date."),
    weekdays: z
      .string()
      .regex(/^[1-7](,[1-7])*$/, "Choose at least one day of the week.")
      .transform((value) => value.split(",").map(Number)),
    startTime: timeText("Choose a start time."),
    endTime: timeText("Choose an end time."),
  })
  .refine((series) => series.untilDate >= series.firstDate, {
    message: "The last date must not be before the first date.",
    path: ["untilDate"],
  })
  .refine((series) => series.endTime > series.startTime, {
    message: "The lesson must end after it starts.",
    path: ["endTime"],
  });

export async function scheduleLessonsWeekly(_: ActionState, formData: FormData) {
  return rpcAction(formData, weeklySchema, (db, v) =>
    db.rpc("schedule_lessons_weekly", {
      p_class_id: v.classId,
      p_first_date: v.firstDate,
      p_until_date: v.untilDate,
      p_weekdays: v.weekdays,
      p_start_time: v.startTime,
      p_end_time: v.endTime,
    }),
  );
}

const cancelSchema = z.object({ lessonId: id, reason: z.string().optional() });

export async function cancelLesson(_: ActionState, formData: FormData) {
  return rpcAction(formData, cancelSchema, (db, v) =>
    db.rpc("cancel_lesson", { p_lesson_id: v.lessonId, p_reason: v.reason }),
  );
}

export async function cancelLessonSeries(_: ActionState, formData: FormData) {
  return rpcAction(formData, cancelSchema, (db, v) =>
    db.rpc("cancel_lesson_series", { p_lesson_id: v.lessonId, p_reason: v.reason }),
  );
}

const entrySchema = z.object({
  lessonId: id,
  topic: required("the topic"),
  activities: required("what you did in the lesson"),
  observation: required("your observation"),
  recommendation: required("the recommendation for next time"),
});

export async function saveLogbookEntry(_: ActionState, formData: FormData) {
  return rpcAction(formData, entrySchema, (db, v) =>
    db.rpc("save_logbook_entry", {
      p_lesson_id: v.lessonId,
      p_topic: v.topic,
      p_activities: v.activities,
      p_observation: v.observation,
      p_recommendation: v.recommendation,
    }),
  );
}

const submitSchema = z.object({ logbookId: id });

export async function submitLogbook(_: ActionState, formData: FormData) {
  return rpcAction(formData, submitSchema, (db, v) =>
    db.rpc("submit_logbook", { p_logbook_id: v.logbookId }),
  );
}
