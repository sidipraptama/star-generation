import Link from "next/link";
import { Repeat } from "lucide-react";
import { cancelLesson, cancelLessonSeries } from "@/app/admin/actions";
import type { LessonDetail } from "@/app/admin/schedule/data";
import { StatusBadge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/field";
import { RouteActionForm, RouteDialog } from "@/components/ui/route-dialog";
import { SubmitButton } from "@/components/ui/submit-button";
import { formatDuration, formatLessonWhen, lessonMinutes } from "@/lib/format";
import { isPast } from "@/lib/time";

type LessonDetailDialogProps = {
  lesson: LessonDetail;
  closeHref: string;
};

export function LessonDetailDialog({ lesson, closeHref }: LessonDetailDialogProps) {
  const ended = isPast(lesson.endAt);
  const scheduled = lesson.status === "scheduled";
  const canCancel = scheduled && !lesson.hasEntry;
  const canCancelSeries = lesson.inSeries && lesson.upcomingInSeries > 0;
  const formClass = "border-cloud space-y-3 border-t pt-4";

  return (
    <RouteDialog
      title="Lesson details"
      description={formatLessonWhen(lesson.startAt, lesson.endAt)}
      closeHref={closeHref}
    >
      <div className="space-y-4 p-5">
        <dl className="grid grid-cols-[6rem_1fr] gap-x-4 gap-y-3 text-sm">
          <dt className="text-muted">Class</dt>
          <dd>
            <Link
              href={`/admin/classes/${lesson.classId}`}
              className="font-semibold hover:underline"
            >
              {lesson.className}
            </Link>
          </dd>
          <dt className="text-muted">Tutor</dt>
          <dd>{lesson.tutorName}</dd>
          <dt className="text-muted">Length</dt>
          <dd>{formatDuration(lessonMinutes(lesson.startAt, lesson.endAt))}</dd>
          <dt className="text-muted">Status</dt>
          <dd>
            <StatusBadge kind="lesson" status={lesson.status} />
          </dd>
          {scheduled && ended && (
            <>
              <dt className="text-muted">Logbook</dt>
              <dd>
                {lesson.hasEntry
                  ? "The entry has been written."
                  : "No entry yet. The tutor still needs to write it."}
              </dd>
            </>
          )}
          {lesson.cancelReason && (
            <>
              <dt className="text-muted">Reason</dt>
              <dd>{lesson.cancelReason}</dd>
            </>
          )}
        </dl>

        {lesson.inSeries && (
          <p className="text-muted flex items-center gap-2 text-sm">
            <Repeat className="size-4" aria-hidden />
            Part of a weekly series.
          </p>
        )}

        {canCancel && (
          <RouteActionForm action={cancelLesson} closeHref={closeHref} className={formClass}>
            <input type="hidden" name="lessonId" value={lesson.id} />
            <p className="text-sm">
              {ended
                ? "Use this if the lesson did not take place, so students are not charged for it."
                : "Students are not charged for a cancelled lesson and the tutor earns nothing for it."}
            </p>
            <Field label="Reason (optional)" htmlFor="cancel-reason">
              <Textarea id="cancel-reason" name="reason" rows={2} maxLength={500} />
            </Field>
            <div className="flex justify-end">
              <SubmitButton variant="danger">Cancel this lesson</SubmitButton>
            </div>
          </RouteActionForm>
        )}

        {canCancelSeries && (
          <RouteActionForm action={cancelLessonSeries} closeHref={closeHref} className={formClass}>
            <input type="hidden" name="lessonId" value={lesson.id} />
            <p className="text-sm">
              Cancels this lesson and every later upcoming lesson of the same weekly series (
              {lesson.upcomingInSeries} in total). Lessons that already took place or have a logbook
              entry are not touched.
            </p>
            <Field label="Reason (optional)" htmlFor="cancel-series-reason">
              <Textarea id="cancel-series-reason" name="reason" rows={2} maxLength={500} />
            </Field>
            <div className="flex justify-end">
              <SubmitButton variant="danger">Cancel this and all following lessons</SubmitButton>
            </div>
          </RouteActionForm>
        )}

        <div className="flex justify-end">
          <ButtonLink href={closeHref} scroll={false} variant="ghost">
            Close
          </ButtonLink>
        </div>
      </div>
    </RouteDialog>
  );
}
