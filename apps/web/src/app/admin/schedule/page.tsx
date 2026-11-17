import type { Metadata } from "next";
import { LessonDetailDialog } from "@/components/admin/lesson-detail-dialog";
import { AutoSubmitForm } from "@/components/calendar/filters";
import { ScheduleCalendar } from "@/components/calendar/schedule-calendar";
import { Select } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page-header";
import { buildHref, parseCalendarParams, visibleRange } from "@/lib/calendar";
import { createClient } from "@/lib/supabase/server";
import { todayInWib } from "@/lib/time";
import { getLessonChips, getLessonDetail, scheduleLegend, uuidOrUndefined } from "./data";

export const metadata: Metadata = { title: "Schedule" };

type SearchParams = Record<string, string | string[] | undefined>;

const text = (value: string | string[] | undefined) =>
  typeof value === "string" ? value : undefined;

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const raw = await searchParams;
  const today = todayInWib();
  const { view, date } = parseCalendarParams({ view: text(raw.view), date: text(raw.date) }, today);
  const filters = {
    tutor: uuidOrUndefined(text(raw.tutor)),
    class: uuidOrUndefined(text(raw.class)),
  };
  const lessonId = uuidOrUndefined(text(raw.lesson));
  const { from, to } = visibleRange(view, date);

  const db = await createClient();
  const [chips, tutors, classes, lesson] = await Promise.all([
    getLessonChips(from, to, filters),
    db.from("profiles").select("id, full_name").eq("role", "tutor").order("full_name"),
    db.from("classes").select("id, name").order("name"),
    lessonId ? getLessonDetail(lessonId) : null,
  ]);

  return (
    <>
      <PageHeader
        title="Schedule"
        description="Every lesson across all classes. Click a lesson to see its details or cancel it. Times are in WIB."
      />

      <ScheduleCalendar
        view={view}
        date={date}
        today={today}
        basePath="/admin/schedule"
        params={filters}
        chips={chips}
        legend={scheduleLegend}
        filters={
          <AutoSubmitForm action="/admin/schedule" className="flex flex-wrap gap-3">
            <input type="hidden" name="view" value={view} />
            <input type="hidden" name="date" value={date} />
            <label htmlFor="tutor" className="sr-only">
              Filter by tutor
            </label>
            <Select name="tutor" defaultValue={filters.tutor ?? ""} className="w-auto min-w-48">
              <option value="">All tutors</option>
              {(tutors.data ?? []).map((tutor) => (
                <option key={tutor.id} value={tutor.id}>
                  {tutor.full_name}
                </option>
              ))}
            </Select>
            <label htmlFor="class" className="sr-only">
              Filter by class
            </label>
            <Select name="class" defaultValue={filters.class ?? ""} className="w-auto min-w-48">
              <option value="">All classes</option>
              {(classes.data ?? []).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </Select>
          </AutoSubmitForm>
        }
      />

      {lesson && (
        <LessonDetailDialog
          lesson={lesson}
          closeHref={buildHref("/admin/schedule", { ...filters, view, date })}
        />
      )}
    </>
  );
}
