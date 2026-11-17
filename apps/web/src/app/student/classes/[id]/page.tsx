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
import { ClassLogbooks, type ApprovedLogbook } from "@/components/student/class-logbooks";
import { ClassSchedule } from "@/components/student/class-schedule";
import { HoursHistory, type LedgerLine } from "@/components/student/hours-history";
import { HoursPicker } from "@/components/student/hours-picker";
import { formatRupiah } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { requestTopup } from "../../actions";
import { getCatalog, getMyEnrollments, must } from "../../data";

export const metadata: Metadata = { title: "Class" };

export default async function StudentClassPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const db = await createClient();
  const [classResult, enrollments, catalog] = await Promise.all([
    db.from("classes").select("id").eq("id", id).maybeSingle(),
    getMyEnrollments(),
    getCatalog(),
  ]);

  const enrollment = enrollments.find((e) => e.classId === id && e.status === "active");
  if (!classResult.data || !enrollment) notFound();

  const rate = catalog.find((c) => c.id === id)?.studentRate ?? 0;

  const [lessons, logbooks, ledger] = await Promise.all([
    db.from("lessons").select("id, start_at, end_at, status").eq("class_id", id).order("start_at"),
    db
      .from("logbooks")
      .select(
        "id, month, logbook_entries(id, topic, activities, observation, recommendation, lessons(start_at, end_at))",
      )
      .eq("class_id", id)
      .eq("status", "approved")
      .order("month", { ascending: false }),
    db
      .from("hour_ledger")
      .select("kind, minutes, occurred_at, lesson_id, invoice_id")
      .eq("enrollment_id", enrollment.id)
      .order("occurred_at", { ascending: false }),
  ]);

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

        <ClassSchedule lessons={must(lessons)} />
        <ClassLogbooks logbooks={approvedLogbooks} />
        <HoursHistory lines={ledgerLines} />
      </div>
    </>
  );
}
