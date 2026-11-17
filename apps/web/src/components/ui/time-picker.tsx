"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { Check, Clock } from "lucide-react";
import { controlClass } from "@/components/ui/field";
import { Picker, usePopover } from "@/components/ui/picker";
import { parseTime, timeRows, timeSlots } from "@/lib/time-picker";

const MIN_WIDTH = 200;
const PANEL_HEIGHT = 330;
const FIRST_VISIBLE = "08:00";

type TimePickerProps = {
  name: string;
  id?: string;
  /** A time as HH:mm. */
  defaultValue?: string;
  /** Minutes between the times in the list. Any time can still be typed. */
  step?: number;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  onValueChange?: (value: string) => void;
};

export function TimePicker({
  name,
  id,
  defaultValue = "",
  step = 15,
  placeholder = "Choose a time",
  required,
  disabled,
  className,
  onValueChange,
}: TimePickerProps) {
  const listId = useId();
  const popover = usePopover({ minWidth: MIN_WIDTH, height: PANEL_HEIGHT });
  const [value, setValue] = useState(defaultValue);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const centerNext = useRef(false);
  const { open } = popover;

  const slots = useMemo(() => timeSlots(step), [step]);
  const rows = useMemo(() => timeRows(slots, query), [slots, query]);
  const optionId = (index: number) => `${listId}-option-${index}`;

  useEffect(() => {
    if (open) inputRef.current?.focus({ preventScroll: true });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const row = document.getElementById(`${listId}-option-${active}`);
    const list = listRef.current;
    if (!row || !list) return;

    if (centerNext.current) {
      centerNext.current = false;
      list.scrollTop = row.offsetTop - (list.clientHeight - row.offsetHeight) / 2;
    } else {
      row.scrollIntoView({ block: "nearest" });
    }
  }, [open, active, listId]);

  function openPicker() {
    if (disabled) return;
    const start = value || FIRST_VISIBLE;
    const index = slots.findIndex((slot) => slot >= start);
    setQuery("");
    setActive(index === -1 ? slots.length - 1 : index);
    centerNext.current = true;
    popover.show();
  }

  function choose(time: string) {
    setValue(time);
    onValueChange?.(time);
    popover.close(true);
  }

  function onSearch(text: string) {
    setQuery(text);
    setActive(0);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((index) => Math.min(index + 1, rows.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const typed = parseTime(query);
      const picked = rows[active] ?? typed;
      if (picked) choose(picked);
    } else if (event.key === "Tab") {
      popover.close(false);
    }
  }

  return (
    <Picker
      controller={popover}
      name={name}
      id={id}
      value={value}
      display={value}
      placeholder={placeholder}
      icon={Clock}
      popup="dialog"
      popupId={listId}
      onOpen={openPicker}
      required={required}
      disabled={disabled}
      className={className}
      panelLabel="Choose a time"
    >
      {open && (
        <>
          <div className="border-cloud border-b p-2">
            <input
              ref={inputRef}
              type="text"
              role="combobox"
              aria-label="Type a time"
              aria-expanded
              aria-controls={listId}
              aria-activedescendant={rows[active] ? optionId(active) : undefined}
              aria-autocomplete="list"
              autoComplete="off"
              inputMode="numeric"
              value={query}
              placeholder="Type a time, e.g. 16:30"
              onChange={(event) => onSearch(event.target.value)}
              onKeyDown={onKeyDown}
              className={controlClass}
            />
          </div>

          <div ref={listRef} className="relative max-h-60 overflow-y-auto">
            <ul id={listId} role="listbox" aria-label="Times" className="py-1">
              {rows.map((time, index) => (
                <li
                  key={time}
                  id={optionId(index)}
                  role="option"
                  aria-selected={time === value}
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseMove={() => setActive(index)}
                  onClick={() => choose(time)}
                  className={clsx(
                    "flex cursor-pointer items-center justify-between gap-2 px-3 py-2 text-sm",
                    index === active && "bg-navy/5",
                    time === value && "font-semibold",
                  )}
                >
                  {time}
                  {time === value && <Check className="size-4 shrink-0" aria-hidden />}
                </li>
              ))}
            </ul>
            {rows.length === 0 && (
              <p className="text-muted px-3 py-2 text-sm">Type a time like 16:30.</p>
            )}
          </div>
        </>
      )}
    </Picker>
  );
}
