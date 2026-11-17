import Link from "next/link";
import { Repeat } from "lucide-react";
import { cancelLesson, cancelLessonSeries } from "@/app/tutor/actions";
import { monthSlug } from "@/app/tutor/_lib/logbook";
import { Alert } from "@/components/ui/alert";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/field";
import { RouteActionForm, RouteDialog } from "@/components/ui/route-dialog";
import { SubmitButton } from "@/components/ui/submit-button";
import { formatLessonWhen } from "@/lib/format";
import { isPast, wibMonthOf } from "@/lib/time";

type LessonDetailProps = {
  lesson: {
    id: string;
    class_id: string;
    start_at: string;
    end_at: string;
    status: "scheduled" | "cancelled";
    series_id: string | null;
    cancel_reason: string | null;
    classes: { name: string } | null;
  };
  hasEntry: boolean;
  closeHref: string;
};

export function LessonDetail({ lesson, hasEntry, closeHref }: LessonDetailProps) {
  const className = lesson.classes?.name ?? "Class";
  const ended = isPast(lesson.end_at);
  const scheduled = lesson.status === "scheduled";
  const logbookHref = `/tutor/classes/${lesson.class_id}/logbook/${monthSlug(wibMonthOf(lesson.start_at))}`;

  return (
    <RouteDialog
      title={className}
      description={formatLessonWhen(lesson.start_at, lesson.end_at)}
      closeHref={closeHref}
    >
      <div className="space-y-4 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge kind="lesson" status={lesson.status} />
          {lesson.series_id && <Badge icon={Repeat}>Part of a weekly series</Badge>}
        </div>

        {lesson.status === "cancelled" && lesson.cancel_reason && (
          <p className="text-sm">
            <span className="font-semibold">Reason:</span> {lesson.cancel_reason}
          </p>
        )}

        {scheduled && ended && (
          <Alert tone={hasEntry ? "success" : "info"}>
            {hasEntry ? (
              <>
                The logbook entry for this lesson is written.{" "}
                <Link href={logbookHref} className="font-semibold underline">
                  Open the logbook
                </Link>
              </>
            ) : (
              "This lesson has ended and still needs a logbook entry."
            )}
          </Alert>
        )}

        <div className="flex flex-wrap gap-2">
          {scheduled && ended && !hasEntry && (
            <ButtonLink href={logbookHref}>Write the logbook entry</ButtonLink>
          )}
          <ButtonLink href={`/tutor/classes/${lesson.class_id}`} variant="secondary">
            Open class
          </ButtonLink>
        </div>

        {scheduled && ended && (
          <p className="text-muted text-xs">
            A finished lesson cannot be cancelled here. If it did not take place, ask an admin.
          </p>
        )}
      </div>

      {scheduled && !ended && (
        <div className="border-cloud space-y-5 border-t p-5">
          <RouteActionForm action={cancelLesson} closeHref={closeHref} className="space-y-3">
            <input type="hidden" name="lessonId" value={lesson.id} />
            <Field label="Cancel this lesson (reason is optional)" htmlFor="reason">
              <Textarea name="reason" rows={2} placeholder="e.g. I am unwell" />
            </Field>
            <SubmitButton variant="danger">Cancel this lesson</SubmitButton>
          </RouteActionForm>

          {lesson.series_id && (
            <RouteActionForm
              action={cancelLessonSeries}
              closeHref={closeHref}
              className="border-cloud space-y-3 border-t pt-5"
            >
              <input type="hidden" name="lessonId" value={lesson.id} />
              <Field
                label="Cancel the rest of the series"
                htmlFor="series-reason"
                hint="Cancels this lesson and every later lesson of the series. Lessons that already took place, or already have a logbook entry, are not touched."
              >
                <Textarea
                  id="series-reason"
                  name="reason"
                  rows={2}
                  placeholder="Reason (optional)"
                />
              </Field>
              <SubmitButton variant="danger">Cancel this and all following lessons</SubmitButton>
            </RouteActionForm>
          )}
        </div>
      )}
    </RouteDialog>
  );
}
