import { PencilLine, Send } from "lucide-react";
import { saveLogbookEntry, submitLogbook } from "@/app/tutor/actions";
import { DialogForm } from "@/components/ui/dialog-form";
import { Field, Input, Textarea } from "@/components/ui/field";

type EntryValues = {
  topic: string;
  activities: string;
  observation: string;
  recommendation: string;
};

type EntryDialogProps = {
  lessonId: string;
  when: string;
  entry?: EntryValues;
};

export function EntryDialog({ lessonId, when, entry }: EntryDialogProps) {
  const fieldId = (name: string) => `${name}-${lessonId}`;

  return (
    <DialogForm
      action={saveLogbookEntry}
      triggerLabel={entry ? "Edit entry" : "Write entry"}
      triggerIcon={<PencilLine className="size-4" aria-hidden />}
      triggerVariant={entry ? "secondary" : "primary"}
      triggerSize="sm"
      title={entry ? "Edit logbook entry" : "Write logbook entry"}
      description={when}
      submitLabel="Save entry"
    >
      <input type="hidden" name="lessonId" value={lessonId} />
      <Field label="Topic" htmlFor={fieldId("topic")} hint="What was this lesson about?">
        <Input
          id={fieldId("topic")}
          name="topic"
          defaultValue={entry?.topic}
          placeholder="e.g. Ordering food and drinks"
          required
        />
      </Field>
      <Field label="What we did" htmlFor={fieldId("activities")}>
        <Textarea
          id={fieldId("activities")}
          name="activities"
          defaultValue={entry?.activities}
          placeholder="What did you and the students do in the lesson?"
          required
        />
      </Field>
      <Field label="Tutor observation" htmlFor={fieldId("observation")}>
        <Textarea
          id={fieldId("observation")}
          name="observation"
          defaultValue={entry?.observation}
          placeholder="How did the students do? Anything to keep an eye on?"
          required
        />
      </Field>
      <Field label="What comes next" htmlFor={fieldId("recommendation")}>
        <Textarea
          id={fieldId("recommendation")}
          name="recommendation"
          defaultValue={entry?.recommendation}
          placeholder="What should the next lesson cover, or what should students practise?"
          required
        />
      </Field>
    </DialogForm>
  );
}

export function SubmitLogbookDialog({ logbookId, month }: { logbookId: string; month: string }) {
  return (
    <DialogForm
      action={submitLogbook}
      triggerLabel="Submit for approval"
      triggerIcon={<Send className="size-4" aria-hidden />}
      triggerVariant="primary"
      title={`Submit the ${month} logbook?`}
      description="Please check your entries first."
      submitLabel="Submit logbook"
    >
      <input type="hidden" name="logbookId" value={logbookId} />
      <p className="text-sm">
        Once submitted, the logbook becomes read-only until an admin reviews it. If something needs
        fixing, the admin will send it back to you with a note.
      </p>
    </DialogForm>
  );
}
