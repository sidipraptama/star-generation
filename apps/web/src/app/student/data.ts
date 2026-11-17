import "server-only";
import { createClient } from "@/lib/supabase/server";

type Result<T> = { data: T | null; error: { message: string } | null };

export function must<T>({ data, error }: Result<T>): T {
  if (error || data === null) throw new Error(error?.message ?? "Unexpected empty response");
  return data;
}

export type CatalogClass = {
  id: string;
  name: string;
  description: string | null;
  tutorName: string;
  capacity: number;
  seatsTaken: number;
  studentRate: number;
};

export async function getCatalog(): Promise<CatalogClass[]> {
  const db = await createClient();
  const rows = must(
    await db
      .from("class_catalog")
      .select("id, name, description, tutor_name, capacity, seats_taken, student_rate")
      .order("name"),
  );

  // View columns are typed as nullable, but these ones come from not-null columns.
  return rows.map((row) => ({
    id: row.id!,
    name: row.name!,
    description: row.description,
    tutorName: row.tutor_name!,
    capacity: row.capacity!,
    seatsTaken: row.seats_taken!,
    studentRate: row.student_rate!,
  }));
}

export type OpenEnrollment = {
  id: string;
  classId: string;
  status: "pending_payment" | "active";
  className: string;
  tutorName: string;
  leftMinutes: number;
  purchasedMinutes: number;
  unpaidInvoice: { id: string; hours: number; amount: number } | null;
};

export async function getMyEnrollments(): Promise<OpenEnrollment[]> {
  const db = await createClient();
  const [enrollments, invoices, balances, catalog] = await Promise.all([
    db
      .from("enrollments")
      .select("id, class_id, status")
      .neq("status", "cancelled")
      .order("created_at", { ascending: false }),
    db.from("invoices").select("id, enrollment_id, hours, student_rate, amount, status"),
    db.from("enrollment_balances").select("enrollment_id, balance_minutes"),
    getCatalog(),
  ]);

  const classById = new Map(catalog.map((c) => [c.id, c]));
  const leftByEnrollment = new Map(
    must(balances).map((b) => [b.enrollment_id, b.balance_minutes ?? 0]),
  );
  const invoiceRows = must(invoices);

  return must(enrollments).flatMap((enrollment) => {
    const cls = classById.get(enrollment.class_id);
    if (!cls || enrollment.status === "cancelled") return [];

    const own = invoiceRows.filter((invoice) => invoice.enrollment_id === enrollment.id);
    const unpaid = own.find((invoice) => invoice.status === "unpaid");

    return [
      {
        id: enrollment.id,
        classId: enrollment.class_id,
        status: enrollment.status,
        className: cls.name,
        tutorName: cls.tutorName,
        leftMinutes: leftByEnrollment.get(enrollment.id) ?? 0,
        purchasedMinutes: own
          .filter((invoice) => invoice.status === "paid")
          .reduce((sum, invoice) => sum + invoice.hours * 60, 0),
        unpaidInvoice: unpaid
          ? {
              id: unpaid.id,
              hours: unpaid.hours,
              amount: unpaid.amount ?? unpaid.hours * unpaid.student_rate,
            }
          : null,
      },
    ];
  });
}

export async function getNextLessons(classIds: string[]) {
  const next = new Map<string, { start_at: string; end_at: string }>();
  if (classIds.length === 0) return next;

  const db = await createClient();
  const lessons = must(
    await db
      .from("lessons")
      .select("class_id, start_at, end_at")
      .in("class_id", classIds)
      .eq("status", "scheduled")
      .gt("end_at", new Date().toISOString())
      .order("start_at"),
  );

  for (const lesson of lessons) {
    if (!next.has(lesson.class_id)) next.set(lesson.class_id, lesson);
  }
  return next;
}

/** Class name for every enrollment, including cancelled ones, so old invoices stay readable. */
export async function getEnrollmentClassNames() {
  const db = await createClient();
  const [enrollments, catalog] = await Promise.all([
    db.from("enrollments").select("id, class_id"),
    getCatalog(),
  ]);

  const nameByClass = new Map(catalog.map((c) => [c.id, c.name]));
  return new Map(
    must(enrollments).map((e) => [e.id, nameByClass.get(e.class_id) ?? "Class"] as const),
  );
}
