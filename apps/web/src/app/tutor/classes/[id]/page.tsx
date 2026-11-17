import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, Users, Wallet } from "lucide-react";
import { AddLessonDialog, CancelLessonDialog } from "@/components/tutor/lesson-dialogs";
import { BackLink } from "@/components/tutor/back-link";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Table, Td, Th } from "@/components/ui/table";
import {
  formatDate,
  formatDuration,
  formatLessonWhen,
  formatMonth,
  formatRupiah,
  formatTimeRange,
  lessonMinutes,
} from "@/lib/format";
import { isPast, wibMonthOf } from "@/lib/time";
import { createClient } from "@/lib/supabase/server";
import { isUuid, plural, row, rows } from "../../_lib/data";
import { monthSlug, summarizeMonths } from "../../_lib/logbook";

export const metadata: Metadata = { title: "Class" };

type Props = { params: Promise<{ id: string }> };

export default async function TutorClassPage({ params }: Props) {
  const { id } = await params;
  if (!isUuid(id)) notFound();

  const db = await createClient();
  const [classRes, rateRes, enrollmentsRes, lessonsRes, logbooksRes] = await Promise.all([
    db.from("classes").select("id, name, description, capacity").eq("id", id).maybeSingle(),
    db.from("class_tutor_rates").select("tutor_rate").eq("class_id", id).maybeSingle(),
    db.from("enrollments").select("id, profiles(full_name)").eq("class_id", id),
    db
      .from("lessons")
      .select("id, class_id, start_at, end_at, status, cancel_reason")
      .eq("class_id", id)
      .order("start_at"),
    db.from("logbooks").select("id, class_id, month, status, review_note").eq("class_id", id),
  ]);

  const cls = row(classRes);
  if (!cls) notFound();

  const rate = row(rateRes)?.tutor_rate;
  const students = rows(enrollmentsRes);
  const lessons = rows(lessonsRes);
  const logbooks = rows(logbooksRes);
  const entries =
    logbooks.length > 0
      ? rows(
          await db
            .from("logbook_entries")
            .select("lesson_id")
            .in(
              "logbook_id",
              logbooks.map((l) => l.id),
            ),
        )
      : [];

  const loggedIds = new Set(entries.map((e) => e.lesson_id));
  const upcoming = lessons.filter((l) => l.status === "scheduled" && !isPast(l.end_at));
  const past = lessons.filter((l) => !upcoming.includes(l)).reverse();
  const months = summarizeMonths(lessons, entries, logbooks).filter(
    (m) => m.progress.total > 0 || m.logbook,
  );

  return (
    <>
      <BackLink href="/tutor/classes">My classes</BackLink>
      <PageHeader
        title={cls.name}
        description={cls.description ?? undefined}
        actions={<AddLessonDialog classId={cls.id} />}
      />

      <ul className="mb-6 flex flex-wrap gap-x-6 gap-y-2 text-sm">
        <li className="flex items-center gap-2">
          <Users className="text-muted size-4" aria-hidden />
          {plural(students.length, "student")} of {cls.capacity} seats
        </li>
        {rate !== undefined && (
          <li className="flex items-center gap-2">
            <Wallet className="text-muted size-4" aria-hidden />
            You earn {formatRupiah(rate)} per hour
          </li>
        )}
      </ul>

      <div className="space-y-6">
        <Card title="Students">
          {students.length > 0 ? (
            <ul className="grid gap-2 sm:grid-cols-2">
              {students.map((s) => (
                <li
                  key={s.id}
                  className="rounded-card bg-cloud/30 flex items-center gap-3 px-3 py-2"
                >
                  <span className="bg-gold/30 grid size-8 place-items-center rounded-full text-sm font-bold">
                    {(s.profiles?.full_name ?? "?").charAt(0)}
                  </span>
                  <span className="font-semibold">{s.profiles?.full_name ?? "Student"}</span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              icon={Users}
              title="No students yet"
              description="Students appear here once they have paid for the class."
            />
          )}
        </Card>

        <Card title="Upcoming lessons">
          {upcoming.length > 0 ? (
            <Table>
              <thead>
                <tr>
                  <Th>When</Th>
                  <Th>Duration</Th>
                  <Th>
                    <span className="sr-only">Actions</span>
                  </Th>
                </tr>
              </thead>
              <tbody>
                {upcoming.map((lesson) => (
                  <tr key={lesson.id}>
                    <Td>
                      <p className="font-semibold">{formatDate(lesson.start_at)}</p>
                      <p className="text-muted text-xs">
                        {formatTimeRange(lesson.start_at, lesson.end_at)} WIB
                      </p>
                    </Td>
                    <Td>{formatDuration(lessonMinutes(lesson.start_at, lesson.end_at))}</Td>
                    <Td className="text-right">
                      <CancelLessonDialog
                        lessonId={lesson.id}
                        when={formatLessonWhen(lesson.start_at, lesson.end_at)}
                      />
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <EmptyState
              icon={CalendarDays}
              title="No upcoming lessons"
              description="Use the Add lesson button to schedule the next one."
            />
          )}
        </Card>

        <Card title="Logbooks" description="One logbook per month, with an entry for every lesson.">
          {months.length > 0 ? (
            <ul className="divide-cloud divide-y">
              {months.map((m) => (
                <li
                  key={m.month}
                  className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div>
                    <p className="font-semibold">{formatMonth(m.month)}</p>
                    <p className="text-muted text-sm">
                      {m.progress.logged} of {plural(m.progress.total, "lesson")} logged
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {m.logbook ? (
                      <StatusBadge kind="logbook" status={m.logbook.status} />
                    ) : (
                      <Badge>Not started</Badge>
                    )}
                    <ButtonLink
                      href={`/tutor/classes/${cls.id}/logbook/${monthSlug(m.month)}`}
                      variant="secondary"
                      size="sm"
                    >
                      Open
                    </ButtonLink>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              icon={CalendarDays}
              title="No logbooks yet"
              description="Add a lesson first. After it ends, you can write its logbook entry."
            />
          )}
        </Card>

        {past.length > 0 && (
          <Card title="Past and cancelled lessons">
            <Table>
              <thead>
                <tr>
                  <Th>When</Th>
                  <Th>Duration</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {past.map((lesson) => (
                  <tr key={lesson.id}>
                    <Td>
                      <p className="font-semibold">{formatDate(lesson.start_at)}</p>
                      <p className="text-muted text-xs">
                        {formatTimeRange(lesson.start_at, lesson.end_at)} WIB
                      </p>
                    </Td>
                    <Td>{formatDuration(lessonMinutes(lesson.start_at, lesson.end_at))}</Td>
                    <Td>
                      {lesson.status === "cancelled" ? (
                        <div className="space-y-1">
                          <StatusBadge kind="lesson" status="cancelled" />
                          {lesson.cancel_reason && (
                            <p className="text-muted text-xs">{lesson.cancel_reason}</p>
                          )}
                        </div>
                      ) : loggedIds.has(lesson.id) ? (
                        <Badge tone="success">Entry written</Badge>
                      ) : (
                        <Link
                          href={`/tutor/classes/${cls.id}/logbook/${monthSlug(wibMonthOf(lesson.start_at))}`}
                          className="hover:underline"
                        >
                          <Badge tone="warning">Needs entry</Badge>
                        </Link>
                      )}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card>
        )}
      </div>
    </>
  );
}
