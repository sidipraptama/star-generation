import { Ban, Plus } from "lucide-react";
import { cancelLesson, scheduleLesson } from "@/app/tutor/actions";
import { DialogForm } from "@/components/ui/dialog-form";
import { Field, Input, Textarea } from "@/components/ui/field";
import { todayInWib } from "@/lib/time";

export function AddLessonDialog({ classId }: { classId: string }) {
  return (
    <DialogForm
      action={scheduleLesson}
      triggerLabel="Add lesson"
      triggerIcon={<Plus className="size-4" aria-hidden />}
      triggerVariant="primary"
      title="Add a lesson"
      description="Pick the day and the time the lesson starts and ends."
      submitLabel="Add lesson"
    >
      <input type="hidden" name="classId" value={classId} />
      <Field label="Date" htmlFor="date">
        <Input name="date" type="date" min={todayInWib()} required />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Starts at" htmlFor="startTime">
          <Input name="startTime" type="time" required />
        </Field>
        <Field label="Ends at" htmlFor="endTime">
          <Input name="endTime" type="time" required />
        </Field>
      </div>
      <p className="text-muted text-xs">
        All times are in WIB (Jakarta time). A lesson must be in the future and cannot overlap with
        another lesson of yours.
      </p>
    </DialogForm>
  );
}

export function CancelLessonDialog({ lessonId, when }: { lessonId: string; when: string }) {
  return (
    <DialogForm
      action={cancelLesson}
      triggerLabel="Cancel lesson"
      triggerIcon={<Ban className="size-4" aria-hidden />}
      triggerVariant="ghost"
      triggerSize="sm"
      title="Cancel this lesson?"
      description={when}
      submitLabel="Yes, cancel lesson"
      submitVariant="danger"
    >
      <input type="hidden" name="lessonId" value={lessonId} />
      <p className="text-sm">
        Students will not be charged for a cancelled lesson, and it will not appear in your logbook.
      </p>
      <Field label="Reason (optional)" htmlFor={`reason-${lessonId}`}>
        <Textarea id={`reason-${lessonId}`} name="reason" rows={2} placeholder="e.g. I am unwell" />
      </Field>
    </DialogForm>
  );
}
