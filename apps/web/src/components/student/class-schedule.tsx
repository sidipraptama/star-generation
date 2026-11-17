import { CalendarDays, CircleCheck } from "lucide-react";
import clsx from "clsx";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDuration, formatLessonWhen, lessonMinutes } from "@/lib/format";
import { isPast } from "@/lib/time";

export type ScheduleLesson = {
  id: string;
  start_at: string;
  end_at: string;
  status: "scheduled" | "cancelled";
};

function LessonRow({ lesson }: { lesson: ScheduleLesson }) {
  const cancelled = lesson.status === "cancelled";
  const done = !cancelled && isPast(lesson.end_at);

  return (
    <li className="flex flex-wrap items-center justify-between gap-2 py-3">
      <div className={clsx("flex items-center gap-3", cancelled && "text-muted line-through")}>
        <CalendarDays className="size-4 shrink-0" aria-hidden />
        <span className="text-sm font-semibold">
          {formatLessonWhen(lesson.start_at, lesson.end_at)}
        </span>
        <span className="text-muted text-xs">
          {formatDuration(lessonMinutes(lesson.start_at, lesson.end_at))}
        </span>
      </div>
      {cancelled && <StatusBadge kind="lesson" status="cancelled" />}
      {done && (
        <Badge icon={CircleCheck} tone="neutral">
          Completed
        </Badge>
      )}
    </li>
  );
}

function LessonGroup({ title, lessons }: { title: string; lessons: ScheduleLesson[] }) {
  if (lessons.length === 0) return null;

  return (
    <div>
      <h3 className="text-muted text-xs font-semibold tracking-wide uppercase">{title}</h3>
      <ul className="divide-cloud/70 divide-y">
        {lessons.map((lesson) => (
          <LessonRow key={lesson.id} lesson={lesson} />
        ))}
      </ul>
    </div>
  );
}

export function ClassSchedule({ lessons }: { lessons: ScheduleLesson[] }) {
  const upcoming = lessons.filter((lesson) => !isPast(lesson.end_at));
  const past = lessons.filter((lesson) => isPast(lesson.end_at)).reverse();

  return (
    <Card title="Schedule" description="All times are in WIB (Jakarta time).">
      {lessons.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No lessons yet"
          description="Your tutor will add lessons soon. They will show up here."
        />
      ) : (
        <div className="space-y-5">
          <LessonGroup title="Coming up" lessons={upcoming} />
          <LessonGroup title="Past lessons" lessons={past} />
        </div>
      )}
    </Card>
  );
}
