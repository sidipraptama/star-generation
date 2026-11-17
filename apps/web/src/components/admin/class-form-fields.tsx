import { searchTutors } from "@/app/admin/options";
import { Combobox } from "@/components/ui/combobox";
import { Field, Input, Textarea } from "@/components/ui/field";
import { NumberInput } from "@/components/ui/number-input";

const RATE_STEP = 10_000;
const MAX_RATE = 10_000_000;

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
      <Field label="Seats" htmlFor={id("capacity")} hint="The most students this class can have.">
        <NumberInput
          id={id("capacity")}
          name="capacity"
          min={1}
          max={100}
          suffix="students"
          defaultValue={defaults.capacity}
          required
        />
      </Field>
      <Field
        label="Student rate"
        htmlFor={id("studentRate")}
        hint="What a student pays for each hour. Use + and − to change it by Rp10.000."
      >
        <NumberInput
          id={id("studentRate")}
          name="studentRate"
          min={RATE_STEP}
          max={MAX_RATE}
          step={RATE_STEP}
          prefix="Rp"
          suffix="/ hour"
          placeholder="150.000"
          defaultValue={defaults.studentRate}
          required
        />
      </Field>
      <Field
        label="Tutor rate"
        htmlFor={id("tutorRate")}
        hint="What the tutor earns for each lesson hour."
      >
        <NumberInput
          id={id("tutorRate")}
          name="tutorRate"
          min={RATE_STEP}
          max={MAX_RATE}
          step={RATE_STEP}
          prefix="Rp"
          suffix="/ hour"
          placeholder="100.000"
          defaultValue={defaults.tutorRate}
          required
        />
      </Field>
    </>
  );
}
