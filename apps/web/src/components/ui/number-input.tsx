"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { caretAfterDigits, clamp, parseDigits, stepValue } from "@/lib/number-input";

const grouping = new Intl.NumberFormat("id-ID");

const stepButtonClass =
  "text-navy hover:bg-cloud/50 flex w-10 items-center justify-center disabled:opacity-35 disabled:hover:bg-transparent";

type NumberInputProps = {
  id: string;
  name: string;
  min: number;
  max: number;
  step?: number;
  prefix?: string;
  suffix?: string;
  placeholder?: string;
  defaultValue?: number;
  value?: number | null;
  onValueChange?: (value: number | null) => void;
  required?: boolean;
};

export function NumberInput({
  id,
  name,
  min,
  max,
  step = 1,
  prefix,
  suffix,
  placeholder,
  defaultValue,
  value,
  onValueChange,
  required,
}: NumberInputProps) {
  const [inner, setInner] = useState<number | null>(defaultValue ?? null);
  const inputRef = useRef<HTMLInputElement>(null);
  const caretDigits = useRef<number | null>(null);
  const current = value === undefined ? inner : value;
  const bounds = { min, max, step };

  useLayoutEffect(() => {
    const input = inputRef.current;
    if (caretDigits.current === null || !input) return;
    const position = caretAfterDigits(input.value, caretDigits.current);
    input.setSelectionRange(position, position);
    caretDigits.current = null;
  });

  function update(next: number | null) {
    if (value === undefined) setInner(next);
    onValueChange?.(next);
  }

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const { value: text, selectionStart } = event.target;
    caretDigits.current = text.slice(0, selectionStart ?? text.length).replace(/\D/g, "").length;
    const parsed = parseDigits(text);
    update(parsed === null ? null : Math.min(parsed, max));
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
    event.preventDefault();
    update(stepValue(current, event.key === "ArrowUp" ? 1 : -1, bounds));
  }

  return (
    <div className="rounded-card border-cloud outline-navy has-[input:focus-visible]:border-navy flex overflow-hidden border bg-white has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2">
      {prefix && (
        <span className="bg-cloud/40 text-muted border-cloud flex items-center border-r px-3 text-sm font-semibold">
          {prefix}
        </span>
      )}
      <input
        ref={inputRef}
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        role="spinbutton"
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={current ?? undefined}
        placeholder={placeholder}
        required={required}
        value={current === null ? "" : grouping.format(current)}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={() => current !== null && current < min && update(clamp(current, bounds))}
        className="text-navy placeholder:text-muted min-w-0 flex-1 bg-transparent px-3 py-2 text-sm font-semibold outline-none"
      />
      <input type="hidden" name={name} value={current ?? ""} />
      {suffix && (
        <span className="text-muted flex items-center pr-3 text-sm whitespace-nowrap">
          {suffix}
        </span>
      )}
      <div className="border-cloud flex border-l">
        <button
          type="button"
          tabIndex={-1}
          aria-label="Decrease"
          disabled={current !== null && current <= min}
          onClick={() => update(stepValue(current, -1, bounds))}
          className={stepButtonClass}
        >
          <Minus className="size-4" aria-hidden />
        </button>
        <button
          type="button"
          tabIndex={-1}
          aria-label="Increase"
          disabled={current !== null && current >= max}
          onClick={() => update(stepValue(current, 1, bounds))}
          className={`${stepButtonClass} border-cloud border-l`}
        >
          <Plus className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
