import type { Metadata } from "next";
import { CalendarDays } from "lucide-react";
import { CancelLessonDialog } from "@/components/admin/cancel-lesson-dialog";
import { LessonStatus } from "@/components/admin/lesson-status";
import { Panel, Section } from "@/components/admin/section";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Table, Td, Th } from "@/components/ui/table";
import { formatLessonWhen } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { isPast } from "@/lib/time";

export const metadata: Metadata = { title: "Schedule" };

export default async function SchedulePage() {
  const db = await createClient();

  const { data } = await db
    .from("lessons")
    .select(
      "id, start_at, end_at, status, classes(name), profiles!lessons_tutor_id_fkey(full_name)",
    )
    .order("start_at");

  const lessons = data ?? [];
  const upcoming = lessons.filter(
    (lesson) => lesson.status === "scheduled" && !isPast(lesson.end_at),
  );
  const past = lessons.filter((lesson) => !upcoming.includes(lesson)).reverse();

  return (
    <>
      <PageHeader
        title="Schedule"
        description="Every lesson across all classes. Times are in WIB."
      />

      {lessons.length === 0 ? (
        <Panel>
          <EmptyState
            icon={CalendarDays}
            title="No lessons yet"
            description="Lessons appear here once tutors schedule them."
          />
        </Panel>
      ) : (
        <>
          <Section title="Upcoming" description="Lessons that have not finished yet.">
            <LessonTable lessons={upcoming} empty="No upcoming lessons are scheduled." />
          </Section>
          <Section
            title="Past and cancelled"
            description="If a lesson did not take place, cancel it so students are not charged."
          >
            <LessonTable lessons={past} empty="No past lessons yet." />
          </Section>
        </>
      )}
    </>
  );
}

type LessonRow = {
  id: string;
  start_at: string;
  end_at: string;
  status: "scheduled" | "cancelled";
  classes: { name: string };
  profiles: { full_name: string };
};

function LessonTable({ lessons, empty }: { lessons: LessonRow[]; empty: string }) {
  if (lessons.length === 0) {
    return (
      <Panel>
        <p className="text-muted px-5 py-6 text-center text-sm">{empty}</p>
      </Panel>
    );
  }

  return (
    <Table>
      <thead>
        <tr>
          <Th>When</Th>
          <Th>Class</Th>
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
              <Td className="font-semibold whitespace-nowrap">{when}</Td>
              <Td>{lesson.classes.name}</Td>
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
  );
}
