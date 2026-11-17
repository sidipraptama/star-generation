import type { Metadata } from "next";
import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { z } from "zod";
import { AutoSubmitForm } from "@/components/calendar/filters";
import { ScheduleCalendar } from "@/components/calendar/schedule-calendar";
import { Alert } from "@/components/ui/alert";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Select } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page-header";
import { LessonDetailDialog } from "@/components/student/lesson-detail-dialog";
import { buildHref, parseCalendarParams, visibleRange } from "@/lib/calendar";
import { formatDate, formatDuration } from "@/lib/format";
import { todayInWib } from "@/lib/time";
import { getMyEnrollments } from "../data";
import {
  getCoverage,
  getLessonDetail,
  getScheduleChips,
  scheduleLegend,
  type ClassCoverage,
} from "./data";

export const metadata: Metadata = { title: "Schedule" };

const BASE_PATH = "/student/schedule";

const lessons = (count: number) => `${count} ${count === 1 ? "lesson" : "lessons"}`;

function HoursAlerts({ coverage }: { coverage: ClassCoverage[] }) {
  return coverage.map(({ enrollment, upcoming, uncovered }) => {
    const link = (
      <Link href={`/student/classes/${enrollment.classId}`} className="font-semibold underline">
        Add more hours
      </Link>
    );

    if (enrollment.leftMinutes <= 0) {
      return (
        <Alert key={enrollment.id} tone="danger">
          You have no hours left in {enrollment.className}. Your upcoming lessons are hidden until
          you pay for a new package. {link}
        </Alert>
      );
    }

    if (uncovered.length === 0) return null;

    const coveredCount = upcoming.length - uncovered.length;
    const first = formatDate(uncovered[0].start_at);
    const later = uncovered.length - 1;

    return (
      <Alert key={enrollment.id} tone="info">
        {enrollment.className}: your remaining {formatDuration(enrollment.leftMinutes)}{" "}
        {coveredCount > 0
          ? `cover the next ${lessons(coveredCount)}.`
          : "are not enough for the next lesson."}{" "}
        The lesson on {first}
        {later > 0 ? ` and ${later} later ${later === 1 ? "lesson" : "lessons"} are` : " is"} not
        covered yet. {link}
      </Alert>
    );
  });
}

type Props = {
  searchParams: Promise<{ view?: string; date?: string; lesson?: string; class?: string }>;
};

export default async function StudentSchedulePage({ searchParams }: Props) {
  const params = await searchParams;
  const today = todayInWib();
  const { view, date } = parseCalendarParams(params, today);

  const active = (await getMyEnrollments()).filter((enrollment) => enrollment.status === "active");

  if (active.length === 0) {
    return (
      <>
        <PageHeader title="Schedule" description="All your lessons on one calendar." />
        <Card>
          <EmptyState
            icon={GraduationCap}
            title="No lessons to show yet"
            description="Your calendar fills up once you are in a class and your payment is confirmed."
            action={<ButtonLink href="/student/browse">Find a class</ButtonLink>}
          />
        </Card>
      </>
    );
  }

  const selected = active.find((enrollment) => enrollment.classId === params.class);
  const coverage = await getCoverage(selected ? [selected] : active);
  const chips = await getScheduleChips(visibleRange(view, date), coverage);

  const lessonId = z.uuid().safeParse(params.lesson).data;
  const detail = lessonId ? await getLessonDetail(lessonId, coverage) : null;
  const closeHref = buildHref(BASE_PATH, { class: selected?.classId, view, date });

  const filters =
    active.length > 1 ? (
      <AutoSubmitForm action={BASE_PATH} className="max-w-xs">
        <input type="hidden" name="view" value={view} />
        <input type="hidden" name="date" value={date} />
        <Field label="Class" htmlFor="class">
          <Select name="class" defaultValue={selected?.classId ?? ""}>
            <option value="">All my classes</option>
            {active.map((enrollment) => (
              <option key={enrollment.classId} value={enrollment.classId}>
                {enrollment.className}
              </option>
            ))}
          </Select>
        </Field>
      </AutoSubmitForm>
    ) : null;

  return (
    <>
      <PageHeader
        title="Schedule"
        description="All your lessons on one calendar. Times are in WIB (Jakarta time)."
      />
      <div className="space-y-4">
        <HoursAlerts coverage={coverage} />
        <ScheduleCalendar
          view={view}
          date={date}
          today={today}
          basePath={BASE_PATH}
          params={{ class: selected?.classId }}
          chips={chips}
          legend={scheduleLegend}
          filters={filters}
        />
      </div>
      {detail && <LessonDetailDialog detail={detail} closeHref={closeHref} />}
    </>
  );
}
