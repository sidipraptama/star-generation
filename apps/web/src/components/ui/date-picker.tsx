"use client";

import { useEffect, useId, useRef, useState } from "react";
import clsx from "clsx";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { Picker, usePopover } from "@/components/ui/picker";
import {
  addDays,
  addMonths,
  dayOfMonth,
  fullDateLabel,
  isValidDate,
  monthStart,
  rangeTitle,
  shiftMonth,
  visibleDays,
  weekStart,
} from "@/lib/calendar";
import { todayInWib } from "@/lib/time";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MIN_WIDTH = 288;
const PANEL_HEIGHT = 380;

const navButtonClass =
  "rounded-card text-navy hover:bg-navy/5 flex size-8 items-center justify-center disabled:opacity-35 disabled:hover:bg-transparent";

const KEY_STEPS: Record<string, number> = {
  ArrowLeft: -1,
  ArrowRight: 1,
  ArrowUp: -7,
  ArrowDown: 7,
};

type DatePickerProps = {
  name: string;
  id?: string;
  /** A date as YYYY-MM-DD. */
  defaultValue?: string;
  min?: string;
  max?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  onValueChange?: (value: string) => void;
};

export function DatePicker({
  name,
  id,
  defaultValue = "",
  min,
  max,
  placeholder = "Choose a date",
  required,
  disabled,
  className,
  onValueChange,
}: DatePickerProps) {
  const panelId = useId();
  const popover = usePopover({ minWidth: MIN_WIDTH, height: PANEL_HEIGHT });
  const [value, setValue] = useState(defaultValue);
  const [cursor, setCursor] = useState("");
  const gridRef = useRef<HTMLDivElement>(null);
  const focusCursor = useRef(false);
  const { open } = popover;

  const outOfRange = (day: string) =>
    (min !== undefined && day < min) || (max !== undefined && day > max);
  const clampToRange = (day: string) => {
    if (min !== undefined && day < min) return min;
    if (max !== undefined && day > max) return max;
    return day;
  };

  useEffect(() => {
    if (!open || !focusCursor.current) return;
    focusCursor.current = false;
    gridRef.current
      ?.querySelector<HTMLElement>(`[data-date="${cursor}"]`)
      ?.focus({ preventScroll: true });
  }, [open, cursor]);

  function openPicker() {
    if (disabled) return;
    setCursor(clampToRange(isValidDate(value) ? value : todayInWib()));
    focusCursor.current = true;
    popover.show();
  }

  function choose(day: string) {
    if (outOfRange(day)) return;
    setValue(day);
    onValueChange?.(day);
    popover.close(true);
  }

  function moveCursor(next: string) {
    focusCursor.current = true;
    setCursor(next);
  }

  function onGridKeyDown(event: React.KeyboardEvent) {
    const days = KEY_STEPS[event.key];
    let next: string;
    if (days) next = addDays(cursor, days);
    else if (event.key === "PageUp") next = shiftMonth(cursor, -1);
    else if (event.key === "PageDown") next = shiftMonth(cursor, 1);
    else if (event.key === "Home") next = weekStart(cursor);
    else if (event.key === "End") next = addDays(weekStart(cursor), 6);
    else return;
    event.preventDefault();
    moveCursor(next);
  }

  const today = todayInWib();
  const title = cursor ? rangeTitle("month", cursor) : "";
  const previousDisabled =
    cursor !== "" && min !== undefined && addDays(monthStart(cursor), -1) < min;
  const nextDisabled = cursor !== "" && max !== undefined && addMonths(cursor, 1) > max;

  return (
    <Picker
      controller={popover}
      name={name}
      id={id}
      value={value}
      display={isValidDate(value) ? fullDateLabel(value) : ""}
      placeholder={placeholder}
      icon={CalendarDays}
      popup="dialog"
      popupId={panelId}
      onOpen={openPicker}
      required={required}
      disabled={disabled}
      className={className}
      panelLabel="Choose a date"
    >
      {open && cursor && (
        <div id={panelId} className="p-3">
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              aria-label="Previous month"
              disabled={previousDisabled}
              onClick={() => setCursor(shiftMonth(cursor, -1))}
              className={navButtonClass}
            >
              <ChevronLeft className="size-4" aria-hidden />
            </button>
            <p aria-live="polite" className="text-sm font-bold">
              {title}
            </p>
            <button
              type="button"
              aria-label="Next month"
              disabled={nextDisabled}
              onClick={() => setCursor(shiftMonth(cursor, 1))}
              className={navButtonClass}
            >
              <ChevronRight className="size-4" aria-hidden />
            </button>
          </div>

          <div className="text-muted grid grid-cols-7 text-center text-xs font-semibold">
            {WEEKDAYS.map((weekday) => (
              <span key={weekday} className="py-1.5">
                {weekday}
              </span>
            ))}
          </div>

          <div
            ref={gridRef}
            role="group"
            aria-label={title}
            onKeyDown={onGridKeyDown}
            className="grid grid-cols-7 gap-y-0.5"
          >
            {visibleDays("month", cursor).map((day) => {
              const selected = day === value;
              const unavailable = outOfRange(day);
              return (
                <button
                  key={day}
                  type="button"
                  data-date={day}
                  tabIndex={day === cursor ? 0 : -1}
                  aria-label={fullDateLabel(day)}
                  aria-pressed={selected}
                  aria-current={day === today ? "date" : undefined}
                  aria-disabled={unavailable || undefined}
                  onClick={() => choose(day)}
                  className={clsx(
                    "rounded-card h-9 text-sm focus-visible:-outline-offset-2",
                    selected && "bg-navy font-semibold text-white",
                    !selected && day === today && "bg-gold/25 font-semibold",
                    !selected && !unavailable && "hover:bg-navy/5",
                    !selected && day.slice(0, 7) !== cursor.slice(0, 7) && "text-muted",
                    unavailable && "cursor-not-allowed opacity-35",
                  )}
                >
                  {dayOfMonth(day)}
                </button>
              );
            })}
          </div>

          <div className="border-cloud mt-2 border-t pt-2">
            <button
              type="button"
              disabled={outOfRange(today)}
              onClick={() => choose(today)}
              className="rounded-card hover:bg-navy/5 px-2 py-1 text-sm font-semibold disabled:opacity-35 disabled:hover:bg-transparent"
            >
              Today
            </button>
          </div>
        </div>
      )}
    </Picker>
  );
}
