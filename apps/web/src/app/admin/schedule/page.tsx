import type { Metadata } from "next";
import { searchClasses, searchTutors } from "@/app/admin/options";
import { LessonDetailDialog } from "@/components/admin/lesson-detail-dialog";
import { ScheduleCalendar } from "@/components/calendar/schedule-calendar";
import { Combobox } from "@/components/ui/combobox";
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
  const [chips, tutor, selectedClass, lesson] = await Promise.all([
    getLessonChips(from, to, filters),
    filters.tutor
      ? db.from("profiles").select("full_name").eq("id", filters.tutor).maybeSingle()
      : null,
    filters.class ? db.from("classes").select("name").eq("id", filters.class).maybeSingle() : null,
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
          <form action="/admin/schedule" method="get" className="flex flex-wrap gap-3">
            <input type="hidden" name="view" value={view} />
            <input type="hidden" name="date" value={date} />
            <label htmlFor="tutor" className="sr-only">
              Filter by tutor
            </label>
            <Combobox
              key={filters.tutor ?? "all-tutors"}
              name="tutor"
              loadOptions={searchTutors}
              defaultValue={filters.tutor ?? ""}
              defaultLabel={tutor?.data?.full_name}
              emptyLabel="All tutors"
              searchPlaceholder="Search tutors…"
              submitOnSelect
              className="w-56"
            />
            <label htmlFor="class" className="sr-only">
              Filter by class
            </label>
            <Combobox
              key={filters.class ?? "all-classes"}
              name="class"
              loadOptions={searchClasses}
              defaultValue={filters.class ?? ""}
              defaultLabel={selectedClass?.data?.name}
              emptyLabel="All classes"
              searchPlaceholder="Search classes…"
              submitOnSelect
              className="w-56"
            />
          </form>
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
