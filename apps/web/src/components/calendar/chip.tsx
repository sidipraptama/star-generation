import Link from "next/link";
import clsx from "clsx";
import { Repeat } from "lucide-react";
import type { CalendarChip, ChipTone } from "@/components/calendar/types";
import { formatTimeRange } from "@/lib/format";

export const toneStyles: Record<ChipTone, string> = {
  scheduled: "border-navy/25 bg-navy/10 text-navy",
  done: "border-success/40 bg-success/15 text-success-ink",
  attention: "border-gold bg-gold/30 text-gold-ink",
  warning: "border-danger/40 bg-danger/10 text-danger-ink",
  cancelled: "border-cloud bg-cloud/50 text-muted",
};

type ChipLinkProps = {
  chip: CalendarChip;
  href: string;
  /** Hide the second and third lines (month cells and short lessons). */
  dense?: boolean;
  className?: string;
};

export function ChipLink({ chip, href, dense, className }: ChipLinkProps) {
  const time = formatTimeRange(chip.startAt, chip.endAt);

  return (
    <Link
      href={href}
      scroll={false}
      prefetch={false}
      title={[time, chip.title, chip.subtitle, chip.note].filter(Boolean).join(" · ")}
      className={clsx(
        "rounded-card block overflow-hidden border px-2 py-1 text-xs leading-tight transition-shadow hover:shadow-md",
        toneStyles[chip.tone],
        chip.tone === "cancelled" && "line-through",
        className,
      )}
    >
      <span className="flex items-center gap-1 font-semibold">
        {time}
        {chip.repeats && <Repeat className="size-3 shrink-0" aria-label="Repeats weekly" />}
      </span>
      <span className="block truncate">{chip.title}</span>
      {!dense && chip.subtitle && (
        <span className="block truncate opacity-80">{chip.subtitle}</span>
      )}
      {!dense && chip.note && <span className="block truncate font-semibold">{chip.note}</span>}
    </Link>
  );
}
