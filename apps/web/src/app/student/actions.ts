"use server";

import { z } from "zod";
import { rpcAction, type ActionState } from "@/lib/action";

const hours = z.coerce
  .number({ error: "Enter the number of hours." })
  .int("Hours must be a whole number.")
  .min(1, "Choose at least 1 hour.")
  .max(200, "You can buy up to 200 hours at a time.");

export async function enroll(_: ActionState, formData: FormData) {
  return rpcAction(formData, z.object({ classId: z.uuid(), hours }), (db, v) =>
    db.rpc("enroll", { p_class_id: v.classId, p_hours: v.hours }),
  );
}

export async function requestTopup(_: ActionState, formData: FormData) {
  return rpcAction(formData, z.object({ enrollmentId: z.uuid(), hours }), (db, v) =>
    db.rpc("request_topup", { p_enrollment_id: v.enrollmentId, p_hours: v.hours }),
  );
}

export async function cancelInvoice(_: ActionState, formData: FormData) {
  return rpcAction(
    formData,
    z.object({ invoiceId: z.uuid(), reason: z.string().optional() }),
    (db, v) => db.rpc("void_invoice", { p_invoice_id: v.invoiceId, p_reason: v.reason }),
  );
}
