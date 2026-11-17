import clsx from "clsx";
import { toneStyles } from "@/components/calendar/chip";
import type { LegendItem } from "@/components/calendar/types";

export function Legend({ items }: { items: LegendItem[] }) {
  return (
    <ul className="text-muted flex flex-wrap gap-x-4 gap-y-1 text-xs" aria-label="Colour legend">
      {items.map(({ tone, label }) => (
        <li key={tone} className="flex items-center gap-1.5">
          <span className={clsx("size-3 rounded-sm border", toneStyles[tone])} aria-hidden />
          {label}
        </li>
      ))}
    </ul>
  );
}
