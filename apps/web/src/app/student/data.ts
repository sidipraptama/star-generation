import "server-only";
import { CARDS_PER_PAGE, orIlike, pageBounds } from "@/lib/list";
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

const CATALOG_COLUMNS = "id, name, description, tutor_name, capacity, seats_taken, student_rate";

type CatalogRow = {
  id: string | null;
  name: string | null;
  description: string | null;
  tutor_name: string | null;
  capacity: number | null;
  seats_taken: number | null;
  student_rate: number | null;
};

// View columns are typed as nullable, but these ones come from not-null columns.
const toCatalogClass = (row: CatalogRow): CatalogClass => ({
  id: row.id!,
  name: row.name!,
  description: row.description,
  tutorName: row.tutor_name!,
  capacity: row.capacity!,
  seatsTaken: row.seats_taken!,
  studentRate: row.student_rate!,
});

/** One page of the class catalogue, filtered by a search and by whether seats are left. */
export async function getCatalogPage({
  q,
  openOnly,
  page,
}: {
  q: string | undefined;
  openOnly: boolean;
  page: number;
}) {
  const db = await createClient();
  const { from, to } = pageBounds(page, CARDS_PER_PAGE);

  let query = db
    .from("class_catalog")
    .select(CATALOG_COLUMNS, { count: "exact" })
    .order("name")
    .order("id")
    .range(from, to);
  if (q) query = query.or(orIlike(["name", "tutor_name", "description"], q));
  if (openOnly) query = query.gt("seats_left", 0);

  const { data, count, error } = await query;
  // The database refuses a page past the last row; the caller sends the visitor back to page 1.
  if (error && page > 1) return { classes: [], total: 0, pastEnd: true };
  if (error) throw new Error(error.message);
  return { classes: (data ?? []).map(toCatalogClass), total: count ?? 0, pastEnd: false };
}

/** Only the classes asked for, so nothing loads the whole catalogue. */
export async function getCatalogByIds(ids: string[]): Promise<CatalogClass[]> {
  if (ids.length === 0) return [];

  const db = await createClient();
  const rows = must(await db.from("class_catalog").select(CATALOG_COLUMNS).in("id", ids));
  return rows.map(toCatalogClass);
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
  const [enrollments, invoices, balances] = await Promise.all([
    db
      .from("enrollments")
      .select("id, class_id, status")
      .neq("status", "cancelled")
      .order("created_at", { ascending: false }),
    db.from("invoices").select("id, enrollment_id, hours, student_rate, amount, status"),
    db.from("enrollment_balances").select("enrollment_id, balance_minutes"),
  ]);

  const catalog = await getCatalogByIds([...new Set(must(enrollments).map((e) => e.class_id))]);
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

  // The class list already holds each class's next lesson, and it hides upcoming lessons from a
  // student who has no hours left, exactly like the lessons themselves.
  const db = await createClient();
  const classes = must(
    await db.from("class_list").select("id, next_lesson_start, next_lesson_end").in("id", classIds),
  );

  for (const row of classes) {
    if (row.id && row.next_lesson_start && row.next_lesson_end) {
      next.set(row.id, { start_at: row.next_lesson_start, end_at: row.next_lesson_end });
    }
  }
  return next;
}

/** Class name for the given enrollments, including cancelled ones, so old invoices stay readable. */
export async function getEnrollmentClassNames(enrollmentIds: string[]) {
  if (enrollmentIds.length === 0) return new Map<string, string>();

  const db = await createClient();
  const enrollments = must(
    await db.from("enrollments").select("id, class_id").in("id", enrollmentIds),
  );
  const catalog = await getCatalogByIds([...new Set(enrollments.map((e) => e.class_id))]);

  const nameByClass = new Map(catalog.map((c) => [c.id, c.name]));
  return new Map(enrollments.map((e) => [e.id, nameByClass.get(e.class_id) ?? "Class"] as const));
}
