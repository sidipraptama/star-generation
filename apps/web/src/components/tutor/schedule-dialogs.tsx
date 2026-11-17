import { scheduleLesson, scheduleLessonsWeekly } from "@/app/tutor/actions";
import { RecurringFields } from "@/components/tutor/recurring-fields";
import { Field, Input, Select } from "@/components/ui/field";
import { RouteDialogForm } from "@/components/ui/route-dialog";
import { todayInWib } from "@/lib/time";

type ClassOption = { id: string; name: string };

type AddLessonRouteDialogProps = {
  classes: ClassOption[];
  initial: { date: string; start: string; end: string };
  closeHref: string;
};

export function AddLessonRouteDialog({ classes, initial, closeHref }: AddLessonRouteDialogProps) {
  return (
    <RouteDialogForm
      action={scheduleLesson}
      closeHref={closeHref}
      title="Add a lesson"
      description="Pick the day and the time the lesson starts and ends."
      submitLabel="Add lesson"
    >
      {classes.length === 1 ? (
        <input type="hidden" name="classId" value={classes[0].id} />
      ) : (
        <Field label="Class" htmlFor="classId">
          <Select name="classId" required defaultValue={classes[0]?.id}>
            {classes.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </Select>
        </Field>
      )}
      <Field label="Date" htmlFor="date">
        <Input name="date" type="date" min={todayInWib()} required defaultValue={initial.date} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Starts at" htmlFor="startTime">
          <Input name="startTime" type="time" required defaultValue={initial.start} />
        </Field>
        <Field label="Ends at" htmlFor="endTime">
          <Input name="endTime" type="time" required defaultValue={initial.end} />
        </Field>
      </div>
      <p className="text-muted text-xs">
        All times are in WIB (Jakarta time). A lesson must be in the future and cannot overlap with
        another lesson of yours.
      </p>
    </RouteDialogForm>
  );
}

type RepeatLessonRouteDialogProps = {
  classes: ClassOption[];
  defaultDate: string;
  closeHref: string;
};

export function RepeatLessonRouteDialog({
  classes,
  defaultDate,
  closeHref,
}: RepeatLessonRouteDialogProps) {
  return (
    <RouteDialogForm
      action={scheduleLessonsWeekly}
      closeHref={closeHref}
      title="Repeat weekly"
      description="Create the same lesson on the days you choose, week after week."
      submitLabel="Create lessons"
    >
      <RecurringFields classes={classes} defaultDate={defaultDate} minDate={todayInWib()} />
    </RouteDialogForm>
  );
}
