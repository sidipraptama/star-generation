import { Ban } from "lucide-react";
import { cancelLesson } from "@/app/admin/actions";
import { DialogForm } from "@/components/ui/dialog-form";
import { Field, Textarea } from "@/components/ui/field";

export function CancelLessonDialog({ lessonId, when }: { lessonId: string; when: string }) {
  const reasonId = `cancel-reason-${lessonId}`;

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
        Students will not be charged any hours for it and the tutor will not earn anything. A lesson
        that already has a logbook entry cannot be cancelled.
      </p>
      <Field label="Reason (optional)" htmlFor={reasonId}>
        <Textarea id={reasonId} name="reason" maxLength={500} />
      </Field>
    </DialogForm>
  );
}
