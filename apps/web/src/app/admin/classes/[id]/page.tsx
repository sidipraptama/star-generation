import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { NotebookPen, Pencil, Users } from "lucide-react";
import { z } from "zod";
import { updateClass } from "@/app/admin/actions";
import { CancelLessonDialog } from "@/components/admin/cancel-lesson-dialog";
import { ClassFormFields } from "@/components/admin/class-form-fields";
import { EnrollmentHours } from "@/components/admin/enrollment-hours";
import { LessonStatus } from "@/components/admin/lesson-status";
import { Panel, Section } from "@/components/admin/section";
import { StatusBadge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { ButtonLink } from "@/components/ui/button";
import { DialogForm } from "@/components/ui/dialog-form";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/list/pagination";
import { PageHeader } from "@/components/ui/page-header";
import { Table, Td, Th } from "@/components/ui/table";
import { formatLessonWhen, formatMonth, formatRupiah } from "@/lib/format";
import { listHref, otherPages, pageBounds, parsePage } from "@/lib/list";
import { stayInRange } from "@/lib/paging";
import { createClient } from "@/lib/supabase/server";

const SECTION_ROWS = 10;

export const metadata: Metadata = { title: "Class details" };

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ upcoming?: string; past?: string; logbooks?: string }>;
};

export default async function ClassDetailPage({ params, searchParams }: Props) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const raw = await searchParams;
  const pages = {
    upcoming: parsePage(raw.upcoming),
    past: parsePage(raw.past),
    logbooks: parsePage(raw.logbooks),
  };
  const basePath = `/admin/classes/${id}`;
  const pageParams = (without: keyof typeof pages) => otherPages(pages, without);
  const bounds = (page: number) => pageBounds(page, SECTION_ROWS);
  const now = new Date().toISOString();
  const lessonSelect = "id, start_at, end_at, status, profiles!lessons_tutor_id_fkey(full_name)";

  const db = await createClient();

  const [classResult, enrollments, upcomingResult, pastResult, logbooks] = await Promise.all([
    db
      .from("classes")
      .select(
        "id, name, description, capacity, tutor_id, profiles!classes_tutor_id_fkey(full_name), class_student_rates(student_rate), class_tutor_rates(tutor_rate)",
      )
      .eq("id", id)
      .maybeSingle(),
    db
      .from("enrollments")
      .select("id, status, profiles(full_name, email), invoices(hours, status)")
      .eq("class_id", id)
      .neq("status", "cancelled")
      .order("created_at"),
    db
      .from("lessons")
      .select(lessonSelect, { count: "exact" })
      .eq("class_id", id)
      .eq("status", "scheduled")
      .gt("end_at", now)
      .order("start_at")
      .range(bounds(pages.upcoming).from, bounds(pages.upcoming).to),
    db
      .from("lessons")
      .select(lessonSelect, { count: "exact" })
      .eq("class_id", id)
      .or(`status.eq.cancelled,end_at.lte.${now}`)
      .order("start_at", { ascending: false })
      .range(bounds(pages.past).from, bounds(pages.past).to),
    db
      .from("logbooks")
      .select("id, month, status, logbook_entries(count)", { count: "exact" })
      .eq("class_id", id)
      .order("month", { ascending: false })
      .range(bounds(pages.logbooks).from, bounds(pages.logbooks).to),
  ]);

  const item = classResult.data;
  if (!item) notFound();

  const students = enrollments.data ?? [];
  const balances = students.length
    ? await db
        .from("enrollment_balances")
        .select("enrollment_id, balance_minutes")
        .in(
          "enrollment_id",
          students.map((student) => student.id),
        )
    : { data: [] };
  const balanceOf = new Map(
    balances.data?.map((row) => [row.enrollment_id, row.balance_minutes ?? 0]),
  );

  const upcoming = upcomingResult.data ?? [];
  const past = pastResult.data ?? [];
  const totals = {
    upcoming: upcomingResult.count ?? 0,
    past: pastResult.count ?? 0,
    logbooks: logbooks.count ?? 0,
  };
  const results = { upcoming: upcomingResult, past: pastResult, logbooks };
  for (const key of ["upcoming", "past", "logbooks"] as const) {
    stayInRange(
      pages[key],
      results[key],
      (target) =>
        listHref(basePath, { ...pageParams(key), [key]: target > 1 ? String(target) : undefined }),
      SECTION_ROWS,
    );
  }

  const studentRate = item.class_student_rates?.student_rate ?? 0;
  const tutorRate = item.class_tutor_rates?.tutor_rate ?? 0;

  return (
    <>
      <PageHeader
        title={item.name}
        description={item.description ?? undefined}
        actions={
          <DialogForm
            action={updateClass}
            triggerLabel="Edit class"
            triggerIcon={<Pencil className="size-4" aria-hidden />}
            title="Edit class"
            submitLabel="Save changes"
          >
            <input type="hidden" name="classId" value={item.id} />
            <Alert>
              Rate changes only apply to new invoices and new lessons. Capacity cannot go below the
              number of students already enrolled. A new tutor takes over upcoming lessons only.
            </Alert>
            <ClassFormFields
              idPrefix="edit-class"
              defaults={{
                name: item.name,
                description: item.description,
                tutorId: item.tutor_id,
                tutorName: item.profiles?.full_name,
                capacity: item.capacity,
                studentRate,
                tutorRate,
              }}
            />
          </DialogForm>
        }
      />

      <dl className="rounded-card border-cloud grid gap-4 border bg-white p-5 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <dt className="text-muted text-sm">Tutor</dt>
          <dd className="font-semibold">{item.profiles.full_name}</dd>
        </div>
        <div>
          <dt className="text-muted text-sm">Seats</dt>
          <dd className="font-semibold">
            {students.length} of {item.capacity} taken
          </dd>
        </div>
        <div>
          <dt className="text-muted text-sm">Student rate</dt>
          <dd className="font-semibold">{formatRupiah(studentRate)} / hour</dd>
        </div>
        <div>
          <dt className="text-muted text-sm">Tutor rate</dt>
          <dd className="font-semibold">{formatRupiah(tutorRate)} / hour</dd>
        </div>
      </dl>

      <Section title="Students">
        {students.length === 0 ? (
          <Panel>
            <EmptyState
              icon={Users}
              title="No students yet"
              description="Students appear here as soon as they enroll in this class."
            />
          </Panel>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Student</Th>
                <Th>Status</Th>
                <Th>Hours left</Th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => (
                <tr key={student.id}>
                  <Td>
                    <p className="font-semibold">{student.profiles.full_name}</p>
                    <p className="text-muted text-xs">{student.profiles.email}</p>
                  </Td>
                  <Td>
                    <StatusBadge kind="enrollment" status={student.status} />
                  </Td>
                  <Td>
                    <EnrollmentHours
                      status={student.status}
                      balanceMinutes={balanceOf.get(student.id) ?? 0}
                      invoices={student.invoices}
                    />
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Section>

      <Section title="Lessons" description="Times are in WIB.">
        <div className="space-y-6">
          <LessonTable
            title="Upcoming"
            lessons={upcoming}
            empty="No upcoming lessons are scheduled."
            pagination={
              <Pagination
                basePath={basePath}
                params={pageParams("upcoming")}
                page={pages.upcoming}
                total={totals.upcoming}
                size={SECTION_ROWS}
                pageParam="upcoming"
                noun={totals.upcoming === 1 ? "lesson" : "lessons"}
              />
            }
          />
          <LessonTable
            title="Past and cancelled"
            lessons={past}
            empty="No past lessons yet."
            pagination={
              <Pagination
                basePath={basePath}
                params={pageParams("past")}
                page={pages.past}
                total={totals.past}
                size={SECTION_ROWS}
                pageParam="past"
                noun={totals.past === 1 ? "lesson" : "lessons"}
              />
            }
          />
        </div>
      </Section>

      <Section
        title="Logbooks"
        description="One logbook per month, reviewed before students see it."
      >
        {!logbooks.data?.length ? (
          <Panel>
            <EmptyState
              icon={NotebookPen}
              title="No logbooks yet"
              description="A logbook appears once the tutor writes the first entry of a month."
            />
          </Panel>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Month</Th>
                <Th>Lessons logged</Th>
                <Th>Status</Th>
                <Th sticky />
              </tr>
            </thead>
            <tbody>
              {logbooks.data.map((logbook) => (
                <tr key={logbook.id}>
                  <Td className="font-semibold">{formatMonth(logbook.month)}</Td>
                  <Td>{logbook.logbook_entries[0]?.count ?? 0}</Td>
                  <Td>
                    <StatusBadge kind="logbook" status={logbook.status} />
                  </Td>
                  <Td sticky className="text-right">
                    <ButtonLink
                      href={`/admin/logbooks/${logbook.id}`}
                      variant="secondary"
                      size="sm"
                    >
                      {logbook.status === "submitted" ? "Review" : "Open"}
                    </ButtonLink>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
        <Pagination
          basePath={basePath}
          params={pageParams("logbooks")}
          page={pages.logbooks}
          total={totals.logbooks}
          size={SECTION_ROWS}
          pageParam="logbooks"
          noun={totals.logbooks === 1 ? "logbook" : "logbooks"}
        />
      </Section>

      <p className="mt-8 text-sm">
        <Link href="/admin/classes" className="text-muted hover:text-navy hover:underline">
          ← Back to all classes
        </Link>
      </p>
    </>
  );
}

type LessonRow = {
  id: string;
  start_at: string;
  end_at: string;
  status: "scheduled" | "cancelled";
  profiles: { full_name: string };
};

function LessonTable({
  title,
  lessons,
  empty,
  pagination,
}: {
  title: string;
  lessons: LessonRow[];
  empty: string;
  pagination: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="text-muted mb-2 text-sm font-semibold">{title}</h3>
      {lessons.length === 0 ? (
        <Panel>
          <p className="text-muted px-5 py-6 text-center text-sm">{empty}</p>
        </Panel>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>When</Th>
              <Th>Tutor</Th>
              <Th>Status</Th>
              <Th sticky />
            </tr>
          </thead>
          <tbody>
            {lessons.map((lesson) => {
              const when = formatLessonWhen(lesson.start_at, lesson.end_at);
              return (
                <tr key={lesson.id}>
                  <Td className="font-semibold">{when}</Td>
                  <Td>{lesson.profiles.full_name}</Td>
                  <Td>
                    <LessonStatus status={lesson.status} endAt={lesson.end_at} />
                  </Td>
                  <Td sticky className="text-right">
                    {lesson.status === "scheduled" && (
                      <CancelLessonDialog lessonId={lesson.id} when={when} />
                    )}
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}
      {pagination}
    </div>
  );
}
