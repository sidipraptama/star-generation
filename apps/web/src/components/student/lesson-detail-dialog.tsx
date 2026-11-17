import { ButtonLink } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { RouteDialog } from "@/components/ui/route-dialog";
import { formatLessonWhen } from "@/lib/format";
import { isPast } from "@/lib/time";

type LessonDetail = {
  lesson: {
    id: string;
    class_id: string;
    start_at: string;
    end_at: string;
    status: "scheduled" | "cancelled";
  };
  className: string;
  tutorName: string;
  covered: boolean | undefined;
};

function hoursSentence({ lesson, covered }: LessonDetail) {
  if (lesson.status === "cancelled") return "This lesson was cancelled, so no hours are used.";
  if (isPast(lesson.end_at))
    return "This lesson took place and its hours were taken from your package.";
  return covered === false
    ? "Your remaining hours do not cover this lesson yet. Add more hours to keep it in your schedule."
    : "Your remaining hours cover this lesson.";
}

export function LessonDetailDialog({
  detail,
  closeHref,
}: {
  detail: LessonDetail;
  closeHref: string;
}) {
  const { lesson, className, tutorName } = detail;

  return (
    <RouteDialog title="Lesson details" description={className} closeHref={closeHref}>
      <div className="space-y-4 p-5">
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="text-muted text-xs font-semibold tracking-wide uppercase">When</dt>
            <dd className="font-semibold">{formatLessonWhen(lesson.start_at, lesson.end_at)}</dd>
          </div>
          <div>
            <dt className="text-muted text-xs font-semibold tracking-wide uppercase">Tutor</dt>
            <dd>{tutorName}</dd>
          </div>
          <div>
            <dt className="text-muted text-xs font-semibold tracking-wide uppercase">Status</dt>
            <dd className="mt-1">
              <StatusBadge kind="lesson" status={lesson.status} />
            </dd>
          </div>
        </dl>
        <p className="text-sm">{hoursSentence(detail)}</p>
        <div className="flex justify-end">
          <ButtonLink href={`/student/classes/${lesson.class_id}`} variant="secondary">
            Open class
          </ButtonLink>
        </div>
      </div>
    </RouteDialog>
  );
}
