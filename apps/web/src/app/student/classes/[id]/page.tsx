import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, Plus } from "lucide-react";
import { z } from "zod";
import { Alert } from "@/components/ui/alert";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DialogForm } from "@/components/ui/dialog-form";
import { HoursMeter } from "@/components/ui/hours-meter";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/list/pagination";
import { ClassLogbooks, type ApprovedLogbook } from "@/components/student/class-logbooks";
import { ClassSchedule } from "@/components/student/class-schedule";
import { HoursHistory, type LedgerLine } from "@/components/student/hours-history";
import { HoursPicker } from "@/components/student/hours-picker";
import { formatRupiah } from "@/lib/format";
import { listHref, otherPages, pageBounds, parsePage } from "@/lib/list";
import { stayInRange } from "@/lib/paging";
import { createClient } from "@/lib/supabase/server";
import { requestTopup } from "../../actions";
import { getCatalogByIds, getMyEnrollments, must } from "../../data";

const SECTION_ROWS = 10;
const LOGBOOK_MONTHS = 3;

export const metadata: Metadata = { title: "Class" };

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ upcoming?: string; past?: string; notes?: string; history?: string }>;
};

export default async function StudentClassPage({ params, searchParams }: Props) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const raw = await searchParams;
  const pages = {
    upcoming: parsePage(raw.upcoming),
    past: parsePage(raw.past),
    notes: parsePage(raw.notes),
    history: parsePage(raw.history),
  };
  const basePath = `/student/classes/${id}`;
  const pagination = (
    key: keyof typeof pages,
    total: number,
    size: number,
    nouns: [string, string],
  ) => (
    <Pagination
      basePath={basePath}
      params={otherPages(pages, key)}
      page={pages[key]}
      total={total}
      size={size}
      pageParam={key}
      noun={nouns[total === 1 ? 0 : 1]}
    />
  );
  const rangeOf = (key: keyof typeof pages, size: number) => pageBounds(pages[key], size);
  const now = new Date().toISOString();

  const db = await createClient();
  const [classResult, enrollments, catalog] = await Promise.all([
    db.from("classes").select("id").eq("id", id).maybeSingle(),
    getMyEnrollments(),
    getCatalogByIds([id]),
  ]);

  const enrollment = enrollments.find((e) => e.classId === id && e.status === "active");
  if (!classResult.data || !enrollment) notFound();

  const rate = catalog[0]?.studentRate ?? 0;

  const [upcomingResult, pastResult, logbooks, ledger] = await Promise.all([
    db
      .from("lessons")
      .select("id, start_at, end_at, status", { count: "exact" })
      .eq("class_id", id)
      .gt("end_at", now)
      .order("start_at")
      .range(rangeOf("upcoming", SECTION_ROWS).from, rangeOf("upcoming", SECTION_ROWS).to),
    db
      .from("lessons")
      .select("id, start_at, end_at, status", { count: "exact" })
      .eq("class_id", id)
      .lte("end_at", now)
      .order("start_at", { ascending: false })
      .range(rangeOf("past", SECTION_ROWS).from, rangeOf("past", SECTION_ROWS).to),
    db
      .from("logbooks")
      .select(
        "id, month, logbook_entries(id, topic, activities, observation, recommendation, lessons(start_at, end_at))",
        { count: "exact" },
      )
      .eq("class_id", id)
      .eq("status", "approved")
      .order("month", { ascending: false })
      .range(rangeOf("notes", LOGBOOK_MONTHS).from, rangeOf("notes", LOGBOOK_MONTHS).to),
    db
      .from("hour_ledger")
      .select("kind, minutes, occurred_at, lesson_id, invoice_id", { count: "exact" })
      .eq("enrollment_id", enrollment.id)
      .order("occurred_at", { ascending: false })
      .range(rangeOf("history", SECTION_ROWS).from, rangeOf("history", SECTION_ROWS).to),
  ]);

  const totals = {
    upcoming: upcomingResult.count ?? 0,
    past: pastResult.count ?? 0,
    notes: logbooks.count ?? 0,
    history: ledger.count ?? 0,
  };
  const sizes = {
    upcoming: SECTION_ROWS,
    past: SECTION_ROWS,
    notes: LOGBOOK_MONTHS,
    history: SECTION_ROWS,
  };
  const results = { upcoming: upcomingResult, past: pastResult, notes: logbooks, history: ledger };
  for (const key of Object.keys(pages) as (keyof typeof pages)[]) {
    stayInRange(
      pages[key],
      results[key],
      (target) =>
        listHref(basePath, {
          ...otherPages(pages, key),
          [key]: target > 1 ? String(target) : undefined,
        }),
      sizes[key],
    );
  }

  const approvedLogbooks: ApprovedLogbook[] = must(logbooks).map((logbook) => ({
    id: logbook.id,
    month: logbook.month,
    entries: logbook.logbook_entries.map((entry) => ({
      id: entry.id,
      topic: entry.topic,
      activities: entry.activities,
      observation: entry.observation,
      recommendation: entry.recommendation,
      lesson: entry.lessons,
    })),
  }));

  const ledgerLines: LedgerLine[] = must(ledger).flatMap((line) =>
    line.occurred_at &&
    line.minutes !== null &&
    (line.kind === "purchase" || line.kind === "lesson")
      ? [
          {
            key: `${line.kind}-${line.lesson_id ?? line.invoice_id}`,
            kind: line.kind,
            minutes: line.minutes,
            occurredAt: line.occurred_at,
          },
        ]
      : [],
  );

  const outOfHours = enrollment.leftMinutes <= 0;
  const unpaid = enrollment.unpaidInvoice;

  return (
    <>
      <ButtonLink href="/student/classes" variant="ghost" size="sm" className="mb-3 -ml-3">
        <ArrowLeft className="size-4" aria-hidden />
        My classes
      </ButtonLink>

      <PageHeader
        title={enrollment.className}
        description={`with ${enrollment.tutorName}`}
        actions={
          unpaid ? (
            <Button variant="gold" disabled>
              <Plus className="size-4" aria-hidden />
              Add more hours
            </Button>
          ) : (
            <DialogForm
              action={requestTopup}
              triggerLabel="Add more hours"
              triggerIcon={<Plus className="size-4" aria-hidden />}
              triggerVariant="gold"
              title="Add more hours"
              description="We will create an invoice. Your hours are added once our admin team confirms your payment."
              submitLabel="Create invoice"
            >
              <input type="hidden" name="enrollmentId" value={enrollment.id} />
              <HoursPicker rate={rate} />
            </DialogForm>
          )
        }
      />

      <div className="space-y-6">
        {outOfHours && (
          <Alert tone="danger">
            <p className="font-semibold">You have no hours left.</p>
            <p>
              Your upcoming lessons are hidden until a new package is paid. Add more hours to see
              them again. Your past lessons and progress notes stay available.
            </p>
          </Alert>
        )}

        {unpaid && (
          <Alert tone="info">
            <p className="font-semibold">
              You have an unpaid invoice of {formatRupiah(unpaid.amount)} for {unpaid.hours} hours.
            </p>
            <p>
              Our admin team will confirm your payment, and the hours are added automatically.{" "}
              <a href="/student/invoices" className="font-semibold underline">
                View invoice
              </a>
            </p>
          </Alert>
        )}

        <Card>
          <HoursMeter
            leftMinutes={enrollment.leftMinutes}
            purchasedMinutes={enrollment.purchasedMinutes}
          />
        </Card>

        <ClassSchedule
          upcoming={must(upcomingResult)}
          past={must(pastResult)}
          isEmpty={totals.upcoming + totals.past === 0}
          upcomingPagination={pagination("upcoming", totals.upcoming, SECTION_ROWS, [
            "lesson",
            "lessons",
          ])}
          pastPagination={pagination("past", totals.past, SECTION_ROWS, ["lesson", "lessons"])}
        />
        <ClassLogbooks
          logbooks={approvedLogbooks}
          pagination={pagination("notes", totals.notes, LOGBOOK_MONTHS, ["month", "months"])}
        />
        <HoursHistory
          lines={ledgerLines}
          pagination={pagination("history", totals.history, SECTION_ROWS, ["entry", "entries"])}
        />
      </div>
    </>
  );
}
