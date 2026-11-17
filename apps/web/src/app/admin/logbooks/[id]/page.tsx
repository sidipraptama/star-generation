import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, MessageSquareWarning } from "lucide-react";
import { z } from "zod";
import { approveLogbook, requestLogbookChanges } from "@/app/admin/actions";
import { EarningsTable, totalEarnings, type EarningLine } from "@/components/admin/earnings-table";
import { Section } from "@/components/admin/section";
import { LogbookEntries } from "@/components/logbook/logbook-entries";
import { Alert } from "@/components/ui/alert";
import { StatusBadge } from "@/components/ui/badge";
import { DialogForm } from "@/components/ui/dialog-form";
import { Field, Textarea } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page-header";
import { formatMonth, formatRupiah } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Review logbook" };

export default async function LogbookReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const db = await createClient();

  const { data: logbook } = await db
    .from("logbooks")
    .select(
      "id, month, status, review_note, classes(name, profiles!classes_tutor_id_fkey(full_name)), logbook_entries(id, topic, activities, observation, recommendation, lessons(start_at, end_at))",
    )
    .eq("id", id)
    .maybeSingle();

  if (!logbook) notFound();

  let earnings: EarningLine[] = [];
  if (logbook.status === "submitted") {
    const { data } = await db.rpc("preview_logbook_earnings", { p_logbook_id: id });
    earnings = data ?? [];
  } else if (logbook.status === "approved") {
    const { data } = await db
      .from("earnings")
      .select("lesson_id, lesson_start, minutes, tutor_rate, amount")
      .eq("logbook_id", id)
      .order("lesson_start");
    earnings = data ?? [];
  }

  const tutorName = logbook.classes.profiles.full_name;
  const total = totalEarnings(earnings);
  const entries = logbook.logbook_entries.map(({ lessons, ...entry }) => ({
    ...entry,
    lesson: lessons,
  }));
  const submitted = logbook.status === "submitted";

  return (
    <>
      <PageHeader
        title={`${logbook.classes.name} · ${formatMonth(logbook.month)}`}
        description={`Written by ${tutorName}`}
        actions={
          <>
            <StatusBadge kind="logbook" status={logbook.status} />
            {submitted && (
              <>
                <DialogForm
                  action={requestLogbookChanges}
                  triggerLabel="Request changes"
                  triggerIcon={<MessageSquareWarning className="size-4" aria-hidden />}
                  title="Send this logbook back?"
                  description={`${tutorName} will be asked to fix it and submit it again.`}
                  submitLabel="Send back to tutor"
                >
                  <input type="hidden" name="logbookId" value={logbook.id} />
                  <Field label="What needs to change?" htmlFor="changes-note">
                    <Textarea id="changes-note" name="note" rows={4} maxLength={1000} required />
                  </Field>
                </DialogForm>
                <DialogForm
                  action={approveLogbook}
                  triggerLabel="Approve logbook"
                  triggerIcon={<Check className="size-4" aria-hidden />}
                  triggerVariant="primary"
                  title="Approve this logbook?"
                  description={`${earnings.length} ${earnings.length === 1 ? "lesson" : "lessons"} · ${tutorName} will earn ${formatRupiah(total)}`}
                  submitLabel="Approve logbook"
                >
                  <input type="hidden" name="logbookId" value={logbook.id} />
                  <Alert>
                    Approving is final. The logbook becomes read-only and visible to students, and
                    the tutor&apos;s earnings are added once.
                  </Alert>
                </DialogForm>
              </>
            )}
          </>
        }
      />

      {logbook.review_note && (
        <Alert tone="danger" className="mb-6">
          <p className="font-semibold">Changes were requested</p>
          <p className="whitespace-pre-line">{logbook.review_note}</p>
        </Alert>
      )}

      {earnings.length > 0 && (
        <Section
          title={submitted ? "What the tutor will earn" : "What the tutor earned"}
          description="Tutor rate × lesson hours, once per lesson."
        >
          <EarningsTable lines={earnings} />
        </Section>
      )}

      <Section title="Logbook entries" description={`${entries.length} lessons logged`}>
        <LogbookEntries entries={entries} />
      </Section>

      <p className="mt-8 text-sm">
        <Link href="/admin/logbooks" className="text-muted hover:text-navy hover:underline">
          ← Back to all logbooks
        </Link>
      </p>
    </>
  );
}
