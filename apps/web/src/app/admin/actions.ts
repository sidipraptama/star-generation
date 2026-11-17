"use server";

import { z } from "zod";
import { rpcAction, type ActionState } from "@/lib/action";

const REFRESH = "Something went wrong. Please refresh the page and try again.";

const id = z.uuid(REFRESH);
const optionalText = z.string().trim().max(500, "That text is too long.");

const wholeNumber = (label: string) =>
  z.coerce
    .number({ error: `Enter ${label} as a number.` })
    .int(`Enter ${label} as a whole number.`);

const rupiah = (label: string) =>
  wholeNumber(label)
    .min(1, `Enter ${label}.`)
    .max(
      10_000_000,
      `${label[0].toUpperCase()}${label.slice(1)} cannot be more than Rp10.000.000 per hour.`,
    );

const classFields = {
  name: z.string().trim().min(1, "Enter a class name.").max(100, "The class name is too long."),
  description: optionalText,
  tutorId: z.uuid("Choose a tutor."),
  capacity: wholeNumber("the capacity")
    .min(1, "Capacity must be at least 1.")
    .max(100, "Capacity cannot be more than 100."),
  studentRate: rupiah("the student rate"),
  tutorRate: rupiah("the tutor rate"),
};

export async function createClass(_: ActionState, formData: FormData) {
  return rpcAction(formData, z.object(classFields), (db, v) =>
    db.rpc("create_class", {
      p_name: v.name,
      p_description: v.description,
      p_tutor_id: v.tutorId,
      p_capacity: v.capacity,
      p_student_rate: v.studentRate,
      p_tutor_rate: v.tutorRate,
    }),
  );
}

export async function updateClass(_: ActionState, formData: FormData) {
  return rpcAction(formData, z.object({ classId: id, ...classFields }), (db, v) =>
    db.rpc("update_class", {
      p_class_id: v.classId,
      p_name: v.name,
      p_description: v.description,
      p_tutor_id: v.tutorId,
      p_capacity: v.capacity,
      p_student_rate: v.studentRate,
      p_tutor_rate: v.tutorRate,
    }),
  );
}

export async function markInvoicePaid(_: ActionState, formData: FormData) {
  return rpcAction(
    formData,
    z.object({
      invoiceId: id,
      reference: z.string().trim().max(100, "The reference is too long."),
    }),
    (db, v) =>
      db.rpc("mark_invoice_paid", {
        p_invoice_id: v.invoiceId,
        p_reference: v.reference || undefined,
      }),
  );
}

export async function voidInvoice(_: ActionState, formData: FormData) {
  return rpcAction(formData, z.object({ invoiceId: id, reason: optionalText }), (db, v) =>
    db.rpc("void_invoice", { p_invoice_id: v.invoiceId, p_reason: v.reason || undefined }),
  );
}

export async function cancelLesson(_: ActionState, formData: FormData) {
  return rpcAction(formData, z.object({ lessonId: id, reason: optionalText }), (db, v) =>
    db.rpc("cancel_lesson", { p_lesson_id: v.lessonId, p_reason: v.reason || undefined }),
  );
}

export async function cancelLessonSeries(_: ActionState, formData: FormData) {
  return rpcAction(formData, z.object({ lessonId: id, reason: optionalText }), (db, v) =>
    db.rpc("cancel_lesson_series", { p_lesson_id: v.lessonId, p_reason: v.reason || undefined }),
  );
}

export async function approveLogbook(_: ActionState, formData: FormData) {
  return rpcAction(formData, z.object({ logbookId: id }), (db, v) =>
    db.rpc("approve_logbook", { p_logbook_id: v.logbookId }),
  );
}

export async function requestLogbookChanges(_: ActionState, formData: FormData) {
  return rpcAction(
    formData,
    z.object({
      logbookId: id,
      note: z
        .string()
        .trim()
        .min(1, "Please explain what needs to change.")
        .max(1000, "That note is too long."),
    }),
    (db, v) => db.rpc("request_logbook_changes", { p_logbook_id: v.logbookId, p_note: v.note }),
  );
}
