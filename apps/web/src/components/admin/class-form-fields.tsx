import { searchTutors } from "@/app/admin/options";
import { Combobox } from "@/components/ui/combobox";
import { Field, Input, Textarea } from "@/components/ui/field";

type ClassDefaults = {
  name?: string;
  description?: string | null;
  tutorId?: string;
  tutorName?: string;
  capacity?: number;
  studentRate?: number;
  tutorRate?: number;
};

type ClassFormFieldsProps = {
  idPrefix: string;
  defaults?: ClassDefaults;
};

export function ClassFormFields({ idPrefix, defaults = {} }: ClassFormFieldsProps) {
  const id = (name: string) => `${idPrefix}-${name}`;

  return (
    <>
      <Field label="Class name" htmlFor={id("name")}>
        <Input
          id={id("name")}
          name="name"
          defaultValue={defaults.name}
          placeholder="e.g. English Conversation - Group A"
          maxLength={100}
          required
        />
      </Field>
      <Field label="Description (optional)" htmlFor={id("description")}>
        <Textarea
          id={id("description")}
          name="description"
          defaultValue={defaults.description ?? ""}
          maxLength={500}
        />
      </Field>
      <Field label="Tutor" htmlFor={id("tutorId")}>
        <Combobox
          id={id("tutorId")}
          name="tutorId"
          loadOptions={searchTutors}
          defaultValue={defaults.tutorId}
          defaultLabel={defaults.tutorName}
          placeholder="Choose a tutor"
          searchPlaceholder="Search tutors…"
          required
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Seats" htmlFor={id("capacity")} hint="Maximum students">
          <Input
            id={id("capacity")}
            name="capacity"
            type="number"
            inputMode="numeric"
            min={1}
            max={100}
            defaultValue={defaults.capacity}
            required
          />
        </Field>
        <Field label="Student rate" htmlFor={id("studentRate")} hint="Rupiah per hour">
          <Input
            id={id("studentRate")}
            name="studentRate"
            type="number"
            inputMode="numeric"
            min={1}
            max={10000000}
            defaultValue={defaults.studentRate}
            required
          />
        </Field>
        <Field label="Tutor rate" htmlFor={id("tutorRate")} hint="Rupiah per hour">
          <Input
            id={id("tutorRate")}
            name="tutorRate"
            type="number"
            inputMode="numeric"
            min={1}
            max={10000000}
            defaultValue={defaults.tutorRate}
            required
          />
        </Field>
      </div>
    </>
  );
}
