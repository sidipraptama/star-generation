import { Field, Input, Select, Textarea } from "@/components/ui/field";

type ClassDefaults = {
  name?: string;
  description?: string | null;
  tutorId?: string;
  capacity?: number;
  studentRate?: number;
  tutorRate?: number;
};

type ClassFormFieldsProps = {
  tutors: { id: string; full_name: string }[];
  idPrefix: string;
  defaults?: ClassDefaults;
};

export function ClassFormFields({ tutors, idPrefix, defaults = {} }: ClassFormFieldsProps) {
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
        <Select id={id("tutorId")} name="tutorId" defaultValue={defaults.tutorId ?? ""} required>
          <option value="" disabled>
            Choose a tutor
          </option>
          {tutors.map((tutor) => (
            <option key={tutor.id} value={tutor.id}>
              {tutor.full_name}
            </option>
          ))}
        </Select>
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
