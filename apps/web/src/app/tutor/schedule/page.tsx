import type { Metadata } from "next";
import { BookOpen, Plus, Repeat } from "lucide-react";
import { ScheduleCalendar } from "@/components/calendar/schedule-calendar";
import { LessonDetail } from "@/components/tutor/lesson-detail";
import { AddLessonRouteDialog, RepeatLessonRouteDialog } from "@/components/tutor/schedule-dialogs";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { addDays, buildHref, parseCalendarParams, visibleRange } from "@/lib/calendar";
import { createClient } from "@/lib/supabase/server";
import { todayInWib } from "@/lib/time";
import { isUuid, rows } from "../_lib/data";
import { parseAddParam } from "../_lib/schedule";
import { getLessonDetail, getScheduleChips, scheduleLegend } from "./data";

export const metadata: Metadata = { title: "Schedule" };

const BASE_PATH = "/tutor/schedule";

type Props = {
  searchParams: Promise<{
    view?: string;
    date?: string;
    lesson?: string;
    add?: string;
    repeat?: string;
  }>;
};

export default async function TutorSchedulePage({ searchParams }: Props) {
  const params = await searchParams;
  const today = todayInWib();
  const { view, date } = parseCalendarParams(params, today);
  const tomorrow = addDays(today, 1);

  const db = await createClient();
  const [classesRes, chips] = await Promise.all([
    db.from("classes").select("id, name").order("name"),
    getScheduleChips(db, visibleRange(view, date)),
  ]);
  const classes = rows(classesRes);

  if (classes.length === 0) {
    return (
      <>
        <PageHeader title="Schedule" />
        <EmptyState
          icon={BookOpen}
          title="You do not teach any class yet"
          description="Once an admin assigns a class to you, its lessons will show up here."
        />
      </>
    );
  }

  const closeHref = buildHref(BASE_PATH, { view, date });
  const add = parseAddParam(params.add);
  const detail =
    params.lesson && isUuid(params.lesson) ? await getLessonDetail(db, params.lesson) : null;

  return (
    <>
      <PageHeader
        title="Schedule"
        description="All your lessons in one calendar. Click a lesson for details, or an empty time to add one."
        actions={
          <>
            <ButtonLink
              href={buildHref(BASE_PATH, { view, date, add: tomorrow })}
              scroll={false}
              prefetch={false}
            >
              <Plus className="size-4" aria-hidden />
              Add lesson
            </ButtonLink>
            <ButtonLink
              href={buildHref(BASE_PATH, { view, date, repeat: "1" })}
              scroll={false}
              prefetch={false}
              variant="secondary"
            >
              <Repeat className="size-4" aria-hidden />
              Repeat weekly
            </ButtonLink>
          </>
        }
      />

      <ScheduleCalendar
        view={view}
        date={date}
        today={today}
        basePath={BASE_PATH}
        chips={chips}
        legend={scheduleLegend}
        canAdd
      />

      {detail ? (
        <LessonDetail lesson={detail.lesson} hasEntry={detail.hasEntry} closeHref={closeHref} />
      ) : add ? (
        <AddLessonRouteDialog classes={classes} initial={add} closeHref={closeHref} />
      ) : params.repeat !== undefined ? (
        <RepeatLessonRouteDialog classes={classes} defaultDate={tomorrow} closeHref={closeHref} />
      ) : null}
    </>
  );
}
