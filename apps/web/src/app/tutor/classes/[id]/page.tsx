import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, Users, Wallet } from "lucide-react";
import { Pagination } from "@/components/list/pagination";
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
import { listHref, otherPages, pageBounds, parsePage } from "@/lib/list";
import { stayInRange } from "@/lib/paging";
import { wibMonthOf } from "@/lib/time";
import { createClient } from "@/lib/supabase/server";
import { isUuid, plural, row, rows } from "../../_lib/data";
import { monthSlug } from "../../_lib/logbook";

const SECTION_ROWS = 10;
const LOGBOOK_MONTHS = 6;

export const metadata: Metadata = { title: "Class" };

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ upcoming?: string; past?: string; months?: string }>;
};

export default async function TutorClassPage({ params, searchParams }: Props) {
  const { id } = await params;
  if (!isUuid(id)) notFound();

  const raw = await searchParams;
  const pages = {
    upcoming: parsePage(raw.upcoming),
    past: parsePage(raw.past),
    months: parsePage(raw.months),
  };
  const sizes = { upcoming: SECTION_ROWS, past: SECTION_ROWS, months: LOGBOOK_MONTHS };
  const basePath = `/tutor/classes/${id}`;
  const rangeOf = (key: keyof typeof pages) => pageBounds(pages[key], sizes[key]);
  const now = new Date().toISOString();
  const lessonColumns = "id, class_id, start_at, end_at, status, cancel_reason";

  const db = await createClient();
  const [classRes, rateRes, enrollmentsRes, upcomingRes, pastRes, monthsRes] = await Promise.all([
    db.from("classes").select("id, name, description, capacity").eq("id", id).maybeSingle(),
    db.from("class_tutor_rates").select("tutor_rate").eq("class_id", id).maybeSingle(),
    db.from("enrollments").select("id, profiles(full_name)").eq("class_id", id),
    db
      .from("lessons")
      .select(lessonColumns, { count: "exact" })
      .eq("class_id", id)
      .eq("status", "scheduled")
      .gt("end_at", now)
      .order("start_at")
      .range(rangeOf("upcoming").from, rangeOf("upcoming").to),
    db
      .from("lessons")
      .select(lessonColumns, { count: "exact" })
      .eq("class_id", id)
      .or(`status.eq.cancelled,end_at.lte.${now}`)
      .order("start_at", { ascending: false })
      .range(rangeOf("past").from, rangeOf("past").to),
    db
      .from("logbook_progress")
      .select("*", { count: "exact" })
      .eq("class_id", id)
      .or("lessons_total.gt.0,logbook_id.not.is.null")
      .order("month", { ascending: false })
      .range(rangeOf("months").from, rangeOf("months").to),
  ]);

  const cls = row(classRes);
  if (!cls) notFound();

  const totals = {
    upcoming: upcomingRes.count ?? 0,
    past: pastRes.count ?? 0,
    months: monthsRes.count ?? 0,
  };
  const results = { upcoming: upcomingRes, past: pastRes, months: monthsRes };
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
  const rate = row(rateRes)?.tutor_rate;
  const students = rows(enrollmentsRes);
  const upcoming = rows(upcomingRes);
  const past = rows(pastRes);
  const months = rows(monthsRes);
  const pagination = (key: keyof typeof pages, nouns: [string, string]) => (
    <Pagination
      basePath={basePath}
      params={otherPages(pages, key)}
      page={pages[key]}
      total={totals[key]}
      size={sizes[key]}
      pageParam={key}
      noun={nouns[totals[key] === 1 ? 0 : 1]}
    />
  );

  const pastIds = past.map((lesson) => lesson.id);
  const entries = pastIds.length
    ? rows(await db.from("logbook_entries").select("lesson_id").in("lesson_id", pastIds))
    : [];
  const loggedIds = new Set(entries.map((e) => e.lesson_id));

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
                  <Th sticky>
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
                    <Td sticky className="text-right">
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
          {pagination("upcoming", ["lesson", "lessons"])}
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
                    <p className="font-semibold">{m.month && formatMonth(m.month)}</p>
                    <p className="text-muted text-sm">
                      {m.entries_written ?? 0} of {plural(m.lessons_total ?? 0, "lesson")} logged
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {m.logbook_status ? (
                      <StatusBadge kind="logbook" status={m.logbook_status} />
                    ) : (
                      <Badge>Not started</Badge>
                    )}
                    <ButtonLink
                      href={`/tutor/classes/${cls.id}/logbook/${monthSlug(m.month ?? "")}`}
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
          {pagination("months", ["month", "months"])}
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
            {pagination("past", ["lesson", "lessons"])}
          </Card>
        )}
      </div>
    </>
  );
}
