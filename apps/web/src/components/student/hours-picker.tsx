"use client";

import { useState } from "react";
import { Field } from "@/components/ui/field";
import { NumberInput } from "@/components/ui/number-input";
import { formatRupiah } from "@/lib/format";

const presets = [6, 12, 24];

export function HoursPicker({ rate }: { rate: number }) {
  const [hours, setHours] = useState<number | null>(12);
  const total = hours !== null && hours >= 1 ? hours * rate : null;

  return (
    <div className="space-y-4">
      <fieldset>
        <legend className="mb-1.5 text-sm font-semibold">How many hours do you want?</legend>
        <div className="grid grid-cols-3 gap-2">
          {presets.map((preset) => (
            <label key={preset} className="cursor-pointer">
              <input
                type="radio"
                name="preset"
                className="peer sr-only"
                checked={hours === preset}
                onChange={() => setHours(preset)}
              />
              <span className="rounded-card border-cloud peer-checked:border-navy peer-checked:bg-navy peer-focus-visible:outline-navy block border bg-white px-3 py-2 text-center text-sm font-semibold peer-checked:text-white peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2">
                {preset} hours
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <Field label="Or choose another number" htmlFor="hours" hint="Between 1 and 200 hours.">
        <NumberInput
          id="hours"
          name="hours"
          min={1}
          max={200}
          suffix="hours"
          required
          value={hours}
          onValueChange={setHours}
        />
      </Field>

      <div className="rounded-card bg-gold/20 p-4">
        <p className="text-muted text-sm">
          {total !== null ? `${hours} hours × ${formatRupiah(rate)}` : "Choose the number of hours"}
        </p>
        <p className="text-xl font-bold">Total: {total !== null ? formatRupiah(total) : "—"}</p>
      </div>
    </div>
  );
}
