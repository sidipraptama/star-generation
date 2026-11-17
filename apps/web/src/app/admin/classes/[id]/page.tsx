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
import { PageHeader } from "@/components/ui/page-header";
import { Table, Td, Th } from "@/components/ui/table";
import { formatLessonWhen, formatMonth, formatRupiah } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { isPast } from "@/lib/time";

export const metadata: Metadata = { title: "Class details" };

export default async function ClassDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const db = await createClient();

  const [classResult, enrollments, lessons, logbooks] = await Promise.all([
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
      .select("id, start_at, end_at, status, profiles!lessons_tutor_id_fkey(full_name)")
      .eq("class_id", id)
      .order("start_at"),
    db
      .from("logbooks")
      .select("id, month, status, logbook_entries(count)")
      .eq("class_id", id)
      .order("month", { ascending: false }),
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

  const allLessons = lessons.data ?? [];
  const upcoming = allLessons.filter(
    (lesson) => lesson.status === "scheduled" && !isPast(lesson.end_at),
  );
  const past = allLessons.filter((lesson) => !upcoming.includes(lesson)).reverse();

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
          />
          <LessonTable title="Past and cancelled" lessons={past} empty="No past lessons yet." />
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
                <Th />
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
                  <Td className="text-right">
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
}: {
  title: string;
  lessons: LessonRow[];
  empty: string;
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
              <Th />
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
                  <Td className="text-right">
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
    </div>
  );
}
