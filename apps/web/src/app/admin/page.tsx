import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, CircleCheck, NotebookPen, Receipt, Users } from "lucide-react";
import { MarkPaidDialog } from "@/components/admin/mark-paid-dialog";
import { WeekStrip } from "@/components/calendar/week-strip";
import { Card } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Stat } from "@/components/ui/stat";
import { addDays, buildHref, weekStart } from "@/lib/calendar";
import { formatDate, formatMonth, formatRupiah } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { todayInWib } from "@/lib/time";
import { getLessonChips, scheduleLegend } from "./schedule/data";

export const metadata: Metadata = { title: "Overview" };

export default async function AdminOverviewPage() {
  const db = await createClient();
  const today = todayInWib();
  const thisWeek = weekStart(today);

  const [stats, unpaidInvoices, logbooks, weekChips] = await Promise.all([
    db.from("admin_stats").select("*").single(),
    db
      .from("invoices")
      .select("id, hours, student_rate, issued_at, enrollments(profiles(full_name), classes(name))")
      .eq("status", "unpaid")
      .order("issued_at")
      .limit(5),
    db
      .from("logbooks")
      .select(
        "id, month, classes(name, profiles!classes_tutor_id_fkey(full_name)), logbook_entries(count)",
      )
      .eq("status", "submitted")
      .order("submitted_at")
      .limit(5),
    getLessonChips(thisWeek, addDays(thisWeek, 7)),
  ]);

  const invoices = unpaidInvoices.data ?? [];
  const waitingLogbooks = logbooks.data ?? [];

  return (
    <>
      <PageHeader title="Overview" description="What is happening across your classes today." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          icon={Receipt}
          label="Invoices waiting for payment"
          value={stats.data?.unpaid_invoices ?? 0}
        />
        <Stat
          icon={NotebookPen}
          label="Logbooks waiting for review"
          value={stats.data?.logbooks_to_review ?? 0}
        />
        <Stat icon={Users} label="Active students" value={stats.data?.active_students ?? 0} />
        <Stat icon={BookOpen} label="Classes" value={stats.data?.classes ?? 0} />
      </div>

      <h2 className="mt-10 mb-4 text-lg font-semibold">Needs your attention</h2>

      {invoices.length === 0 && waitingLogbooks.length === 0 ? (
        <div className="rounded-card border-cloud border bg-white">
          <EmptyState
            icon={CircleCheck}
            title="You are all caught up"
            description="There are no unpaid invoices and no logbooks waiting for your review."
          />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card
            title="Invoices waiting for payment"
            action={
              <ButtonLink href="/admin/invoices?status=unpaid" variant="ghost" size="sm">
                See all
              </ButtonLink>
            }
          >
            {invoices.length === 0 ? (
              <p className="text-muted text-sm">No invoices are waiting for payment.</p>
            ) : (
              <ul className="divide-cloud divide-y">
                {invoices.map((invoice) => (
                  <li
                    key={invoice.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold">
                        {invoice.enrollments.profiles.full_name}
                      </p>
                      <p className="text-muted truncate text-sm">
                        {invoice.enrollments.classes.name} · {invoice.hours}h ·{" "}
                        {formatRupiah(invoice.hours * invoice.student_rate)} ·{" "}
                        {formatDate(invoice.issued_at)}
                      </p>
                    </div>
                    <MarkPaidDialog
                      invoiceId={invoice.id}
                      studentName={invoice.enrollments.profiles.full_name}
                      amount={invoice.hours * invoice.student_rate}
                    />
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card
            title="Logbooks waiting for review"
            action={
              <ButtonLink href="/admin/logbooks" variant="ghost" size="sm">
                See all
              </ButtonLink>
            }
          >
            {waitingLogbooks.length === 0 ? (
              <p className="text-muted text-sm">No logbooks are waiting for review.</p>
            ) : (
              <ul className="divide-cloud divide-y">
                {waitingLogbooks.map((logbook) => (
                  <li
                    key={logbook.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <Link
                        href={`/admin/logbooks/${logbook.id}`}
                        className="truncate font-semibold hover:underline"
                      >
                        {logbook.classes.name} · {formatMonth(logbook.month)}
                      </Link>
                      <p className="text-muted truncate text-sm">
                        {logbook.classes.profiles.full_name} ·{" "}
                        {logbook.logbook_entries[0]?.count ?? 0} lessons logged
                      </p>
                    </div>
                    <ButtonLink href={`/admin/logbooks/${logbook.id}`} size="sm">
                      Review
                    </ButtonLink>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}

      <div className="mt-10">
        <WeekStrip
          today={today}
          chips={weekChips}
          legend={scheduleLegend}
          scheduleHref="/admin/schedule"
          chipHref={(id) => buildHref("/admin/schedule", { view: "week", date: today, lesson: id })}
        />
      </div>
    </>
  );
}
